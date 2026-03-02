/**
 * getPipelineData.ts
 * Velocis — Fortress Agent / Pipeline Handlers
 *
 * Routes:
 *   GET  /repos/:repoId/pipeline                 → Current live pipeline state
 *   GET  /repos/:repoId/pipeline/runs            → Historical pipeline runs
 *   POST /repos/:repoId/pipeline/trigger         → Manually trigger a run
 *   GET  /repos/:repoId/pipeline/runs/:runId     → Single run detail
 *
 * Data sourced from DynamoDB (written by executeTests.ts / selfHeal.ts).
 * The pipeline page polls GET /pipeline every ~2 s when autoRefresh is on,
 * so this handler is optimised for low latency.
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

const dynamo         = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET     = process.env.JWT_SECRET      ?? "changeme-in-production";
const PIPELINE_TABLE = process.env.PIPELINE_TABLE  ?? "velocis-pipeline-runs";

// ── Auth helper ──────────────────────────────────────────────────────────────
async function requireAuth(authHeader: string | undefined): Promise<string | null> {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  try {
    return (jwt.verify(token, JWT_SECRET) as { sub: string }).sub;
  } catch {
    return null;
  }
}

// Standard pipeline step template (mirrors the API contract)
const PIPELINE_STEP_DEFS = [
  { id: "push",   label: "Code Pushed",           icon: "Code",        description: "Commit detected from branch" },
  { id: "llama",  label: "Llama 3 Writes Test",   icon: "Cpu",         description: "AI-generated test case based on code changes" },
  { id: "test",   label: "Test Execution",         icon: "TestTube2",   description: "Running test suite against new code" },
  { id: "claude", label: "Claude Analyzes Error",  icon: "FileSearch",  description: "Analyzing failure patterns and root cause" },
  { id: "fix",    label: "Auto Code Fix",          icon: "Wrench",      description: "Generating automated fix based on analysis" },
  { id: "rerun",  label: "Test Re-run",            icon: "RotateCcw",   description: "Validating fix with test suite" },
  { id: "pass",   label: "Test Pass",              icon: "CheckCircle", description: "Self-healing loop completed successfully" },
];

function hydrateSteps(stepStates: Record<string, any> = {}) {
  return PIPELINE_STEP_DEFS.map((def) => ({
    ...def,
    state:       stepStates[def.id]?.state       ?? "idle",
    duration_s:  stepStates[def.id]?.duration_s  ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/pipeline
// ─────────────────────────────────────────────────────────────────────────────

export const getPipeline = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  // Return the most recent (or currently running) pipeline run
  const res = await dynamo.send(
    new ScanCommand({
      TableName: PIPELINE_TABLE,
      FilterExpression: "repoId = :r",
      ExpressionAttributeValues: { ":r": repoId },
    })
  );

  const items = (res.Items ?? []).sort(
    (a: any, b: any) => (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
  );

  const run = items[0];
  if (!run) {
    // Return an idle pipeline if no runs yet
    return ok({
      repo_id:    repoId,
      run_id:     null,
      trigger:    null,
      branch:     "main",
      commit_sha: null,
      status:     "idle",
      started_at: null,
      steps:      hydrateSteps(),
    });
  }

  return ok({
    repo_id:    repoId,
    run_id:     run.runId,
    trigger:    run.trigger    ?? "push",
    branch:     run.branch     ?? "main",
    commit_sha: run.commitSha  ?? null,
    status:     run.status     ?? "queued",
    started_at: run.startedAt  ?? null,
    steps:      hydrateSteps(run.stepStates ?? {}),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/pipeline/runs
// ─────────────────────────────────────────────────────────────────────────────

export const getPipelineRuns = async (
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

  const res = await dynamo.send(
    new ScanCommand({
      TableName: PIPELINE_TABLE,
      FilterExpression: "repoId = :r",
      ExpressionAttributeValues: { ":r": repoId },
    })
  );

  const all = (res.Items ?? []).sort(
    (a: any, b: any) => (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
  );

  const start = (page - 1) * limit;
  const runs  = all.slice(start, start + limit).map((r: any) => ({
    run_id:        r.runId,
    status:        r.status      ?? "queued",
    branch:        r.branch      ?? "main",
    commit_sha:    r.commitSha   ?? null,
    started_at:    r.startedAt,
    duration_s:    r.durationS   ?? null,
    timestamp_ago: timeAgo(r.startedAt ?? new Date().toISOString()),
  }));

  return ok({ runs, total: all.length });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/pipeline/trigger
// ─────────────────────────────────────────────────────────────────────────────

export const triggerPipeline = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let body: any = {};
  try {
    if (event.body) body = JSON.parse(event.body);
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }

  const branch = body.branch ?? "main";
  const runId  = `run_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 8)}`;
  const now    = new Date().toISOString();

  await dynamo.send(
    new PutCommand({
      TableName: PIPELINE_TABLE,
      Item: {
        runId,
        repoId,
        userId,
        branch,
        trigger:    "manual",
        status:     "queued",
        startedAt:  now,
        stepStates: {},
      },
    })
  );

  logger.info({ runId, repoId, branch, userId, msg: "Pipeline triggered" });

  return ok({ run_id: runId, status: "queued" }, 202);
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/pipeline/runs/:runId
// ─────────────────────────────────────────────────────────────────────────────

export const getPipelineRunDetail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(event.headers?.Authorization ?? event.headers?.authorization);
  if (!userId) return errors.unauthorized();

  const { repoId, runId } = event.pathParameters ?? {};
  if (!repoId || !runId) return errors.badRequest("Missing repoId or runId.");

  const res = await dynamo.send(
    new GetCommand({ TableName: PIPELINE_TABLE, Key: { runId } })
  );

  const run = res.Item;
  if (!run || run.repoId !== repoId) {
    return errors.notFound(`Pipeline run '${runId}' not found.`);
  }

  return ok({
    run_id:      run.runId,
    status:      run.status,
    branch:      run.branch      ?? "main",
    commit_sha:  run.commitSha   ?? null,
    started_at:  run.startedAt,
    finished_at: run.finishedAt  ?? null,
    duration_s:  run.durationS   ?? null,
    steps:       hydrateSteps(run.stepStates ?? {}),
    test_results: {
      total:         run.testTotal       ?? 0,
      passed:        run.testPassed      ?? 0,
      failed:        run.testFailed      ?? 0,
      flaky:         run.testFlaky       ?? 0,
      stability_pct: run.testStabilityPct ?? 100,
    },
    fixes_applied: run.fixesApplied ?? 0,
    logs_url:      run.logsUrl      ?? null,
  });
};
