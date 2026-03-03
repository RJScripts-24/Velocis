/**
 * getActivity.ts
 * Velocis — GET /activity
 *
 * Returns the global activity feed across all repositories.
 * Supports filtering by agent, repo, and pagination.
 *
 * Query params:
 *   agent    — sentinel | fortress | cortex | all
 *   repo_id  — filter to a specific repo
 *   limit    — default 20
 *   page     — default 1
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE ?? "velocis-activity";

// ── Auth helper (session cookie + JWT fallback) ─────────────────────────────

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

async function resolveUserId(event: APIGatewayProxyEvent): Promise<string | null> {
  // 1. Session cookie
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
        return session.githubId;
      }
    } catch (e) {
      logger.error({ msg: "Session cookie lookup failed", error: String(e) });
    }
  }

  // 2. JWT fallback
  const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!token) return null;
  try {
    return (jwt.verify(token, JWT_SECRET) as { sub: string }).sub;
  } catch {
    return null;
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await resolveUserId(event);
  if (!userId) return errors.unauthorized();

  const qs = event.queryStringParameters ?? {};
  const agent = qs.agent ?? null;
  const repoIdF = qs.repo_id ?? null;
  const limit = Math.min(100, parseInt(qs.limit ?? "20", 10));
  const page = Math.max(1, parseInt(qs.page ?? "1", 10));

  let filterExpr = "userId = :uid";
  const exprVals: Record<string, any> = { ":uid": userId };

  if (agent) {
    filterExpr += " AND agent = :agent";
    exprVals[":agent"] = agent;
  }
  if (repoIdF) {
    filterExpr += " AND repoId = :rid";
    exprVals[":rid"] = repoIdF;
  }

  const docClient = getDocClient();

  let allItems: any[] = [];
  try {
    // Try AI_ACTIVITY table first
    const res = await docClient.send(
      new ScanCommand({
        TableName: DYNAMO_TABLES.AI_ACTIVITY,
        FilterExpression: filterExpr,
        ExpressionAttributeValues: exprVals,
      })
    );
    allItems = res.Items ?? [];
  } catch (_) {
    // Fallback to legacy activity table
    try {
      const res2 = await docClient.send(
        new ScanCommand({
          TableName: ACTIVITY_TABLE,
          FilterExpression: filterExpr,
          ExpressionAttributeValues: exprVals,
        })
      );
      allItems = res2.Items ?? [];
    } catch (__) { /* non-fatal */ }
  }

  const all = allItems.sort(
    (a: any, b: any) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "")
  );

  const unreadCount = all.filter((e: any) => !e.read).length;
  const start = (page - 1) * limit;
  const events = all.slice(start, start + limit).map((e: any) => ({
    id: e.id,
    agent: e.agent,
    repo_id: e.repoId,
    repo_name: e.repoName,
    message: e.message,
    severity: e.severity,
    timestamp: e.timestamp,
    timestamp_ago: timeAgo(e.timestamp),
  }));

  return ok({
    events,
    unread_count: unreadCount,
    total: all.length,
    page,
    per_page: limit,
  });
};
