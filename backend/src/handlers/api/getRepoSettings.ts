/**
 * getRepoSettings.ts
 * Velocis — GET /repos/:repoId/settings
 * Returns the saved automation settings for a given repository.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse.js";
import { logger } from "../../utils/logger.js";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient.js";
import { getUserToken } from "../../services/github/auth.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
    if (!cookieHeader) return null;
    for (const cookie of cookieHeader.split(";").map((c) => c.trim())) {
        const [key, ...valueParts] = cookie.split("=");
        if (key?.trim() === name) return valueParts.join("=").trim() || null;
    }
    return null;
}

async function resolveUser(event: APIGatewayProxyEvent): Promise<{ userId: string; githubToken: string } | null> {
    const cookieHeader = event.headers?.["cookie"] ?? event.headers?.["Cookie"];
    const sessionToken = parseCookieValue(cookieHeader, "velocis_session");
    if (sessionToken) {
        try {
            const hash = crypto.createHash("sha256").update(sessionToken).digest("hex");
            const session = await dynamoClient.get<{ userId: string; expiresAt: string }>({
                tableName: DYNAMO_TABLES.USERS,
                key: { pk: `SESSION#${hash}` },
            });
            if (session && new Date(session.expiresAt) > new Date()) {
                let githubToken = "";
                try {
                    githubToken = await getUserToken(session.userId);
                } catch {
                    try {
                        const u = await dynamoClient.get<{ accessToken?: string; github_token?: string }>({
                            tableName: DYNAMO_TABLES.USERS,
                            key: { pk: `USER#${session.userId}` },
                        });
                        githubToken = u?.accessToken ?? u?.github_token ?? "";
                    } catch { /* non-fatal */ }
                }
                return { userId: session.userId, githubToken };
            }
        } catch (e) {
            logger.error({ msg: "Session lookup failed", error: String(e) });
        }
    }
    const token = extractBearerToken(event.headers?.Authorization ?? event.headers?.authorization);
    if (!token) return null;
    try {
        const { sub } = jwt.verify(token, JWT_SECRET) as { sub: string };
        return { userId: sub, githubToken: "" };
    } catch {
        return null;
    }
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === "OPTIONS") return preflight();

    const user = await resolveUser(event);
    if (!user) return errors.unauthorized();
    const { userId } = user;

    const repoId = event.pathParameters?.repoId;
    if (!repoId) return errors.badRequest("Missing repoId path parameter.");

    logger.info({ msg: "GET /repos/:repoId/settings", repoId, userId });

    const docClient = getDocClient();

    // Use same scan pattern as getRepoOverview.ts — scan by repoSlug OR repoId
    let repo: Record<string, any> | undefined;

    try {
        const scan = await docClient.send(new ScanCommand({
            TableName: DYNAMO_TABLES.REPOSITORIES,
            FilterExpression: "(repoSlug = :s OR repoId = :s OR #id = :s OR pk = :s) AND userId = :uid",
            ExpressionAttributeNames: { "#id": "id" },
            ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
        }));
        repo = scan.Items?.[0];
    } catch (e) {
        logger.warn({ msg: "REPOSITORIES scan failed", error: String(e) });
    }

    if (!repo) {
        try {
            const scan2 = await docClient.send(new ScanCommand({
                TableName: process.env.REPOS_TABLE ?? "velocis-repos",
                FilterExpression: "(repoSlug = :s OR repoId = :s OR #id = :s OR pk = :s) AND userId = :uid",
                ExpressionAttributeNames: { "#id": "id" },
                ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
            }));
            repo = scan2.Items?.[0];
        } catch { /* non-fatal */ }
    }

    // Even if repo not found in DynamoDB, return default (false) — don't 404
    const isAutomated = repo?.isAutomated === true;

    return ok({ isAutomated });
};
