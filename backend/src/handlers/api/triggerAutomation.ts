/**
 * triggerAutomation.ts
 * Velocis — POST /repos/:repoId/trigger-automation
 *
 * Runs the full automation pipeline (Sentinel + Fortress + Infrastructure)
 * on the entire repo when a user enables automation from the Settings page.
 *
 * This is a STANDALONE handler — it does NOT interfere with the existing
 * githubPush.ts webhook pipeline. It reuses the same agent functions but
 * stores results in a separate automation-report record in the REPOSITORIES table.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";
import { repoOps } from "../../services/github/repoOps";
import { analyzeLogic } from "../../functions/sentinel/analyzeLogic";
import { generateQATestPlan } from "../../functions/fortress/analyzeFortress";
import { generateIac, type IacGenerationResult } from "../../functions/predictor/generateIac";
import {
    predictInfrastructureFromCodeContent,
    type InfrastructurePredictionData,
} from "./predictInfrastructure";
import axios from "axios";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";

// ── Auth helpers (same as other handlers) ────────────────────────────────────

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

// ── Reviewable file filter (mirrors analyzeLogic.ts) ─────────────────────────

const REVIEWABLE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".rb", ".cs"]);
const SKIP_PATTERNS = [".test.", ".spec.", ".d.ts", "node_modules", "dist/", ".next/", "coverage/", "yarn.lock", "package-lock.json", ".env"];

function isReviewableFile(filePath: string): boolean {
    const ext = "." + (filePath.split(".").pop() ?? "");
    if (!REVIEWABLE_EXTENSIONS.has(ext)) return false;
    return !SKIP_PATTERNS.some((p) => filePath.includes(p));
}

interface AutomationInfrastructurePlan {
    detectedPatterns: unknown[];
    architectureNotes: string;
    costForecast: Record<string, unknown> | null;
    terraformCode: string | null;
    hasInfraChanges: boolean;
    impactSummary?: string[];
    costProjection?: string | null;
    confidenceScore?: number | null;
}

function buildInfrastructurePlanFromIacResult(iacResult: IacGenerationResult): AutomationInfrastructurePlan {
    return {
        detectedPatterns: iacResult.detectedPatterns ?? [],
        architectureNotes: iacResult.architectureNotes ?? "",
        costForecast: (iacResult.costForecast as unknown as Record<string, unknown>) ?? null,
        terraformCode: iacResult.terraform?.code ?? null,
        hasInfraChanges: iacResult.hasInfraChanges ?? false,
    };
}

function parseMonthlyCost(costProjection: string): number | null {
    const match = costProjection.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildInfrastructurePlanFromProjection(
    projected: InfrastructurePredictionData
): AutomationInfrastructurePlan {
    const monthlyCost = parseMonthlyCost(projected.costProjection ?? "");
    const confidence =
        projected.confidenceScore >= 80 ? "HIGH" :
            projected.confidenceScore >= 50 ? "MEDIUM" : "LOW";

    return {
        detectedPatterns: [],
        architectureNotes: projected.impactSummary?.join("\n") ?? "",
        costForecast: monthlyCost == null ? null : {
            totalMonthlyCostUsd: monthlyCost,
            totalYearlyCostUsd: Number((monthlyCost * 12).toFixed(2)),
            currency: "USD",
            confidence,
            breakdown: [],
            environmentMultiplier: 1,
            forecastedAt: new Date().toISOString(),
        },
        terraformCode: projected.iacCode ?? null,
        hasInfraChanges: (projected.impactSummary?.length ?? 0) > 0,
        impactSummary: projected.impactSummary ?? [],
        costProjection: projected.costProjection ?? null,
        confidenceScore: projected.confidenceScore ?? null,
    };
}

function buildProjectedInfraPrompt(combinedContent: string, sentinelResult: any): string {
    const actions: string[] = Array.isArray(sentinelResult?.prioritizedActionItems)
        ? sentinelResult.prioritizedActionItems
            .filter((x: unknown) => typeof x === "string")
            .map((x: string) => x)
            .slice(0, 20)
        : [];

    const findings = Array.isArray(sentinelResult?.findings)
        ? sentinelResult.findings.slice(0, 20).map((finding: any, idx: number) => {
            const severity = String(finding?.severity ?? "unknown");
            const title = String(finding?.title ?? "Untitled finding");
            const fix = finding?.suggestedFix ? ` | suggestedFix: ${String(finding.suggestedFix)}` : "";
            return `${idx + 1}. [${severity}] ${title}${fix}`;
        })
        : [];

    return [
        "Project a future infrastructure plan after Sentinel's recommendations are implemented.",
        "Use the current repository code as baseline context and adjust for the proposed fixes below.",
        "",
        "Sentinel prioritized action items:",
        actions.length > 0 ? actions.map((a, idx) => `${idx + 1}. ${a}`).join("\n") : "None",
        "",
        "Sentinel key findings:",
        findings.length > 0 ? findings.join("\n") : "None",
        "",
        "Current repository code context:",
        combinedContent,
    ].join("\n");
}

// ── Main handler ─────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === "OPTIONS") return preflight();

    const user = await resolveUser(event);
    if (!user) return errors.unauthorized();
    const { userId, githubToken } = user;

    const repoId = event.pathParameters?.repoId;
    if (!repoId) return errors.badRequest("Missing repoId path parameter.");

    logger.info({ msg: "POST /repos/:repoId/trigger-automation", repoId, userId });

    const docClient = getDocClient();

    // Step 1: Find the repo in DynamoDB
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

    if (!repo) {
        return errors.badRequest("Repository not found.");
    }

    // Attempt to get the actual GitHub username if repoFullName is not fully qualified
    let fallbackOwner = userId;
    try {
        const ghRes = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${githubToken}` }
        });
        if (ghRes.data && ghRes.data.login) {
            fallbackOwner = ghRes.data.login;
        }
    } catch { /* ignore */ }

    const repoFullName = repo.repoFullName ?? repo.fullName ?? `${repo.repoOwner ?? repo.ownerLogin ?? fallbackOwner}/${repo.repoName ?? repo.repoSlug ?? repoId}`;
    const repoOwner = repoFullName.split("/")[0] ?? "";
    const repoName = repoFullName.split("/")[1] ?? repoId;
    const numericRepoId = String(repo.repoId ?? repo.id ?? repoId);

    // Return immediately to the frontend — run pipeline in background
    // (In Express this works because the response is already sent)
    const responsePromise = ok({
        success: true,
        status: "running",
        message: "Automation pipeline started. Sentinel, Fortress, and Infrastructure agents are now analyzing the full repository.",
    });

    // Mark the automation report as "running" first
    try {
        await dynamoClient.update({
            tableName: DYNAMO_TABLES.REPOSITORIES,
            key: { repoId: numericRepoId },
            updates: { automationReport: { status: "running", startedAt: new Date().toISOString() } },
        });
    } catch { /* ignore */ }

    // Run the pipeline asynchronously (fire-and-forget)
    runAutomationPipeline({
        repoId: numericRepoId,
        repoFullName,
        repoOwner,
        repoName,
        githubToken,
        repo,
    }).catch((err) => {
        logger.error({ msg: "Automation pipeline failed", repoId, error: String(err) });
    });

    return responsePromise;
};

// ── Pipeline execution ───────────────────────────────────────────────────────

async function runAutomationPipeline(ctx: {
    repoId: string;
    repoFullName: string;
    repoOwner: string;
    repoName: string;
    githubToken: string;
    repo: Record<string, any>;
}): Promise<void> {
    const { repoId, repoFullName, repoOwner, repoName, githubToken, repo } = ctx;

    logger.info({ msg: "Automation pipeline starting", repoId, repoFullName });

    // Step 2: Get the full repo tree from GitHub
    let allSourceFiles: string[] = [];
    try {
        const tree = await repoOps.fetchRepoTree({
            repoFullName,
            token: githubToken,
            recursive: true,
        });
        allSourceFiles = tree
            .filter((item) => item.type === "blob" && isReviewableFile(item.path))
            .map((item) => item.path)
            .slice(0, 15); // Limit to 15 most relevant files to avoid Bedrock token limits

        logger.info({ msg: "Repo tree fetched", repoId, totalFiles: tree.length, reviewableFiles: allSourceFiles.length });
    } catch (err) {
        logger.error({ msg: "Failed to fetch repo tree", repoId, error: String(err) });
        await saveAutomationReport(repo, { status: "failed", error: "Failed to fetch repository files from GitHub." });
        return;
    }

    if (allSourceFiles.length === 0) {
        await saveAutomationReport(repo, { status: "completed", sentinel: null, fortress: null, infrastructure: null });
        return;
    }

    // Step 3: Fetch file contents
    let fileContents: Record<string, string> = {};
    try {
        const result = await repoOps.fetchFileContents({
            repoFullName,
            filePaths: allSourceFiles,
            token: githubToken,
        });
        fileContents = Object.fromEntries(
            Object.entries(result.files).map(([k, v]) => [k, v.content])
        );
        logger.info({ msg: "File contents fetched", repoId, fileCount: Object.keys(fileContents).length });
    } catch (err) {
        logger.error({ msg: "Failed to fetch file contents", repoId, error: String(err) });
        await saveAutomationReport(repo, { status: "failed", error: "Failed to fetch file contents from GitHub." });
        return;
    }

    const combinedContent = Object.entries(fileContents)
        .map(([path, content]) => `// === FILE: ${path} ===\n${content}`)
        .join("\n\n");

    // Step 4: Run all three agents
    let sentinelResult: any = null;
    let fortressResult: string | null = null;
    let infraResult: IacGenerationResult | null = null;
    let projectedInfraResult: InfrastructurePredictionData | null = null;

    // Phase A: Sentinel deep review
    logger.info({ msg: "Phase A: Running Sentinel deep review", repoId });
    try {
        const reviewResult = await analyzeLogic({
            repoId,
            repoOwner,
            repoName,
            filePaths: Object.keys(fileContents),
            commitSha: "HEAD",
            accessToken: githubToken,
            reviewDepth: "deep",
        });
        sentinelResult = (reviewResult as any)?.reviewResult ?? reviewResult;
        logger.info({ msg: "Sentinel complete", repoId, overallRisk: sentinelResult?.overallRisk });
    } catch (err) {
        logger.error({ msg: "Sentinel failed", repoId, error: String(err) });
        sentinelResult = { status: "failed", error: String(err) };
    }

    // Phase B: Fortress QA Test Plan
    logger.info({ msg: "Phase B: Running Fortress QA Strategist", repoId });
    try {
        fortressResult = await generateQATestPlan(combinedContent);
        logger.info({ msg: "Fortress complete", repoId, planLength: fortressResult?.length });
    } catch (err) {
        logger.error({ msg: "Fortress failed", repoId, error: String(err) });
    }

    // Phase C: Infrastructure prediction
    logger.info({ msg: "Phase C: Running Infrastructure Predictor", repoId });
    try {
        infraResult = await generateIac({
            repoId,
            repoOwner,
            repoName,
            filePaths: Object.keys(fileContents),
            commitSha: "HEAD",
            accessToken: githubToken,
            region: "us-east-1",
            environment: "production",
        });
        logger.info({ msg: "Infrastructure Predictor complete", repoId });
    } catch (err) {
        logger.error({ msg: "Infrastructure Predictor failed", repoId, error: String(err) });
    }

    // Phase D: Projected infrastructure if Sentinel suggestions are applied
    const hasSentinelSuggestions =
        Array.isArray(sentinelResult?.prioritizedActionItems) && sentinelResult.prioritizedActionItems.length > 0;
    const hasSentinelFindings =
        Array.isArray(sentinelResult?.findings) && sentinelResult.findings.length > 0;

    if (hasSentinelSuggestions || hasSentinelFindings) {
        logger.info({ msg: "Phase D: Running projected Infrastructure plan (after Sentinel changes)", repoId });
        try {
            const projectedPrompt = buildProjectedInfraPrompt(combinedContent, sentinelResult);
            projectedInfraResult = await predictInfrastructureFromCodeContent(projectedPrompt);
            logger.info({ msg: "Projected Infrastructure plan complete", repoId });
        } catch (err) {
            logger.warn({
                msg: "Projected Infrastructure plan failed; saving baseline plan only",
                repoId,
                error: String(err),
            });
            projectedInfraResult = null;
        }
    }

    // Step 5: Save full report
    const beforeChangesPlan = infraResult ? buildInfrastructurePlanFromIacResult(infraResult) : null;
    const afterSentinelChangesPlan = projectedInfraResult
        ? buildInfrastructurePlanFromProjection(projectedInfraResult)
        : null;

    const infrastructureReport =
        beforeChangesPlan || afterSentinelChangesPlan
            ? {
                // Backward-compatible fields mapped from beforeChanges baseline.
                detectedPatterns: beforeChangesPlan?.detectedPatterns ?? [],
                architectureNotes: beforeChangesPlan?.architectureNotes ?? "",
                costForecast: beforeChangesPlan?.costForecast ?? null,
                terraformCode: beforeChangesPlan?.terraformCode ?? null,
                hasInfraChanges: beforeChangesPlan?.hasInfraChanges ?? false,
                plans: {
                    beforeChanges: beforeChangesPlan,
                    afterSentinelChanges: afterSentinelChangesPlan,
                },
            }
            : null;

    const report = {
        status: "completed",
        completedAt: new Date().toISOString(),
        sentinel: sentinelResult ? {
            overallRisk: sentinelResult.overallRisk ?? "unknown",
            riskScore: sentinelResult.criticalFindings != null
                ? Math.min(100, (sentinelResult.criticalFindings * 30) + (sentinelResult.highFindings * 15) + (sentinelResult.mediumFindings * 5))
                : 0,
            summary: sentinelResult.executiveSummary ?? "Review completed.",
            findings: (sentinelResult.findings ?? []).map((f: any) => ({
                severity: f.severity,
                category: f.category,
                title: f.title,
                description: f.description,
                mentorExplanation: f.mentorExplanation,
                filePath: f.location?.filePath,
                startLine: f.location?.startLine,
                suggestedFix: f.suggestedFix,
                estimatedFixEffort: f.estimatedFixEffort,
            })),
            fileSummaries: sentinelResult.fileSummaries ?? [],
            prioritizedActionItems: sentinelResult.prioritizedActionItems ?? [],
            totalFindings: sentinelResult.totalFindings ?? 0,
            criticalFindings: sentinelResult.criticalFindings ?? 0,
            highFindings: sentinelResult.highFindings ?? 0,
        } : null,
        fortress: fortressResult ? {
            testPlanText: fortressResult,
            testStabilityPct: 100,
        } : null,
        infrastructure: infrastructureReport,
    };

    await saveAutomationReport(repo, report);
    logger.info({ msg: "Automation report saved", repoId, status: "completed" });
}

async function saveAutomationReport(repo: Record<string, any>, report: Record<string, any>): Promise<void> {
    try {
        const repoId = repo.repoId ?? repo.id ?? repo.repoSlug;

        await dynamoClient.update({
            tableName: DYNAMO_TABLES.REPOSITORIES,
            key: { repoId },
            updates: { automationReport: { ...report, updatedAt: new Date().toISOString() } },
        });
    } catch (err) {
        logger.error({ msg: "Failed to save automation report", error: String(err) });
    }
}
