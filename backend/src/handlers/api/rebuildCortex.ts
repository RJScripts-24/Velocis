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

    // 3. Pre-wipe stale data so the old map disappears immediately
    // 3a. Delete the cached graph so getCortexServiceFiles can't return stale nodes
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
      logger.info({ repoId: canonicalRepoId }, 'Pre-wipe: old graph cache deleted');
    } catch (e) {
      logger.warn({ repoId: canonicalRepoId, e }, 'Pre-wipe: graph cache delete failed — non-fatal');
    }

    // 3b. Delete all stale SERVICE rows so listServices returns empty during rebuild
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
        logger.info({ repoId: canonicalRepoId, count: items.length }, 'Pre-wipe: stale service rows deleted');
      }
    } catch (e) {
      logger.warn({ repoId: canonicalRepoId, e }, 'Pre-wipe: service row delete failed — non-fatal');
    }

    // 4. Rebuild the graph
    logger.info(`Building Cortex graph for ${owner}/${name} (repoId=${canonicalRepoId}, nodes will be fetched live from GitHub)`);
    const graph = await buildCortexGraph({
      repoId: canonicalRepoId,
      repoOwner: owner,
      repoName: name,
      accessToken: githubToken,
      enableAiSummaries: false, // Keep graph small — avoids DynamoDB 400KB item size limit
      forceRebuild: true,
    });

    logger.info(`Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges — syncing services`);

    // Graph is cached to DynamoDB by buildCortexGraph() itself (setCachedGraph).
    // Sync services into the CORTEX_TABLE for the service-level map view.
    await syncCortexServices(canonicalRepoId, graph);

    logger.info(`Cortex rebuild complete for ${canonicalRepoId}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    return ok({
      success: true,
      message: "Cortex graph rebuilt successfully",
      stats: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        services: graph.stats.totalFiles,
      },
    });

  } catch (error) {
    logger.error({ error, msg: "Failed to rebuild Cortex", stack: error instanceof Error ? error.stack : undefined });
    return errors.internal("Failed to rebuild Cortex graph");
  }
}
