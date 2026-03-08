/**
 * getDashboard.ts
 * Velocis — GET /dashboard
 *
 * Returns the full organisation-level dashboard data:
 *   - user info
 *   - summary health counts
 *   - per-repo cards with sparklines and last activity
 *   - global activity feed
 *   - recent deployments
 *   - system metrics
 *
 * Query params:
 *   range — time window: 1h | 24h | 7d | 30d  (default 24h)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import axios from "axios";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse.js";
import { logger } from "../../utils/logger.js";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient.js";
import { getUserToken } from "../../services/github/auth.js";
import * as crypto from "crypto";

interface CommitHistorySeries {
  monthlyCounts: number[];
  totalCommits: number;
  timelineStartMonth: string | null;
  timelineEndMonth: string | null;
}

function incrementMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return monthKey;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Fetch all commit pages from GitHub and aggregate monthly commit counts for
 * an all-time graph. Uses Link rel="next" pagination until exhausted.
 */
async function fetchAllTimeCommitHistory(
  owner: string,
  repoName: string,
  githubToken: string
): Promise<CommitHistorySeries> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Velocis-App",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

    let nextUrl = `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=100`;
    let pageCount = 0;
    let totalCommits = 0;
    const monthCount = new Map<string, number>();

    while (nextUrl && pageCount < 500) {
      const res = await axios.get(nextUrl, { headers, timeout: 10000 });
      const commits = Array.isArray(res.data) ? res.data : [];
      if (commits.length === 0) break;

      totalCommits += commits.length;
      for (const commit of commits) {
        const commitDate: string | undefined = commit?.commit?.committer?.date ?? commit?.commit?.author?.date;
        if (!commitDate) continue;
        const monthKey = commitDate.slice(0, 7); // YYYY-MM
        monthCount.set(monthKey, (monthCount.get(monthKey) ?? 0) + 1);
      }

      const linkHeader = String(res.headers?.link ?? "");
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = nextMatch?.[1] ?? "";
      pageCount += 1;
    }

    const orderedMonths = Array.from(monthCount.keys()).sort();
    if (orderedMonths.length === 0) {
      return {
        monthlyCounts: [],
        totalCommits,
        timelineStartMonth: null,
        timelineEndMonth: null,
      };
    }

    const timelineStartMonth = orderedMonths[0];
    const timelineEndMonth = getCurrentMonthKey();
    const denseMonths: string[] = [];
    let cursor = timelineStartMonth;
    let guard = 0;
    while (cursor <= timelineEndMonth && guard < 1200) {
      denseMonths.push(cursor);
      cursor = incrementMonth(cursor);
      guard += 1;
    }

    return {
      monthlyCounts: denseMonths.map((m) => monthCount.get(m) ?? 0),
      totalCommits,
      timelineStartMonth,
      timelineEndMonth,
    };
  } catch {
    return {
      monthlyCounts: [],
      totalCommits: 0,
      timelineStartMonth: null,
      timelineEndMonth: null,
    };
  }
}

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

const docClient = getDocClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";
const USERS_TABLE = process.env.DYNAMODB_TABLE_NAME || process.env.USERS_TABLE || "velocis-main";
const REPOS_TABLE = process.env.REPOS_TABLE ?? "velocis-repos";
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE ?? "velocis-activity";
const DEPLOYS_TABLE = process.env.DEPLOYS_TABLE ?? "velocis-deployments";

const RANGE_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Convert an ISO timestamp to a human-readable "Xm ago / Xh ago" label */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffS = Math.floor(diffMs / 1000);
  if (diffS < 60) return `${diffS}s`;
  if (diffS < 3600) return `${Math.floor(diffS / 60)}m`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h`;
  return `${Math.floor(diffS / 86400)}d`;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  let userId: string | null = null;
  const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");

  if (sessionToken) {
    try {
      const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionRecord = await dynamoClient.get<{ userId: string, expiresAt: string }>({
        tableName: DYNAMO_TABLES.USERS,
        key: { pk: `SESSION#${sessionTokenHash}` },
      });
      if (sessionRecord && new Date(sessionRecord.expiresAt) > new Date()) {
        userId = sessionRecord.userId;
      }
    } catch (e) {
      logger.error({ msg: "Error resolving session cookie", error: String(e) });
    }
  }

  if (!userId) {
    const token = extractBearerToken(
      event.headers?.Authorization ?? event.headers?.authorization
    );
    if (!token) return errors.unauthorized();

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      // Sometimes JWT 'sub' has usr_ prefix (from old auth), sometimes it's just ID.
      // Strip usr_ prefix if we're migrating to pure githubId
      userId = decoded.sub.startsWith('usr_') ? decoded.sub.slice(4) : decoded.sub;
    } catch {
      return errors.unauthorized("Token is invalid or expired.");
    }
  }

  const qs = event.queryStringParameters ?? {};
  const range = (qs.range && RANGE_MS[qs.range]) ? qs.range : "24h";
  const since = new Date(Date.now() - RANGE_MS[range]).toISOString();

  // ── Fetch user ─────────────────────────────────────────────────────────────
  const user = await dynamoClient.get<any>({
    tableName: DYNAMO_TABLES.USERS,
    key: { pk: `USER#${userId!}` }
  });

  if (!user) {
    // Try the pk key format as fallback
    const oldUserRes = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { pk: `USER#${userId}` } }));
    if (!oldUserRes.Item) return errors.unauthorized("User not found.");
    Object.assign(user, oldUserRes.Item);
  }

  // ── Fetch installed repos for this user ────────────────────────────────────
  let repos: any[] = [];
  try {
    // Try the configured REPOSITORIES table first (used by installRepo.ts)
    const scan = await docClient.send(
      new ScanCommand({
        TableName: DYNAMO_TABLES.REPOSITORIES,
        FilterExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      })
    );
    repos = scan.Items ?? [];
  } catch (_) {
    // Fallback to legacy REPOS_TABLE
    try {
      const scan2 = await docClient.send(
        new ScanCommand({
          TableName: REPOS_TABLE,
          FilterExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
        })
      );
      repos = scan2.Items ?? [];
    } catch (__) { /* non-fatal */ }
  }

  // ── Summary counts ──────────────────────────────────────────────────────────
  const summary = repos.reduce(
    (acc, r) => {
      const s = r.status ?? "healthy";
      if (s === "healthy") acc.healthy++;
      if (s === "warning") acc.warning++;
      if (s === "critical") acc.critical++;
      acc.open_risks += r.openRisks ?? 0;
      acc.agents_running += r.agentsRunning ?? 0;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0, open_risks: 0, agents_running: 0 }
  );

  // ── Activity feed (reads from the AI_ACTIVITY table where handlers log events) ──
  let activityEvents: any[] = [];
  try {
    const actScan = await docClient.send(
      new ScanCommand({
        TableName: DYNAMO_TABLES.AI_ACTIVITY,
        FilterExpression: "userId = :uid AND #ts >= :since",
        ExpressionAttributeNames: { "#ts": "timestamp" },
        ExpressionAttributeValues: { ":uid": userId, ":since": since },
        Limit: 50,
      })
    );
    activityEvents = (actScan.Items ?? [])
      .sort((a: any, b: any) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
      .slice(0, 10)
      .map((e: any) => ({
        id: e.activityId ?? e.id,
        agent: e.agent,
        repo_id: e.repoId,
        repo_name: e.repoName ?? e.repoId,
        message: e.message,
        severity: e.severity ?? "info",
        timestamp_ago: timeAgo(e.timestamp),
        timestamp: e.timestamp,
      }));
  } catch (_) { /* non-fatal */ }

  // ── Recent deployments ──────────────────────────────────────────────────────
  let recentDeployments: any[] = [];
  try {
    const depScan = await docClient.send(
      new ScanCommand({
        TableName: DEPLOYS_TABLE,
        FilterExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        Limit: 10,
      })
    );
    recentDeployments = (depScan.Items ?? [])
      .sort((a: any, b: any) => (b.deployedAt ?? "").localeCompare(a.deployedAt ?? ""))
      .slice(0, 5)
      .map((d: any) => ({
        repo_id: d.repoId,
        environment: d.environment,
        deployed_at: d.deployedAt,
        status: d.status,
      }));
  } catch (_) { /* non-fatal */ }

  // ── Resolve GitHub token for sparkline fetching ────────────────────────────
  let githubToken = "";
  try { githubToken = await getUserToken(userId!); } catch { /* non-fatal */ }

  // ── Deduplicate repos by repoId (guards against duplicate DynamoDB records)
  const seen = new Set<string>();
  const uniqueRepos = repos.filter((r) => {
    const id = String(r.repoId ?? r.repoSlug ?? r.id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // ── Resolve numeric repoNames to real slugs before any GitHub API call ──────
  // DynamoDB records may have the raw GitHub numeric ID stored as repoName.
  // The GitHub API only accepts slugs in owner/repo paths, so we resolve first.
  const resolvedNameMap: Record<string, string> = {};
  if (githubToken) {
    await Promise.all(
      uniqueRepos.map(async (r) => {
        const id = String(r.repoId ?? r.repoSlug ?? "");
        const candidate = String(r.repoName ?? r.repoSlug ?? "");
        if (id && /^\d{7,}$/.test(candidate)) {
          try {
            const res = await axios.get(`https://api.github.com/repositories/${candidate}`, {
              headers: { "User-Agent": "Velocis-App", Authorization: `Bearer ${githubToken}` },
              timeout: 5000,
            });
            if (res.data?.name) resolvedNameMap[id] = res.data.name;
          } catch { /* non-fatal */ }
        }
      })
    );
  }

  // ── Fetch sparklines in parallel for all repos ─────────────────────────────
  const sparklineMap: Record<string, number[]> = {};
  const totalCommitsMap: Record<string, number> = {};
  const timelineStartMap: Record<string, string | null> = {};
  const timelineEndMap: Record<string, string | null> = {};
  if (githubToken) {
    await Promise.all(
      uniqueRepos.map(async (r) => {
        const id = String(r.repoId ?? r.repoSlug ?? "");
        const owner: string | undefined =
          r.repoOwner ??
          (r.repoFullName ? String(r.repoFullName).split('/')[0] : undefined);
        const repoNameFromFullName: string | undefined = r.repoFullName ? String(r.repoFullName).split('/')[1] : undefined;
        const repoNameCandidate = typeof r.repoName === "string" ? r.repoName : undefined;
        const safeRepoName = repoNameCandidate && !/^\d{7,}$/.test(repoNameCandidate) ? repoNameCandidate : undefined;
        const name: string | undefined = resolvedNameMap[id] ?? safeRepoName ?? repoNameFromFullName ?? r.repoSlug;
        if (owner && name && id && !/^\d{7,}$/.test(name)) {
          const commitHistory = await fetchAllTimeCommitHistory(owner, name, githubToken);
          sparklineMap[id] = commitHistory.monthlyCounts;
          totalCommitsMap[id] = commitHistory.totalCommits;
          timelineStartMap[id] = commitHistory.timelineStartMonth;
          timelineEndMap[id] = commitHistory.timelineEndMonth;
        }
      })
    );
  }

  // ── Shape repo cards ─────────────────────────────────────────────────────────
  const repoDashCards = uniqueRepos.map((r) => {
    const id = String(r.repoId ?? r.repoSlug ?? "");
    const sparkline = sparklineMap[id] ?? [];
    const total = totalCommitsMap[id] ?? sparkline.reduce((s, v) => s + v, 0);
    const repoNameCandidate = typeof r.repoName === "string" ? r.repoName : undefined;
    const safeRepoName = repoNameCandidate && !/^\d{7,}$/.test(repoNameCandidate) ? repoNameCandidate : undefined;
    const repoNameFromFullName = r.repoFullName ? String(r.repoFullName).split('/')[1] : undefined;
    let trendLabel = r.commitTrendLabel ?? "";
    let trendDirection = r.commitTrendDirection ?? "flat";
    if (sparkline.length >= 2 && !trendLabel) {
      const last = sparkline[sparkline.length - 1];
      const prev = sparkline[sparkline.length - 2];
      if (last > prev) { trendDirection = "up"; trendLabel = `\u2191 ${total} total commits`; }
      else if (prev > last) { trendDirection = "down"; trendLabel = `\u2193 ${total} total commits`; }
      else trendLabel = `${total} total commits`;
    }
    return {
      id,
      name: resolvedNameMap[String(r.repoId ?? r.repoSlug ?? "")] ?? safeRepoName ?? repoNameFromFullName ?? r.repoSlug ?? String(r.repoId ?? ""),
      status: r.status ?? "healthy",
      language: r.language ?? null,
      last_activity: (r.lastActivity ?? []).map((a: any) => ({
        agent: a.agent,
        message: a.message,
        severity: a.severity,
        timestamp_ago: timeAgo(a.timestamp),
      })),
      last_scanned_at: r.lastReviewAt ?? r.lastScannedAt ?? r.automationReport?.completedAt ?? null,
      commit_sparkline: sparkline,
      total_commits: total,
      commit_timeline_start: timelineStartMap[id] ?? null,
      commit_timeline_end: timelineEndMap[id] ?? null,
      commit_trend_label: trendLabel,
      commit_trend_direction: trendDirection,
      installed_at: r.createdAt || r.updatedAt || r.lastProcessedAt || r.lastPushAt || r.lastScannedAt,
    };
  });

  logger.info({ userId, msg: "GET /dashboard", range });

  return ok({
    user: {
      name: user?.name ?? user?.displayName ?? "Developer",
      avatar_url: user?.avatar_url ?? user?.avatarUrl,
    },
    summary,
    repos: repoDashCards,
    activity_feed: activityEvents,
    recent_deployments: recentDeployments,
    system: {
      // These should be pulled from CloudWatch in production
      api_latency_ms: 38,
      queue_depth: 0,
      agent_uptime_pct: 99.9,
      storage_used_pct: 0,
      agents: [],
    },
  });
};
