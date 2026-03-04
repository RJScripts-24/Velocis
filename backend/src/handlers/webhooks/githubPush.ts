// src/handlers/webhooks/githubPush.ts
// The Master Orchestrator — fires on every GitHub push event
// Validates the incoming webhook, then triggers all three Velocis agents

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { verifySignature } from "../../middlewares/verifySignature";
import { validatePayload } from "../../middlewares/validatePayload";
import { githubPushSchema } from "../../models/schemas/githubSchemas";
import { analyzeLogic } from "../../functions/sentinel/analyzeLogic";
import { writeTests } from "../../functions/fortress/writeTests";
<<<<<<< Updated upstream
import { graphBuilder } from "../../functions/cortex/graphBuilder";
=======
import { buildCortexGraph } from "../../functions/cortex/graphBuilder";
import { syncCortexServices } from "../../functions/cortex/syncCortexServices";
>>>>>>> Stashed changes
import { dynamoClient } from "../../services/database/dynamoClient";
import { repoOps } from "../../services/github/repoOps";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { PushEventPayload } from "../../models/interfaces/WebhookEvent";
import { Repository } from "../../models/interfaces/Repository";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const AGENT_TIMEOUT_MS = 25000; // Lambda safe timeout buffer

<<<<<<< Updated upstream
=======
const _rawDynamo = new DynamoDBClient({});
const _docClient = DynamoDBDocumentClient.from(_rawDynamo);
const SENTINEL_TABLE = process.env.SENTINEL_TABLE ?? "velocis-sentinel";
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE ?? "velocis-activity";
const TIMELINE_TABLE = process.env.TIMELINE_TABLE ?? "velocis-timeline";
const PIPELINE_TABLE = process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs";

>>>>>>> Stashed changes
// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId ?? "unknown";
<<<<<<< Updated upstream
  logger.info({ requestId, msg: "GitHub push webhook received" });

  // ── STEP 1: Verify the webhook actually came from GitHub ──────────────────
  const rawBody = event.body ?? "";
  const signature = event.headers["x-hub-signature-256"] ?? "";
=======
  const rawBody = event.body ?? "";
  const signature = event.headers["x-hub-signature-256"] ?? "";
  const githubEvent = event.headers["x-github-event"] ?? "push";
>>>>>>> Stashed changes

  const isValid = verifySignature({
    rawBody,
    signature,
    secret: config.GITHUB_WEBHOOK_SECRET,
  });

  if (!isValid) {
    logger.warn({ requestId, msg: "Invalid webhook signature — rejected" });
    return response(401, { error: "Unauthorized: Invalid webhook signature" });
  }

  // ── STEP 2: Parse and validate the incoming payload ───────────────────────
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (err) {
    logger.error({ requestId, msg: "Failed to parse webhook body", err });
    return response(400, { error: "Bad Request: Invalid JSON body" });
  }

<<<<<<< Updated upstream
  const validationResult = validatePayload(githubPushSchema, parsedBody);
=======
  logger.info({ requestId, githubEvent, msg: "GitHub webhook received" });

  // ── Route by event type ───────────────────────────────────────────────────
  switch (githubEvent) {
    case "ping":
      return response(200, { status: "ok", zen: body.zen });

    case "push":
      return handlePush(event, requestId, rawBody, body);

    case "pull_request":
      return handlePullRequest(requestId, body);

    case "pull_request_review":
      return handlePullRequestReview(requestId, body);

    case "deployment":
      return handleDeployment(requestId, body);

    default:
      logger.info({ requestId, githubEvent, msg: "Unhandled event type — ignoring" });
      return response(200, { status: "ignored", event: githubEvent });
  }
};

// ─────────────────────────────────────────────
// PULL REQUEST HANDLER
// ─────────────────────────────────────────────
async function handlePullRequest(
  requestId: string,
  body: any
): Promise<APIGatewayProxyResult> {
  const { action, pull_request: pr, repository } = body;
  const repoId = String(repository?.id ?? "");
  const prNumber = pr?.number;
  const now = new Date().toISOString();

  logger.info({ requestId, action, prNumber, repoId, msg: "pull_request event" });

  if (["opened", "synchronize", "reopened"].includes(action)) {
    // Queue Sentinel PR analysis
    const scanId = `pr_scan_${randomUUID().replace(/-/g, "").slice(0, 10)}`;

    await _docClient.send(
      new PutCommand({
        TableName: SENTINEL_TABLE,
        Item: {
          id: scanId,
          repoId,
          recordType: "PR_REVIEW",
          prNumber,
          title: pr?.title ?? `PR #${prNumber}`,
          author: pr?.user?.login ?? "unknown",
          branch: pr?.head?.ref ?? "",
          state: "open",
          status: "queued",
          riskScore: 0,
          riskLevel: "low",
          findings: [],
          diffUrl: pr?.html_url ?? "",
          createdAt: pr?.created_at ?? now,
          updatedAt: now,
        },
      })
    );

    // Also create a Fortress pipeline run for the PR branch
    const runId = `run_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 8)}`;
    await _docClient.send(
      new PutCommand({
        TableName: PIPELINE_TABLE,
        Item: {
          runId,
          repoId,
          branch: pr?.head?.ref ?? "",
          commitSha: pr?.head?.sha ?? "",
          trigger: "pull_request",
          status: "queued",
          startedAt: now,
          stepStates: {},
        },
      })
    );

    logger.info({ requestId, scanId, runId, prNumber, msg: "PR queued for Sentinel + Fortress" });

  } else if (["closed"].includes(action)) {
    // Update state to merged or closed
    const newState = pr?.merged ? "merged" : "closed";
    logger.info({ requestId, prNumber, newState, msg: "PR closed/merged — updating state" });

    // In production: update the PR record in DynamoDB
    // (scan for existing record then update — omitted for brevity)
  }

  return response(200, { status: "ok", action, prNumber });
}

// ─────────────────────────────────────────────
// PULL REQUEST REVIEW HANDLER
// Log a lightweight activity event
// ─────────────────────────────────────────────
async function handlePullRequestReview(
  requestId: string,
  body: any
): Promise<APIGatewayProxyResult> {
  const { review, pull_request: pr, repository } = body;
  const repoId = String(repository?.id ?? "");
  const now = new Date().toISOString();

  await _docClient.send(
    new PutCommand({
      TableName: ACTIVITY_TABLE,
      Item: {
        id: `evt_${randomUUID().replace(/-/g, "").slice(0, 10)}`,
        repoId,
        repoName: repository?.name ?? "",
        agent: "sentinel",
        message: `PR #${pr?.number} review: ${review?.state ?? "submitted"}`,
        severity: "info",
        timestamp: now,
        read: false,
      },
    })
  );

  logger.info({ requestId, msg: "pull_request_review logged to activity feed" });
  return response(200, { status: "ok" });
}

// ─────────────────────────────────────────────
// DEPLOYMENT HANDLER
// Record in Cortex timeline and deployments table
// ─────────────────────────────────────────────
async function handleDeployment(
  requestId: string,
  body: any
): Promise<APIGatewayProxyResult> {
  const { deployment, repository } = body;
  const repoId = String(repository?.id ?? "");
  const now = new Date().toISOString();

  await _docClient.send(
    new PutCommand({
      TableName: TIMELINE_TABLE,
      Item: {
        id: `deploy_${randomUUID().replace(/-/g, "").slice(0, 10)}`,
        repoId,
        positionPct: 100, // Latest event is at 100%; historical events scaled later
        label: `Deploy ${deployment?.ref ?? ""}`,
        color: "#22c55e",
        environment: deployment?.environment ?? "production",
        deployedAt: deployment?.created_at ?? now,
        createdAt: now,
      },
    })
  );

  await _docClient.send(
    new PutCommand({
      TableName: process.env.DEPLOYS_TABLE ?? "velocis-deployments",
      Item: {
        id: `deploy_${randomUUID().replace(/-/g, "").slice(0, 10)}`,
        repoId,
        repoName: repository?.name ?? "",
        environment: deployment?.environment ?? "production",
        deployedAt: deployment?.created_at ?? now,
        status: "success",
      },
    })
  );

  logger.info({ requestId, repoId, msg: "Deployment event recorded" });
  return response(200, { status: "ok" });
}

// ─────────────────────────────────────────────
// PUSH HANDLER (original logic extracted)
// ─────────────────────────────────────────────
async function handlePush(
  event: APIGatewayProxyEvent,
  requestId: string,
  rawBody: string,
  webhookBody: any
): Promise<APIGatewayProxyResult> {
  // ── Validate the push payload schema ─────────────────────────────────────
  const validationResult = validatePayload(githubPushSchema, webhookBody);
>>>>>>> Stashed changes
  if (!validationResult.success) {
    logger.warn({
      requestId,
      msg: "Payload validation failed",
      errors: validationResult.errors,
    });
    return response(400, {
      error: "Bad Request: Invalid payload schema",
      details: validationResult.errors,
    });
  }

  const webhookEvent = validationResult.data as PushEventPayload;

  // ── STEP 3: Extract core context from the webhook ─────────────────────────
  const {
    repository: { id: repoId, full_name: repoFullName, default_branch },
    ref,
    commits,
    installation,
    sender,
  } = webhookEvent;

  // Only act on pushes to the default branch (e.g., main/master)
  const pushedBranch = ref.replace("refs/heads/", "");
  if (pushedBranch !== default_branch) {
    logger.info({
      requestId,
      msg: `Push to non-default branch '${pushedBranch}' — skipping agent trigger`,
    });
    return response(200, {
      status: "skipped",
      reason: `Branch '${pushedBranch}' is not the default branch`,
    });
  }

  // ── STEP 4: Fetch the changed files from GitHub ───────────────────────────
  const changedFiles = commits.flatMap((commit) => [
    ...commit.added,
    ...commit.modified,
  ]);

  const uniqueChangedFiles = [...new Set(changedFiles)].filter(
    (f) =>
      // Only process source files — skip lock files, configs, assets
      f.endsWith(".ts") ||
      f.endsWith(".tsx") ||
      f.endsWith(".js") ||
      f.endsWith(".jsx") ||
      f.endsWith(".py")
  );

  if (uniqueChangedFiles.length === 0) {
    logger.info({ requestId, msg: "No actionable source files changed" });
    return response(200, {
      status: "skipped",
      reason: "No source files changed in this push",
    });
  }

  logger.info({
    requestId,
    msg: `Processing ${uniqueChangedFiles.length} changed files`,
    files: uniqueChangedFiles,
  });

  // Fetch the actual file contents from GitHub using installation token
  const installationToken = await repoOps.getInstallationToken(
    installation.id
  );

  const fileContents = await repoOps.fetchFileContents({
    repoFullName,
    filePaths: uniqueChangedFiles,
    token: installationToken,
  });

  // ── STEP 5: Persist activity snapshot to DynamoDB ─────────────────────────
  const repoRecord: Partial<Repository> = {
    repoId: String(repoId),
    repoFullName,
    lastPushAt: new Date().toISOString(),
    lastPushedBy: sender.login,
    lastCommitSha: commits[commits.length - 1]?.id ?? "unknown",
    status: "processing",
  };

  await dynamoClient.upsert({
    tableName: config.DYNAMO_REPOSITORIES_TABLE,
    item: repoRecord,
    key: "repoId",
  });

  logger.info({
    requestId,
    repoId,
    msg: "Repository record updated in DynamoDB — status: processing",
  });

  // ── STEP 6: Fire the Tri-Agent Pipeline (Parallel where possible) ─────────
  // Sentinel and Cortex can run in parallel.
  // Fortress depends on Sentinel's output (tests are written against reviewed code).

  const agentResults = await runAgentPipeline({
    requestId,
    repoId: String(repoId),
    repoFullName,
    installationToken,
    fileContents,
    uniqueChangedFiles,
  });

  // ── STEP 7: Update final status in DynamoDB ───────────────────────────────
  await dynamoClient.upsert({
    tableName: config.DYNAMO_REPOSITORIES_TABLE,
    item: {
      repoId: String(repoId),
      status: agentResults.overallStatus,
      lastProcessedAt: new Date().toISOString(),
      sentinel: agentResults.sentinel,
      fortress: agentResults.fortress,
      cortex: agentResults.cortex,
    },
    key: "repoId",
  });

  logger.info({
    requestId,
    repoId,
    msg: "All agents completed — final status saved",
    status: agentResults.overallStatus,
  });

  // ── STEP 8: Return success to GitHub (must respond within 10s) ────────────
  return response(200, {
    status: "success",
    requestId,
    repoId,
    agentsSummary: {
      sentinel: agentResults.sentinel.status,
      fortress: agentResults.fortress.status,
      cortex: agentResults.cortex.status,
    },
  });
};

// ─────────────────────────────────────────────
// AGENT PIPELINE ORCHESTRATOR
// ─────────────────────────────────────────────
async function runAgentPipeline(ctx: {
  requestId: string;
  repoId: string;
  repoFullName: string;
  installationToken: string;
  fileContents: Record<string, string>;
  uniqueChangedFiles: string[];
}): Promise<AgentPipelineResult> {
  const {
    requestId,
    repoId,
    repoFullName,
    installationToken,
    fileContents,
    uniqueChangedFiles,
  } = ctx;

  // ── Phase A: Sentinel + Cortex run in PARALLEL ────────────────────────────
  logger.info({ requestId, msg: "Phase A: Launching Sentinel + Cortex in parallel" });

  const [sentinelResult, cortexResult] = await Promise.allSettled([
    // SENTINEL: Deep logic, security, and architectural review via Claude 3.5 Sonnet
    withTimeout(
      analyzeLogic({
        repoId,
<<<<<<< Updated upstream
        fileContents,
        repoFullName,
        installationToken,
=======
        repoOwner: repoFullName.split("/")[0] ?? "",
        repoName: repoFullName.split("/")[1] ?? "",
        filePaths: uniqueChangedFiles,
        commitSha: String(repoId),
        accessToken: installationToken,
>>>>>>> Stashed changes
      }),
      AGENT_TIMEOUT_MS,
      "Sentinel"
    ),

    // CORTEX: Rebuild the dependency graph for the 3D canvas
    withTimeout(
      graphBuilder({
        repoId,
<<<<<<< Updated upstream
        filePaths: uniqueChangedFiles,
        fileContents,
=======
        repoOwner: repoFullName.split("/")[0] ?? "",
        repoName: repoFullName.split("/")[1] ?? "",
        accessToken: installationToken,
        forceRebuild: true,
>>>>>>> Stashed changes
      }),
      AGENT_TIMEOUT_MS,
      "Cortex"
    ),
  ]);

  const sentinel = extractResult(sentinelResult, "sentinel");
  const cortex = extractResult(cortexResult, "cortex");

  logger.info({
    requestId,
    msg: "Phase A complete",
    sentinelStatus: sentinel.status,
    cortexStatus: cortex.status,
  });

  // ── Sync cortex graph → service-level table for the 3D frontend canvas ───
  if (cortex.status === "success" && cortex.data) {
    try {
      await withTimeout(
        syncCortexServices(repoId, cortex.data as any),
        10_000,
        "CortexSync"
      );
      logger.info({ requestId, msg: "Cortex service sync completed" });
    } catch (syncErr) {
      logger.error({ requestId, syncErr }, "Cortex service sync failed — non-fatal");
      // Non-fatal: the file-level graph is still cached; service map just won't update this push
    }
  }

  // ── Phase B: Fortress TDD — runs after Sentinel ───────────────────────────
  // We pass Sentinel's review output to Fortress so test generation is
  // context-aware of flagged issues.
  logger.info({ requestId, msg: "Phase B: Launching Fortress TDD pipeline" });

  let fortress: AgentResult;
  try {
    const fortressOutput = await withTimeout(
      writeTests({
        repoId,
<<<<<<< Updated upstream
        fileContents,
        sentinelReview: sentinel.data ?? null,
        repoFullName,
        installationToken,
=======
        repoOwner: repoFullName.split("/")[0] ?? "",
        repoName: repoFullName.split("/")[1] ?? "",
        filePath: uniqueChangedFiles[0] ?? "",
        commitSha: String(repoId),
        accessToken: installationToken,
        maxAttempts: 3,
>>>>>>> Stashed changes
      }),
      AGENT_TIMEOUT_MS,
      "Fortress"
    );
    fortress = { status: "success", data: fortressOutput };
  } catch (err) {
    logger.error({ requestId, msg: "Fortress agent failed", err });
    fortress = { status: "failed", error: String(err), data: null };
  }

  logger.info({
    requestId,
    msg: "Phase B complete",
    fortressStatus: fortress.status,
  });

  // ── Determine overall pipeline health ────────────────────────────────────
  const overallStatus =
    sentinel.status === "success" &&
      fortress.status === "success" &&
      cortex.status === "success"
      ? "healthy"
      : "degraded";

  return { sentinel, fortress, cortex, overallStatus };
}

// ─────────────────────────────────────────────
// UTILITY: Promise timeout wrapper
// ─────────────────────────────────────────────
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  agentName: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${agentName} agent timed out after ${ms}ms`)),
      ms
    );
  });

  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle!);
    throw err;
  }
}

// ─────────────────────────────────────────────
// UTILITY: Extract result from Promise.allSettled
// ─────────────────────────────────────────────
function extractResult(
  settled: PromiseSettledResult<unknown>,
  agentName: string
): AgentResult {
  if (settled.status === "fulfilled") {
    return { status: "success", data: settled.value };
  } else {
    logger.error({
      msg: `${agentName} agent failed`,
      error: settled.reason,
    });
    return {
      status: "failed",
      error: String(settled.reason),
      data: null,
    };
  }
}

// ─────────────────────────────────────────────
// UTILITY: Standard Lambda response builder
// ─────────────────────────────────────────────
function response(
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "X-Powered-By": "Velocis",
    },
    body: JSON.stringify(body),
  };
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface AgentResult {
  status: "success" | "failed" | "skipped";
  data: unknown;
  error?: string;
}

interface AgentPipelineResult {
  sentinel: AgentResult;
  fortress: AgentResult;
  cortex: AgentResult;
  overallStatus: "healthy" | "degraded";
}