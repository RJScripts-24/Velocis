// src/handlers/webhooks/githubPush.ts
// The Master Orchestrator — routes ALL GitHub webhook events to the correct agent
//
// Supported events (per API_CONTRACT §16):
//   push              → Full tri-agent pipeline (Sentinel + Cortex + Fortress)
//   pull_request      → Sentinel PR analysis (opened / synchronize / reopened)
//                       or state update (closed / merged)
//   pull_request_review → Log to activity feed
//   deployment        → Record deployment event for Cortex timeline
//   ping              → ACK with 200

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { verifySignature } from "../../middlewares/verifySignature";
import { validatePayload } from "../../middlewares/validatePayload";
import { githubPushSchema } from "../../models/schemas/githubSchemas";
import { analyzeLogic } from "../../functions/sentinel/analyzeLogic";
import { generateQATestPlan, generateApiDocs } from "../../functions/fortress/analyzeFortress";
import { buildCortexGraph } from "../../functions/cortex/graphBuilder";
import { generateIac } from "../../functions/predictor/generateIac";
import { dynamoClient, getDocClient } from "../../services/database/dynamoClient";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { repoOps } from "../../services/github/repoOps";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { PushEventPayload } from "../../models/interfaces/WebhookEvent";
import { Repository } from "../../models/interfaces/Repository";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const AGENT_TIMEOUT_MS = 25000; // Lambda safe timeout buffer

const _rawDynamo = new DynamoDBClient({});
const _docClient = DynamoDBDocumentClient.from(_rawDynamo);
const SENTINEL_TABLE = process.env.SENTINEL_TABLE ?? "velocis-sentinel";
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE ?? "velocis-activity";
const TIMELINE_TABLE = process.env.TIMELINE_TABLE ?? "velocis-timeline";
const PIPELINE_TABLE = process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs";

// ─────────────────────────────────────────────
// TOP-LEVEL ROUTER
// Reads X-GitHub-Event header and dispatches to the right sub-handler.
// HMAC verification is always done first.
// ─────────────────────────────────────────────
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId ?? "unknown";
  const rawBody = event.body ?? "";
  const signature = event.headers["x-hub-signature-256"] ?? "";
  const githubEvent = event.headers["x-github-event"] ?? "push";

  // ── Verify HMAC signature ────────────────────────────────────────────────
  const isValid = verifySignature({
    rawBody,
    signature,
    secret: config.GITHUB_WEBHOOK_SECRET,
  });
  if (!isValid) {
    logger.warn({ requestId, msg: "Invalid webhook signature — rejected" });
    return response(401, { error: "Unauthorized: Invalid webhook signature" });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return response(400, { error: "Bad Request: Invalid JSON body" });
  }

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
  if (!validationResult.success) {
    logger.warn({ requestId, msg: "Push payload validation failed", errors: validationResult.errors });
    return response(400, { error: "Bad Request: Invalid payload schema", details: validationResult.errors });
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
  const addedOrModifiedFiles = commits.flatMap((commit) => [
    ...commit.added,
    ...commit.modified,
  ]);

  // Track deleted files separately — they trigger a full Cortex rebuild
  const deletedFiles = commits.flatMap((commit) => commit.removed ?? []);

  const uniqueChangedFiles = [...new Set(addedOrModifiedFiles)].filter(
    (f) =>
      // Process all meaningful source and config file types
      f.endsWith(".ts") ||
      f.endsWith(".tsx") ||
      f.endsWith(".js") ||
      f.endsWith(".jsx") ||
      f.endsWith(".py") ||
      f.endsWith(".json") ||
      f.endsWith(".yaml") ||
      f.endsWith(".yml") ||
      f.endsWith(".tf") ||
      f.endsWith(".sql") ||
      f.endsWith(".md")
  );

  // If only non-source files changed (images, lock files) AND no deletions, skip agent pipeline
  // but still record the push activity in DynamoDB below.
  const hasDeletions = deletedFiles.length > 0;
  const hasActionableChanges = uniqueChangedFiles.length > 0 || hasDeletions;

  if (!hasActionableChanges) {
    // Still update last push metadata even for trivial pushes
    await dynamoClient.upsert({
      tableName: config.DYNAMO_REPOSITORIES_TABLE,
      item: {
        repoId: String(repoId),
        lastPushAt: new Date().toISOString(),
        lastPushedBy: sender.login,
        lastCommitSha: commits[commits.length - 1]?.id ?? "unknown",
      },
      key: "repoId",
    });
    logger.info({ requestId, msg: "No actionable files changed — push metadata updated" });
    return response(200, {
      status: "skipped",
      reason: "No actionable source/config files changed in this push",
    });
  }

  logger.info({
    requestId,
    msg: `Processing ${uniqueChangedFiles.length} changed files, ${deletedFiles.length} deleted files`,
    files: uniqueChangedFiles,
    deleted: deletedFiles,
  });

  // Fetch the actual file contents from GitHub using installation token
  if (!installation) {
    logger.warn({ requestId, msg: "Push event missing installation context — cannot fetch token" });
    return response(200, { status: "skipped", reason: "No installation context" });
  }

  const installationToken = await repoOps.getInstallationToken(
    installation.id
  );

  // Only fetch contents for added/modified source files — not deletions or config-only changes
  const sourceFilesToFetch = uniqueChangedFiles.filter((f) =>
    f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".py")
  );

  let fileContents: Record<string, string> = {};
  if (sourceFilesToFetch.length > 0) {
    const fileContentsResult = await repoOps.fetchFileContents({
      repoFullName,
      filePaths: sourceFilesToFetch,
      token: installationToken,
    });
    fileContents = Object.fromEntries(
      Object.entries(fileContentsResult.files).map(([k, v]) => [k, v.content])
    );
  }

  // ── STEP 5: Persist activity snapshot to DynamoDB ─────────────────────────
  const pushStartedAt = new Date().toISOString();
  const repoRecord: Partial<Repository> = {
    repoId: String(repoId),
    repoFullName,
    lastPushAt: pushStartedAt,
    lastPushedBy: sender.login,
    lastCommitSha: commits[commits.length - 1]?.id ?? "unknown",
    lastCommitMessage: commits[commits.length - 1]?.message ?? "",
    lastCommitAuthor: commits[commits.length - 1]?.author?.name ?? sender.login,
    filesChangedCount: uniqueChangedFiles.length,
    filesDeletedCount: deletedFiles.length,
    status: "processing",
    // Mark the automation report as "running" immediately so the UI can
    // show a live indicator while the agents are executing.
    automationReport: {
      status: "running",
      startedAt: pushStartedAt,
      updatedAt: pushStartedAt,
      trigger: "push",
      commitSha: commits[commits.length - 1]?.id ?? "unknown",
      pushedBranch,
      pushedBy: sender.login,
    },
  };

  await dynamoClient.upsert({
    tableName: config.DYNAMO_REPOSITORIES_TABLE,
    item: repoRecord,
    key: "repoId",
  });

  logger.info({
    requestId,
    repoId: String(repoId),
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
    deletedFiles,
    forceFullRebuild: hasDeletions,
  });

  // ── STEP 7: Update final status in DynamoDB ───────────────────────────────
  const completedAt = new Date().toISOString();

  // Build automationReport in the same shape that getAutomationReport.ts reads,
  // so every push automatically refreshes the automation report visible in the UI.
  const automationReport = {
    status: agentResults.overallStatus === "healthy" ? "completed" : "failed",
    startedAt: pushStartedAt,
    completedAt,
    updatedAt: completedAt,
    sentinel: agentResults.sentinel.status === "success" ? agentResults.sentinel.data : null,
    fortress: agentResults.fortress.status === "success" ? agentResults.fortress.data : null,
    infrastructure: null,           // Phase C (infra predictor) result not surfaced here yet
    error: agentResults.overallStatus !== "healthy"
      ? [
          agentResults.sentinel.status === "failed" ? `Sentinel: ${agentResults.sentinel.error}` : null,
          agentResults.fortress.status === "failed" ? `Fortress: ${agentResults.fortress.error}` : null,
          agentResults.cortex.status === "failed" ? `Cortex: ${agentResults.cortex.error}` : null,
        ]
          .filter(Boolean)
          .join("; ") || "One or more agents failed"
      : null,
    progress: null,   // push-triggered runs have no step-by-step progress bar
    trigger: "push",
    commitSha: commits[commits.length - 1]?.id ?? "unknown",
    pushedBranch,
    pushedBy: sender.login,
  };

  await dynamoClient.upsert({
    tableName: config.DYNAMO_REPOSITORIES_TABLE,
    item: {
      repoId: String(repoId),
      status: agentResults.overallStatus,
      lastProcessedAt: completedAt,
      sentinel: agentResults.sentinel,
      fortress: agentResults.fortress,
      cortex: agentResults.cortex,
      automationReport,
    },
    key: "repoId",
  });

  logger.info({
    requestId,
    repoId: String(repoId),
    msg: "All agents completed — final status and automation report saved",
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
  deletedFiles: string[];
  forceFullRebuild: boolean;
}): Promise<AgentPipelineResult> {
  const {
    requestId,
    repoId,
    repoFullName,
    installationToken,
    fileContents,
    uniqueChangedFiles,
    deletedFiles,
    forceFullRebuild,
  } = ctx;

  // Let's check if the repo is automated
  let isAutomated = false;
  try {
    const repoDoc = await dynamoClient.get({
      tableName: config.DYNAMO_REPOSITORIES_TABLE,
      key: { repoId }
    });
    if (repoDoc && repoDoc.isAutomated) {
      isAutomated = true;
    } else {
      const fallbackRepo = await dynamoClient.get({
        tableName: process.env.REPOS_TABLE ?? "velocis-repos",
        key: { repoId }
      });
      if (fallbackRepo && fallbackRepo.isAutomated) {
        isAutomated = true;
      }
    }
  } catch (e) { /* ignore */ }

  logger.info({ requestId, repoId, isAutomated, msg: "Automation status" });

  // ── Phase A: Sentinel + Cortex run in PARALLEL ────────────────────────────
  logger.info({ requestId, msg: "Phase A: Launching Sentinel + Cortex in parallel" });

  // Only run Sentinel when there are actual source files to analyze
  const sourceFilesForSentinel = uniqueChangedFiles.filter((f) =>
    f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".py")
  );

  const [sentinelResult, cortexResult] = await Promise.allSettled([
    // SENTINEL: Deep logic, security, and architectural review via Claude 3.5 Sonnet
    // Only run when there are actual source files to analyze — skip for config/doc-only pushes
    sourceFilesForSentinel.length > 0
      ? withTimeout(
          analyzeLogic({
            repoId,
            repoOwner: repoFullName.split("/")[0] ?? "",
            repoName: repoFullName.split("/")[1] ?? "",
            filePaths: sourceFilesForSentinel,
            commitSha: String(repoId),
            accessToken: installationToken,
          }),
          AGENT_TIMEOUT_MS,
          "Sentinel"
        )
      : Promise.resolve({ status: "skipped", reason: "No source files changed" }),

    // CORTEX: Rebuild the dependency graph for the 3D canvas
    // Force a full rebuild when files are deleted so removed nodes are purged
    withTimeout(
      buildCortexGraph({
        repoId,
        repoOwner: repoFullName.split("/")[0] ?? "",
        repoName: repoFullName.split("/")[1] ?? "",
        accessToken: installationToken,
        forceRebuild: true,
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

  // ── Phase B: Fortress Analysis — runs after Sentinel ───────────────────────
  // QA Strategist generates a test plan; API Documenter produces API docs.
  // Both run in parallel against the combined changed file contents.
  logger.info({ requestId, msg: "Phase B: Launching Fortress analysis pipeline" });

  const combinedContent = Object.entries(fileContents)
    .map(([path, content]) => `// File: ${path}\n${content}`)
    .join("\n\n");

  let fortress: AgentResult;
  try {
    const [qaTestPlan, apiDocs] = await Promise.all([
      withTimeout(generateQATestPlan(combinedContent), AGENT_TIMEOUT_MS, "Fortress-QA"),
      withTimeout(generateApiDocs(combinedContent), AGENT_TIMEOUT_MS, "Fortress-Docs"),
    ]);

    // Update Fortress run with the test plan text so it can be fetched later
    try {
      const _docClient = getDocClient();
      const pipelineRes = await _docClient.send(new QueryCommand({
        TableName: process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs",
        KeyConditionExpression: "repoId = :r",
        ExpressionAttributeValues: { ":r": repoId },
      }));
      const latestRun = (pipelineRes.Items ?? []).sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0];
      if (latestRun) {
        await dynamoClient.upsert({
          tableName: process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs",
          item: { ...latestRun, testPlanText: qaTestPlan },
          key: "runId"
        });
      }
    } catch (e) { /* ignore */ }

    fortress = { status: "success", data: { qaTestPlan, apiDocs } };
  } catch (err) {
    logger.error({ requestId, msg: "Fortress agent failed", err });
    fortress = { status: "failed", error: String(err), data: null };
  }

  logger.info({
    requestId,
    msg: "Phase B complete",
    fortressStatus: fortress.status,
  });

  // ── Phase C: Infrastructure Prediction (Automation Only) ───────────────────
  // Run if automation is enabled
  let architecture = null;
  if (isAutomated) {
    logger.info({ requestId, msg: "Phase C: Automation enabled, running Infrastructure predictor" });
    try {
      const iacForecast = await withTimeout(
        generateIac({
          repoId,
          repoOwner: repoFullName.split("/")[0] ?? "",
          repoName: repoFullName.split("/")[1] ?? "",
          filePaths: uniqueChangedFiles,
          commitSha: String(repoId), // usually this is commits[0].id
          accessToken: installationToken,
          region: "us-east-1",
          environment: "production",
        }),
        AGENT_TIMEOUT_MS * 2, // IaC takes a bit longer
        "Infrastructure Predictor"
      );
      architecture = { status: "success", data: iacForecast };
    } catch (err) {
      logger.error({ requestId, msg: "Infrastructure Predictor failed", err });
      architecture = { status: "failed", error: String(err), data: null };
    }
  }

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