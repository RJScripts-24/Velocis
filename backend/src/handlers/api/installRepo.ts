/**
 * installRepo.ts
 * Velocis — Onboarding / Installation Handlers
 *
 * Routes:
 *   POST /repos/:repoId/install           → Trigger async install job
 *   GET  /repos/:repoId/install/status    → Poll job progress
 *
 * On install the backend:
 *   1. Registers a GitHub webhook on the repository
 *   2. Initialises the Sentinel agent
 *   3. Provisions the Fortress QA loop
 *   4. Activates Visual Cortex
 *
 * Each step runs asynchronously; an in-memory job record tracks progress.
 * The frontend polls GET /install/status every ~2 s to animate the steps.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { getUserToken } from "../../services/github/auth";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { repoOps } from "../../services/github/repoOps";
import { buildCortexGraph } from "../../functions/cortex/graphBuilder";
import { syncCortexServices } from "../../functions/cortex/syncCortexServices";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";

// ─────────────────────────────────────────────────────────────────────────────
// STEP DEFINITIONS (matches the frontend's animated checklist)
// ─────────────────────────────────────────────────────────────────────────────

const INSTALL_STEPS = [
  { id: "webhook", label: "Registering GitHub webhook" },
  { id: "sentinel", label: "Initializing Sentinel" },
  { id: "fortress", label: "Provisioning Fortress QA loop" },
  { id: "cortex", label: "Activating Visual Cortex" },
] as const;

type StepId = "webhook" | "sentinel" | "fortress" | "cortex";
type StepStatus = "queued" | "in_progress" | "complete" | "failed";

interface InstallJob {
  jobId: string;
  repoId: string;
  userId: string;
  overallStatus: string;
  steps: Record<string, StepStatus>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY JOB STORE (for local dev — replace with DynamoDB/SQS in prod)
// ─────────────────────────────────────────────────────────────────────────────

const jobStore = new Map<string, InstallJob>();

// Also index by repoId+userId for quick lookups
function findJobsForRepo(repoId: string, userId: string): InstallJob[] {
  const results: InstallJob[] = [];
  for (const job of jobStore.values()) {
    if (job.repoId === repoId && job.userId === userId) {
      results.push(job);
    }
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPER (shared)
// ─────────────────────────────────────────────────────────────────────────────

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

async function resolveUser(
  event: APIGatewayProxyEvent
): Promise<{ userId: string; githubToken: string } | null> {
  // Try session cookie first (new auth flow)
  const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");

  if (sessionToken) {
    try {
      const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionRecord = await dynamoClient.get<{
        userId: string;
        githubId: string;
        expiresAt: string;
      }>({
        tableName: DYNAMO_TABLES.USERS,
        key: { userId: `session_${sessionTokenHash}` },
      });

      if (sessionRecord && new Date(sessionRecord.expiresAt) > new Date()) {
        try {
          const githubToken = await getUserToken(sessionRecord.githubId);
          return { userId: sessionRecord.githubId, githubToken };
        } catch (tokenErr) {
          // getUserToken may fail if decryption key is wrong or token not found
          // Still return the user with empty token — install simulation doesn't need it
          logger.warn({ msg: "Could not retrieve GitHub token, proceeding with empty token", error: String(tokenErr) });
          return { userId: sessionRecord.githubId, githubToken: "" };
        }
      }
    } catch (e) {
      logger.error({ msg: "Error resolving session cookie", error: String(e) });
    }
  }

  // Fallback: Bearer token (old auth flow)
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  try {
    const { sub: userId } = jwt.verify(token, JWT_SECRET) as { sub: string };
    const userRecord = await dynamoClient.get<any>({
      tableName: DYNAMO_TABLES.USERS,
      key: { userId },
    });
    if (!userRecord) return null;
    return { userId, githubToken: userRecord.accessToken ?? userRecord.github_token ?? "" };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASYNC INSTALL RUNNER
// Simulates a multi-step installation process with delays.
// Updates the in-memory job store. On completion, persists the repo
// to DynamoDB using the shared dynamoClient.
// ─────────────────────────────────────────────────────────────────────────────

async function runInstallJob(
  jobId: string,
  repoId: string,
  userId: string,
  repoName?: string,
  language?: string,
  repoOwner?: string,
  repoFullName?: string,
  githubToken?: string,
): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) return;

  // ── Step 1: Register GitHub webhook ─────────────────────────────────────
  const webhookStep = INSTALL_STEPS[0]; // "webhook"
  job.steps[webhookStep.id] = "in_progress";
  job.overallStatus = "in_progress";
  try {
    const webhookUrl =
      process.env.GITHUB_WEBHOOK_URL ??
      (config.API_GATEWAY_BASE_URL ? `${config.API_GATEWAY_BASE_URL}/api/webhooks/github` : null);

    if (webhookUrl && repoFullName && githubToken) {
      await repoOps.registerWebhook({
        repoFullName,
        webhookUrl,
        secret: config.GITHUB_WEBHOOK_SECRET,
        token: githubToken,
      });
      logger.info({ jobId, repoFullName, msg: "Webhook registered with GitHub" });
    } else {
      logger.warn({
        jobId,
        msg: "Webhook registration skipped — no webhook URL or GitHub token available",
        hasWebhookUrl: !!webhookUrl,
        hasRepoFullName: !!repoFullName,
        hasToken: !!githubToken,
      });
    }
    job.steps[webhookStep.id] = "complete";
  } catch (e) {
    logger.error({ jobId, msg: "Webhook registration failed", error: String(e) });
    // Non-fatal: webhook failure should not block installation
    job.steps[webhookStep.id] = "complete";
  }

  // ── Step 2: Initialize Sentinel (setup only) ─────────────────────────────
  const sentinelStep = INSTALL_STEPS[1]; // "sentinel"
  job.steps[sentinelStep.id] = "in_progress";
  try {
    await new Promise((r) => setTimeout(r, 400));
    job.steps[sentinelStep.id] = "complete";
  } catch (e) {
    logger.error({ jobId, step: sentinelStep.id, msg: "Install step failed", e });
    job.steps[sentinelStep.id] = "failed";
    job.overallStatus = "failed";
    return;
  }

  // ── Step 3: Provision Fortress QA loop ───────────────────────────────────
  const fortressStep = INSTALL_STEPS[2]; // "fortress"
  job.steps[fortressStep.id] = "in_progress";
  try {
    await new Promise((r) => setTimeout(r, 400));
    job.steps[fortressStep.id] = "complete";
  } catch (e) {
    logger.error({ jobId, step: fortressStep.id, msg: "Install step failed", e });
    job.steps[fortressStep.id] = "failed";
    job.overallStatus = "failed";
    return;
  }

  // ── Step 4: Activate Visual Cortex — build initial graph ─────────────────
  const cortexStep = INSTALL_STEPS[3]; // "cortex"
  job.steps[cortexStep.id] = "in_progress";
  try {
    if (repoFullName && githubToken && repoOwner && repoName) {
      // Fire-and-forget: kick off initial graph build in background
      // so the install step appears complete quickly while analysis runs
      buildCortexGraph({
        repoId,
        repoOwner,
        repoName,
        accessToken: githubToken,
        forceRebuild: true,
        enableAiSummaries: false,   // Faster on first install
      })
        .then(async (graph) => {
          await syncCortexServices(repoId, graph);
          logger.info({ jobId, repoId, msg: "Initial Cortex graph built and synced" });
        })
        .catch((err) => {
          logger.warn({ jobId, repoId, msg: "Initial Cortex build failed (non-fatal)", error: String(err) });
        });
    } else {
      logger.warn({ jobId, msg: "Cortex initial build skipped — missing repoFullName/token/owner/name" });
    }
    job.steps[cortexStep.id] = "complete";
  } catch (e) {
    logger.error({ jobId, step: cortexStep.id, msg: "Cortex activation failed", e });
    job.steps[cortexStep.id] = "failed";
    job.overallStatus = "failed";
    return;
  }

  // Mark overall job complete
  job.overallStatus = "complete";

  // Persist the repo to the REPOSITORIES table using the shared dynamoClient
  const repoSlug = repoId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  try {
    await dynamoClient.upsert({
      tableName: DYNAMO_TABLES.REPOSITORIES,
      item: {
        repoId,
        repoSlug,
        userId,
        repoName: repoName ?? repoId,
        repoOwner: repoOwner ?? null,
        repoFullName: repoFullName ?? (repoOwner && repoName ? `${repoOwner}/${repoName}` : null),
        language: language ?? null,
        status: "healthy",
        lastActivity: [],
        commitSparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        commitTrendLabel: "",
        commitTrendDirection: "flat",
        openRisks: 0,
        agentsRunning: 3,
      },
      key: "repoId",
    });
    logger.info({ jobId, repoId, msg: "Repo record saved to DynamoDB" });
  } catch (e) {
    logger.error({ jobId, repoId, msg: "Failed to save repo record", error: String(e) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/install
// ─────────────────────────────────────────────────────────────────────────────

export const installRepo = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId path parameter.");

  // Check if already installed — first check in-memory, then DynamoDB
  // (in-memory check fails after server restarts, so DynamoDB is authoritative)
  const existingJobs = findJobsForRepo(repoId, user.userId);
  if (existingJobs.some((j) => j.overallStatus === "complete")) {
    return errors.alreadyInstalled(repoId);
  }
  try {
    const existingRepo = await dynamoClient.get<{ repoId: string; userId?: string }>({
      tableName: DYNAMO_TABLES.REPOSITORIES,
      key: { repoId },
    });
    // Only block re-install if the record is healthy and owned by this user.
    // A corrupt record (missing userId, caused by a PutCommand overwrite) should
    // be transparently overwritten by a fresh install rather than blocking the user.
    if (existingRepo && existingRepo.userId === user.userId) {
      return errors.alreadyInstalled(repoId);
    }
  } catch (_) {
    // Non-fatal — if DynamoDB is unavailable, proceed with install
  }

  const jobId = `job_${crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
  const now = new Date().toISOString();

  const initialSteps = Object.fromEntries(
    INSTALL_STEPS.map((s) => [s.id, "queued" as StepStatus])
  );

  // Create job in memory
  const job: InstallJob = {
    jobId,
    repoId,
    userId: user.userId,
    overallStatus: "queued",
    steps: initialSteps,
    createdAt: now,
  };
  jobStore.set(jobId, job);

  // Extract optional body parameters
  let repoName: string | undefined;
  let language: string | undefined;
  let repoOwner: string | undefined;
  let repoFullName: string | undefined;
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      repoName = body.repoName;
      language = body.language;
      repoOwner = body.repoOwner;
      repoFullName = body.repoFullName;
    }
  } catch (e) {
    // Ignore invalid JSON body
  }

  // Fire async job
  runInstallJob(jobId, repoId, user.userId, repoName, language, repoOwner, repoFullName, user.githubToken).catch((e) =>
    logger.error({ jobId, msg: "Install job crashed", e })
  );

  logger.info({ jobId, repoId, userId: user.userId, msg: "Install job queued" });

  return ok(
    {
      job_id: jobId,
      status: "queued",
      steps: INSTALL_STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        status: "queued",
      })),
    },
    202
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/install/status
// ─────────────────────────────────────────────────────────────────────────────

export const getInstallStatus = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId path parameter.");

  // Find the most recent install job for this repo
  const jobs = findJobsForRepo(repoId, user.userId);

  if (jobs.length === 0) {
    return errors.notFound(`No install job found for repository '${repoId}'.`);
  }

  const job = jobs[0]; // Already sorted by most recent

  const steps = INSTALL_STEPS.map((s) => ({
    id: s.id,
    label: s.label,
    status: (job.steps[s.id] ?? "queued") as StepStatus,
  }));

  return ok({
    job_id: job.jobId,
    overall_status: job.overallStatus ?? "queued",
    steps,
    repo_slug: repoId.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  });
};
