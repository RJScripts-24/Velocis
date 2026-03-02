/**
 * apiResponse.ts
 * Velocis — Shared API response helpers
 *
 * Centralises:
 *   - Error formatting per the API contract:
 *       { error: { code, message, status } }
 *   - Success response shaping
 *   - CORS headers (required by the frontend at https://app.velocis.dev)
 */

import { APIGatewayProxyResult } from "aws-lambda";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "REPO_NOT_FOUND"
  | "NOT_FOUND"
  | "ALREADY_INSTALLED"
  | "GITHUB_OAUTH_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "AGENT_UNAVAILABLE";

// ─────────────────────────────────────────────────────────────────────────────
// CORS HEADERS
// Allow the Velocis frontend origin with auth credentials
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN ?? "https://app.velocis.dev",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-repo-owner,x-repo-name",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Content-Type": "application/json",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Return a well-formed success response */
export function ok(body: unknown, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/** Return a well-formed error response matching the API contract shape:
 *  `{ error: { code, message, status } }`
 */
export function err(
  statusCode: number,
  code: ErrorCode,
  message: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: { code, message, status: statusCode } }),
  };
}

/** Convenience wrappers for common error statuses */
export const errors = {
  badRequest: (message: string) => err(400, "INVALID_REQUEST", message),
  unauthorized: (message = "Missing or invalid access token") =>
    err(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have access to this resource") =>
    err(403, "FORBIDDEN", message),
  repoNotFound: (repoId: string) =>
    err(404, "REPO_NOT_FOUND", `Repository '${repoId}' not found or not installed.`),
  notFound: (message: string) => err(404, "NOT_FOUND", message),
  alreadyInstalled: (repoId: string) =>
    err(409, "ALREADY_INSTALLED", `Velocis is already installed on '${repoId}'.`),
  oauthFailed: (message = "GitHub OAuth exchange failed") =>
    err(422, "GITHUB_OAUTH_FAILED", message),
  rateLimited: () => err(429, "RATE_LIMITED", "Too many requests. Please slow down."),
  internal: (message = "An unexpected server error occurred") =>
    err(500, "INTERNAL_ERROR", message),
  agentUnavailable: (agent: string) =>
    err(503, "AGENT_UNAVAILABLE", `${agent} agent is temporarily unavailable.`),
};

/** Preflight CORS response for OPTIONS requests */
export function preflight(): APIGatewayProxyResult {
  return { statusCode: 204, headers: CORS_HEADERS, body: "" };
}

/** Extract the Bearer token from an Authorization header */
export function extractBearerToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
