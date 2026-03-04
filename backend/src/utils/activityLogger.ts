/**
 * activityLogger.ts
 * Velocis — Shared Activity Logger
 *
 * Fire-and-forget utility that logs user actions to the AI_ACTIVITY DynamoDB table.
 * Used by all backend handlers so that the Dashboard Activity panel shows real data.
 *
 * Usage:
 *   import { logActivity } from "../../utils/activityLogger";
 *   logActivity({ userId, repoId, repoName, agent: "cortex", message: "Generated 3D map", severity: "info" });
 */

import { randomUUID } from "crypto";
import { dynamoClient, DYNAMO_TABLES } from "../services/database/dynamoClient";
import { logger } from "./logger";

export type ActivityAgent = "sentinel" | "fortress" | "cortex" | "predictor";
export type ActivitySeverity = "critical" | "warning" | "info" | "healthy";

export interface ActivityLogParams {
    userId: string;
    repoId: string;
    repoName?: string;
    agent: ActivityAgent;
    message: string;
    severity?: ActivitySeverity;
}

/**
 * Logs a single user activity event to the AI_ACTIVITY DynamoDB table.
 *
 * This is **fire-and-forget** — errors are caught and logged but never thrown.
 * The caller's response is never blocked or delayed by this write.
 */
export function logActivity(params: ActivityLogParams): void {
    const {
        userId,
        repoId,
        repoName,
        agent,
        message,
        severity = "info",
    } = params;

    const activityId = `act_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    // Fire-and-forget — don't await, just catch errors
    dynamoClient
        .upsert({
            tableName: DYNAMO_TABLES.AI_ACTIVITY,
            key: "activityId",
            item: {
                activityId,
                userId,
                repoId,
                repoName: repoName ?? repoId,
                agent,
                message,
                severity,
                timestamp: now,
                read: false,
            },
        })
        .then(() => {
            logger.info(`Activity logged: ${activityId} [${agent}] for ${repoId}`);
        })
        .catch((err) => {
            logger.warn(
                `Failed to log activity (non-fatal): [${agent}] ${repoId} — ${err instanceof Error ? err.message : String(err)}`
            );
        });
}
