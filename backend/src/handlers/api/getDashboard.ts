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
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";
import * as crypto from "crypto";

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
const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";
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
      const sessionRecord = await dynamoClient.get<{ githubId: string, expiresAt: string }>({
        tableName: DYNAMO_TABLES.USERS,
        key: { userId: `session_${sessionTokenHash}` },
      });
      if (sessionRecord && new Date(sessionRecord.expiresAt) > new Date()) {
        userId = sessionRecord.githubId;
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
    key: { userId: userId! }
  });

  if (!user) {
    // Try the old 'id' key if 'userId' fails (just in case)
    const oldUserRes = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } }));
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

  // ── Activity feed ───────────────────────────────────────────────────────────
  let activityEvents: any[] = [];
  try {
    const actScan = await docClient.send(
      new ScanCommand({
        TableName: ACTIVITY_TABLE,
        FilterExpression: "userId = :uid AND #ts >= :since",
        ExpressionAttributeNames: { "#ts": "timestamp" },
        ExpressionAttributeValues: { ":uid": userId, ":since": since },
        Limit: 30,
      })
    );
    activityEvents = (actScan.Items ?? [])
      .sort((a: any, b: any) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
      .slice(0, 20)
      .map((e: any) => ({
        id: e.id,
        agent: e.agent,
        repo_id: e.repoId,
        repo_name: e.repoName,
        message: e.message,
        severity: e.severity,
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

  // ── Shape repo cards ─────────────────────────────────────────────────────────
  const repoDashCards = repos.map((r) => ({
    id: r.repoSlug ?? r.repoId,
    name: r.repoName ?? r.repoSlug,
    status: r.status ?? "healthy",
    language: r.language ?? null,
    last_activity: (r.lastActivity ?? []).map((a: any) => ({
      agent: a.agent,
      message: a.message,
      severity: a.severity,
      timestamp_ago: timeAgo(a.timestamp),
    })),
    commit_sparkline: r.commitSparkline ?? [],
    commit_trend_label: r.commitTrendLabel ?? "",
    commit_trend_direction: r.commitTrendDirection ?? "flat",
  }));

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
