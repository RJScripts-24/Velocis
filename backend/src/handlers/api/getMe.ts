/**
 * getMe.ts
 * Velocis — GET /me
 *
 * Returns the currently authenticated user's profile, sourced from DynamoDB.
 * Supports session cookie auth (velocis_session) and JWT Bearer token fallback.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key?.trim() === name) return valueParts.join("=").trim() || null;
  }
  return null;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  let userId: string | null = null;

  // 1. Session cookie auth
  const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
  const sessionToken = parseCookieValue(cookieHeader, "velocis_session");

  if (sessionToken) {
    try {
      const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionRecord = await dynamoClient.get<{ githubId: string; expiresAt: string }>({
        tableName: DYNAMO_TABLES.USERS,
        key: { githubId: `session_${sessionTokenHash}` },
      });
      if (sessionRecord && new Date(sessionRecord.expiresAt) > new Date()) {
        userId = sessionRecord.githubId;
      }
    } catch (e) {
      logger.error({ msg: "Error resolving session cookie", error: String(e) });
    }
  }

  // 2. JWT Bearer fallback
  if (!userId) {
    const token = extractBearerToken(
      event.headers?.Authorization ?? event.headers?.authorization
    );
    if (!token) return errors.unauthorized();

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      userId = decoded.sub.startsWith("usr_") ? decoded.sub.slice(4) : decoded.sub;
    } catch {
      return errors.unauthorized("Token is invalid or expired.");
    }
  }

  const u = await dynamoClient.get<any>({
    tableName: DYNAMO_TABLES.USERS,
    key: { githubId: userId! },
  });

  if (!u) return errors.notFound("User not found.");

  logger.info({ userId, msg: "GET /me" });

  return ok({
    id:         u.userId  ?? u.id,
    github_id:  u.githubId ?? u.github_id,
    login:      u.username  ?? u.login,
    name:       u.displayName ?? u.name,
    email:      u.email,
    avatar_url: u.avatarUrl ?? u.avatar_url,
    created_at: u.createdAt ?? u.created_at,
  });
};
