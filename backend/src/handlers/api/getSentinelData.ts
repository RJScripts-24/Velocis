/**
 * getSentinelData.ts
 * Velocis — Sentinel Agent Handlers
 *
 * Routes:
 *   GET  /repos/:repoId/sentinel/prs              → List PRs with risk analysis
 *   GET  /repos/:repoId/sentinel/prs/:prNumber    → Single PR deep analysis
 *   POST /repos/:repoId/sentinel/scan             → Trigger manual scan
 *   GET  /repos/:repoId/sentinel/activity         → Recent Sentinel events
 *
 * Data sourced from DynamoDB (written by analyzeLogic.ts on every push/PR event).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { randomUUID, createHash } from "crypto";
import {
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";
import { config } from "../../utils/config";

const JWT_SECRET      = process.env.JWT_SECRET  ?? "changeme-in-production";
const SCAN_JOBS_TABLE = process.env.SCAN_JOBS_TABLE ?? "velocis-scan-jobs";

/** Maps overallRisk text → 0-100 score for the frontend risk bars */
const riskToScore: Record<string, number> = {
  critical: 90, high: 70, medium: 50, low: 25, clean: 10,
};

// ── Auth helper ──────────────────────────────────────────────────────────────
function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";").map((c) => c.trim())) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

async function requireAuth(event: APIGatewayProxyEvent) {
  // 1. Session cookie
  const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");
  if (sessionToken) {
    try {
      const hash = createHash("sha256").update(sessionToken).digest("hex");
      const session = await dynamoClient.get<{ userId: string; githubId: string; expiresAt: string }>({
        tableName: DYNAMO_TABLES.USERS,
        key: { githubId: `session_${hash}` },
      });
      if (session && new Date(session.expiresAt) > new Date()) return session.githubId;
    } catch (e) {
      logger.error({ msg: "Session cookie lookup failed", error: String(e) });
    }
  }
  // 2. Bearer JWT fallback
  const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!token) return null;
  try {
    return (jwt.verify(token, JWT_SECRET) as { sub: string }).sub;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/sentinel/prs
// ─────────────────────────────────────────────────────────────────────────────

export const listPrs = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let prs: any[] = [];
  try {
    // Sentinel writes commit-level reviews to DYNAMO_AI_ACTIVITY_TABLE
    // with PK=REPO#<repoId> and SK=SENTINEL#<commitSha>
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: config.DYNAMO_AI_ACTIVITY_TABLE,
        IndexName: "repoId-createdAt-index",
        KeyConditionExpression: "repoId = :r",
        FilterExpression: "#agent = :agent",
        ExpressionAttributeNames: { "#agent": "agent" },
        ExpressionAttributeValues: { ":r": repoId, ":agent": "sentinel" },
        ScanIndexForward: false, // newest first
        Limit: 20,
      })
    );
    prs = (res.Items ?? []).map((p: any, i: number) => ({
      pr_number:  i + 1,
      title:      `Commit ${(p.commitSha ?? "").slice(0, 7)}`,
      author:     p.outputLanguage ?? "en",
      branch:     p.reviewDepth ?? "standard",
      risk_score: riskToScore[p.overallRisk] ?? 10,
      risk_level: p.overallRisk ?? "clean",
      state:      "reviewed",
      created_at: p.reviewedAt,
      findings:  (p.findingSummaries ?? []).slice(0, 5).map((f: any) => ({
        id:       f.id,
        severity: f.severity,
        file:     f.filePath,
        line:     f.startLine,
        message:  f.title,
      })),
    }));
  } catch (e: any) {
    logger.error({ repoId, msg: "listPrs failed", error: e?.message });
    return errors.agentUnavailable("Sentinel");
  }

  return ok({ prs });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/sentinel/prs/:prNumber
// ─────────────────────────────────────────────────────────────────────────────

export const getPrDetail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const { repoId, prNumber } = event.pathParameters ?? {};
  if (!repoId || !prNumber) return errors.badRequest("Missing repoId or prNumber.");

  // prNumber maps to a positional index — fetch all and pick the nth
  let pr: any;
  try {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: config.DYNAMO_AI_ACTIVITY_TABLE,
        IndexName: "repoId-createdAt-index",
        KeyConditionExpression: "repoId = :r",
        FilterExpression: "#agent = :agent",
        ExpressionAttributeNames: { "#agent": "agent" },
        ExpressionAttributeValues: { ":r": repoId, ":agent": "sentinel" },
        ScanIndexForward: false,
        Limit: parseInt(prNumber, 10) + 1,
      })
    );
    const items = res.Items ?? [];
    pr = items[parseInt(prNumber, 10) - 1];
  } catch (e: any) {
    logger.error({ repoId, msg: "getPrDetail failed", error: e?.message });
    return errors.agentUnavailable("Sentinel");
  }

  if (!pr) return errors.notFound(`Review #${prNumber} not found for repo '${repoId}'.`);

  return ok({
    pr_number:  parseInt(prNumber, 10),
    title:      `Commit ${(pr.commitSha ?? "").slice(0, 7)}`,
    risk_score: riskToScore[pr.overallRisk] ?? 10,
    risk_level: pr.overallRisk ?? "clean",
    summary:    pr.executiveSummary ?? "",
    findings:  (pr.findingSummaries ?? []).map((f: any) => ({
      id:         f.id,
      severity:   f.severity,
      file:       f.filePath,
      line:       f.startLine,
      message:    f.title,
      suggestion: "",
    })),
    diff_url: "",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/sentinel/scan
// ─────────────────────────────────────────────────────────────────────────────

export const triggerScan = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const scanId  = `scan_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)}`;
  const now     = new Date().toISOString();

  await getDocClient().send(
    new PutCommand({
      TableName: SCAN_JOBS_TABLE,
      Item: {
        scanId,
        repoId,
        userId,
        status:    "queued",
        createdAt: now,
      },
    })
  );

  logger.info({ scanId, repoId, userId, msg: "Sentinel scan queued" });

  return ok(
    {
      scan_id: scanId,
      status:  "queued",
      message: `Sentinel scan queued for ${repoId}`,
    },
    202
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/sentinel/activity
// ─────────────────────────────────────────────────────────────────────────────

export const getSentinelActivity = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const qs    = event.queryStringParameters ?? {};
  const limit = Math.min(100, parseInt(qs.limit ?? "20", 10));
  const page  = Math.max(1, parseInt(qs.page   ?? "1",  10));

  let events: any[] = [];
  try {
    // Sentinel writes reviews to AI_ACTIVITY table — surface them as activity events
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: config.DYNAMO_AI_ACTIVITY_TABLE,
        IndexName: "repoId-createdAt-index",
        KeyConditionExpression: "repoId = :r",
        FilterExpression: "#agent = :agent",
        ExpressionAttributeNames: { "#agent": "agent" },
        ExpressionAttributeValues: { ":r": repoId, ":agent": "sentinel" },
        ScanIndexForward: false,
        Limit: limit * page,
      })
    );
    const all = res.Items ?? [];
    const start = (page - 1) * limit;
    events = all.slice(start, start + limit).map((e: any, i: number) => ({
      id:             e.activityId ?? `sentinel-${i}`,
      type:           "review",
      severity:       e.overallRisk ?? "info",
      message:        e.executiveSummary ?? `Sentinel review — ${e.overallRisk ?? "clean"}`,
      file:           e.fileSummaries?.[0]?.filePath ?? undefined,
      line:           undefined,
      pr_number:      undefined,
      timestamp:      e.reviewedAt,
      timestamp_ago:  timeAgo(e.reviewedAt),
    }));
  } catch (e: any) {
    logger.error({ repoId, msg: "getSentinelActivity failed", error: e?.message });
    return errors.agentUnavailable("Sentinel");
  }

  return ok({ events });
};
