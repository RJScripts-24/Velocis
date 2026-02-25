// src/services/github/auth.ts
// GitHub OAuth and GitHub App authentication for Velocis
// Handles: OAuth flow, token exchange, installation tokens, token refresh
// Two auth modes: OAuth App (user login) + GitHub App (repo installation)

import { createAppAuth } from "@octokit/auth-app";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { Octokit } from "@octokit/rest";
import * as crypto from "crypto";
import { dynamoClient, DYNAMO_TABLES } from "../database/dynamoClient";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface OAuthInitParams {
  redirectUri?: string;
  scopes?: GitHubScope[];
  state?: string;       // CSRF token — auto-generated if not provided
}

export interface OAuthInitResult {
  authorizationUrl: string;
  state: string;        // Must be stored in session/cookie for CSRF validation
}

export interface OAuthCallbackParams {
  code: string;         // Temporary code from GitHub callback
  state: string;        // State from callback — must match stored state
  storedState: string;  // State stored in session/cookie during init
}

export interface OAuthTokenResult {
  accessToken: string;
  tokenType: string;
  scope: string;
  userId: string;
  userLogin: string;
  avatarUrl: string;
  expiresAt?: string;   // Only present if token expiration is enabled
}

export interface InstallationTokenResult {
  token: string;
  expiresAt: string;    // ISO string — tokens expire after 1 hour
  installationId: number;
  permissions: Record<string, string>;
  repositorySelection: "all" | "selected";
}

export interface StoredUserToken {
  userId: string;
  userLogin: string;
  accessToken: string;  // Encrypted at rest
  scope: string;
  tokenType: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface StoredInstallationToken {
  installationId: number;
  token: string;        // Encrypted at rest
  expiresAt: string;
  permissions: Record<string, string>;
  createdAt: string;
}

// GitHub permission scopes Velocis needs
export type GitHubScope =
  | "repo"              // Full repo access (read + write code, PRs)
  | "read:org"          // Read org membership
  | "read:user"         // Read user profile
  | "user:email"        // Read user email
  | "write:discussion"  // Post PR review comments
  | "workflow";         // Trigger GitHub Actions (for Fortress TDD)

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const DEFAULT_SCOPES: GitHubScope[] = [
  "repo",
  "read:user",
  "user:email",
  "write:discussion",
];

// Installation tokens expire after 1 hour — refresh 5 minutes before
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// State parameter TTL — CSRF tokens expire after 10 minutes
const STATE_TTL_MS = 10 * 60 * 1000;

// ─────────────────────────────────────────────
// OCTOKIT INSTANCES
// ─────────────────────────────────────────────

// Unauthenticated client — for public API calls only
const publicOctokit = new Octokit();

// App-level authenticated client — for installation token generation
function getAppOctokit(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.GITHUB_APP_ID,
      privateKey: config.GITHUB_APP_PRIVATE_KEY,
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
    },
  });
}

// User-authenticated client — scoped to a specific user's access token
function getUserOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

// ─────────────────────────────────────────────
// OAUTH FLOW — Step 1: Generate Authorization URL
// Called by the /onboarding page "Connect with GitHub" button
// ─────────────────────────────────────────────

/**
 * Generates the GitHub OAuth authorization URL.
 * The user is redirected here to grant Velocis access to their repos.
 * Returns the URL + a CSRF state token that MUST be stored in the session.
 *
 * @example
 * const { authorizationUrl, state } = await initOAuthFlow({
 *   redirectUri: "https://velocis.dev/api/auth/callback",
 *   scopes: DEFAULT_SCOPES,
 * });
 * // Store state in session cookie, redirect user to authorizationUrl
 */
export async function initOAuthFlow(
  params: OAuthInitParams = {}
): Promise<OAuthInitResult> {
  const {
    redirectUri = config.GITHUB_OAUTH_REDIRECT_URI,
    scopes = DEFAULT_SCOPES,
    state = generateCsrfState(),
  } = params;

  // Persist state to DynamoDB with TTL for server-side CSRF validation
  await storeCsrfState(state);

  const scopeString = scopes.join(" ");
  const params_ = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: scopeString,
    state,
    allow_signup: "true",
  });

  const authorizationUrl = `https://github.com/login/oauth/authorize?${params_.toString()}`;

  logger.info({
    msg: "initOAuthFlow: authorization URL generated",
    scopes: scopeString,
    redirectUri,
  });

  return { authorizationUrl, state };
}

// ─────────────────────────────────────────────
// OAUTH FLOW — Step 2: Exchange Code for Token
// Called after GitHub redirects back to /api/auth/callback
// ─────────────────────────────────────────────

/**
 * Exchanges the temporary OAuth code for a permanent access token.
 * Validates the CSRF state, exchanges the code, fetches the user profile,
 * persists the token to DynamoDB, and returns the full token result.
 *
 * @example
 * const tokenResult = await handleOAuthCallback({
 *   code: searchParams.get("code"),
 *   state: searchParams.get("state"),
 *   storedState: session.get("oauthState"),
 * });
 */
export async function handleOAuthCallback(
  params: OAuthCallbackParams
): Promise<OAuthTokenResult> {
  const { code, state, storedState } = params;

  // ── CSRF Validation ───────────────────────────────────────────────────────
  if (!state || state !== storedState) {
    logger.warn({
      msg: "handleOAuthCallback: CSRF state mismatch",
      received: state,
    });
    throw new GitHubAuthError("CSRF state mismatch — possible CSRF attack");
  }

  // Validate state exists in DynamoDB and hasn't expired
  await validateAndConsumeCsrfState(state);

  // ── Token Exchange ────────────────────────────────────────────────────────
  logger.info({ msg: "handleOAuthCallback: exchanging code for token" });

  let accessToken: string;
  let tokenType: string;
  let scope: string;

  try {
    const auth = createOAuthAppAuth({
      clientType: "oauth-app",
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
    });

    const tokenAuth = await auth({
      type: "oauth-user",
      code,
      redirectUrl: config.GITHUB_OAUTH_REDIRECT_URI,
    });

    accessToken = tokenAuth.token;
    tokenType = tokenAuth.tokenType;
    scope = "token" in tokenAuth ? (tokenAuth as any).scopes?.join(" ") ?? "" : "";
  } catch (err) {
    logger.error({
      msg: "handleOAuthCallback: token exchange failed",
      error: String(err),
    });
    throw new GitHubAuthError(`OAuth token exchange failed: ${String(err)}`);
  }

  // ── Fetch GitHub User Profile ─────────────────────────────────────────────
  const userOctokit = getUserOctokit(accessToken);
  const { data: githubUser } = await userOctokit.users.getAuthenticated();

  logger.info({
    msg: "handleOAuthCallback: user authenticated",
    userId: String(githubUser.id),
    login: githubUser.login,
  });

  // ── Persist Token to DynamoDB (encrypted) ────────────────────────────────
  const encryptedToken = encryptToken(accessToken);

  const storedToken: StoredUserToken = {
    userId: String(githubUser.id),
    userLogin: githubUser.login,
    accessToken: encryptedToken,
    scope,
    tokenType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dynamoClient.upsert({
    tableName: DYNAMO_TABLES.USERS,
    item: storedToken,
    key: "userId",
  });

  return {
    accessToken,              // Return plaintext — never stored plaintext
    tokenType,
    scope,
    userId: String(githubUser.id),
    userLogin: githubUser.login,
    avatarUrl: githubUser.avatar_url,
  };
}

// ─────────────────────────────────────────────
// INSTALLATION TOKEN — GitHub App Auth for Repo Operations
// Used by repoOps.ts to read/write code on behalf of the installed app
// Installation tokens expire every hour — cached and refreshed automatically
// ─────────────────────────────────────────────

/**
 * Returns a valid installation token for a GitHub App installation.
 * Checks DynamoDB cache first — only calls GitHub API if token is
 * expired or within the 5-minute refresh buffer.
 *
 * This is what repoOps.ts calls before every GitHub API operation.
 *
 * @example
 * const token = await getInstallationToken(installationId);
 * // → "ghs_xxxxxxxxxxxx" (valid for ~1 hour)
 */
export async function getInstallationToken(
  installationId: number
): Promise<string> {
  // ── Check Cache ───────────────────────────────────────────────────────────
  const cached = await getCachedInstallationToken(installationId);

  if (cached && !isTokenExpiringSoon(cached.expiresAt)) {
    logger.info({
      msg: "getInstallationToken: returning cached token",
      installationId,
      expiresAt: cached.expiresAt,
    });
    return decryptToken(cached.token);
  }

  // ── Generate Fresh Token ──────────────────────────────────────────────────
  logger.info({
    msg: "getInstallationToken: generating fresh installation token",
    installationId,
  });

  try {
    const appOctokit = getAppOctokit();
    const { data } = await appOctokit.apps.createInstallationAccessToken({
      installation_id: installationId,
    });

    const tokenResult: InstallationTokenResult = {
      token: data.token,
      expiresAt: data.expires_at,
      installationId,
      permissions: data.permissions as Record<string, string>,
      repositorySelection: data.repository_selection as "all" | "selected",
    };

    // ── Cache the new token in DynamoDB ───────────────────────────────────
    await cacheInstallationToken(tokenResult);

    logger.info({
      msg: "getInstallationToken: new token generated and cached",
      installationId,
      expiresAt: tokenResult.expiresAt,
    });

    return tokenResult.token;
  } catch (err) {
    logger.error({
      msg: "getInstallationToken: failed to generate token",
      installationId,
      error: String(err),
    });
    throw new GitHubAuthError(
      `Failed to generate installation token for installation ${installationId}: ${String(err)}`
    );
  }
}

// ─────────────────────────────────────────────
// USER TOKEN — Retrieve stored token for a user
// ─────────────────────────────────────────────

/**
 * Retrieves and decrypts the stored OAuth access token for a user.
 * Used when making API calls on behalf of a specific user.
 *
 * @example
 * const token = await getUserToken("12345678");
 * const octokit = new Octokit({ auth: token });
 */
export async function getUserToken(userId: string): Promise<string> {
  const stored = await dynamoClient.get<StoredUserToken>({
    tableName: DYNAMO_TABLES.USERS,
    key: { userId },
  });

  if (!stored) {
    throw new GitHubAuthError(
      `No stored token found for userId: ${userId} — user must re-authenticate`
    );
  }

  return decryptToken(stored.accessToken);
}

// ─────────────────────────────────────────────
// TOKEN REVOCATION — Cleanup on user disconnect
// Called when user removes Velocis from their account
// ─────────────────────────────────────────────

/**
 * Revokes a user's OAuth token and deletes it from DynamoDB.
 * Called when a user disconnects their GitHub account from Velocis.
 *
 * @example
 * await revokeUserToken("12345678");
 */
export async function revokeUserToken(userId: string): Promise<void> {
  const stored = await dynamoClient.get<StoredUserToken>({
    tableName: DYNAMO_TABLES.USERS,
    key: { userId },
  });

  if (!stored) {
    logger.warn({
      msg: "revokeUserToken: no token found to revoke",
      userId,
    });
    return;
  }

  const plainToken = decryptToken(stored.accessToken);

  // Revoke at GitHub's end
  try {
    await publicOctokit.request(
      "DELETE /applications/{client_id}/token",
      {
        client_id: config.GITHUB_CLIENT_ID,
        access_token: plainToken,
        headers: {
          authorization: `Basic ${Buffer.from(
            `${config.GITHUB_CLIENT_ID}:${config.GITHUB_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    logger.info({
      msg: "revokeUserToken: token revoked at GitHub",
      userId,
    });
  } catch (err) {
    // Log but don't throw — still delete from DynamoDB even if GitHub revocation fails
    logger.warn({
      msg: "revokeUserToken: GitHub revocation failed (deleting locally anyway)",
      userId,
      error: String(err),
    });
  }

  // Delete from DynamoDB
  await dynamoClient.remove({
    tableName: DYNAMO_TABLES.USERS,
    key: { userId },
  });

  logger.info({
    msg: "revokeUserToken: token deleted from DynamoDB",
    userId,
  });
}

// ─────────────────────────────────────────────
// TOKEN VALIDATION — Check if a stored token is still valid
// ─────────────────────────────────────────────

/**
 * Validates that a stored user token is still accepted by GitHub.
 * Makes a lightweight /user API call to check token validity.
 * Returns false (doesn't throw) if token is invalid.
 *
 * @example
 * const isValid = await validateUserToken("12345678");
 * if (!isValid) redirect("/api/auth/login");
 */
export async function validateUserToken(userId: string): Promise<boolean> {
  try {
    const token = await getUserToken(userId);
    const octokit = getUserOctokit(token);
    await octokit.users.getAuthenticated();
    return true;
  } catch {
    logger.warn({
      msg: "validateUserToken: token invalid or expired",
      userId,
    });
    return false;
  }
}

// ─────────────────────────────────────────────
// CSRF STATE HELPERS
// ─────────────────────────────────────────────

function generateCsrfState(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function storeCsrfState(state: string): Promise<void> {
  await dynamoClient.upsert({
    tableName: DYNAMO_TABLES.USERS,
    item: {
      userId: `csrf_${state}`,    // Namespaced to avoid collision with real users
      state,
      type: "csrf",
      expiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
      ttl: Math.floor((Date.now() + STATE_TTL_MS) / 1000),
    },
    key: "userId",
  });
}

async function validateAndConsumeCsrfState(state: string): Promise<void> {
  const record = await dynamoClient.get<{ expiresAt: string }>({
    tableName: DYNAMO_TABLES.USERS,
    key: { userId: `csrf_${state}` },
  });

  if (!record) {
    throw new GitHubAuthError("CSRF state not found — may have expired or already been used");
  }

  if (new Date(record.expiresAt) < new Date()) {
    throw new GitHubAuthError("CSRF state expired — OAuth flow took too long");
  }

  // Consume: delete immediately — one-time use only
  await dynamoClient.remove({
    tableName: DYNAMO_TABLES.USERS,
    key: { userId: `csrf_${state}` },
  });
}

// ─────────────────────────────────────────────
// INSTALLATION TOKEN CACHE HELPERS
// ─────────────────────────────────────────────

async function getCachedInstallationToken(
  installationId: number
): Promise<StoredInstallationToken | null> {
  return dynamoClient.get<StoredInstallationToken>({
    tableName: DYNAMO_TABLES.USERS,
    key: { userId: `installation_${installationId}` },
  });
}

async function cacheInstallationToken(
  tokenResult: InstallationTokenResult
): Promise<void> {
  const encryptedToken = encryptToken(tokenResult.token);

  await dynamoClient.upsert({
    tableName: DYNAMO_TABLES.USERS,
    item: {
      userId: `installation_${tokenResult.installationId}`,
      installationId: tokenResult.installationId,
      token: encryptedToken,
      expiresAt: tokenResult.expiresAt,
      permissions: tokenResult.permissions,
      type: "installation_token",
      // DynamoDB TTL — auto-expire 1 hour after token creation
      ttl: Math.floor(new Date(tokenResult.expiresAt).getTime() / 1000),
      createdAt: new Date().toISOString(),
    },
    key: "userId",
  });
}

function isTokenExpiringSoon(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  return Date.now() >= expiryTime - TOKEN_REFRESH_BUFFER_MS;
}

// ─────────────────────────────────────────────
// ENCRYPTION HELPERS
// Tokens are encrypted at rest in DynamoDB using AES-256-GCM
// The encryption key comes from AWS Secrets Manager via config
// ─────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a token string using AES-256-GCM.
 * Returns a base64 string: iv:authTag:ciphertext
 */
function encryptToken(plaintext: string): string {
  const key = Buffer.from(config.TOKEN_ENCRYPTION_KEY, "hex"); // 32 bytes = 256 bits
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store as: base64(iv):base64(authTag):base64(ciphertext)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a token string encrypted with encryptToken.
 */
function decryptToken(encrypted: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new GitHubAuthError("Malformed encrypted token — expected iv:authTag:ciphertext");
  }

  const key = Buffer.from(config.TOKEN_ENCRYPTION_KEY, "hex");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// ─────────────────────────────────────────────
// CUSTOM ERROR
// ─────────────────────────────────────────────

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}