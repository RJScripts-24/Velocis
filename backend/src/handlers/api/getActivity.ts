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
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";

const dynamo         = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET     = process.env.JWT_SECRET      ?? "changeme-in-production";
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE  ?? "velocis-activity";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!token) return errors.unauthorized();

  let userId: string;
  try {
    userId = (jwt.verify(token, JWT_SECRET) as { sub: string }).sub;
  } catch {
    return errors.unauthorized("Token is invalid or expired.");
  }

  const qs       = event.queryStringParameters ?? {};
  const agent    = qs.agent   ?? null;
  const repoIdF  = qs.repo_id ?? null;
  const limit    = Math.min(100, parseInt(qs.limit ?? "20", 10));
  const page     = Math.max(1,  parseInt(qs.page  ?? "1",  10));

  let filterExpr = "userId = :uid";
  const exprVals: Record<string, any> = { ":uid": userId };

  if (agent) {
    filterExpr      += " AND agent = :agent";
    exprVals[":agent"] = agent;
  }
  if (repoIdF) {
    filterExpr         += " AND repoId = :rid";
    exprVals[":rid"] = repoIdF;
  }

  const res = await dynamo.send(
    new ScanCommand({
      TableName: ACTIVITY_TABLE,
      FilterExpression: filterExpr,
      ExpressionAttributeValues: exprVals,
    })
  );

  const all = (res.Items ?? []).sort(
    (a: any, b: any) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "")
  );

  const unreadCount = all.filter((e: any) => !e.read).length;
  const start       = (page - 1) * limit;
  const events      = all.slice(start, start + limit).map((e: any) => ({
    id:            e.id,
    agent:         e.agent,
    repo_id:       e.repoId,
    repo_name:     e.repoName,
    message:       e.message,
    severity:      e.severity,
    timestamp:     e.timestamp,
    timestamp_ago: timeAgo(e.timestamp),
  }));

  return ok({
    events,
    unread_count: unreadCount,
    total:        all.length,
    page,
    per_page:     limit,
  });
};
