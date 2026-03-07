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
import {
    BedrockRuntimeClient,
    ConverseCommand,
    type ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";
import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";
import { repoOps } from "../../services/github/repoOps";
import { generateQATestPlan } from "../../functions/fortress/analyzeFortress";
import { generateIac, type IacGenerationResult } from "../../functions/predictor/generateIac";
import {
    predictInfrastructureFromCodeContent,
    type InfrastructurePredictionData,
} from "./predictInfrastructure";
import axios from "axios";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";

// ── Bedrock client for Sentinel — same model + region as Fortress ─────────────────
const SENTINEL_MODEL = "deepseek.v3.2";
const sentinelBedrock = new BedrockRuntimeClient({
    region: "us-east-1",
    requestHandler: { requestTimeout: 300_000 } as any,
});

// ── Automation-report Sentinel: direct ConverseCommand (no XML, returns JSON) ─

const SENTINEL_SYSTEM_PROMPT = [
    "You are Sentinel, an elite AI Senior Engineer. You perform deep semantic code reviews.",
    "Focus ONLY on: security vulnerabilities, business logic errors, scalability bottlenecks, type-safety issues, AWS best practice violations, and error-handling gaps.",
    "Ignore: code style, formatting, naming conventions, import ordering, missing semicolons.",
    "For every finding, write a mentorExplanation: the WHY behind the issue, written for a junior engineer.",
    "",
    "Respond with ONLY a valid JSON object — no markdown, no code fences, no preamble.",
    "The JSON must match this exact schema:",
    "{",
    '  "overallRisk": "critical"|"high"|"medium"|"low"|"clean",',
    '  "executiveSummary": "2-3 sentence overall assessment of production-readiness",',
    '  "prioritizedActionItems": ["top action 1", "top action 2", "top action 3"],',
    '  "findings": [',
    '    {',
    '      "severity": "critical"|"high"|"medium"|"low",',
    '      "category": "security"|"logic"|"scalability"|"type-safety"|"aws-best-practice"|"error-handling",',
    '      "title": "Short scannable title referencing specific function/variable",',
    '      "description": "Precise technical description of what is wrong and why it matters",',
    '      "mentorExplanation": "The deeper architectural or security principle being violated",',
    '      "location": { "filePath": "exact/file/path.ts", "startLine": 1 },',
    '      "suggestedFix": "Complete working corrected code snippet",',
    '      "estimatedFixEffort": "5 min"|"30 min"|"2 hours"|"major refactor"',
    '    }',
    '  ],',
    '  "fileSummaries": [',
    '    { "filePath": "path/to/file.ts", "headline": "One-line summary or No issues found", "healthScore": 85 }',
    '  ]',
    "}",
].join("\n");

async function runSentinelForAutomation(
    combinedContent: string,
    repoId: string
): Promise<any | null> {
    const input: ConverseCommandInput = {
        modelId: SENTINEL_MODEL,
        system: [{ text: SENTINEL_SYSTEM_PROMPT }],
        messages: [{
            role: "user",
            content: [{ text: `Perform a deep code review of the following repository source files.\n\n${combinedContent}` }],
        }],
        inferenceConfig: { maxTokens: 4096, temperature: 0.1 },
    };

    const abort = new AbortController();
    const abortTimer = setTimeout(() => abort.abort(), 295_000);
    let response;
    try {
        response = await sentinelBedrock.send(new ConverseCommand(input), { abortSignal: abort.signal });
    } finally {
        clearTimeout(abortTimer);
    }

    const content = response.output?.message?.content;
    const rawText =
        Array.isArray(content) && content.length > 0 && "text" in content[0]
            ? (content[0].text as string).trim()
            : "";

    if (!rawText) return null;

    // Strip markdown code fences if DeepSeek wraps the JSON
    const jsonText = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    try {
        const parsed = JSON.parse(jsonText);
        // Compute derived counts from the findings array
        const findings: any[] = parsed.findings ?? [];
        parsed.totalFindings    = findings.length;
        parsed.criticalFindings = findings.filter((f: any) => f.severity === "critical").length;
        parsed.highFindings     = findings.filter((f: any) => f.severity === "high").length;
        parsed.mediumFindings   = findings.filter((f: any) => f.severity === "medium").length;
        parsed.lowFindings      = findings.filter((f: any) => f.severity === "low").length;
        logger.info({ repoId, msg: "Sentinel JSON parsed", overallRisk: parsed.overallRisk, findings: parsed.totalFindings });
        return parsed;
    } catch (parseErr) {
        logger.error({ repoId, msg: "Sentinel JSON parse failed", error: String(parseErr), preview: rawText.slice(0, 300) });
        return null;
    }
}

type AutomationStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface AutomationPipelineStep {
    key: "prepare" | "sentinel" | "fortress" | "infrastructure" | "projected";
    label: string;
    status: AutomationStepStatus;
    detail?: string;
    startedAt?: string;
    completedAt?: string;
    updatedAt: string;
}

interface AutomationPipelineProgress {
    currentStepKey: AutomationPipelineStep["key"];
    steps: AutomationPipelineStep[];
}

interface AutomationReportRecord {
    status: "running" | "completed" | "failed";
    startedAt?: string;
    completedAt?: string;
    error?: string;
    sentinel?: unknown;
    fortress?: unknown;
    infrastructure?: unknown;
    progress?: AutomationPipelineProgress;
    updatedAt?: string;
}

const PIPELINE_STEP_ORDER: AutomationPipelineStep["key"][] = [
    "prepare",
    "sentinel",
    "fortress",
    "infrastructure",
    "projected",
];

// Per-step timeout budgets. Bedrock calls on large repos can take several minutes.
const STEP_TIMEOUT_MS: Record<AutomationPipelineStep["key"], number> = {
    prepare:        2 * 60 * 1000,  //  2 min  — GitHub API fetch
    sentinel:       5 * 60 * 1000,  //  5 min  — Bedrock standard review (was "deep" = 8 min)
    fortress:       90 * 1000,       //  90 sec — DeepSeek Bedrock QA plan
    infrastructure: 4 * 60 * 1000,  //  4 min  — Bedrock IaC generation
    projected:      4 * 60 * 1000,  //  4 min  — Bedrock projected infra
};
// Hard cap for the entire pipeline run.
const PIPELINE_GLOBAL_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Writes a "still alive" ping to DynamoDB every intervalMs while a long
 * Bedrock call is in-progress.  Prevents the stale-run check in
 * getAutomationReport from falsely marking a legitimate run as failed.
 *
 * Returns a stop function — ALWAYS call it when the step finishes.
 */
function startHeartbeat(
    repoId: string,
    startedAt: string,
    getProgress: () => AutomationPipelineProgress,
    intervalMs = 50_000   // every 50 s — well under the 4-min stale threshold
): () => void {
    let stopped = false;
    const beat = async () => {
        if (stopped) return;
        try {
            await persistAutomationReport(repoId, {
                status: "running",
                startedAt,
                progress: getProgress(),
            });
            logger.info({ msg: "Automation heartbeat", repoId });
        } catch (e) {
            logger.warn({ msg: "Automation heartbeat failed (non-fatal)", repoId, error: String(e) });
        }
    };
    const timer = setInterval(beat, intervalMs);
    return () => { stopped = true; clearInterval(timer); };
}

/**
 * Races a promise against a timeout. Throws with a clear message if time runs out.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); },
        );
    });
}

const PIPELINE_STEP_LABELS: Record<AutomationPipelineStep["key"], string> = {
    prepare: "Repository preparation",
    sentinel: "Sentinel deep review",
    fortress: "Fortress QA plan",
    infrastructure: "Infrastructure baseline",
    projected: "Projected infrastructure",
};

function getStepStatus(
    step: AutomationPipelineStep,
    currentStepKey: AutomationPipelineStep["key"]
): AutomationStepStatus {
    if (step.status === "failed" || step.status === "skipped") {
        return step.status;
    }

    const currentIndex = PIPELINE_STEP_ORDER.indexOf(currentStepKey);
    const stepIndex = PIPELINE_STEP_ORDER.indexOf(step.key);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return step.status === "pending" ? "running" : step.status;
    return step.status;
}

function buildInitialAutomationProgress(startedAt: string): AutomationPipelineProgress {
    return {
        currentStepKey: "prepare",
        steps: PIPELINE_STEP_ORDER.map((key) => ({
            key,
            label: PIPELINE_STEP_LABELS[key],
            status: key === "prepare" ? "running" : "pending",
            startedAt: key === "prepare" ? startedAt : undefined,
            updatedAt: startedAt,
        })),
    };
}

function updateProgressStep(
    progress: AutomationPipelineProgress,
    key: AutomationPipelineStep["key"],
    updates: Partial<Pick<AutomationPipelineStep, "status" | "detail">>
): AutomationPipelineProgress {
    const now = new Date().toISOString();
    const nextCurrentKey = updates.status === "running" ? key : progress.currentStepKey;

    return {
        currentStepKey: nextCurrentKey,
        steps: progress.steps.map((step) => {
            if (step.key !== key) {
                return {
                    ...step,
                    status: getStepStatus(step, nextCurrentKey),
                };
            }

            const nextStatus = updates.status ?? step.status;
            const isRunning = nextStatus === "running";
            const isDone = nextStatus === "completed" || nextStatus === "failed" || nextStatus === "skipped";

            return {
                ...step,
                status: nextStatus,
                detail: updates.detail ?? step.detail,
                startedAt: step.startedAt ?? (isRunning ? now : step.startedAt),
                completedAt: isDone ? now : step.completedAt,
                updatedAt: now,
            };
        }),
    };
}

async function persistAutomationReport(repoId: string, report: AutomationReportRecord): Promise<void> {
    await dynamoClient.update({
        tableName: DYNAMO_TABLES.REPOSITORIES,
        key: { repoId },
        updates: { automationReport: { ...report, updatedAt: new Date().toISOString() } },
    });
}

/**
 * Returns true if automation is still enabled for this repo.
 * Uses GetCommand (direct key lookup) on the numericRepoId — the same key
 * that persistAutomationReport writes to. This avoids scan pagination issues
 * and the "two records" problem where isAutomated lives on a different record
 * than the automationReport.
 */
async function checkIsAutomated(repoId: string, startedAt: string): Promise<boolean> {
    try {
        const docClient = getDocClient();
        // Direct hash-key lookup — O(1), no pagination, reliable
        const result = await docClient.send(new GetCommand({
            TableName: DYNAMO_TABLES.REPOSITORIES,
            Key: { repoId },
        }));
        const item = result.Item;
        if (!item) return true; // Record not found — don't abort

        // Primary signal: automationCancelledAt written by updateRepoSettings
        // when the user pressed "Disable Automation"
        if (item.automationCancelledAt && item.automationCancelledAt >= startedAt) return false;

        // Secondary signal: isAutomated explicitly set to false on this record
        if (item.isAutomated === false) return false;

        return true;
    } catch {
        return true; // On error, don't abort
    }
}

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
                key: { githubId: `session_${hash}` },
            });
            if (session && new Date(session.expiresAt) > new Date()) {
                let githubToken = "";
                try {
                    githubToken = await getUserToken(session.githubId);
                } catch {
                    try {
                        const u = await dynamoClient.get<{ accessToken?: string; github_token?: string }>({
                            tableName: DYNAMO_TABLES.USERS,
                            key: { githubId: session.githubId },
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

    const startedAt = new Date().toISOString();
    const initialProgress = buildInitialAutomationProgress(startedAt);

    // Mark the automation report as "running" first
    try {
        await persistAutomationReport(numericRepoId, {
            status: "running",
            startedAt,
            progress: initialProgress,
        });
    } catch { /* ignore */ }

    // Run the pipeline asynchronously (fire-and-forget), guarded by a global timeout.
    withTimeout(
        runAutomationPipeline({
            repoId: numericRepoId,
            repoFullName,
            repoOwner,
            repoName,
            githubToken,
            repo,
        }),
        PIPELINE_GLOBAL_TIMEOUT_MS,
        "Automation pipeline",
    ).catch(async (err) => {
        const message = String(err);
        logger.error({ msg: "Automation pipeline failed or timed out", repoId: numericRepoId, error: message });
        try {
            // Ensure the record is never left permanently stuck in "running"
            await persistAutomationReport(numericRepoId, {
                status: "failed",
                startedAt,
                error: message,
                progress: initialProgress,
            });
        } catch { /* best-effort */ }
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
    const startedAt = new Date().toISOString();
    let progress = buildInitialAutomationProgress(startedAt);

    const persistRunningProgress = async (nextProgress: AutomationPipelineProgress): Promise<void> => {
        progress = nextProgress;
        try {
            await persistAutomationReport(repoId, {
                status: "running",
                startedAt,
                progress,
            });
        } catch {
            // non-blocking progress persistence
        }
    };

    const runStep = async (
        key: AutomationPipelineStep["key"],
        detail: string,
        job: () => Promise<void>,
        onError?: (errorMessage: string) => Promise<void>
    ): Promise<boolean> => {
        await persistRunningProgress(updateProgressStep(progress, key, { status: "running", detail }));
        try {
            await job();
            await persistRunningProgress(updateProgressStep(progress, key, { status: "completed" }));
            return true;
        } catch (err) {
            const message = String(err);
            await persistRunningProgress(updateProgressStep(progress, key, { status: "failed", detail: message }));
            if (onError) await onError(message);
            return false;
        }
    };

    logger.info({ msg: "Automation pipeline starting", repoId, repoFullName });

    // Helper: abort if user disabled automation after this run started
    const abortIfDisabled = async (phase: string): Promise<boolean> => {
        const enabled = await checkIsAutomated(repoId, startedAt);
        if (!enabled) {
            logger.info({ msg: `Automation cancelled mid-run at ${phase}`, repoId });
            await persistAutomationReport(repoId, {
                status: "failed",
                startedAt,
                completedAt: new Date().toISOString(),
                error: "Automation was disabled by the user.",
                progress,
            });
        }
        return !enabled;
    };

    // Step 2: Get the full repo tree from GitHub
    let allSourceFiles: string[] = [];
    const fetchedTree = await runStep(
        "prepare",
        "Scanning repository and fetching source files",
        async () => {
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
        }
    );
    if (!fetchedTree) {
        logger.error({ msg: "Failed to fetch repo tree", repoId });
        await saveAutomationReport(repo, {
            status: "failed",
            startedAt,
            error: "Failed to fetch repository files from GitHub.",
            progress,
        });
        return;
    }

    if (allSourceFiles.length === 0) {
        progress = updateProgressStep(progress, "sentinel", { status: "skipped", detail: "No reviewable source files found." });
        progress = updateProgressStep(progress, "fortress", { status: "skipped", detail: "No reviewable source files found." });
        progress = updateProgressStep(progress, "infrastructure", { status: "skipped", detail: "No reviewable source files found." });
        progress = updateProgressStep(progress, "projected", { status: "skipped", detail: "No reviewable source files found." });
        await saveAutomationReport(repo, {
            status: "completed",
            startedAt,
            sentinel: null,
            fortress: null,
            infrastructure: null,
            progress,
        });
        return;
    }

    // Step 3: Fetch file contents
    let fileContents: Record<string, string> = {};
    const fetchedContents = await runStep(
        "prepare",
        "Downloading selected files for agent analysis",
        async () => {
        const result = await repoOps.fetchFileContents({
            repoFullName,
            filePaths: allSourceFiles,
            token: githubToken,
        });
        fileContents = Object.fromEntries(
            Object.entries(result.files).map(([k, v]) => [k, v.content])
        );
        logger.info({ msg: "File contents fetched", repoId, fileCount: Object.keys(fileContents).length });
        }
    );
    if (!fetchedContents) {
        logger.error({ msg: "Failed to fetch file contents", repoId });
        await saveAutomationReport(repo, {
            status: "failed",
            startedAt,
            error: "Failed to fetch file contents from GitHub.",
            progress,
        });
        return;
    }

    // Cap at 50 000 chars (~12 500 tokens) so Bedrock doesn't queue or timeout
    // on giant repos. Sentinel uses its own file-level chunking; Fortress and
    // Infra get the same truncated view.
    const MAX_COMBINED_CHARS = 50_000;
    const rawCombined = Object.entries(fileContents)
        .map(([path, content]) => `// === FILE: ${path} ===\n${content}`)
        .join("\n\n");
    const combinedContent = rawCombined.length > MAX_COMBINED_CHARS
        ? rawCombined.slice(0, MAX_COMBINED_CHARS) + "\n\n// ... [truncated to fit model context limit]"
        : rawCombined;

    // Step 4: Run all three agents
    let sentinelResult: any = null;
    let fortressResult: string | null = null;
    let infraResult: IacGenerationResult | null = null;
    let projectedInfraResult: InfrastructurePredictionData | null = null;

    // Start a heartbeat that writes to DynamoDB every 50 s so the stale-run
    // check in getAutomationReport never false-fires during long Bedrock waits.
    const stopHeartbeat = startHeartbeat(repoId, startedAt, () => progress);

    try {
    // Pre-phase check: was automation disabled before we even started the agents?
    if (await abortIfDisabled("pre-agents")) { stopHeartbeat(); return; }

    // Phase A: Sentinel — DeepSeek V3 via ConverseCommand (same model as Fortress)
    logger.info({ msg: "Phase A: Sentinel starting", repoId, contentChars: combinedContent.length });
    await persistRunningProgress(updateProgressStep(progress, "sentinel", {
        status: "running",
        detail: "Sent to DeepSeek V3 — awaiting security & logic review (2–5 min)",
    }));
    try {
        sentinelResult = await withTimeout(
            runSentinelForAutomation(combinedContent, repoId),
            STEP_TIMEOUT_MS.sentinel,
            "Sentinel"
        );
        logger.info({ msg: "Phase A: Sentinel complete", repoId, overallRisk: sentinelResult?.overallRisk, findings: sentinelResult?.totalFindings });
        await persistRunningProgress(updateProgressStep(progress, "sentinel", { status: "completed" }));
    } catch (err) {
        logger.error({ msg: "Phase A: Sentinel failed", repoId, error: String(err) });
        sentinelResult = null;
        await persistRunningProgress(updateProgressStep(progress, "sentinel", { status: "failed", detail: `Sentinel error: ${String(err)}` }));
    }

    // Check between phases
    if (await abortIfDisabled("post-sentinel")) { stopHeartbeat(); return; }

    // Phase B: Fortress QA Test Plan
    logger.info({ msg: "Phase B: Fortress starting", repoId, contentChars: combinedContent.length });
    await persistRunningProgress(updateProgressStep(progress, "fortress", {
        status: "running",
        detail: "Sent to DeepSeek — generating QA scenarios (up to 90 s)",
    }));
    try {
        fortressResult = await withTimeout(generateQATestPlan(combinedContent), STEP_TIMEOUT_MS.fortress, "Fortress");
        logger.info({ msg: "Phase B: Fortress complete", repoId, planChars: fortressResult?.length });
        await persistRunningProgress(updateProgressStep(progress, "fortress", { status: "completed" }));
    } catch (err) {
        logger.error({ msg: "Phase B: Fortress failed", repoId, error: String(err) });
        await persistRunningProgress(updateProgressStep(progress, "fortress", { status: "failed", detail: `Fortress error: ${String(err)}` }));
    }

    if (await abortIfDisabled("post-fortress")) { stopHeartbeat(); return; }

    // Phase C: Infrastructure prediction
    logger.info({ msg: "Phase C: Infrastructure Predictor starting", repoId });
    await persistRunningProgress(updateProgressStep(progress, "infrastructure", {
        status: "running",
        detail: "Sent to Nova Pro — estimating cloud resources & baseline costs",
    }));
    try {
        infraResult = await withTimeout(generateIac({
            repoId,
            repoOwner,
            repoName,
            filePaths: Object.keys(fileContents),
            commitSha: "HEAD",
            accessToken: githubToken,
            region: "us-east-1",
            environment: "production",
        }), STEP_TIMEOUT_MS.infrastructure, "Infrastructure");
        logger.info({ msg: "Phase C: Infrastructure Predictor complete", repoId });
        await persistRunningProgress(updateProgressStep(progress, "infrastructure", { status: "completed" }));
    } catch (err) {
        logger.error({ msg: "Phase C: Infrastructure Predictor failed", repoId, error: String(err) });
        await persistRunningProgress(updateProgressStep(progress, "infrastructure", { status: "failed", detail: `Infrastructure error: ${String(err)}` }));
    }

    if (await abortIfDisabled("post-infrastructure")) { stopHeartbeat(); return; }

    // Final check before saving completed report — covers the case where the
    // user disabled automation while the last phase was running.
    if (await abortIfDisabled("pre-save")) { stopHeartbeat(); return; }

    // Phase D: Projected infrastructure if Sentinel suggestions are applied
    const hasSentinelSuggestions =
        Array.isArray(sentinelResult?.prioritizedActionItems) && sentinelResult.prioritizedActionItems.length > 0;
    const hasSentinelFindings =
        Array.isArray(sentinelResult?.findings) && sentinelResult.findings.length > 0;

    if (hasSentinelSuggestions || hasSentinelFindings) {
        logger.info({ msg: "Phase D: Running projected Infrastructure plan (after Sentinel changes)", repoId });
        await persistRunningProgress(updateProgressStep(progress, "projected", {
            status: "running",
            detail: "Projecting infrastructure after Sentinel fixes are applied",
        }));
        try {
            const projectedPrompt = buildProjectedInfraPrompt(combinedContent, sentinelResult);
            projectedInfraResult = await withTimeout(
                predictInfrastructureFromCodeContent(projectedPrompt),
                STEP_TIMEOUT_MS.projected,
                "Projected Infrastructure",
            );
            logger.info({ msg: "Projected Infrastructure plan complete", repoId });
            await persistRunningProgress(updateProgressStep(progress, "projected", { status: "completed" }));
        } catch (err) {
            logger.warn({
                msg: "Projected Infrastructure plan failed; saving baseline plan only",
                repoId,
                error: String(err),
            });
            projectedInfraResult = null;
            await persistRunningProgress(updateProgressStep(progress, "projected", { status: "failed", detail: String(err) }));
        }
    } else {
        await persistRunningProgress(updateProgressStep(progress, "projected", {
            status: "skipped",
            detail: "No Sentinel findings available to project post-change infrastructure",
        }));
    }

    } finally {
        // Always stop the heartbeat, whether phases succeeded or threw
        stopHeartbeat();
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
        startedAt,
        completedAt: new Date().toISOString(),
        progress,
        sentinel: (sentinelResult && sentinelResult.overallRisk) ? {
            overallRisk: sentinelResult.overallRisk ?? "unknown",
            riskScore: sentinelResult.criticalFindings != null
                ? Math.min(100, (sentinelResult.criticalFindings * 30) + (sentinelResult.highFindings * 15) + (sentinelResult.mediumFindings * 5))
                : 0,
            summary: sentinelResult.executiveSummary || "Review completed.",
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
        await persistAutomationReport(String(repoId), report as AutomationReportRecord);
        if (report.status === "completed") {
            await dynamoClient.update({
                tableName: DYNAMO_TABLES.REPOSITORIES,
                key: { repoId: String(repoId) },
                updates: { lastScannedAt: report.completedAt ?? new Date().toISOString() },
            });
        }
    } catch (err) {
        logger.error({ msg: "Failed to save automation report", error: String(err) });
    }
}
