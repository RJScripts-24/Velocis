/**
 * getGithubRepos.ts
 * Velocis — GET /github/repos
 *
 * Proxies to the GitHub API to list all repositories accessible to the
 * authenticated user (used for the repo-selection / onboarding screen).
 *
 * Query params:
 *   q        — search filter by repo name
 *   page     — pagination page (default 1)
 *   per_page — results per page (default 20, max 100)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import axios from "axios";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

const dynamo       = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET   = process.env.JWT_SECRET   ?? "changeme-in-production";
const USERS_TABLE  = process.env.USERS_TABLE  ?? "velocis-users";
const INSTALL_TABLE = process.env.INSTALL_TABLE ?? "velocis-installations";

// Map of GitHub language names to their conventional colour codes
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python:     "#3572A5",
  Go:         "#00ADD8",
  Rust:       "#dea584",
  Java:       "#b07219",
  "C#":       "#178600",
  Ruby:       "#701516",
  PHP:        "#4F5D95",
  Swift:      "#F05138",
  Kotlin:     "#A97BFF",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = extractBearerToken(
    event.headers?.Authorization ?? event.headers?.authorization
  );
  if (!token) return errors.unauthorized();

  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    userId = decoded.sub;
  } catch {
    return errors.unauthorized("Token is invalid or expired.");
  }

  // ── Resolve GitHub token from DynamoDB ───────────────────────────────────
  const userItem = await dynamo.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } })
  );
  if (!userItem.Item) return errors.unauthorized("User session not found.");
  const githubToken: string = userItem.Item.github_token;

  // ── Query params ─────────────────────────────────────────────────────────
  const qs       = event.queryStringParameters ?? {};
  const q        = qs.q ?? "";
  const page     = Math.max(1, parseInt(qs.page     ?? "1",  10));
  const per_page = Math.min(100, parseInt(qs.per_page ?? "20", 10));

  // ── Fetch repos from GitHub ───────────────────────────────────────────────
  let ghRepos: any[];
  try {
    const { data } = await axios.get(
      "https://api.github.com/user/repos",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
        params: { per_page: 100, sort: "updated", affiliation: "owner,collaborator,organization_member" },
      }
    );
    ghRepos = data;
  } catch (e: any) {
    logger.error({ userId, msg: "GitHub repos fetch failed", error: e?.message });
    return errors.internal("Failed to fetch repositories from GitHub.");
  }

  // ── Resolve which repos have Velocis installed ───────────────────────────
  let installedRepoIds = new Set<number>();
  try {
    const scan = await dynamo.send(
      new ScanCommand({
        TableName: INSTALL_TABLE,
        FilterExpression: "userId = :uid AND installStatus = :s",
        ExpressionAttributeValues: { ":uid": userId, ":s": "complete" },
        ProjectionExpression: "githubRepoId",
      })
    );
    installedRepoIds = new Set((scan.Items ?? []).map((i: any) => i.githubRepoId));
  } catch (_) { /* non-fatal */ }

  // ── Filter by search query ────────────────────────────────────────────────
  const filtered = q
    ? ghRepos.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    : ghRepos;

  // ── Paginate ──────────────────────────────────────────────────────────────
  const total   = filtered.length;
  const start   = (page - 1) * per_page;
  const paged   = filtered.slice(start, start + per_page);

  const repos = paged.map((r) => ({
    github_id:          r.id,
    name:               r.name,
    full_name:          r.full_name,
    visibility:         r.private ? "private" : "public",
    language:           r.language ?? null,
    language_color:     r.language ? (LANGUAGE_COLORS[r.language] ?? "#6b7280") : null,
    updated_at:         r.updated_at,
    velocis_installed:  installedRepoIds.has(r.id),
  }));

  logger.info({ userId, msg: "GET /github/repos", total });

  return ok({ repos, total, page, per_page });
};
