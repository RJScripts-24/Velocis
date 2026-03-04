/**
 * rebuildCortex.ts
 * Manual endpoint to rebuild Cortex graph for a repository
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { buildCortexGraph } from "../../functions/cortex/graphBuilder";
import { syncCortexServices } from "../../functions/cortex/syncCortexServices";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient, dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";
import { logger } from "../../utils/logger";
import { ok, errors } from "../../utils/apiResponse";
import { config } from "../../utils/config";
import * as crypto from "crypto";

const docClient = getDocClient();
const REPOSITORIES_TABLE = config.DYNAMO_REPOSITORIES_TABLE;

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
      githubId: string;
      expiresAt: string;
    }>({
      tableName: DYNAMO_TABLES.USERS,
      key: { userId: `session_${sessionTokenHash}` },
    });

    logger.info({ found: !!sessionRecord, userId: sessionRecord?.userId }, 'Session record lookup result');

    if (!sessionRecord || new Date(sessionRecord.expiresAt) <= new Date()) {
      return errors.unauthorized("Session expired");
    }

    logger.info({ githubId: sessionRecord.githubId }, 'Getting GitHub token');
    let githubToken: string;
    try {
      githubToken = await getUserToken(sessionRecord.githubId);
      logger.info({ hasToken: !!githubToken }, 'GitHub token retrieved');
    } catch (tokenError) {
      logger.error({ error: tokenError, githubId: sessionRecord.githubId, stack: tokenError instanceof Error ? tokenError.stack : undefined }, 'Failed to get GitHub token');
      throw tokenError;
    }
    
    if (!githubToken) {
      return errors.unauthorized("No GitHub token found");
    }

    // 2. Get repo details from DynamoDB
    const repoResult = await docClient.send(
      new GetCommand({
        TableName: REPOSITORIES_TABLE,
        Key: { repoId },
      })
    );

    if (!repoResult.Item) {
      return errors.notFound("Repository not found");
    }

    const repo = repoResult.Item;
    logger.info({ repoId: repo.repoId, repoFullName: repo.repoFullName, repoOwner: repo.repoOwner, repoName: repo.repoName }, 'Found repo');
    
    // Use repoFullName from DB, or construct from parts, or use repoId as fallback
    let owner: string;
    let name: string;
    
    if (repo.repoFullName && repo.repoFullName.includes('/')) {
      [owner, name] = repo.repoFullName.split("/");
    } else if (repo.repoOwner && repo.repoName) {
      owner = repo.repoOwner;
      name = repo.repoName;
    } else {
      // Fallback: resolve owner/name from GitHub API using the numeric repo ID
      logger.info({ repoId }, 'Resolving owner/name from GitHub API by repo ID');
      try {
        const ghRes = await fetch(`https://api.github.com/repositories/${repoId}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
        });
        if (!ghRes.ok) throw new Error(`GitHub API returned ${ghRes.status}`);
        const ghRepo = await ghRes.json() as { full_name: string; owner: { login: string }; name: string };
        owner = ghRepo.owner.login;
        name = ghRepo.name;
        logger.info({ owner, name }, 'Resolved repo owner/name from GitHub API');
        // Back-fill the DynamoDB record so future rebuilds work without this fallback
        await docClient.send(new (await import('@aws-sdk/lib-dynamodb').then(m => m.UpdateCommand))({
          TableName: REPOSITORIES_TABLE,
          Key: { repoId },
          UpdateExpression: 'SET repoOwner = :o, repoFullName = :f, repoName = :n',
          ExpressionAttributeValues: { ':o': owner, ':f': ghRepo.full_name, ':n': name },
        }));
      } catch (ghErr) {
        logger.error({ repo, ghErr }, 'Could not resolve repo owner from GitHub API');
        return errors.badRequest("Repository is missing owner/name information. Please reinstall this repository from the onboarding page.");
      }
    }

    // 3. Rebuild the graph
    logger.info(`Building Cortex graph for ${owner}/${name}`);
    const graph = await buildCortexGraph({
      repoId,
      repoOwner: owner,
      repoName: name,
      accessToken: githubToken,
      enableAiSummaries: true, // DeepSeek V3.2 via Bedrock
      forceRebuild: true,
    });

    // 3. Graph is already cached to DynamoDB by buildCortexGraph() itself (setCachedGraph).
    //    Sync services into the CORTEX_TABLE for the service-level map view.
    await syncCortexServices(repoId, graph);

    logger.info(`Cortex rebuild complete for ${repoId}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

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
