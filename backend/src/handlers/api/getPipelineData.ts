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
 * Data sourced from DynamoDB (written by analyzeFortress.ts / Fortress engine).
 * The pipeline page polls GET /pipeline every ~2 s when autoRefresh is on,
 * so this handler is optimised for low latency.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { randomUUID, createHash } from "crypto";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { logActivity } from "../../utils/activityLogger";
import { generateQATestPlan, generateApiDocs } from "../../functions/fortress/analyzeFortress";
import { repoOps, getInstallationToken, fetchFileContent } from "../../services/github/repoOps";
import { getUserToken } from "../../services/github/auth";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";
const PIPELINE_TABLE = process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs";
const REPOS_TABLE = config.DYNAMO_REPOSITORIES_TABLE;
const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";

// ── Cookie parser (mirrors authGithubCallback.ts) ────────────────────────────
function parseCookieValue(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k?.trim() === name) return v.join("=").trim() || null;
  }
  return null;
}

// ── Auth helper — accepts Bearer JWT *or* velocis_session cookie ─────────────
async function requireAuth(
  authHeader: string | undefined,
  cookieHeader: string = ""
): Promise<string | null> {
  // 1. Try Bearer JWT first (legacy / direct API access)
  const token = extractBearerToken(authHeader);
  if (token) {
    try {
      return (jwt.verify(token, JWT_SECRET) as { sub: string }).sub;
    } catch {
      return null; // bad token → reject immediately, don't fall through to cookie
    }
  }

  // 2. Fall back to session cookie (set by GitHub OAuth callback)
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");
  if (!sessionToken) return null;

  const sessionHash = createHash("sha256").update(sessionToken).digest("hex");
  try {
    const res = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId: `session_${sessionHash}` } })
    );
    const rec = res.Item;
    if (!rec) return null;
    if (new Date(rec.expiresAt) < new Date()) return null;
    // Return githubId as the userId — matches userId written by Fortress pipeline etc.
    return rec.githubId ?? rec.userLogin ?? `session_${sessionHash}`;
  } catch {
    return null;
  }
}

// Standard pipeline step template (mirrors the API contract)
const PIPELINE_STEP_DEFS = [
  { id: "push", label: "Code Pushed", icon: "Code", description: "GitHub push webhook received — resolving repo and fetching source files" },
  { id: "qa_plan", label: "QA Strategist", icon: "Target", description: "Nova Pro generating BDD test scenarios (Given / When / Then)" },
  { id: "api_docs", label: "API Documenter", icon: "FileSearch", description: "Nova Pro producing README-ready API documentation" },
  { id: "complete", label: "Results Stored", icon: "CheckCircle", description: "QA plan & API docs written to DynamoDB — analysis complete" },
];

function hydrateSteps(stepStates: Record<string, any> = {}) {
  return PIPELINE_STEP_DEFS.map((def) => {
    const s = stepStates[def.id];
    // Separate presentation fields from rich stepData payload
    const { state: _s, duration_s: _d, ...extra } = s ?? {};
    return {
      ...def,
      state: s?.state ?? "idle",
      duration_s: s?.duration_s ?? null,
      stepData: Object.keys(extra).length > 0 ? extra : undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/pipeline
// ─────────────────────────────────────────────────────────────────────────────

export const getPipeline = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(
    event.headers?.Authorization ?? event.headers?.authorization,
    event.headers?.cookie ?? event.headers?.Cookie ?? ""
  );
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const idleResponse = {
    repo_id: repoId,
    run_id: null,
    trigger: null,
    branch: "main",
    commit_sha: null,
    status: "idle",
    started_at: null,
    steps: hydrateSteps(),
  };

  let res;
  try {
    res = await dynamo.send(
      new ScanCommand({
        TableName: PIPELINE_TABLE,
        FilterExpression: "repoId = :r",
        ExpressionAttributeValues: { ":r": repoId },
      })
    );
  } catch (err: any) {
    logger.warn({ repoId, err: err?.message, msg: "getPipeline: DynamoDB unavailable — returning idle" });
    return ok(idleResponse);
  }

  const items = (res.Items ?? []).sort(
    (a: any, b: any) => (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
  );

  const run = items[0];
  if (!run) {
    // Return an idle pipeline if no runs yet
    return ok(idleResponse);
  }

  return ok({
    repo_id: repoId,
    run_id: run.runId,
    trigger: run.trigger ?? "push",
    branch: run.branch ?? "main",
    commit_sha: run.commitSha ?? null,
    status: run.status ?? "queued",
    started_at: run.startedAt ?? null,
    steps: hydrateSteps(run.stepStates ?? {}),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/pipeline/runs
// ─────────────────────────────────────────────────────────────────────────────

export const getPipelineRuns = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(
    event.headers?.Authorization ?? event.headers?.authorization,
    event.headers?.cookie ?? event.headers?.Cookie ?? ""
  );
  if (!userId) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const qs = event.queryStringParameters ?? {};
  const limit = Math.min(100, parseInt(qs.limit ?? "20", 10));
  const page = Math.max(1, parseInt(qs.page ?? "1", 10));

  let scanRes;
  try {
    scanRes = await dynamo.send(
      new ScanCommand({
        TableName: PIPELINE_TABLE,
        FilterExpression: "repoId = :r",
        ExpressionAttributeValues: { ":r": repoId },
      })
    );
  } catch (err: any) {
    logger.warn({ repoId, err: err?.message, msg: "getPipelineRuns: DynamoDB unavailable — returning empty" });
    return ok({ runs: [], total: 0 });
  }

  const all = (scanRes.Items ?? []).sort(
    (a: any, b: any) => (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
  );

  const start = (page - 1) * limit;
  const runs = all.slice(start, start + limit).map((r: any) => ({
    run_id: r.runId,
    status: r.status ?? "queued",
    branch: r.branch ?? "main",
    commit_sha: r.commitSha ?? null,
    started_at: r.startedAt,
    duration_s: r.durationS ?? null,
    timestamp_ago: timeAgo(r.startedAt ?? new Date().toISOString()),
  }));

  return ok({ runs, total: all.length });
};

// ─────────────────────────────────────────────────────────────────────────────
// FORTRESS PIPELINE — background executor (QA Strategist + API Documenter)
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSABLE_EXTS = [".ts", ".tsx", ".js", ".jsx"];
const SKIP_PATTERNS = [
  ".test.", ".spec.", ".d.ts", "/mocks/", "/types/", "/interfaces/",
  "index.ts", "config.ts", "logger.ts", ".config.", "tsconfig",
  "/config/", "constants.", "/seeds/", "/migrations/",
];

async function executeFortressPipeline(args: {
  runId: string;
  repoId: string;
  branch: string;
  userId: string;
}): Promise<void> {
  const { runId, repoId, branch, userId } = args;
  const runStart = Date.now();

  /** Helper — write a single step state into DynamoDB */
  const setStep = async (stepId: string, state: string, duration_s?: number, extra?: Record<string, unknown>) => {
    await dynamo.send(
      new UpdateCommand({
        TableName: PIPELINE_TABLE,
        Key: { runId },
        UpdateExpression: "SET stepStates.#s = :v",
        ExpressionAttributeNames: { "#s": stepId },
        ExpressionAttributeValues: {
          ":v": {
            state,
            ...(duration_s != null ? { duration_s } : {}),
            ...(extra ?? {}),
          },
        },
      })
    );
  };

  /** Helper — write the final run status */
  const finishRun = async (status: "success" | "failed") => {
    await dynamo.send(
      new UpdateCommand({
        TableName: PIPELINE_TABLE,
        Key: { runId },
        UpdateExpression: "SET #status = :s, finishedAt = :f, durationS = :d",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":s": status,
          ":f": new Date().toISOString(),
          ":d": Math.round((Date.now() - runStart) / 1000),
        },
      })
    );
  };

  try {
    // ── Step: push — resolve repo record ────────────────────────────────────
    await setStep("push", "running");

    const repoRes = await dynamo.send(
      new ScanCommand({
        TableName: REPOS_TABLE,
        // Match on repoSlug ("maskme") OR repoId ("MaskMe" / numeric GitHub ID)
        FilterExpression: "repoSlug = :r OR repoId = :r",
        ExpressionAttributeValues: { ":r": repoId },
      })
    );

    // If slug didn't match, also try case-insensitive repoId match
    let repoRecord = repoRes.Items?.[0];
    if (!repoRecord) {
      const fallbackRes = await dynamo.send(
        new ScanCommand({
          TableName: REPOS_TABLE,
          FilterExpression: "contains(repoSlug, :r) OR contains(repoId, :r)",
          ExpressionAttributeValues: { ":r": repoId.toLowerCase() },
        })
      );
      repoRecord = fallbackRes.Items?.[0];
    }
    if (!repoRecord) {
      logger.error({ runId, repoId, msg: "Repo record not found in DynamoDB" });
      await setStep("push", "failed");
      await finishRun("failed");
      return;
    }

    const installationId: number | undefined = repoRecord.installationId
      ? Number(repoRecord.installationId)
      : undefined;

    // Derive repoName: prefer explicit field, fall back to repoId slug
    const repoName: string = repoRecord.repoName ?? repoRecord.repoId ?? repoId;

    // Derive repoOwner: check record fields first, then look up user's GitHub login
    let repoOwner: string = "";
    const rawFull: string = repoRecord.repoFullName ?? repoRecord.fullName ?? "";
    if (rawFull.includes("/")) {
      repoOwner = rawFull.split("/")[0];
    } else if (repoRecord.repoOwner) {
      repoOwner = repoRecord.repoOwner;
    } else {
      // installRepo records don't store repoOwner — look up the user's GitHub username
      const userRes = await dynamo.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
      );
      repoOwner = userRes.Item?.username ?? userRes.Item?.githubLogin ?? userRes.Item?.displayName ?? "";
    }

    const fullName = repoOwner ? `${repoOwner}/${repoName}` : repoName;

    if (!repoOwner || !repoName) {
      logger.error({ runId, fullName, msg: "Cannot determine repoOwner/repoName" });
      await setStep("push", "failed");
      await finishRun("failed");
      return;
    }

    // Use installation token if available, otherwise fall back to user's OAuth token
    let installationToken: string;
    if (installationId) {
      installationToken = await getInstallationToken(installationId);
    } else {
      installationToken = await getUserToken(userId).catch(() => "");
      if (!installationToken) {
        logger.error({ runId, repoId, msg: "No installation token and no user OAuth token available" });
        await setStep("push", "failed");
        await finishRun("failed");
        return;
      }
    }

    // Fetch the full file tree for the repo
    const tree = await repoOps.fetchRepoTree({
      repoFullName: fullName,
      token: installationToken,
      ref: branch,
      recursive: true,
    });

    // Pick analysable source files — skip tests, configs, typings
    const sourceFiles = tree
      .filter(
        (f: any) =>
          f.type === "blob" &&
          ANALYSABLE_EXTS.some((e) => (f.path as string).endsWith(e)) &&
          !SKIP_PATTERNS.some((p) => (f.path as string).includes(p))
      )
      .map((f: any) => f.path as string)
      .slice(0, 10);

    if (sourceFiles.length === 0) {
      logger.warn({ runId, fullName, msg: "No testable source files found" });
      await setStep("push", "failed");
      await finishRun("failed");
      return;
    }

    const firstFile = sourceFiles[0];

    await setStep("push", "success", Math.round((Date.now() - runStart) / 1000), {
      filePath: firstFile,
      repoName,
      repoOwner,
      sourceFileCount: sourceFiles.length,
      allSourceFiles: sourceFiles,
    });

    // Fetch the raw content of the primary source file to analyse
    let fileContent = "";
    try {
      fileContent = await fetchFileContent(repoOwner, repoName, firstFile, installationToken, branch);
    } catch (fetchErr) {
      logger.warn({ runId, firstFile, fetchErr, msg: "Fortress: could not fetch file content — using placeholder" });
      fileContent = `// Source file: ${firstFile}\n// (content unavailable)`;
    }

    // ── Step: qa_plan — Nova Pro generates BDD test scenarios ─────────────────
    const qaStart = Date.now();
    await setStep("qa_plan", "running");

    let qaPlan = "";
    try {
      qaPlan = await generateQATestPlan(fileContent);
      await setStep("qa_plan", "success", Math.round((Date.now() - qaStart) / 1000), {
        filePath: firstFile,
        model: "amazon.nova-pro-v1:0",
        outputLength: qaPlan.length,
        qaTestPlan: qaPlan.slice(0, 4000),
      });
    } catch (qaErr) {
      logger.error({ runId, qaErr, msg: "Fortress: qa_plan step failed" });
      await setStep("qa_plan", "failed", Math.round((Date.now() - qaStart) / 1000));
      await finishRun("failed");
      return;
    }

    // ── Step: api_docs — Nova Pro generates API documentation ─────────────────
    const docsStart = Date.now();
    await setStep("api_docs", "running");

    let apiDocs = "";
    try {
      apiDocs = await generateApiDocs(fileContent);
      await setStep("api_docs", "success", Math.round((Date.now() - docsStart) / 1000), {
        filePath: firstFile,
        model: "amazon.nova-pro-v1:0",
        outputLength: apiDocs.length,
        apiDocs: apiDocs.slice(0, 4000),
      });
    } catch (docsErr) {
      logger.error({ runId, docsErr, msg: "Fortress: api_docs step failed" });
      await setStep("api_docs", "failed", Math.round((Date.now() - docsStart) / 1000));
      await finishRun("failed");
      return;
    }

    // ── Step: complete — persist results ──────────────────────────────────────
    await setStep("complete", "success", Math.round((Date.now() - runStart) / 1000), {
      filePath: firstFile,
      qaTestPlanStored: true,
      apiDocsStored: true,
    });

    await finishRun("success");
    logger.info({ runId, repoId, filePath: firstFile, msg: "Fortress analysis complete — QA plan + API docs ready" });
  } catch (err) {
    logger.error({ runId, repoId, err, msg: "executeFortressPipeline threw an error" });
    await finishRun("failed").catch(() => { });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/pipeline/trigger
// ─────────────────────────────────────────────────────────────────────────────

export const triggerPipeline = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(
    event.headers?.Authorization ?? event.headers?.authorization,
    event.headers?.cookie ?? event.headers?.Cookie ?? ""
  );
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
  const runId = `run_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 8)}`;
  const now = new Date().toISOString();

  // Persist the run record synchronously so the frontend can start polling
  try {
    await dynamo.send(
      new PutCommand({
        TableName: PIPELINE_TABLE,
        Item: {
          runId,
          repoId,
          userId,
          branch,
          trigger: "manual",
          status: "running",
          startedAt: now,
          stepStates: {},
        },
      })
    );
  } catch (err: any) {
    logger.error({ runId, repoId, err: err?.message, msg: "triggerPipeline: DynamoDB PutCommand failed" });
    return errors.internal("Pipeline table unavailable — please try again in a moment.");
  }

  // Fire-and-forget: execute the real Fortress chain in the background
  executeFortressPipeline({ runId, repoId, branch, userId }).catch((e) =>
    logger.error({ runId, e, msg: "Background executeFortressPipeline error" })
  );

  logger.info({ runId, repoId, branch, userId, msg: "Pipeline triggered — Fortress chain started" });

  // Log activity for the dashboard
  logActivity({
    userId,
    repoId,
    agent: "fortress",
    message: `Fortress QA pipeline triggered on branch ${branch}`,
    severity: "info",
  });

  return ok({ run_id: runId, status: "running" }, 202);
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/pipeline/runs/:runId
// ─────────────────────────────────────────────────────────────────────────────

export const getPipelineRunDetail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const userId = await requireAuth(
    event.headers?.Authorization ?? event.headers?.authorization,
    event.headers?.cookie ?? event.headers?.Cookie ?? ""
  );
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
    run_id: run.runId,
    status: run.status,
    branch: run.branch ?? "main",
    commit_sha: run.commitSha ?? null,
    started_at: run.startedAt,
    finished_at: run.finishedAt ?? null,
    duration_s: run.durationS ?? null,
    steps: hydrateSteps(run.stepStates ?? {}),
    test_results: {
      total: run.testTotal ?? 0,
      passed: run.testPassed ?? 0,
      failed: run.testFailed ?? 0,
      flaky: run.testFlaky ?? 0,
      stability_pct: run.testStabilityPct ?? 100,
    },
    fixes_applied: run.fixesApplied ?? 0,
    logs_url: run.logsUrl ?? null,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fortress/qa-plan
// Fortress QA Strategist — generates a BDD test plan from code using DeepSeek
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/fortress/qa-plan
 *
 * Reads the actual source files from the GitHub repository, then invokes
 * DeepSeek V3 via Bedrock to produce a per-file BDD test plan in Markdown.
 *
 * Body: { repoId: string, branch?: string }
 * Response 200: { status: "success", qaPlanMarkdown: string, filesAnalyzed: string[] }
 */
export const postQAPlan = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  // ── Auth ────────────────────────────────────────────────────────────────
  const userId = await requireAuth(
    event.headers?.Authorization ?? event.headers?.authorization,
    event.headers?.cookie ?? event.headers?.Cookie ?? ""
  );
  if (!userId) return errors.unauthorized();

  // ── Parse body ────────────────────────────────────────────────────────────
  let repoId: string;
  let branch = "HEAD";
  try {
    const body = JSON.parse(event.body ?? "{}");
    repoId = body.repoId;
    if (body.branch && typeof body.branch === "string") branch = body.branch;
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }

  if (!repoId || typeof repoId !== "string" || repoId.trim() === "") {
    return errors.badRequest("repoId is required.");
  }

  // ── Resolve repo record from DynamoDB ─────────────────────────────────────
  let repoRecord: any;
  try {
    const scanRes = await dynamo.send(
      new ScanCommand({
        TableName: REPOS_TABLE,
        FilterExpression: "repoSlug = :r OR repoId = :r",
        ExpressionAttributeValues: { ":r": repoId },
      })
    );
    repoRecord = scanRes.Items?.[0];
    if (!repoRecord) {
      const fallback = await dynamo.send(
        new ScanCommand({
          TableName: REPOS_TABLE,
          FilterExpression: "contains(repoSlug, :r) OR contains(repoId, :r)",
          ExpressionAttributeValues: { ":r": repoId.toLowerCase() },
        })
      );
      repoRecord = fallback.Items?.[0];
    }
  } catch (err: any) {
    logger.error({ error: err?.message }, "[Fortress] postQAPlan — DynamoDB lookup failed");
    return errors.internal("Could not look up repository. Please try again.");
  }

  if (!repoRecord) {
    return errors.notFound(`Repository '${repoId}' is not registered with Velocis. Install it first.`);
  }

  // ── Resolve repo name + owner ─────────────────────────────────────────────
  const repoName: string = repoRecord.repoName ?? repoRecord.repoId ?? repoId;
  let repoOwner = "";
  const rawFull: string = repoRecord.repoFullName ?? repoRecord.fullName ?? "";
  if (rawFull.includes("/")) {
    repoOwner = rawFull.split("/")[0];
  } else if (repoRecord.repoOwner) {
    repoOwner = repoRecord.repoOwner;
  } else {
    const userRes = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );
    repoOwner = userRes.Item?.username ?? userRes.Item?.githubLogin ?? userRes.Item?.displayName ?? "";
  }

  if (!repoOwner) {
    return errors.badRequest("Cannot determine repository owner. Reconnect your GitHub account.");
  }

  const fullName = `${repoOwner}/${repoName}`;

  // ── Resolve GitHub token ──────────────────────────────────────────────────
  let token: string;
  const installationId: number | undefined = repoRecord.installationId
    ? Number(repoRecord.installationId)
    : undefined;

  if (installationId) {
    try {
      token = await getInstallationToken(installationId);
    } catch {
      token = await getUserToken(userId).catch(() => "");
    }
  } else {
    token = await getUserToken(userId).catch(() => "");
  }

  if (!token) {
    return errors.internal("No GitHub access token available. Re-connect your GitHub account.");
  }

  // ── Fetch repo file tree ──────────────────────────────────────────────────
  let sourceFilePaths: string[];
  try {
    const tree = await repoOps.fetchRepoTree({
      repoFullName: fullName,
      token,
      ref: branch,
      recursive: true,
    });
    sourceFilePaths = tree
      .filter(
        (f: any) =>
          f.type === "blob" &&
          ANALYSABLE_EXTS.some((e) => (f.path as string).endsWith(e)) &&
          !SKIP_PATTERNS.some((p) => (f.path as string).includes(p))
      )
      .map((f: any) => f.path as string)
      .slice(0, 8); // cap at 8 files to stay within token budget
  } catch (err: any) {
    logger.error({ fullName, error: err?.message }, "[Fortress] postQAPlan — fetchRepoTree failed");
    return errors.internal(`Could not fetch repository file tree: ${err?.message ?? "GitHub API error"}`);
  }

  if (sourceFilePaths.length === 0) {
    return errors.badRequest("No analyzable source files found (.ts/.tsx/.js/.jsx).");
  }

  // ── Fetch file contents in parallel ──────────────────────────────────────
  let fileBodies: Record<string, string> = {};
  try {
    const result = await repoOps.fetchFileContents({
      repoFullName: fullName,
      filePaths: sourceFilePaths,
      token,
      ...(branch !== "HEAD" && { ref: branch }),
    });
    fileBodies = Object.fromEntries(
      Object.entries(result.files).map(([p, fc]) => [p, (fc as any).content as string])
    );
    if (result.failedPaths.length > 0) {
      logger.warn({ failedPaths: result.failedPaths }, "[Fortress] postQAPlan — failed to read some files");
    }
  } catch (err: any) {
    logger.error({ error: err?.message }, "[Fortress] postQAPlan — fetchFileContents failed");
    return errors.internal("Could not read source files from GitHub.");
  }

  const fetchedPaths = sourceFilePaths.filter((p) => fileBodies[p]);
  if (fetchedPaths.length === 0) {
    return errors.internal("All file reads failed. Verify the GitHub App has repository read access.");
  }

  // ── Build structured per-file prompt ─────────────────────────────────────
  const fileBlocks = fetchedPaths
    .map((p, i) => `=== FILE [${i + 1}/${fetchedPaths.length}]: ${p} ===\n${fileBodies[p]}`)
    .join("\n\n");

  const prompt = [
    `Repository: ${fullName}`,
    `Branch: ${branch === "HEAD" ? "default" : branch}`,
    `Files analyzed: ${fetchedPaths.length}`,
    "",
    fileBlocks,
  ].join("\n");

  // ── Invoke DeepSeek V3 via Bedrock ────────────────────────────────────────
  try {
    const qaPlanMarkdown = await generateQATestPlan(prompt);
    // Log activity for the dashboard
    logActivity({
      userId,
      repoId,
      repoName,
      agent: "fortress",
      message: `QA test plan generated for ${fetchedPaths.length} files`,
      severity: "info",
    });

    logger.info("[Fortress] postQAPlan — plan generated", {
      fullName,
      fileCount: fetchedPaths.length,
      outputLength: qaPlanMarkdown.length,
    });
    return ok({ status: "success", qaPlanMarkdown, filesAnalyzed: fetchedPaths });
  } catch (err: any) {
    logger.error({ error: err?.message }, "[Fortress] postQAPlan — Bedrock call failed");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "error",
        message: err?.message ?? "Internal server error — Bedrock invocation failed.",
      }),
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fortress/api-docs
// Fortress API Documenter — generates Markdown API docs from raw source code
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/fortress/api-docs
 *
 * Accepts raw backend source code, passes it to DeepSeek V3 via Bedrock, and
 * returns comprehensive API documentation formatted in Markdown with an
 * optional Swagger/OpenAPI JSON block.
 *
 * Body:     { codeContent: string }
 * Response: { status: "success", apiDocsMarkdown: string }
 */
export const postApiDocs = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await requireAuth(
    event.headers?.Authorization ?? event.headers?.authorization,
    event.headers?.cookie ?? event.headers?.Cookie ?? ""
  );
  if (!userId) return errors.unauthorized();

  // ── Parse body ────────────────────────────────────────────────────────────
  let codeContent: string | undefined;
  let repoId: string | undefined;
  let branch = "HEAD";
  try {
    const body = JSON.parse(event.body ?? "{}");
    codeContent = body.codeContent;
    repoId = body.repoId;
    if (body.branch && typeof body.branch === "string") branch = body.branch;
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }

  // ── If repoId provided, fetch source files from GitHub ───────────────────
  if (!codeContent && repoId) {
    // Resolve repo record from DynamoDB
    let repoRecord: any;
    try {
      const scanRes = await dynamo.send(
        new ScanCommand({
          TableName: REPOS_TABLE,
          FilterExpression: "repoSlug = :r OR repoId = :r",
          ExpressionAttributeValues: { ":r": repoId },
        })
      );
      repoRecord = scanRes.Items?.[0];
      if (!repoRecord) {
        const fallback = await dynamo.send(
          new ScanCommand({
            TableName: REPOS_TABLE,
            FilterExpression: "contains(repoSlug, :r) OR contains(repoId, :r)",
            ExpressionAttributeValues: { ":r": repoId.toLowerCase() },
          })
        );
        repoRecord = fallback.Items?.[0];
      }
    } catch (err: any) {
      logger.error({ error: err?.message }, "[Fortress] postApiDocs — DynamoDB lookup failed");
      return errors.internal("Could not look up repository. Please try again.");
    }

    if (!repoRecord) {
      return errors.notFound(`Repository '${repoId}' is not registered with Velocis. Install it first.`);
    }

    const repoName: string = repoRecord.repoName ?? repoRecord.repoId ?? repoId;
    let repoOwner = "";
    const rawFull: string = repoRecord.repoFullName ?? repoRecord.fullName ?? "";
    if (rawFull.includes("/")) {
      repoOwner = rawFull.split("/")[0];
    } else if (repoRecord.repoOwner) {
      repoOwner = repoRecord.repoOwner;
    } else {
      const userRes = await dynamo.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
      repoOwner = userRes.Item?.username ?? userRes.Item?.githubLogin ?? userRes.Item?.displayName ?? "";
    }

    if (!repoOwner) {
      return errors.badRequest("Cannot determine repository owner. Reconnect your GitHub account.");
    }

    const fullName = `${repoOwner}/${repoName}`;
    let token: string;
    const installationId = repoRecord.installationId ? Number(repoRecord.installationId) : undefined;
    if (installationId) {
      try { token = await getInstallationToken(installationId); }
      catch { token = await getUserToken(userId).catch(() => ""); }
    } else {
      token = await getUserToken(userId).catch(() => "");
    }
    if (!token) return errors.internal("No GitHub access token available. Re-connect your GitHub account.");

    try {
      const tree = await repoOps.fetchRepoTree({ repoFullName: fullName, token, ref: branch, recursive: true });
      const sourceFilePaths = tree
        .filter((f: any) =>
          f.type === "blob" &&
          ANALYSABLE_EXTS.some((e) => (f.path as string).endsWith(e)) &&
          !SKIP_PATTERNS.some((p) => (f.path as string).includes(p))
        )
        .map((f: any) => f.path as string)
        .slice(0, 8);

      if (sourceFilePaths.length === 0) {
        return errors.badRequest("No analyzable source files found (.ts/.tsx/.js/.jsx).");
      }

      const result = await repoOps.fetchFileContents({ repoFullName: fullName, filePaths: sourceFilePaths, token, ...(branch !== "HEAD" && { ref: branch }) });
      const fetchedPaths = sourceFilePaths.filter((p) => result.files[p]);
      if (fetchedPaths.length === 0) return errors.internal("All file reads failed.");

      codeContent = [
        `Repository: ${fullName}`,
        `Branch: ${branch === "HEAD" ? "default" : branch}`,
        `Files: ${fetchedPaths.length}`,
        "",
        ...fetchedPaths.map((p, i) =>
          `=== FILE [${i + 1}/${fetchedPaths.length}]: ${p} ===\n${(result.files[p] as any).content}`
        ),
      ].join("\n\n");
    } catch (err: any) {
      logger.error({ error: err?.message }, "[Fortress] postApiDocs — file fetch failed");
      return errors.internal(`Could not fetch repository files: ${err?.message ?? "GitHub API error"}`);
    }
  }

  if (!codeContent || typeof codeContent !== "string" || codeContent.trim() === "") {
    return errors.badRequest("Either codeContent or repoId is required.");
  }

  // ── Invoke DeepSeek V3 via Bedrock ────────────────────────────────────────
  try {
    const apiDocsMarkdown = await generateApiDocs(codeContent);
    // Log activity for the dashboard
    logActivity({
      userId,
      repoId: repoId ?? "unknown",
      agent: "fortress",
      message: `API documentation generated (${apiDocsMarkdown.length} chars)`,
      severity: "info",
    });

    logger.info("[Fortress] postApiDocs — docs generated", {
      inputLength: codeContent.length,
      outputLength: apiDocsMarkdown.length,
    });
    return ok({ status: "success", apiDocsMarkdown });
  } catch (err: any) {
    logger.error({ error: err?.message }, "[Fortress] postApiDocs — Bedrock call failed");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "error",
        message: err?.message ?? "Internal server error — Bedrock invocation failed.",
      }),
    };
  }
};
