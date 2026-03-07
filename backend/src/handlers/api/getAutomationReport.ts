/**
 * getAutomationReport.ts
 * Velocis — GET /repos/:repoId/automation-report
 * Returns the automationReport stored on the repo document by triggerAutomation.ts.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
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

    logger.info({ msg: "GET /repos/:repoId/automation-report", repoId, userId });

    const docClient = getDocClient();

    try {
        // Find the repo using same scan pattern as getRepoOverview
        let repo: Record<string, any> | undefined;

        try {
            const scan = await docClient.send(new ScanCommand({
                TableName: DYNAMO_TABLES.REPOSITORIES,
                FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
                ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
            }));
            repo = scan.Items?.[0];
        } catch { /* ignore */ }

        if (!repo) {
            try {
                const scan2 = await docClient.send(new ScanCommand({
                    TableName: process.env.REPOS_TABLE ?? "velocis-repos",
                    FilterExpression: "(repoSlug = :s OR repoId = :s) AND userId = :uid",
                    ExpressionAttributeValues: { ":s": repoId, ":uid": userId },
                }));
                repo = scan2.Items?.[0];
            } catch { /* ignore */ }
        }

        // Read the automationReport field from the repo document
        const automationReport = repo?.automationReport;

        if (!automationReport) {
            return ok({
                status: "not_started",
                sentinel: null,
                fortress: null,
                infrastructure: null,
                error: null,
                progress: null,
                lastUpdatedAt: null,
            });
        }

        if (automationReport.status === "running") {
            // A run is stale if:
            //   (a) no progress heartbeat in the last 8 minutes  (covers a single step hanging mid-call)
            //   OR
            //   (b) started more than 22 minutes ago regardless   (covers the full-pipeline cap)
            const now = Date.now();
            const lastUpdated  = new Date(automationReport.updatedAt  ?? automationReport.startedAt ?? 0).getTime();
            const startedAt    = new Date(automationReport.startedAt  ?? 0).getTime();
            const HEARTBEAT_MS = 4  * 60 * 1000;  // 4 min — heartbeat fires every 50 s so 4 min = safe buffer
            const TOTAL_CAP_MS = 22 * 60 * 1000;  // 22 min — hard cap for the whole pipeline
            const isStale = (now - lastUpdated) > HEARTBEAT_MS || (startedAt > 0 && (now - startedAt) > TOTAL_CAP_MS);

            if (isStale) {
                const ageMin = Math.round((now - lastUpdated) / 60000);
                const msg = `Pipeline timed out — no progress for ${ageMin} minute${ageMin !== 1 ? "s" : ""}. Click Restart to try again.`;
                logger.info({ msg: "Automation run is stale — marking as failed", repoId, ageMin });
                try {
                    const { UpdateCommand } = await import("@aws-sdk/lib-dynamodb");
                    await docClient.send(new UpdateCommand({
                        TableName: DYNAMO_TABLES.REPOSITORIES,
                        Key: { repoId: (repo?.repoId ?? (repo as any)?.id ?? repoId) as string },
                        UpdateExpression: "SET automationReport.#st = :failed, automationReport.#err = :err, automationReport.updatedAt = :ts",
                        ExpressionAttributeNames: { "#st": "status", "#err": "error" },
                        ExpressionAttributeValues: {
                            ":failed": "failed",
                            ":err": msg,
                            ":ts": new Date().toISOString(),
                        },
                    }));
                } catch (updateErr) {
                    logger.warn({ msg: "Could not update stale run status", error: String(updateErr) });
                }
                return ok({
                    status: "failed",
                    sentinel: null,
                    fortress: null,
                    infrastructure: null,
                    error: msg,
                    progress: automationReport.progress ?? null,
                    lastUpdatedAt: automationReport.updatedAt ?? automationReport.startedAt ?? null,
                });
            }

            return ok({
                status: "running",
                sentinel: null,
                fortress: null,
                infrastructure: null,
                error: null,
                progress: automationReport.progress ?? null,
                lastUpdatedAt: automationReport.updatedAt ?? automationReport.startedAt ?? null,
            });
        }

        // Return structured report data
        return ok({
            status: automationReport.status,
            sentinel: automationReport.sentinel ?? null,
            fortress: automationReport.fortress ?? null,
            infrastructure: automationReport.infrastructure ?? null,
            error: automationReport.error ?? null,
            progress: automationReport.progress ?? null,
            lastUpdatedAt: automationReport.completedAt ?? automationReport.updatedAt ?? new Date().toISOString(),
        });

    } catch (e) {
        logger.error({ msg: "Failed to fetch automation report", repoId, error: String(e) });
        return errors.internal("Failed to fetch automation report.");
    }
};
