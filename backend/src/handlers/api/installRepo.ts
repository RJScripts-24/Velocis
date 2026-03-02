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
 * Each step runs asynchronously; a job record in DynamoDB tracks progress.
 * The frontend polls GET /install/status every ~2 s to animate the steps.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import axios from "axios";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

const dynamo        = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET    = process.env.JWT_SECRET    ?? "changeme-in-production";
const USERS_TABLE   = process.env.USERS_TABLE   ?? "velocis-users";
const INSTALL_TABLE = process.env.INSTALL_TABLE ?? "velocis-installations";

// ─────────────────────────────────────────────────────────────────────────────
// STEP DEFINITIONS (matches the frontend's animated checklist)
// ─────────────────────────────────────────────────────────────────────────────

const INSTALL_STEPS = [
  { id: "webhook",  label: "Registering GitHub webhook" },
  { id: "sentinel", label: "Initializing Sentinel" },
  { id: "fortress", label: "Provisioning Fortress QA loop" },
  { id: "cortex",   label: "Activating Visual Cortex" },
] as const;

type StepId = "webhook" | "sentinel" | "fortress" | "cortex";
type StepStatus = "queued" | "in_progress" | "complete" | "failed";

interface InstallStep {
  id: StepId;
  label: string;
  status: StepStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPER (shared)
// ─────────────────────────────────────────────────────────────────────────────

async function resolveUser(
  authHeader: string | undefined
): Promise<{ userId: string; githubToken: string } | null> {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  try {
    const { sub: userId } = jwt.verify(token, JWT_SECRET) as { sub: string };
    const res = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } })
    );
    if (!res.Item) return null;
    return { userId, githubToken: res.Item.github_token };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASYNC INSTALL RUNNER
// In production this should be triggered via SQS / Step Functions.
// Here we kick off a non-blocking Promise to simulate progressively
// updating the DynamoDB job record.
// ─────────────────────────────────────────────────────────────────────────────

async function runInstallJob(
  jobId: string,
  repoId: string,
  githubToken: string
): Promise<void> {
  const updateStep = async (stepId: StepId, status: StepStatus) => {
    await dynamo.send(
      new UpdateCommand({
        TableName: INSTALL_TABLE,
        Key: { jobId },
        UpdateExpression: "SET #steps.#sid = :s, overallStatus = :o",
        ExpressionAttributeNames: { "#steps": "steps", "#sid": stepId },
        ExpressionAttributeValues: {
          ":s": status,
          ":o": status === "failed" ? "failed" : "in_progress",
        },
      })
    );
  };

  for (const step of INSTALL_STEPS) {
    try {
      await updateStep(step.id, "in_progress");
      // Simulate async work (replace with real logic per step)
      await new Promise((r) => setTimeout(r, 800));
      await updateStep(step.id, "complete");
    } catch (e) {
      logger.error({ jobId, step: step.id, msg: "Install step failed", e });
      await updateStep(step.id, "failed");
      await dynamo.send(
        new UpdateCommand({
          TableName: INSTALL_TABLE,
          Key: { jobId },
          UpdateExpression: "SET overallStatus = :s",
          ExpressionAttributeValues: { ":s": "failed" },
        })
      );
      return;
    }
  }

  // Mark overall job complete
  await dynamo.send(
    new UpdateCommand({
      TableName: INSTALL_TABLE,
      Key: { jobId },
      UpdateExpression: "SET overallStatus = :s",
      ExpressionAttributeValues: { ":s": "complete" },
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/install
// ─────────────────────────────────────────────────────────────────────────────

export const installRepo = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(
    event.headers?.Authorization ?? event.headers?.authorization
  );
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId path parameter.");

  // Check if already installed
  const existing = await dynamo.send(
    new GetCommand({ TableName: INSTALL_TABLE, Key: { jobId: `install_${repoId}` } })
  );
  if (existing.Item && existing.Item.overallStatus === "complete") {
    return errors.alreadyInstalled(repoId);
  }

  const jobId   = `job_${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
  const repoSlug = repoId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const now      = new Date().toISOString();

  const initialSteps = Object.fromEntries(
    INSTALL_STEPS.map((s) => [s.id, "queued"])
  );

  // Persist job record
  await dynamo.send(
    new PutCommand({
      TableName: INSTALL_TABLE,
      Item: {
        jobId,
        repoId,
        repoSlug,
        userId:        user.userId,
        overallStatus: "queued",
        githubRepoId:  repoId,
        steps:         initialSteps,
        createdAt:     now,
      },
    })
  );

  // Fire async job (in production → SQS/Step Functions)
  runInstallJob(jobId, repoId, user.githubToken).catch((e) =>
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

  const user = await resolveUser(
    event.headers?.Authorization ?? event.headers?.authorization
  );
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId path parameter.");

  // Find the most recent install job for this repo
  const scanResult = await dynamo.send(
    new ScanCommand({
      TableName: INSTALL_TABLE,
      FilterExpression: "repoId = :r AND userId = :u",
      ExpressionAttributeValues: { ":r": repoId, ":u": user.userId },
    })
  );
  const jobs = scanResult.Items;

  if (!jobs || jobs.length === 0) {
    return errors.notFound(`No install job found for repository '${repoId}'.`);
  }

  // Return the most recent job
  const job = jobs.sort((a: any, b: any) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  )[0];

  const steps = INSTALL_STEPS.map((s) => ({
    id:     s.id,
    label:  s.label,
    status: (job.steps?.[s.id] ?? "queued") as StepStatus,
  }));

  return ok({
    job_id:         job.jobId,
    overall_status: job.overallStatus ?? "queued",
    steps,
    repo_slug:      job.repoSlug ?? repoId.toLowerCase(),
  });
};
