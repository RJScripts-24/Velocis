// src/handlers/api/authGithubCallback.ts
// Lambda handler: GET /api/auth/github/callback
//
// Step 2 of the GitHub OAuth flow.
// GitHub redirects here with a temporary ?code= and ?state= after the user approves.
//
// This handler:
//   1. Validates the CSRF state (from cookie vs. DynamoDB store)
//   2. Exchanges the code for a GitHub User Access Token
//   3. Fetches the GitHub user profile
//   4. Creates or updates the user record in DynamoDB (multi-tenant)
//   5. Redirects the user to the frontend dashboard with a session cookie
//
// All user OAuth tokens are stored AES-256-GCM encrypted in DynamoDB.
// Tokens are NEVER returned to the frontend — only a session cookie is set.

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handleOAuthCallback } from "../../services/github/auth";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { User } from "../../models/interfaces/User";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import * as crypto from "crypto";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext?.requestId ?? "unknown";
    logger.info({ requestId, msg: "authGithubCallback: callback received" });

    // ── CORS Headers ───────────────────────────────────────────────────────────
    const origin = event.headers["origin"] ?? event.headers["Origin"] ?? "";
    const isAllowedOrigin = config.ALLOWED_ORIGINS.includes(origin);
    const corsHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : config.FRONTEND_URL,
        "Access-Control-Allow-Credentials": "true",
    };

    // ── Parse Query Params from GitHub Redirect ─────────────────────────────────
    const code = event.queryStringParameters?.["code"];
    const state = event.queryStringParameters?.["state"];
    const error = event.queryStringParameters?.["error"];

    // Handle cases where the user denied the OAuth prompt
    if (error) {
        logger.warn({
            requestId,
            msg: "authGithubCallback: user denied GitHub OAuth access",
            error,
        });
        return redirect(`${config.FRONTEND_URL}/auth?error=access_denied`, corsHeaders);
    }

    if (!code || !state) {
        logger.warn({
            requestId,
            msg: "authGithubCallback: missing code or state",
            hasCode: !!code,
            hasState: !!state,
        });
        return redirect(`${config.FRONTEND_URL}/auth?error=invalid_callback`, corsHeaders);
    }

    // ── Read CSRF State from Cookie ────────────────────────────────────────────
    const cookieHeader = event.headers["cookie"] ?? event.headers["Cookie"] ?? "";
    const storedState = parseCookieValue(cookieHeader, "github_oauth_state");

    if (!storedState) {
        logger.warn({ requestId, msg: "authGithubCallback: no CSRF state cookie found" });
        return redirect(`${config.FRONTEND_URL}/auth?error=session_expired`, corsHeaders);
    }

    try {
        // ── Step 1: Exchange code for token + validate CSRF state ──────────────────
        const tokenResult = await handleOAuthCallback({
            code,
            state,
            storedState,
        });

        logger.info({
            requestId,
            msg: "authGithubCallback: token exchange successful",
            userId: tokenResult.userId,
            login: tokenResult.userLogin,
        });

        // ── Step 2: Upsert user into DynamoDB (create on first login, update on return) ──
        // handleOAuthCallback already fetched the GitHub profile and encrypted the token.
        // Here we flesh out the full User record with profile data and plan.
        const now = new Date().toISOString();

        // Fetch existing user to preserve createdAt and plan
        const existingUser = await dynamoClient.get<User>({
            tableName: DYNAMO_TABLES.USERS,
            key: { userId: tokenResult.userId },
        });

        const userRecord: Record<string, unknown> = {
            userId: tokenResult.userId,
            githubId: tokenResult.userId,
            username: tokenResult.userLogin,
            displayName: tokenResult.userLogin,
            avatarUrl: tokenResult.avatarUrl,
            githubProfileUrl: `https://github.com/${tokenResult.userLogin}`,
            // IMPORTANT: The key must be 'accessToken' to match getUserToken / StoredUserToken
            accessToken: existingUser?.accessToken ?? existingUser?.encryptedAccessToken ?? "",
            plan: existingUser?.plan ?? "free",
            createdAt: existingUser?.createdAt ?? now,
            updatedAt: now,
            // Only include GSI key attributes if non-empty — DynamoDB rejects empty string GSI keys
            ...(tokenResult.userLogin && { username: tokenResult.userLogin }),
        };

        // ── Step 3: Generate a session token (opaque token for the frontend) ───────
        // The frontend uses this session token in subsequent API calls.
        // We store a hash of it in DynamoDB so we can validate it server-side.
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const sessionTokenHash = crypto
            .createHash("sha256")
            .update(sessionToken)
            .digest("hex");

        const sessionExpiresAt = new Date(
            Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000
        ).toISOString();

        // Run user upsert and session write in parallel — they are independent
        await Promise.all([
            dynamoClient.upsert({
                tableName: DYNAMO_TABLES.USERS,
                item: userRecord,
                key: "userId",
            }),
            // Store session hash in DynamoDB (keyed by userId, namespaced with prefix)
            dynamoClient.upsert({
                tableName: DYNAMO_TABLES.USERS,
                item: {
                    userId: `session_${sessionTokenHash}`,  // Namespaced session record
                    githubId: tokenResult.userId,
                    userLogin: tokenResult.userLogin,
                    type: "session",
                    expiresAt: sessionExpiresAt,
                    ttl: Math.floor(Date.now() / 1000) + SESSION_COOKIE_MAX_AGE_SECONDS,
                    createdAt: now,
                    updatedAt: now,
                },
                key: "userId",
            }),
        ]);

        logger.info({
            requestId,
            msg: "authGithubCallback: user record upserted",
            userId: tokenResult.userId,
            isNewUser: !existingUser,
        });

        // ── Step 4: Set session cookie and redirect to dashboard ───────────────────
        const isProduction = config.NODE_ENV === "production";
        const clearStateCookie = [
            "github_oauth_state=",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=0",     // Immediately expire the CSRF state cookie
            "Path=/",
            ...(isProduction ? ["Secure"] : []),
        ].join("; ");

        const sessionCookie = [
            `velocis_session=${sessionToken}`,
            "HttpOnly",
            "SameSite=Lax",
            `Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`,
            "Path=/",
            ...(isProduction ? ["Secure"] : []),
        ].join("; ");

        logger.info({
            requestId,
            msg: "authGithubCallback: login complete — redirecting to dashboard",
            userId: tokenResult.userId,
            isNewUser: !existingUser,
        });

        return {
            statusCode: 302,
            headers: {
                ...corsHeaders,
                Location: `${config.FRONTEND_URL}/onboarding`,
                // API Gateway only supports one Set-Cookie header natively —
                // use multiValueHeaders for multiple cookies
                "Cache-Control": "no-store",
            },
            multiValueHeaders: {
                "Set-Cookie": [clearStateCookie, sessionCookie],
            },
            body: "",
        };
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({
            requestId,
            msg: "authGithubCallback: callback processing failed",
            error: errMsg,
        });

        // Determine redirect error code for user-facing messaging
        const isStateError = errMsg.includes("CSRF") || errMsg.includes("state");
        const errorCode = isStateError ? "session_expired" : "auth_failed";

        return redirect(
            `${config.FRONTEND_URL}/auth?error=${errorCode}`,
            corsHeaders
        );
    }
};

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function redirect(
    location: string,
    corsHeaders: Record<string, string>
): APIGatewayProxyResult {
    return {
        statusCode: 302,
        headers: {
            ...corsHeaders,
            Location: location,
            "Cache-Control": "no-store",
        },
        body: "",
    };
}

/**
 * Parses a specific cookie value from a Cookie header string.
 * @example parseCookieValue("foo=bar; baz=qux", "foo") → "bar"
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.split("=");
        if (key?.trim() === name) {
            return valueParts.join("=").trim() || null;
        }
    }
    return null;
}
