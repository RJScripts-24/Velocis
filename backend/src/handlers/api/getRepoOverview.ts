/**
 * getRepoOverview.ts
 * Velocis — GET /repos/:repoId
 *
 * Returns full detail for a single installed repository:
 * health status, metrics, per-agent summaries, and risk counts.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";

const dynamo      = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET  = process.env.JWT_SECRET  ?? "changeme-in-production";
const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";
const REPOS_TABLE = process.env.REPOS_TABLE ?? "velocis-repos";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const token = extractBearerToken(
    event.headers?.Authorization ?? event.headers?.authorization
  );
  if (!token) return errors.unauthorized();

  let userId: string;
  try {
    const { sub } = jwt.verify(token, JWT_SECRET) as { sub: string };
    userId = sub;
  } catch {
    return errors.unauthorized("Token is invalid or expired.");
  }

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId path parameter.");

  // ── Look up repo record (index by slug) ──────────────────────────────────
  const scan = await dynamo.send(
    new ScanCommand({
      TableName: REPOS_TABLE,
      FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
      ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
      Limit: 1,
    })
  );

  const repo = scan.Items?.[0];
  if (!repo) return errors.repoNotFound(repoId);

  const lastScannedAt = repo.lastScannedAt ?? new Date().toISOString();

  logger.info({ userId, repoId, msg: "GET /repos/:repoId" });

  return ok({
    id:               repo.repoSlug ?? repoId,
    name:             repo.repoName ?? repoId,
    status:           repo.status   ?? "healthy",
    status_label:     repo.statusLabel    ?? "System Healthy",
    visibility:       repo.visibility     ?? "private",
    language:         repo.language       ?? null,
    last_scanned_ago: timeAgo(lastScannedAt),
    last_scanned_at:  lastScannedAt,
    size_loc:         repo.sizeLoc        ?? "–",
    metrics: {
      risk_score:           repo.riskScore           ?? "Low",
      test_stability_pct:   repo.testStabilityPct    ?? 100,
      architecture_drift:   repo.architectureDrift   ?? "None detected",
      last_action_ago:      timeAgo(repo.lastActionAt ?? lastScannedAt),
    },
    sentinel: {
      active_prs:       repo.sentinelActivePrs   ?? 0,
      last_update_ago:  timeAgo(repo.sentinelLastUpdated ?? lastScannedAt),
    },
    fortress: {
      status_message: repo.fortressStatusMessage ?? "Pipeline idle",
      last_run_ago:   timeAgo(repo.fortressLastRun ?? lastScannedAt),
    },
    cortex: {
      last_update_ago: timeAgo(repo.cortexLastUpdated ?? lastScannedAt),
      service_count:   repo.cortexServiceCount ?? 0,
    },
    risks: {
      critical: repo.risksCritical ?? 0,
      medium:   repo.risksMedium   ?? 0,
      low:      repo.risksLow      ?? 0,
    },
  });
};
