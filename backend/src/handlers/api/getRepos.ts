// src/handlers/api/getRepos.ts
// GET /api/repos
//
// Returns the authenticated user's GitHub repositories for the onboarding page.
// Reads the session cookie → looks up session in DynamoDB → gets userId →
// retrieves & decrypts the stored GitHub token → calls GitHub API → returns repos.

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import * as crypto from "crypto";

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext?.requestId ?? "unknown";

    const origin = event.headers["origin"] ?? event.headers["Origin"] ?? "";
    const isAllowedOrigin = config.ALLOWED_ORIGINS.includes(origin);
    const corsHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : config.FRONTEND_URL,
        "Access-Control-Allow-Credentials": "true",
        "Content-Type": "application/json",
    };

    // ── Read session cookie ────────────────────────────────────────────────────
    const cookieHeader = event.headers["cookie"] ?? event.headers["Cookie"] ?? "";
    const sessionToken = parseCookieValue(cookieHeader, "velocis_session");

    if (!sessionToken) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Not authenticated" }),
        };
    }

    try {
        // ── Resolve session → userId ───────────────────────────────────────────
        const sessionTokenHash = crypto
            .createHash("sha256")
            .update(sessionToken)
            .digest("hex");

        const sessionRecord = await dynamoClient.get<{
            userId: string;
            githubId: string;
            userLogin: string;
            expiresAt: string;
        }>({
            tableName: DYNAMO_TABLES.USERS,
            key: { githubId: `session_${sessionTokenHash}` },
        });

        if (!sessionRecord) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Session not found or expired" }),
            };
        }

        if (new Date(sessionRecord.expiresAt) < new Date()) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Session expired" }),
            };
        }

        const { githubId, userLogin } = sessionRecord;

        // ── Fetch decrypted token & call GitHub API ────────────────────────────
        const accessToken = await getUserToken(githubId);

        // Fetch up to 100 repos (sorted by most recently updated)
        const reposResponse = await fetch(
            "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            }
        );

        if (!reposResponse.ok) {
            const errText = await reposResponse.text();
            logger.error({ msg: "getRepos: GitHub API error", status: reposResponse.status, body: errText });
            return {
                statusCode: 502,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Failed to fetch repositories from GitHub" }),
            };
        }

        const repos = await reposResponse.json() as Array<{
            id: number;
            name: string;
            full_name: string;
            private: boolean;
            language: string | null;
            updated_at: string;
            html_url: string;
            owner: { id: number; login: string; avatar_url: string };
            description: string | null;
            stargazers_count: number;
            default_branch: string;
        }>;

        // Return cleaned, minimal shape the frontend needs
        // Check which repos are already installed by querying DynamoDB
        const installedReposMap = new Map<string, boolean>();
        try {
            // Query all installed repos for this user
            const installedRepos = await dynamoClient.query<{ repoId: string; repoName: string }>({
                tableName: DYNAMO_TABLES.REPOSITORIES,
                indexName: "userId-index",
                keyConditionExpression: "ownerGithubId = :ownerGithubId",
                expressionAttributeValues: { ":ownerGithubId": githubId },
            });

            if (installedRepos && installedRepos.items.length > 0) {
                installedRepos.items.forEach(repo => {
                    if (repo.repoName) {
                        installedReposMap.set(repo.repoName.toLowerCase(), true);
                    }
                    if (repo.repoId) {
                        installedReposMap.set(repo.repoId.toLowerCase(), true);
                    }
                });
            }
        } catch (queryErr) {
            logger.warn({ msg: "getRepos: Could not fetch installed repos", error: String(queryErr) });
            // Continue without installation status if query fails
        }

        const result = repos.map((r) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            isPrivate: r.private,
            language: r.language,
            updatedAt: r.updated_at,
            htmlUrl: r.html_url,
            description: r.description,
            stars: r.stargazers_count,
            ownerId: r.owner.id,
            ownerLogin: r.owner.login,
            isInstalled: installedReposMap.has(r.name.toLowerCase()) || installedReposMap.has(r.full_name.toLowerCase()),
        }));

        logger.info({
            msg: "getRepos: success",
            requestId,
            userId: githubId,
            login: userLogin,
            repoCount: result.length,
            installedCount: installedReposMap.size,
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ repos: result, login: userLogin }),
        };
    } catch (err) {
        logger.error({ msg: "getRepos: failed", requestId, error: String(err) });
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
};

function parseCookieValue(cookieHeader: string | undefined | null, name: string): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.split("=");
        if (key?.trim() === name) return valueParts.join("=").trim() || null;
    }
    return null;
}
