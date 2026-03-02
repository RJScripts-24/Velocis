/**
 * getSystemHealth.ts
 * Velocis — GET /system/health
 *
 * Returns current Velocis platform system metrics.
 * Shown in the Dashboard sidebar "System" panel.
 *
 * In production these values should be sourced from CloudWatch metrics.
 * For now the handler reads from a DynamoDB health record that is updated
 * by a scheduled Lambda (or mocked for local development).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";

const dynamo        = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET    = process.env.JWT_SECRET    ?? "changeme-in-production";
const HEALTH_TABLE  = process.env.HEALTH_TABLE  ?? "velocis-system-health";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!token) return errors.unauthorized();

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return errors.unauthorized("Token is invalid or expired.");
  }

  // Attempt to read live metrics from DynamoDB; fall back to sensible defaults
  let health: Record<string, any> = {
    api_latency_ms:   38,
    queue_depth:      0,
    agent_uptime_pct: 99.9,
    storage_used_pct: 0,
    agents: [
      { name: "sentinel", status: "running", uptime_pct: 99.9 },
      { name: "fortress", status: "running", uptime_pct: 99.9 },
      { name: "cortex",   status: "running", uptime_pct: 99.9 },
    ],
  };

  try {
    const res = await dynamo.send(
      new GetCommand({ TableName: HEALTH_TABLE, Key: { id: "global" } })
    );
    if (res.Item) {
      const h = res.Item;
      health = {
        api_latency_ms:   h.apiLatencyMs   ?? health.api_latency_ms,
        queue_depth:      h.queueDepth     ?? health.queue_depth,
        agent_uptime_pct: h.agentUptimePct ?? health.agent_uptime_pct,
        storage_used_pct: h.storageUsedPct ?? health.storage_used_pct,
        agents:           h.agents        ?? health.agents,
      };
    }
  } catch (_) { /* Use defaults */ }

  return ok(health);
};
