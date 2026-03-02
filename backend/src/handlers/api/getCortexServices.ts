/**
 * getCortexServices.ts
 * Velocis — Cortex Agent Service Map Handlers
 *
 * Routes:
 *   GET /repos/:repoId/cortex/services            → All services + blast-radius
 *   GET /repos/:repoId/cortex/services/:serviceId → Single service detail
 *   GET /repos/:repoId/cortex/timeline            → Deployment / event timeline
 *
 * NOTE: This is the frontend-facing API for the 3D canvas.
 * The deep graph format (CortexGraph) used by getCortexData.ts is kept for
 * internal/advanced usage (nodeId drill-down, sub-graph queries, etc.).
 * This handler returns a simpler service-card format expected by the Cortex page.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";

const dynamo         = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET     = process.env.JWT_SECRET      ?? "changeme-in-production";
const CORTEX_TABLE   = process.env.CORTEX_TABLE    ?? "velocis-cortex";
const TIMELINE_TABLE = process.env.TIMELINE_TABLE  ?? "velocis-timeline";

async function requireAuth(h: string | undefined): Promise<string | null> {
  const t = extractBearerToken(h);
  if (!t) return null;
  try { return (jwt.verify(t, JWT_SECRET) as { sub: string }).sub; } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/cortex/services
// ─────────────────────────────────────────────────────────────────────────────

export const listServices = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let services: any[] = [];
  let blastRadiusPairs: any[] = [];
  let criticalServiceId: number | null = null;
  let lastUpdatedAt = new Date().toISOString();

  try {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: CORTEX_TABLE,
        FilterExpression: "repoId = :r AND recordType = :t",
        ExpressionAttributeValues: { ":r": repoId, ":t": "SERVICE" },
      })
    );

    const items = res.Items ?? [];
    lastUpdatedAt = items.reduce(
      (latest: string, s: any) =>
        (s.updatedAt ?? "") > latest ? s.updatedAt : latest,
      lastUpdatedAt
    );

    services = items.map((s: any) => ({
      id:          s.serviceId,
      name:        s.name,
      status:      s.status      ?? "healthy",
      layer:       s.layer       ?? "compute",
      position:    s.position    ?? { x: 0, y: 0, z: 0 },
      connections: s.connections ?? [],
      metrics: {
        p95_latency:    s.p95Latency    ?? "–",
        error_rate_pct: s.errorRatePct  ?? 0,
        sparkline:      s.sparkline     ?? [],
      },
      tests: {
        total:   s.testsTotal   ?? 0,
        passing: s.testsPassing ?? 0,
        errors:  s.testsErrors  ?? 0,
      },
      last_deployment_ago: s.lastDeployedAt ? timeAgo(s.lastDeployedAt) : "–",
    }));

    // Determine blast radius pairs and critical service
    blastRadiusPairs = items
      .filter((s: any) => s.status === "critical" && (s.connections ?? []).length > 0)
      .flatMap((s: any) =>
        (s.connections as number[]).map((targetId) => ({
          source_id: s.serviceId,
          target_id: targetId,
        }))
      );

    const critNode = items.find((s: any) => s.status === "critical");
    criticalServiceId = critNode?.serviceId ?? null;
  } catch (e: any) {
    logger.error({ repoId, msg: "listServices failed", error: e?.message });
    return errors.agentUnavailable("Cortex");
  }

  return ok({
    repo_id:            repoId,
    last_updated_ago:   timeAgo(lastUpdatedAt),
    last_updated_at:    lastUpdatedAt,
    services,
    blast_radius_pairs: blastRadiusPairs,
    critical_service_id: criticalServiceId,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/cortex/services/:serviceId
// ─────────────────────────────────────────────────────────────────────────────

export const getServiceDetail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const { repoId, serviceId } = event.pathParameters ?? {};
  if (!repoId || !serviceId) return errors.badRequest("Missing repoId or serviceId.");

  const res = await dynamo.send(
    new ScanCommand({
      TableName: CORTEX_TABLE,
      FilterExpression: "repoId = :r AND recordType = :t AND serviceId = :sid",
      ExpressionAttributeValues: {
        ":r":   repoId,
        ":t":   "SERVICE",
        ":sid": parseInt(serviceId, 10),
      },
      Limit: 1,
    })
  );

  const s = res.Items?.[0];
  if (!s) return errors.notFound(`Service '${serviceId}' not found in repo '${repoId}'.`);

  return ok({
    id:     s.serviceId,
    name:   s.name,
    status: s.status   ?? "healthy",
    layer:  s.layer    ?? "compute",
    metrics: {
      p95_latency:    s.p95Latency   ?? "–",
      error_rate_pct: s.errorRatePct ?? 0,
      sparkline:      s.sparkline    ?? [],
    },
    tests: {
      total:   s.testsTotal   ?? 0,
      passing: s.testsPassing ?? 0,
      errors:  s.testsErrors  ?? 0,
    },
    last_deployment_ago: s.lastDeployedAt ? timeAgo(s.lastDeployedAt) : "–",
    timeline_events:     s.timelineEvents ?? [],
    fortress_action:     s.fortressAction ?? null,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/cortex/timeline
// ─────────────────────────────────────────────────────────────────────────────

export const getCortexTimeline = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let events: any[] = [];
  try {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: TIMELINE_TABLE,
        FilterExpression: "repoId = :r",
        ExpressionAttributeValues: { ":r": repoId },
      })
    );
    events = (res.Items ?? [])
      .sort((a: any, b: any) => (a.positionPct ?? 0) - (b.positionPct ?? 0))
      .map((e: any) => ({
        position_pct: e.positionPct,
        label:        e.label,
        color:        e.color ?? "#6b7280",
      }));
  } catch (e: any) {
    logger.error({ repoId, msg: "getCortexTimeline failed", error: e?.message });
  }

  return ok({ events });
};
