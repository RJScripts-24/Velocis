/**
 * getInfrastructureData.ts
 * Velocis — Infrastructure Page Handlers
 *
 * Routes:
 *   GET  /repos/:repoId/infrastructure              → Cost breakdown + metadata
 *   GET  /repos/:repoId/infrastructure/terraform    → Raw Terraform HCL string
 *   POST /repos/:repoId/infrastructure/generate     → Trigger fresh IaC generation
 *
 * The existing getCostForecast.ts handler exposes a rich internal format used by
 * the /repo/{repoId}/infrastructure advanced page (multi-env compare, graph data).
 * This file exposes the simplified shape that the frontend API contract expects
 * for the standard Infrastructure page.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { randomUUID, createHash } from "crypto";
import {
  ScanCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";

const JWT_SECRET   = process.env.JWT_SECRET   ?? "changeme-in-production";
const IAC_TABLE    = process.env.IAC_TABLE    ?? "velocis-iac";
const IAC_JOBS_TABLE = process.env.IAC_JOBS_TABLE ?? "velocis-iac-jobs";

type Environment = "production" | "staging" | "preview";

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";").map((c) => c.trim())) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

async function requireAuth(event: APIGatewayProxyEvent): Promise<string | null> {
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
  const t = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!t) return null;
  try { return (jwt.verify(t, JWT_SECRET) as { sub: string }).sub; } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/infrastructure
// ─────────────────────────────────────────────────────────────────────────────

export const getInfrastructure = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const env: Environment = (event.queryStringParameters?.environment as Environment) ?? "production";

  let iac: any;
  try {
    const res = await getDocClient().send(
      new GetCommand({
        TableName: IAC_TABLE,
        Key: { repoId, environment: env },
      })
    );
    iac = res.Item;
  } catch (e: any) {
    // Table may not exist yet (no IaC generated) — return empty state, not 503
    logger.warn({ repoId, env, msg: "getInfrastructure DynamoDB get failed — returning empty state", error: e?.message });
  }

  if (!iac) {
    // Return a sensible empty state — the frontend shows a "generate IaC" CTA
    return ok({
      repo_id:             repoId,
      environment:         env,
      cloud_provider:      "aws",
      region:              "ap-south-1",
      monthly_cost_usd:    0,
      cost_breakdown:      [],
      iac_generated_at:    null,
      iac_source_commit:   null,
      iac_source_branch:   null,
    });
  }

  return ok({
    repo_id:           repoId,
    environment:       env,
    cloud_provider:    iac.cloudProvider    ?? "aws",
    region:            iac.region           ?? "ap-south-1",
    monthly_cost_usd:  iac.monthlyCostUsd   ?? 0,
    cost_breakdown:    (iac.costBreakdown   ?? []).map((c: any) => ({
      service:    c.service,
      cost_usd:   c.costUsd,
      percentage: c.percentage,
      color:      c.color ?? "#6b7280",
    })),
    iac_generated_at:  iac.generatedAt      ?? null,
    iac_source_commit: iac.sourceCommit     ?? null,
    iac_source_branch: iac.sourceBranch     ?? null,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/infrastructure/terraform
// ─────────────────────────────────────────────────────────────────────────────

export const getTerraform = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const env: Environment = (event.queryStringParameters?.environment as Environment) ?? "production";

  let iac: any;
  try {
    const res = await getDocClient().send(
      new GetCommand({
        TableName: IAC_TABLE,
        Key: { repoId, environment: env },
      })
    );
    iac = res.Item;
  } catch (e: any) {
    logger.warn({ repoId, env, msg: "getTerraform DynamoDB get failed", error: e?.message });
  }

  if (!iac || !iac.terraformCode) {
    return errors.notFound(
      `Terraform code not yet generated for '${repoId}' (${env}). Trigger a generation first.`
    );
  }

  return ok({
    environment:    env,
    generated_at:   iac.generatedAt   ?? null,
    source_commit:  iac.sourceCommit  ?? null,
    terraform_code: iac.terraformCode,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/infrastructure/generate
// ─────────────────────────────────────────────────────────────────────────────

export const generateInfrastructure = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let body: any = {};
  try {
    if (event.body) body = JSON.parse(event.body);
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }

  const env    = (body.environment ?? "production") as Environment;
  const branch = body.branch ?? "main";
  const jobId  = `job_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)}`;
  const now    = new Date().toISOString();

  try {
    await getDocClient().send(
      new PutCommand({
        TableName: IAC_JOBS_TABLE,
        Item: {
          jobId,
          repoId,
          userId,
          environment: env,
          branch,
          status:      "queued",
          createdAt:   now,
        },
      })
    );
  } catch (e: any) {
    logger.error({ repoId, msg: "generateInfrastructure DynamoDB put failed", error: e?.message });
    return errors.agentUnavailable("Infrastructure");
  }

  logger.info({ jobId, repoId, env, userId, msg: "IaC generation queued" });

  return ok(
    {
      job_id:  jobId,
      status:  "queued",
      message: `IaC generation queued for ${repoId}/${env}`,
    },
    202
  );
};
