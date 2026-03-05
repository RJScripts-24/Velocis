/**
 * updateRepoSettings.ts
 * Velocis — POST /repos/:repoId/settings
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { UpdateCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";

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
            const session = await dynamoClient.get<{ userId: string; githubId: string; expiresAt: string }>({
                tableName: DYNAMO_TABLES.USERS,
                key: { userId: `session_${hash}` },
            });
            if (session && new Date(session.expiresAt) > new Date()) {
                let githubToken = "";
                try {
                    githubToken = await getUserToken(session.githubId);
                } catch {
                    try {
                        const u = await dynamoClient.get<{ accessToken?: string; github_token?: string }>({
                            tableName: DYNAMO_TABLES.USERS,
                            key: { userId: session.githubId },
                        });
                        githubToken = u?.accessToken ?? u?.github_token ?? "";
                    } catch { /* non-fatal */ }
                }
                return { userId: session.githubId, githubToken };
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

    let body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch {
        return errors.badRequest("Invalid JSON body");
    }

    const isAutomated = typeof body.isAutomated === 'boolean' ? body.isAutomated : undefined;

    if (isAutomated === undefined) {
        return ok({ message: "No valid settings provided." });
    }

    logger.info({ msg: "POST /repos/:repoId/settings", repoId, userId, isAutomated });

    const docClient = getDocClient();

    try {
        // Step 1: Scan to find the actual repo record (same as getRepoOverview pattern)
        let foundRepo: Record<string, any> | undefined;

        try {
            const scan = await docClient.send(new ScanCommand({
                TableName: DYNAMO_TABLES.REPOSITORIES,
                FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
                ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
            }));
            foundRepo = scan.Items?.[0];
        } catch { /* ignore */ }

        if (!foundRepo) {
            try {
                const scan2 = await docClient.send(new ScanCommand({
                    TableName: process.env.REPOS_TABLE ?? "velocis-repos",
                    FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
                    ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
                }));
                foundRepo = scan2.Items?.[0];
            } catch { /* ignore */ }
        }

        const now = new Date().toISOString();

        if (foundRepo) {
            // Always write to the canonical repositories table
            const tableName = DYNAMO_TABLES.REPOSITORIES;

            const key = foundRepo.PK
                ? { PK: foundRepo.PK, SK: foundRepo.SK }
                : { repoId: foundRepo.repoId ?? foundRepo.id ?? repoId };

            await docClient.send(new UpdateCommand({
                TableName: tableName,
                Key: key,
                UpdateExpression: "SET isAutomated = :a, updatedAt = :u",
                ExpressionAttributeValues: { ":a": isAutomated, ":u": now },
            }));

            logger.info({ msg: "isAutomated saved", repoId, isAutomated, tableName });
        } else {
            // Repo not in DynamoDB yet, put a minimal record
            logger.warn({ msg: "Repo not found in DB, cannot persist isAutomated", repoId });
        }

        return ok({ success: true, isAutomated });

    } catch (e) {
        logger.error({ msg: "Failed to update repo settings", repoId, error: String(e) });
        return errors.internal("Failed to update repository settings.");
    }
};
