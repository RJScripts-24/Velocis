/**
 * auth.ts
 * Velocis — Authentication Handlers
 *
 * Routes:
 *   GET  /auth/github              → Redirect to GitHub OAuth consent screen
 *   GET  /auth/github/callback     → Exchange OAuth code for JWT; redirect to frontend
 *   POST /auth/logout              → Invalidate user session / JWT
 *
 * Strategy:
 *   GitHub OAuth 2.0.  After code exchange the backend mints a short-lived
 *   JWT (24 h) that is returned either as an HttpOnly cookie or in the JSON
 *   body (see API_CONTRACT §1).  User profile is persisted to DynamoDB on
 *   first login and updated on subsequent logins.
 */

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { randomUUID, createHash } from "crypto";
import * as jwt from "jsonwebtoken";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import axios from "axios";
import { config } from "../../utils/config";
import { logger } from "../../utils/logger";
import {
  ok,
  err,
  errors,
  preflight,
  extractBearerToken,
} from "../../utils/apiResponse";
import { revokeUserToken } from "../../services/github/auth";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNALS
// ─────────────────────────────────────────────────────────────────────────────

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";
const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";
const JWT_TTL_S = 86400; // 24 hours

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

/**
 * Exchange GitHub OAuth code for an access token.
 */
async function exchangeGithubCode(code: string): Promise<GitHubTokenResponse> {
  const { data } = await axios.post<GitHubTokenResponse>(
    "https://github.com/login/oauth/access_token",
    {
      client_id: config.GITHUB_CLIENT_ID,
      client_secret: config.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: "application/json" } }
  );
  return data;
}

/**
 * Fetch the authenticated user's GitHub profile.
 */
async function getGithubUser(accessToken: string): Promise<GitHubUserResponse> {
  const { data } = await axios.get<GitHubUserResponse>("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  return data;
}

/**
 * Mint a Velocis JWT for the given user ID.
 */
function mintJwt(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_TTL_S });
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /auth/github
// Redirect the browser to GitHub's consent screen.
// ─────────────────────────────────────────────────────────────────────────────

export const initiateGithubOAuth = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const state = randomUUID(); // CSRF token — in production store in a short-lived cookie
  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: `${config.API_GATEWAY_BASE_URL ?? "https://api.velocis.dev/v1"}/auth/github/callback`,
    scope: "repo read:user user:email",
    state,
  });

  return {
    statusCode: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
    },
    body: "",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /auth/github/callback
// GitHub redirects here after the user authorises.  Exchange code → tokens,
// upsert user in DynamoDB, issue our own JWT.
// ─────────────────────────────────────────────────────────────────────────────

export const handleGithubCallback = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const { code, state } = event.queryStringParameters ?? {};
  if (!code) return errors.badRequest("Missing OAuth code parameter.");

  try {
    // 1. Exchange code for GitHub access token
    const tokenData = await exchangeGithubCode(code);
    if (!tokenData.access_token) return errors.oauthFailed("GitHub did not return an access token.");

    // 2. Fetch the user's GitHub profile
    const ghUser = await getGithubUser(tokenData.access_token);

    // 3. Upsert user in DynamoDB
    const userId = `usr_${ghUser.id}`;
    const now = new Date().toISOString();

    // Check if user already exists to preserve created_at
    let createdAt = now;
    try {
      const existing = await dynamo.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } })
      );
      if (existing.Item) createdAt = existing.Item.created_at ?? now;
    } catch (_) {
      /* new user — use current time */
    }

    await dynamo.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          id: userId,
          github_id: ghUser.id,
          login: ghUser.login,
          name: ghUser.name ?? ghUser.login,
          email: ghUser.email ?? null,
          avatar_url: ghUser.avatar_url,
          github_token: tokenData.access_token, // encrypted at rest via DynamoDB KMS
          created_at: createdAt,
          updated_at: now,
        },
      })
    );

    // 4. Mint our own JWT
    const velocisToken = mintJwt(userId);

    // 5. Respond — return token in JSON body and as a short-lived cookie
    const responseBody = {
      access_token: velocisToken,
      token_type: "bearer",
      expires_in: JWT_TTL_S,
      user: {
        id: userId,
        github_id: ghUser.id,
        login: ghUser.login,
        name: ghUser.name ?? ghUser.login,
        email: ghUser.email,
        avatar_url: ghUser.avatar_url,
      },
    };

    logger.info({ userId, msg: "GitHub OAuth successful" });
    return ok(responseBody);
  } catch (e: any) {
    logger.error({ msg: "GitHub OAuth callback failed", error: e?.message });
    return errors.oauthFailed(e?.message ?? "OAuth flow failed");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
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

/** Build Set-Cookie headers that immediately expire both session cookies */
function clearCookieHeaders(): string[] {
  const isProduction = (process.env.NODE_ENV ?? "development") === "production";
  const sessionBase = ["HttpOnly", isProduction ? "SameSite=None" : "SameSite=Lax", "Max-Age=0", "Path=/", ...(isProduction ? ["Secure"] : [])];
  const stateBase  = ["HttpOnly", "SameSite=Lax", "Max-Age=0", "Path=/", ...(isProduction ? ["Secure"] : [])];
  return [
    `velocis_session=; ${sessionBase.join("; ")}`,
    `github_oauth_state=; ${stateBase.join("; ")}`,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /auth/logout
// Accepts BOTH session-cookie auth (new flow) and Bearer JWT (legacy).
// Deletes the session record from DynamoDB and clears the browser cookie.
// ─────────────────────────────────────────────────────────────────────────────

export const logout = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");

  // ── 1. Session-cookie auth (primary flow) ──────────────────────────────────
  if (sessionToken) {
    try {
      const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");
      const sessionKey = `session_${sessionTokenHash}`;

      // Delete the session record so it can't be reused
      await dynamoClient.remove({
        tableName: DYNAMO_TABLES.USERS,
        key: { githubId: sessionKey },
      });

      logger.info({ msg: "User logged out via session cookie" });
    } catch (e) {
      // Non-fatal — session may have already expired; still clear the cookie
      logger.warn({ msg: "Could not delete session record on logout", error: String(e) });
    }

    return {
      statusCode: 204,
      multiValueHeaders: { "Set-Cookie": clearCookieHeaders() },
      headers: {},
      body: "",
    };
  }

  // ── 2. Bearer JWT auth (legacy flow) ──────────────────────────────────────
  const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
  if (!token) {
    // No auth at all — still clear cookies so the browser is cleaned up
    return {
      statusCode: 204,
      multiValueHeaders: { "Set-Cookie": clearCookieHeaders() },
      headers: {},
      body: "",
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    const userId = decoded.sub;

    try {
      await revokeUserToken(userId);
    } catch (revokeErr) {
      logger.warn({ msg: "Failed to revoke GitHub token, proceeding to clean up session", error: revokeErr });
    }

    // Clear the stored GitHub token so the session cannot be reused
    await dynamo.send(
      new DeleteCommand({ TableName: USERS_TABLE, Key: { id: userId } })
    );

    logger.info({ userId, msg: "User logged out via JWT" });
    return {
      statusCode: 204,
      multiValueHeaders: { "Set-Cookie": clearCookieHeaders() },
      headers: {},
      body: "",
    };
  } catch (e) {
    // Invalid token — still clear cookies
    return {
      statusCode: 204,
      multiValueHeaders: { "Set-Cookie": clearCookieHeaders() },
      headers: {},
      body: "",
    };
  }
};
