/**
 * rebuildCortex.ts
 * Manual endpoint to rebuild Cortex graph for a repository
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { buildCortexGraph } from "../../functions/cortex/graphBuilder.js";
import { syncCortexServices } from "../../functions/cortex/syncCortexServices.js";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient, dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient.js";
import { getUserToken, getInstallationToken } from "../../services/github/auth.js";
import { logger } from "../../utils/logger.js";
import { ok, errors } from "../../utils/apiResponse.js";
import { config } from "../../utils/config.js";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import * as crypto from "crypto";

const docClient = getDocClient();
const REPOSITORIES_TABLE = config.DYNAMO_REPOSITORIES_TABLE;
const CORTEX_TABLE = process.env.CORTEX_TABLE ?? "velocis-cortex";
const SCAN_JOBS_TABLE = process.env.SCAN_JOBS_TABLE ?? "velocis-scan-jobs";

type RebuildJobStatus = "queued" | "running" | "completed" | "failed";

interface RebuildJobRecord {
  scanId: string;
  jobType: "cortex-rebuild";
  repoId: string;
  userId: string;
  status: RebuildJobStatus;
  progressPct: number;
  currentStep: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  stats?: { nodes: number; edges: number; services: number };
}

async function putJob(record: RebuildJobRecord): Promise<void> {
  await docClient.send(new UpdateCommand({
    TableName: SCAN_JOBS_TABLE,
    Key: { scanId: record.scanId },
    UpdateExpression:
      "SET jobType = :jobType, repoId = :repoId, userId = :userId, #status = :status, progressPct = :progressPct, currentStep = :currentStep, #message = :message, createdAt = :createdAt, updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      "#status": "status",
      "#message": "message",
    },
    ExpressionAttributeValues: {
      ":jobType": record.jobType,
      ":repoId": record.repoId,
      ":userId": record.userId,
      ":status": record.status,
      ":progressPct": record.progressPct,
      ":currentStep": record.currentStep,
      ":message": record.message,
      ":createdAt": record.createdAt,
      ":updatedAt": record.updatedAt,
    },
  }));
}

async function updateJob(
  scanId: string,
  patch: Partial<Omit<RebuildJobRecord, "scanId" | "jobType" | "repoId" | "userId" | "createdAt">>
): Promise<void> {
  const setParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const now = new Date().toISOString();
  const next = { ...patch, updatedAt: now } as Record<string, unknown>;

  Object.entries(next).forEach(([key, value]) => {
    const n = `#${key}`;
    const v = `:${key}`;
    names[n] = key;
    values[v] = value;
    setParts.push(`${n} = ${v}`);
  });

  if (setParts.length === 0) return;

  await docClient.send(new UpdateCommand({
    TableName: SCAN_JOBS_TABLE,
    Key: { scanId },
    UpdateExpression: `SET ${setParts.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

function isValidationException(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { name?: string }).name === "ValidationException";
}

function isLikelyRepositoryRecord(item: any): boolean {
  if (!item || typeof item !== "object") return false;
  if (item.activityId || item.agent === "fortress" || item.agent === "sentinel" || item.agent === "cortex") {
    return false;
  }
  return Boolean(
    item.repoSlug ||
    item.repoFullName ||
    item.repoOwner ||
    item.installationId ||
    (typeof item.pk === "string" && typeof item.repoId === "string" && item.pk === item.repoId)
  );
}

function parseCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { repoId } = event.pathParameters || {};

    if (!repoId) {
      return errors.badRequest("Missing repoId");
    }

    logger.info(`Manual rebuild requested for repo ${repoId}`);

    // 1. Get GitHub token from session
    const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
    logger.info({ cookieHeader: cookieHeader ? 'present' : 'missing' }, 'Checking for session cookie');

    const sessionToken = parseCookieValue(cookieHeader, "velocis_session");
    logger.info({ sessionToken: sessionToken ? 'found' : 'not found' }, 'Session token status');

    if (!sessionToken) {
      return errors.unauthorized("No session found");
    }

    const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    logger.info({ sessionTokenHash: sessionTokenHash.substring(0, 10) + '...' }, 'Looking up session');

    const sessionRecord = await dynamoClient.get<{
      userId: string;
      expiresAt: string;
    }>({
      tableName: DYNAMO_TABLES.USERS,
      key: { pk: `SESSION#${sessionTokenHash}` },
    });

    logger.info({ found: !!sessionRecord, userId: sessionRecord?.userId }, 'Session record lookup result');

    if (!sessionRecord || new Date(sessionRecord.expiresAt) <= new Date()) {
      return errors.unauthorized("Session expired");
    }

    // 2. Get repo details from DynamoDB
    const repoResult = await docClient.send(
      new ScanCommand({
        TableName: REPOSITORIES_TABLE,
        FilterExpression: "(repoSlug = :s OR repoId = :s) AND (userId = :uid OR attribute_not_exists(userId))",
        ExpressionAttributeValues: { ":s": repoId, ":uid": sessionRecord.userId },
      })
    );

    const repo = (repoResult.Items ?? []).find(isLikelyRepositoryRecord);
    if (!repo) {
      return errors.notFound("Repository not found");
    }
    const canonicalRepoId = String(repo.repoId ?? repoId);
    logger.info({ repoId: canonicalRepoId, repoFullName: repo.repoFullName, repoOwner: repo.repoOwner, repoName: repo.repoName }, 'Found repo');

    // Prefer the GitHub App installation token — it has full, scoped access to
    // the repo and is always fresh.  Fall back to the user OAuth token only if
    // no installationId is stored (e.g. older installs before App auth was added).
    let githubToken: string;
    const installationId = repo.installationId ? Number(repo.installationId) : undefined;
    if (installationId) {
      logger.info({ installationId }, 'Using GitHub App installation token for rebuild');
      try {
        githubToken = await getInstallationToken(installationId);
      } catch (tokenErr) {
        logger.warn({ installationId, err: tokenErr }, 'Installation token failed — falling back to user OAuth token');
        githubToken = await getUserToken(sessionRecord.userId);
      }
    } else {
      logger.info({ userId: sessionRecord.userId }, 'No installationId on repo — using user OAuth token');
      githubToken = await getUserToken(sessionRecord.userId);
    }

    // Resolve owner / name from the repo record
    let owner: string;
    let name: string;

    if (repo.repoFullName && repo.repoFullName.includes('/')) {
      [owner, name] = repo.repoFullName.split("/");
    } else if (repo.repoOwner && repo.repoName) {
      owner = repo.repoOwner;
      name = repo.repoName;
    } else {
      // Fallback: resolve owner from the USERS_TABLE using the githubId
      logger.info({ repoId: canonicalRepoId, userId: sessionRecord.userId }, 'Resolving owner from USERS_TABLE');
      try {
        const userRes = await docClient.send(new GetCommand({ TableName: DYNAMO_TABLES.USERS, Key: { pk: `USER#${sessionRecord.userId}` } }));
        owner = userRes.Item?.username ?? userRes.Item?.githubLogin ?? userRes.Item?.displayName ?? "";

        if (!owner) {
          // Second fallback: fetch from GitHub via /user
          logger.info({ repoId: canonicalRepoId }, 'Resolving owner from GitHub /user API');
          const ghRes = await fetch(`https://api.github.com/user`, {
            headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
          });
          if (!ghRes.ok) throw new Error(`GitHub API returned ${ghRes.status}`);
          const ghUser = await ghRes.json() as { login: string };
          owner = ghUser.login;
        }

        name = repo.repoName ?? repo.repoId ?? canonicalRepoId;

        logger.info({ owner, name }, 'Resolved repo owner/name from fallbacks');
        // Back-fill the DynamoDB record so future rebuilds work without this fallback.
        // Support both single-table (pk) and legacy (repoId) key schemas.
        const repoPk = typeof repo.pk === "string" && repo.pk.length > 0 ? repo.pk : canonicalRepoId;
        try {
          await docClient.send(new UpdateCommand({
            TableName: REPOSITORIES_TABLE,
            Key: { pk: repoPk },
            UpdateExpression: 'SET repoOwner = :o, repoFullName = :f, repoName = :n',
            ExpressionAttributeValues: { ':o': owner, ':f': `${owner}/${name}`, ':n': name },
          }));
        } catch (updateErr) {
          if (!isValidationException(updateErr)) throw updateErr;
          await docClient.send(new UpdateCommand({
            TableName: REPOSITORIES_TABLE,
            Key: { repoId: canonicalRepoId },
            UpdateExpression: 'SET repoOwner = :o, repoFullName = :f, repoName = :n',
            ExpressionAttributeValues: { ':o': owner, ':f': `${owner}/${name}`, ':n': name },
          }));
        }
      } catch (err) {
        logger.error({ repo, err }, 'Could not resolve repo owner');
        return errors.badRequest("Repository is missing owner/name information. Please reinstall this repository from the onboarding page.");
      }
    }

    const scanId = `cortex-rebuild-${canonicalRepoId}-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await putJob({
      scanId,
      jobType: "cortex-rebuild",
      repoId: canonicalRepoId,
      userId: sessionRecord.userId,
      status: "queued",
      progressPct: 0,
      currentStep: "queued",
      message: "Rebuild queued",
      createdAt: now,
      updatedAt: now,
    });

    const runRebuild = async () => {
      try {
        await updateJob(scanId, {
          status: "running",
          progressPct: 10,
          currentStep: "cleanup",
          message: "Clearing stale Cortex data",
        });

        // 1) Pre-wipe stale data so the old map disappears immediately
        try {
          const cacheKey = `REPO#${canonicalRepoId}#CORTEX_GRAPH`;
          try {
            await docClient.send(new DeleteCommand({
              TableName: REPOSITORIES_TABLE,
              Key: { pk: cacheKey },
            }));
          } catch (deleteErr) {
            if (!isValidationException(deleteErr)) throw deleteErr;
            await docClient.send(new DeleteCommand({
              TableName: REPOSITORIES_TABLE,
              Key: { repoId: `${canonicalRepoId}#CORTEX_GRAPH` },
            }));
          }
        } catch (e) {
          logger.warn({ repoId: canonicalRepoId, e }, 'Pre-wipe: graph cache delete failed — non-fatal');
        }

        try {
          const stale = await docClient.send(new ScanCommand({
            TableName: CORTEX_TABLE,
            FilterExpression: 'repoId = :r AND recordType = :t',
            ExpressionAttributeValues: { ':r': canonicalRepoId, ':t': 'SERVICE' },
          }));
          const items = stale.Items ?? [];
          if (items.length > 0) {
            const chunks: any[][] = [];
            for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25));
            for (const chunk of chunks) {
              await docClient.send(new BatchWriteCommand({
                RequestItems: {
                  [CORTEX_TABLE]: chunk.map(item => ({ DeleteRequest: { Key: { id: item.id } } })),
                },
              }));
            }
          }
        } catch (e) {
          logger.warn({ repoId: canonicalRepoId, e }, 'Pre-wipe: service row delete failed — non-fatal');
        }

        await updateJob(scanId, {
          progressPct: 45,
          currentStep: "graph-build",
          message: "Building Cortex graph",
        });

        const graph = await buildCortexGraph({
          repoId: canonicalRepoId,
          repoOwner: owner,
          repoName: name,
          accessToken: githubToken,
          enableAiSummaries: false,
          forceRebuild: true,
        });

        await updateJob(scanId, {
          progressPct: 80,
          currentStep: "service-sync",
          message: "Syncing services",
        });

        await syncCortexServices(canonicalRepoId, graph);

        await updateJob(scanId, {
          status: "completed",
          progressPct: 100,
          currentStep: "completed",
          message: "Cortex rebuild complete",
          completedAt: new Date().toISOString(),
          stats: {
            nodes: graph.nodes.length,
            edges: graph.edges.length,
            services: graph.stats.totalFiles,
          },
        });
      } catch (jobErr) {
        logger.error({ repoId: canonicalRepoId, scanId, error: jobErr }, "Cortex rebuild job failed");
        await updateJob(scanId, {
          status: "failed",
          currentStep: "failed",
          message: "Cortex rebuild failed",
          error: jobErr instanceof Error ? jobErr.message : "Unknown error",
          completedAt: new Date().toISOString(),
        });
      }
    };

    // Fire-and-forget so API responds immediately and avoids gateway timeouts.
    setTimeout(() => {
      void runRebuild();
    }, 0);

    return ok({
      accepted: true,
      job_id: scanId,
      status: "queued",
      message: "Cortex rebuild started",
    }, 202);

  } catch (error) {
    logger.error({ error, msg: "Failed to rebuild Cortex", stack: error instanceof Error ? error.stack : undefined });
    return errors.internal("Failed to rebuild Cortex graph");
  }
}

export async function getStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { repoId, jobId } = event.pathParameters || {};
    if (!repoId || !jobId) return errors.badRequest("Missing repoId or jobId");

    const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
    const sessionToken = parseCookieValue(cookieHeader, "velocis_session");
    if (!sessionToken) return errors.unauthorized("No session found");

    const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const sessionRecord = await dynamoClient.get<{ userId: string; expiresAt: string }>({
      tableName: DYNAMO_TABLES.USERS,
      key: { pk: `SESSION#${sessionTokenHash}` },
    });
    if (!sessionRecord || new Date(sessionRecord.expiresAt) <= new Date()) {
      return errors.unauthorized("Session expired");
    }

    const jobRes = await docClient.send(new GetCommand({
      TableName: SCAN_JOBS_TABLE,
      Key: { scanId: jobId },
    }));
    const job = jobRes.Item as RebuildJobRecord | undefined;
    if (!job || job.jobType !== "cortex-rebuild" || job.repoId !== repoId) {
      return errors.notFound("Rebuild job not found");
    }
    if (job.userId !== sessionRecord.userId) {
      return errors.forbidden();
    }

    return ok({
      job_id: job.scanId,
      repo_id: job.repoId,
      status: job.status,
      progress_pct: job.progressPct,
      current_step: job.currentStep,
      message: job.message,
      error: job.error ?? null,
      stats: job.stats ?? null,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
      completed_at: job.completedAt ?? null,
    });
  } catch (error) {
    logger.error({ error, msg: "Failed to fetch Cortex rebuild status" });
    return errors.internal("Failed to fetch rebuild status");
  }
}
