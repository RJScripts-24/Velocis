/**
 * getRepoOverview.ts
 * Velocis — GET /repos/:repoId
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import axios from "axios";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";").map((c) => c.trim())) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

async function resolveUser(event: APIGatewayProxyEvent): Promise<{ userId: string; githubToken: string } | null> {
  const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");
  if (sessionToken) {
    try {
      const hash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const session = await dynamoClient.get<{ userId: string; githubId: string; expiresAt: string }>({
        tableName: DYNAMO_TABLES.USERS,
        key: { userId: `session_${hash}` },
      });
      if (session && new Date(session.expiresAt) > new Date()) {
        let githubToken = "";
        try {
          githubToken = await getUserToken(session.githubId);
        } catch {
          try {
            const u = await dynamoClient.get<{ accessToken?: string; github_token?: string }>({
              tableName: DYNAMO_TABLES.USERS,
              key: { userId: session.githubId },
            });
            githubToken = u?.accessToken ?? u?.github_token ?? "";
          } catch { /* non-fatal */ }
        }
        return { userId: session.githubId, githubToken };
      }
    } catch (e) {
      logger.error({ msg: "Session lookup failed", error: String(e) });
    }
  }
  const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!token) return null;
  try {
    const { sub } = jwt.verify(token, JWT_SECRET) as { sub: string };
    return { userId: sub, githubToken: "" };
  } catch {
    return null;
  }
}

interface CommitMonth {
  month: string;   // "Jan 2026"
  count: number;
  days: number[];  // per-day commit counts (index 0 = day 1)
}

async function fetchAllCommitsByMonth(
  owner: string,
  repoName: string,
  githubToken: string,
): Promise<CommitMonth[]> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Velocis-App",
    };
    if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

    logger.info({ msg: "Fetching ALL commits from GitHub", owner, repoName });

    const allCommits: any[] = [];
    let page = 1;
    while (page <= 10) {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/commits`, {
        headers,
        params: { per_page: 100, page },
        timeout: 10000,
      });
      if (!res.data || res.data.length === 0) break;
      allCommits.push(...res.data);
      if (res.data.length < 100) break;
      page++;
    }

    logger.info({ msg: "GitHub commits fetched", totalCommits: allCommits.length });
    if (allCommits.length === 0) return [];

    // Group by month, track per-day counts
    const monthDayMap: Record<string, Record<number, number>> = {};
    for (const commit of allCommits) {
      const dateStr = commit.commit?.author?.date ?? commit.commit?.committer?.date ?? "";
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const day = d.getDate();
      if (!monthDayMap[key]) monthDayMap[key] = {};
      monthDayMap[key][day] = (monthDayMap[key][day] ?? 0) + 1;
    }

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Object.entries(monthDayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, dayMap]) => {
        const [yearStr, monStr] = key.split("-");
        const year = parseInt(yearStr, 10);
        const mon = parseInt(monStr, 10);
        const daysInMonth = new Date(year, mon, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => dayMap[i + 1] ?? 0);
        return { month: `${MONTHS[mon - 1]} ${year}`, count: days.reduce((s, v) => s + v, 0), days };
      });
  } catch (e: any) {
    logger.error({ msg: "Failed to fetch GitHub commit history", error: e.message, status: e.response?.status });
    return [];
  }
}

async function getGitHubLogin(githubToken: string): Promise<string | null> {
  if (!githubToken) return null;
  try {
    const res = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${githubToken}`, "User-Agent": "Velocis-App" },
      timeout: 5000,
    });
    return res.data?.login ?? null;
  } catch {
    return null;
  }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();
  const { userId, githubToken } = user;

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId path parameter.");

  logger.info({ msg: "GET /repos/:repoId", repoId, userId, hasToken: !!githubToken });

  const docClient = getDocClient();
  let repo: Record<string, any> | undefined;

  try {
    const scan = await docClient.send(new ScanCommand({
      TableName: DYNAMO_TABLES.REPOSITORIES,
      FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
      ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
    }));
    repo = scan.Items?.[0];
  } catch (e) {
    logger.warn({ msg: "REPOSITORIES scan failed", error: String(e) });
  }

  if (!repo) {
    try {
      const scan2 = await docClient.send(new ScanCommand({
        TableName: process.env.REPOS_TABLE ?? "velocis-repos",
        FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
        ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
      }));
      repo = scan2.Items?.[0];
    } catch { /* non-fatal */ }
  }

  if (!repo) return errors.repoNotFound(repoId);

  const lastScannedAt = repo.lastScannedAt ?? new Date().toISOString();

  // 1. Fetch real metrics from various tables
  let prRiskScore = repo.riskScore ?? "Low";
  let testStabilityPct = repo.testStabilityPct ?? 100;
  let architectureDrift = repo.architectureDrift ?? "None detected";
  let lastActionAt = repo.lastActionAt ?? lastScannedAt;

  // Risk counts
  let risksCritical = repo.risksCritical ?? 0;
  let risksMedium = repo.risksMedium ?? 0;
  let risksLow = repo.risksLow ?? 0;

  const SENTINEL_TABLE = process.env.SENTINEL_TABLE ?? "velocis-sentinel";
  const PIPELINE_TABLE = process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs";

  try {
    // Latest PR Risk from Sentinel
    const sentinelRes = await docClient.send(new ScanCommand({
      TableName: SENTINEL_TABLE,
      FilterExpression: "repoId = :r AND recordType = :t",
      ExpressionAttributeValues: { ":r": repoId, ":t": "PR_REVIEW" },
    }));
    const latestPr = (sentinelRes.Items ?? []).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
    if (latestPr) {
      prRiskScore = `${latestPr.riskScore}%`;

      // Calculate risk counts from findings if available
      if (latestPr.findings && Array.isArray(latestPr.findings)) {
        risksCritical = latestPr.findings.filter((f: any) => f.severity === "high" || f.severity === "critical").length;
        risksMedium = latestPr.findings.filter((f: any) => f.severity === "medium").length;
        risksLow = latestPr.findings.filter((f: any) => f.severity === "low").length;
      }
    }

    // Latest Test Stability from Fortress
    const pipelineRes = await docClient.send(new ScanCommand({
      TableName: PIPELINE_TABLE,
      FilterExpression: "repoId = :r",
      ExpressionAttributeValues: { ":r": repoId },
    }));
    const latestRun = (pipelineRes.Items ?? []).sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0];
    if (latestRun) {
      testStabilityPct = latestRun.testStabilityPct ?? latestRun.test_results?.stability_pct ?? 100;
    }

    // Latest Activity for "last auto action"
    const activityRes = await docClient.send(new ScanCommand({
      TableName: DYNAMO_TABLES.AI_ACTIVITY,
      FilterExpression: "repoId = :r",
      ExpressionAttributeValues: { ":r": repoId },
    }));
    const latestActivity = (activityRes.Items ?? []).sort((a, b) => (b.timestamp ?? b.createdAt ?? "").localeCompare(a.timestamp ?? a.createdAt ?? ""))[0];
    if (latestActivity) {
      lastActionAt = latestActivity.timestamp ?? latestActivity.createdAt;
    }

    // Architecture Drift from repo record or dedicated SK if we had one
    // For now, if we have many nodes failing in cortex, we could derive it.
    // Let's stick to the repo field for architectue drift but maybe clean up the label
    if (repo.architectureDrift === "None" || !repo.architectureDrift) {
      architectureDrift = "Minimal";
    }
  } catch (e) {
    logger.warn({ msg: "Failed to fetch real-time metrics", repoId, error: String(e) });
  }


  let commitByMonth: CommitMonth[] = [];
  if (githubToken) {
    const owner = await getGitHubLogin(githubToken);
    if (owner) {
      commitByMonth = await fetchAllCommitsByMonth(owner, repo.repoName ?? repoId, githubToken);
    }
  }

  const totalCommits = commitByMonth.reduce((s, m) => s + m.count, 0);
  let trendDirection = "flat";
  let trendLabel = "";
  if (commitByMonth.length >= 2) {
    const last = commitByMonth[commitByMonth.length - 1].count;
    const prev = commitByMonth[commitByMonth.length - 2].count;
    if (last > prev) { trendDirection = "up"; trendLabel = `↑ ${totalCommits} total commits`; }
    else if (prev > last) { trendDirection = "down"; trendLabel = `↓ ${totalCommits} total commits`; }
    else { trendLabel = `${totalCommits} total commits`; }
  } else if (totalCommits > 0) {
    trendLabel = `${totalCommits} total commits`;
  }

  return ok({
    id: repo.repoSlug ?? repoId,
    name: repo.repoName ?? repoId,
    status: repo.status ?? "healthy",
    status_label: repo.statusLabel ?? "System Healthy",
    visibility: repo.visibility ?? "private",
    language: repo.language ?? null,
    last_scanned_ago: timeAgo(lastScannedAt),
    last_scanned_at: lastScannedAt,
    size_loc: repo.sizeLoc ?? "–",
    metrics: {
      risk_score: prRiskScore,
      test_stability_pct: testStabilityPct,
      architecture_drift: architectureDrift,
      last_action_ago: timeAgo(lastActionAt),
    },
    sentinel: { active_prs: repo.sentinelActivePrs ?? 0, last_update_ago: timeAgo(repo.sentinelLastUpdated ?? lastScannedAt) },
    fortress: { status_message: repo.fortressStatusMessage ?? "Pipeline idle", last_run_ago: timeAgo(repo.fortressLastRun ?? lastScannedAt) },
    cortex: { last_update_ago: timeAgo(repo.cortexLastUpdated ?? lastScannedAt), service_count: repo.cortexServiceCount ?? 0 },
    risks: { critical: risksCritical, medium: risksMedium, low: risksLow },
    commit_by_month: commitByMonth,
    commit_sparkline: commitByMonth.map((m) => m.count),
    commit_trend_label: trendLabel || repo.commitTrendLabel || "",
    commit_trend_direction: trendDirection || repo.commitTrendDirection || "flat",
    installed_at: repo.createdAt || repo.updatedAt || repo.lastProcessedAt || repo.lastPushAt || repo.lastScannedAt || lastActionAt,
  });
};


