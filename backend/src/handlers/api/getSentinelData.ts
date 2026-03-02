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
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";

const dynamo          = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET      = process.env.JWT_SECRET       ?? "changeme-in-production";
const USERS_TABLE     = process.env.USERS_TABLE      ?? "velocis-users";
const SENTINEL_TABLE  = process.env.SENTINEL_TABLE   ?? "velocis-sentinel";
const SCAN_JOBS_TABLE = process.env.SCAN_JOBS_TABLE  ?? "velocis-scan-jobs";

// ── Auth helper ──────────────────────────────────────────────────────────────
async function requireAuth(authHeader: string | undefined) {
  const token = extractBearerToken(authHeader);
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

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let prs: any[] = [];
  try {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: SENTINEL_TABLE,
        FilterExpression: "repoId = :r AND recordType = :t",
        ExpressionAttributeValues: { ":r": repoId, ":t": "PR_REVIEW" },
      })
    );
    prs = (res.Items ?? [])
      .sort((a: any, b: any) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .map((p: any) => ({
        pr_number:  p.prNumber,
        title:      p.title       ?? `PR #${p.prNumber}`,
        author:     p.author      ?? "unknown",
        branch:     p.branch      ?? "",
        risk_score: p.riskScore   ?? 0,
        risk_level: p.riskLevel   ?? "low",
        state:      p.state       ?? "open",
        created_at: p.createdAt,
        findings:  (p.findings ?? []).map((f: any) => ({
          id:       f.id,
          severity: f.severity,
          file:     f.file,
          line:     f.line,
          message:  f.message,
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

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const { repoId, prNumber } = event.pathParameters ?? {};
  if (!repoId || !prNumber) return errors.badRequest("Missing repoId or prNumber.");

  const res = await dynamo.send(
    new ScanCommand({
      TableName: SENTINEL_TABLE,
      FilterExpression: "repoId = :r AND recordType = :t AND prNumber = :pr",
      ExpressionAttributeValues: {
        ":r": repoId,
        ":t": "PR_REVIEW",
        ":pr": parseInt(prNumber, 10),
      },
      Limit: 1,
    })
  );

  const pr = res.Items?.[0];
  if (!pr) return errors.notFound(`PR #${prNumber} not found for repo '${repoId}'.`);

  return ok({
    pr_number:  pr.prNumber,
    title:      pr.title       ?? `PR #${pr.prNumber}`,
    risk_score: pr.riskScore   ?? 0,
    risk_level: pr.riskLevel   ?? "low",
    summary:    pr.summary     ?? "",
    findings:  (pr.findings ?? []).map((f: any) => ({
      id:         f.id,
      severity:   f.severity,
      file:       f.file,
      line:       f.line,
      message:    f.message,
      suggestion: f.suggestion ?? "",
    })),
    diff_url: pr.diffUrl ?? "",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/sentinel/scan
// ─────────────────────────────────────────────────────────────────────────────

export const triggerScan = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const scanId  = `scan_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)}`;
  const now     = new Date().toISOString();

  await dynamo.send(
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

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const qs    = event.queryStringParameters ?? {};
  const limit = Math.min(100, parseInt(qs.limit ?? "20", 10));
  const page  = Math.max(1, parseInt(qs.page   ?? "1",  10));

  let events: any[] = [];
  try {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: SENTINEL_TABLE,
        FilterExpression: "repoId = :r AND recordType = :t",
        ExpressionAttributeValues: { ":r": repoId, ":t": "ACTIVITY_EVENT" },
      })
    );
    const all = (res.Items ?? []).sort(
      (a: any, b: any) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "")
    );
    const start = (page - 1) * limit;
    events = all.slice(start, start + limit).map((e: any) => ({
      id:             e.id,
      type:           e.eventType    ?? "finding",
      severity:       e.severity     ?? "info",
      message:        e.message,
      file:           e.file         ?? undefined,
      line:           e.line         ?? undefined,
      pr_number:      e.prNumber     ?? undefined,
      timestamp:      e.timestamp,
      timestamp_ago:  timeAgo(e.timestamp),
    }));
  } catch (e: any) {
    logger.error({ repoId, msg: "getSentinelActivity failed", error: e?.message });
    return errors.agentUnavailable("Sentinel");
  }

  return ok({ events });
};
