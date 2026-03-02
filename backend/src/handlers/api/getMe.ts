/**
 * getMe.ts
 * Velocis — GET /me
 *
 * Returns the currently authenticated user's profile, sourced from DynamoDB.
 * The JWT `sub` claim contains the Velocis user ID (`usr_<github_id>`).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";

const dynamo    = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET  = process.env.JWT_SECRET  ?? "changeme-in-production";
const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

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

  const result = await dynamo.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } })
  );

  if (!result.Item) return errors.notFound("User not found.");

  const u = result.Item;
  logger.info({ userId, msg: "GET /me" });

  return ok({
    id:         u.id,
    github_id:  u.github_id,
    login:      u.login,
    name:       u.name,
    email:      u.email,
    avatar_url: u.avatar_url,
    created_at: u.created_at,
  });
};
