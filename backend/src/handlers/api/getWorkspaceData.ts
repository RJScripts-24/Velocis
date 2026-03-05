/**
 * getWorkspaceData.ts
 * Velocis — Workspace Handlers (Monaco editor + Sentinel AI chat panel)
 *
 * Routes:
 *   GET  /repos/:repoId/workspace/files           → File picker listing
 *   GET  /repos/:repoId/workspace/files/content   → Raw file content
 *   GET  /repos/:repoId/workspace/annotations     → Sentinel annotations for a file
 *   POST /repos/:repoId/workspace/chat            → Send a message (Sentinel AI)
 *   GET  /repos/:repoId/workspace/chat/history    → Chat message history
 *
 * The chat endpoint delegates to the existing mentorChat / analyzeLogic pipeline
 * and persists turns to DynamoDB.  Multilingual output via Amazon Translate is
 * triggered when `language` ≠ "en".
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";
import { fetchFileContent, fetchRepoTree } from "../../services/github/repoOps";
import { translateText } from "../../services/aws/translate";
import { config } from "../../utils/config";
import { logActivity } from "../../utils/activityLogger";
import * as crypto from "crypto";
import axios from "axios";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
// DeepSeek V3.2 on Bedrock — use BEDROCK_REGION (us-east-1), not AWS_REGION (ap-south-1).
const BEDROCK_REGION = config.BEDROCK_REGION || config.AWS_REGION;
const DEEPSEEK_V3_MODEL_ID = "deepseek.v3.2";
const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";
const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";
const ANNOTATIONS_TABLE = process.env.ANNOTATIONS_TABLE ?? "velocis-annotations";
const CHAT_TABLE = process.env.CHAT_TABLE ?? "velocis-workspace-chat";

type Language = "en" | "hi" | "ta";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface WorkspaceReviewFinding {
  severity: "critical" | "warning" | "info";
  file_path: string;
  line?: number;
  title: string;
  description: string;
  fix_suggestion: string;
}

interface WorkspaceAutoFix {
  file_path: string;
  reason: string;
  fixed_code: string;
}

interface WorkspaceReviewResult {
  summary: string;
  risk_level: RiskLevel;
  files_reviewed: number;
  findings: WorkspaceReviewFinding[];
  auto_fix: WorkspaceAutoFix | null;
}

const REVIEWABLE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "go", "rs", "java", "kt", "swift",
  "rb", "php", "cs", "cpp", "cc", "c", "h",
  "json", "yaml", "yml", "toml", "ini",
  "sh", "sql", "md",
]);

const IGNORED_PATH_SEGMENTS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  "target",
  "bin",
  "obj",
];

const MAX_REVIEW_FILES = 20;
const MAX_FILE_CHARS = 3500;
const MAX_PROMPT_CHARS = 120_000;

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n/* ... truncated for review ... */`;
}

function isReviewableFilePath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  if (IGNORED_PATH_SEGMENTS.some((segment) => normalized.includes(`/${segment}/`))) {
    return false;
  }
  const fileName = normalized.split("/").pop() ?? "";
  if (!fileName || fileName.startsWith(".")) return false;
  const ext = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  return REVIEWABLE_EXTENSIONS.has(ext);
}

function extractJsonPayload(raw: string): string | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return raw.slice(firstBrace, lastBrace + 1).trim();
}

function parseRiskLevel(value: unknown): RiskLevel {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") {
    return value;
  }
  return "medium";
}

function parseReviewOutput(rawModelOutput: string): Omit<WorkspaceReviewResult, "files_reviewed"> {
  const fallbackSummary = rawModelOutput.trim().slice(0, 1500) || "Review completed, but the model output was empty.";

  const jsonPayload = extractJsonPayload(rawModelOutput);
  if (!jsonPayload) {
    return {
      summary: fallbackSummary,
      risk_level: "medium",
      findings: [],
      auto_fix: null,
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonPayload);
  } catch {
    return {
      summary: fallbackSummary,
      risk_level: "medium",
      findings: [],
      auto_fix: null,
    };
  }

  const findings: WorkspaceReviewFinding[] = Array.isArray(parsed.findings)
    ? parsed.findings
      .slice(0, 8)
      .map((f: any): WorkspaceReviewFinding | null => {
        if (!f || typeof f !== "object") return null;

        const severity = f.severity === "critical" || f.severity === "warning" || f.severity === "info"
          ? f.severity
          : "warning";
        const filePath = typeof f.file_path === "string" && f.file_path.trim()
          ? f.file_path.trim()
          : "/";
        const line = typeof f.line === "number" && Number.isFinite(f.line) && f.line > 0
          ? Math.floor(f.line)
          : undefined;
        const title = typeof f.title === "string" && f.title.trim()
          ? f.title.trim()
          : "Issue detected";
        const description = typeof f.description === "string" && f.description.trim()
          ? f.description.trim()
          : "No description provided.";
        const fixSuggestion = typeof f.fix_suggestion === "string" && f.fix_suggestion.trim()
          ? f.fix_suggestion.trim()
          : "No fix suggestion provided.";

        return {
          severity,
          file_path: filePath,
          line,
          title,
          description,
          fix_suggestion: fixSuggestion,
        };
      })
      .filter((f: WorkspaceReviewFinding | null): f is WorkspaceReviewFinding => f !== null)
    : [];

  const autoFixRaw = parsed.auto_fix_candidate;
  let autoFix: WorkspaceAutoFix | null = null;
  if (
    autoFixRaw &&
    typeof autoFixRaw === "object" &&
    typeof autoFixRaw.file_path === "string" &&
    typeof autoFixRaw.reason === "string" &&
    typeof autoFixRaw.fixed_code === "string" &&
    autoFixRaw.fixed_code.trim().length > 20
  ) {
    autoFix = {
      file_path: autoFixRaw.file_path.trim(),
      reason: autoFixRaw.reason.trim(),
      fixed_code: autoFixRaw.fixed_code,
    };
  }

  const summary = typeof parsed.summary === "string" && parsed.summary.trim()
    ? parsed.summary.trim()
    : fallbackSummary;

  return {
    summary,
    risk_level: parseRiskLevel(parsed.risk_level),
    findings,
    auto_fix: autoFix,
  };
}

function renderReviewMessage(review: WorkspaceReviewResult): string {
  const lines: string[] = [
    `Full repository review complete. Overall risk: ${review.risk_level.toUpperCase()}.`,
    "",
    review.summary,
  ];

  if (review.findings.length > 0) {
    lines.push("", "Top findings:");
    for (const finding of review.findings.slice(0, 5)) {
      const lineSuffix = finding.line ? `:${finding.line}` : "";
      lines.push(`- [${finding.severity.toUpperCase()}] ${finding.file_path}${lineSuffix} - ${finding.title}`);
    }
  }

  if (review.auto_fix) {
    lines.push("", `Auto-fix is ready for ${review.auto_fix.file_path}. Click "Auto Fix" to apply it in the editor.`);
  }

  return lines.join("\n");
}

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
    const { sub: userId } = jwt.verify(token, JWT_SECRET) as { sub: string };
    const res = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } })
    );
    if (!res.Item) return null;
    return { userId, githubToken: res.Item.github_token as string };
  } catch {
    return null;
  }
}

async function getGitHubLogin(githubToken: string): Promise<string | null> {
  if (!githubToken) return null;
  try {
    const res = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${githubToken}`, "User-Agent": "Velocis-App" },
      timeout: 5000,
    });
    return res.data?.login ?? null;
  } catch {
    return null;
  }
}

/** Resolves the GitHub repo slug (e.g. "my-repo") from the Velocis internal repoId
 *  by looking up the registered record in DynamoDB. Returns null on any failure. */
async function resolveRepoName(repoId: string): Promise<string | null> {
  try {
    const rec = await dynamoClient.get<{ repoName?: string }>({
      tableName: DYNAMO_TABLES.REPOSITORIES,
      key: { repoId },
    });
    return rec?.repoName ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/workspace/files
// ─────────────────────────────────────────────────────────────────────────────

export const listFiles = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const path = event.queryStringParameters?.path ?? "/";
  const isRecursive = event.queryStringParameters?.recursive === "true";

  let owner = event.headers?.["x-repo-owner"] ?? "";
  const headerName = event.headers?.["x-repo-name"] ?? "";
  // Fall back to the stored GitHub slug from DynamoDB when the header is absent,
  // rather than using the raw Velocis repoId (which may be a numeric GitHub ID).
  const name = headerName || (await resolveRepoName(repoId)) || repoId;

  if (!owner) {
    const inferredOwner = await getGitHubLogin(user.githubToken);
    if (inferredOwner) owner = inferredOwner;
    else return errors.badRequest("Missing x-repo-owner header and could not infer owner.");
  }

  try {
    const tree = await fetchRepoTree({ repoFullName: `${owner}/${name}`, token: user.githubToken, recursive: true });
    const dirPath = path === "/" ? "" : path.replace(/^\//, "");

    const files = tree
      .filter((item: any) => {
        if (isRecursive) return item.type === "blob"; // Only return files when recursive
        const itemDir = item.path.includes("/")
          ? item.path.substring(0, item.path.lastIndexOf("/"))
          : "";
        return itemDir === dirPath;
      })
      .map((item: any) => ({
        name: item.path.split("/").pop(),
        type: item.type === "tree" ? "dir" : "file",
        path: `/${item.path}`,
      }));

    return ok({ path, files });
  } catch (e: any) {
    logger.error({ repoId, path, msg: "listFiles failed", error: e?.message });
    return errors.internal("Failed to list repository files.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/workspace/files/content
// ─────────────────────────────────────────────────────────────────────────────

export const getFileContent = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const filePath = event.queryStringParameters?.path;
  const ref = event.queryStringParameters?.ref ?? "main";
  if (!filePath) return errors.badRequest("Missing path query parameter.");

  let owner = event.headers?.["x-repo-owner"] ?? "";
  const headerName2 = event.headers?.["x-repo-name"] ?? "";
  const name = headerName2 || (await resolveRepoName(repoId)) || repoId;

  if (!owner) {
    const inferredOwner = await getGitHubLogin(user.githubToken);
    if (inferredOwner) owner = inferredOwner;
    else return errors.badRequest("Missing x-repo-owner header and could not infer owner.");
  }

  // Detect language from extension
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const LANG_MAP: Record<string, string> = {
    ts: "typescript", js: "javascript", py: "python",
    go: "go", rs: "rust", java: "java", cs: "csharp",
    rb: "ruby", php: "php", md: "markdown", json: "json",
    yaml: "yaml", yml: "yaml", tf: "hcl",
  };
  const language = LANG_MAP[ext] ?? "plaintext";

  try {
    const content = await fetchFileContent(
      owner, name, filePath.replace(/^\//, ""), user.githubToken, ref
    );
    return ok({ path: filePath, ref, content, language });
  } catch (e: any) {
    logger.error({ repoId, filePath, msg: "getFileContent failed", error: e?.message });
    return errors.notFound(`File '${filePath}' not found on ref '${ref}'.`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/workspace/annotations
// ─────────────────────────────────────────────────────────────────────────────

export const getAnnotations = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const filePath = event.queryStringParameters?.path;
  const ref = event.queryStringParameters?.ref ?? "main";
  if (!filePath) return errors.badRequest("Missing path query parameter.");

  try {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: ANNOTATIONS_TABLE,
        FilterExpression: "repoId = :r AND filePath = :fp AND #ref = :ref",
        ExpressionAttributeNames: { "#ref": "ref" },
        ExpressionAttributeValues: { ":r": repoId, ":fp": filePath, ":ref": ref },
      })
    );

    const annotations = (res.Items ?? [])
      .sort((a: any, b: any) => (a.line ?? 0) - (b.line ?? 0))
      .map((a: any) => ({
        id: a.id,
        line: a.line,
        type: a.type ?? "info",
        title: a.title ?? "",
        message: a.message ?? "",
        suggestions: a.suggestions ?? [],
      }));

    return ok({ path: filePath, annotations });
  } catch (e: any) {
    logger.warn({
      repoId,
      filePath,
      msg: "getAnnotations: DynamoDB scan failed (table may not exist)",
      table: ANNOTATIONS_TABLE,
      error: e?.message,
    });
    // Return empty annotations rather than crashing — table may not be provisioned yet
    return ok({ path: filePath, annotations: [] });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/workspace/chat
// ─────────────────────────────────────────────────────────────────────────────

export const sendChatMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") return preflight();

    const user = await resolveUser(event);
    if (!user) return errors.unauthorized();

    const repoId = event.pathParameters?.repoId;
    if (!repoId) return errors.badRequest("Missing repoId.");

    let body: any = {};
    try {
      if (event.body) body = JSON.parse(event.body);
    } catch {
      return errors.badRequest("Invalid JSON body.");
    }

    const { message, context, language = "en" } = body as {
      message: string;
      context?: { file_path?: string; line?: number; annotation_id?: string };
      language?: Language;
    };

    if (!message) return errors.badRequest("message is required.");

    const messageId = `msg_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const now = new Date().toISOString();

    // Build the prompt — include file context if provided
    let systemPrompt = "You are Sentinel, Velocis's AI code review and mentoring assistant. Provide concise, actionable guidance.";
    let userPrompt = message;
    if (context?.file_path) {
      userPrompt = `[File: ${context.file_path}${context.line ? ` line ${context.line}` : ""}]\n\n${message}`;
    }

    let responseContent = "";
    try {
      // DeepSeek V3 uses OpenAI-compatible request format
      const payload = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.3,
        top_p: 0.9,
      };

      const cmd = new InvokeModelCommand({
        modelId: DEEPSEEK_V3_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const bedrockRes = await bedrock.send(cmd);
      const parsed = JSON.parse(new TextDecoder().decode(bedrockRes.body));
      // DeepSeek V3 response: OpenAI-compatible — choices[0].message.content
      responseContent = parsed.choices?.[0]?.message?.content ?? "";
    } catch (e: any) {
      logger.error({
        repoId,
        msg: "Bedrock invocation failed",
        error: e?.message,
        stack: e?.stack,
        region: BEDROCK_REGION,
        model: DEEPSEEK_V3_MODEL_ID,
      });
      return errors.agentUnavailable("Sentinel");
    }

    // Translate if requested
    let finalContent = responseContent;
    if (language !== "en") {
      try {
        finalContent = (await translateText({ text: responseContent, sourceLanguage: "en", targetLanguage: language as any })).translatedText;
      } catch (_) { /* fallback to English */ }
    }

    // Persist to DynamoDB (non-fatal — don't fail the response if the table is missing)
    try {
      await dynamo.send(
        new PutCommand({
          TableName: CHAT_TABLE,
          Item: {
            messageId,
            repoId,
            userId: user.userId,
            role: "sentinel",
            content: finalContent,
            language,
            context: context ?? null,
            timestamp: now,
          },
        })
      );
    } catch (dbErr: any) {
      logger.warn({
        repoId,
        msg: "Failed to persist chat message to DynamoDB (non-fatal)",
        table: CHAT_TABLE,
        error: dbErr?.message,
      });
    }

    // Log activity for the dashboard
    logActivity({
      userId: user.userId,
      repoId,
      agent: "sentinel",
      message: `Workspace chat: ${message.slice(0, 60)}${message.length > 60 ? "…" : ""}`,
      severity: "info",
    });

    return ok({
      message_id: messageId,
      role: "sentinel",
      content: finalContent,
      timestamp: now,
      timestamp_ago: "Just now",
    });
  } catch (err: any) {
    logger.error({
      msg: "sendChatMessage: unhandled error",
      error: err?.message,
      stack: err?.stack,
      region: BEDROCK_REGION,
      model: DEEPSEEK_V3_MODEL_ID,
    });
    return errors.internal(err?.message ?? "Unexpected error in chat handler");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/workspace/review
// ─────────────────────────────────────────────────────────────────────────────

export const reviewCodebase = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") return preflight();

    const user = await resolveUser(event);
    if (!user) return errors.unauthorized();

    const repoId = event.pathParameters?.repoId;
    if (!repoId) return errors.badRequest("Missing repoId.");

    let body: any = {};
    try {
      if (event.body) body = JSON.parse(event.body);
    } catch {
      return errors.badRequest("Invalid JSON body.");
    }

    const { language = "en", ref = "main" } = body as {
      language?: Language;
      ref?: string;
    };

    let owner = event.headers?.["x-repo-owner"] ?? "";
    const name = event.headers?.["x-repo-name"] ?? repoId;
    if (!owner) {
      const inferredOwner = await getGitHubLogin(user.githubToken);
      if (inferredOwner) owner = inferredOwner;
      else return errors.badRequest("Missing x-repo-owner header and could not infer owner.");
    }

    const tree = await fetchRepoTree({
      repoFullName: `${owner}/${name}`,
      token: user.githubToken,
      recursive: true,
      ref,
    });

    const reviewablePaths = tree
      .filter((item) => item.type === "blob" && isReviewableFilePath(`/${item.path}`))
      .map((item) => `/${item.path}`)
      .slice(0, MAX_REVIEW_FILES);

    if (reviewablePaths.length === 0) {
      return errors.badRequest("No reviewable source files were found in this repository.");
    }

    const fetchedFiles = await Promise.all(
      reviewablePaths.map(async (filePath) => {
        try {
          const content = await fetchFileContent(
            owner,
            name,
            filePath.replace(/^\//, ""),
            user.githubToken,
            ref
          );
          return {
            path: filePath,
            content: truncateText(content, MAX_FILE_CHARS),
          };
        } catch (err: any) {
          logger.warn({
            repoId,
            filePath,
            msg: "reviewCodebase: failed to fetch file (skipping)",
            error: err?.message,
          });
          return null;
        }
      })
    );

    const codeFiles: Array<{ path: string; content: string }> = [];
    let promptChars = 0;
    for (const file of fetchedFiles) {
      if (!file || !file.content.trim()) continue;
      const projectedChars = promptChars + file.path.length + file.content.length + 48;
      if (projectedChars > MAX_PROMPT_CHARS) break;
      codeFiles.push(file);
      promptChars = projectedChars;
    }

    if (codeFiles.length === 0) {
      return errors.internal("Unable to load source files for review.");
    }

    const systemPrompt = [
      "You are Sentinel, a senior code reviewer.",
      "Review the repository snapshot for logic bugs, security vulnerabilities, and scalability risks.",
      "Respond with strict JSON only and no markdown.",
      "Schema:",
      "{",
      '  "summary": "short executive summary",',
      '  "risk_level": "low|medium|high|critical",',
      '  "findings": [',
      "    {",
      '      "severity": "critical|warning|info",',
      '      "file_path": "/path/to/file.ts",',
      '      "line": 12,',
      '      "title": "short title",',
      '      "description": "what is wrong and why",',
      '      "fix_suggestion": "what to change"',
      "    }",
      "  ],",
      '  "auto_fix_candidate": {',
      '    "file_path": "/path/to/file.ts",',
      '    "reason": "why this file is chosen",',
      '    "fixed_code": "complete file content with the fix applied"',
      "  }",
      "}",
      "If no safe auto-fix is possible, set auto_fix_candidate to null.",
      "Never return partial file snippets in fixed_code.",
    ].join("\n");

    const repoSnapshot = codeFiles
      .map(
        (file) =>
          `FILE: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``
      )
      .join("\n\n");

    const userPrompt = [
      `Repository: ${owner}/${name}`,
      `Ref: ${ref}`,
      `Files included: ${codeFiles.length}`,
      "",
      "Review this snapshot and return JSON only:",
      repoSnapshot,
    ].join("\n");

    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3072,
      temperature: 0.2,
      top_p: 0.9,
    };

    const cmd = new InvokeModelCommand({
      modelId: DEEPSEEK_V3_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const bedrockRes = await bedrock.send(cmd);
    const parsed = JSON.parse(new TextDecoder().decode(bedrockRes.body));
    const rawReviewOutput = parsed.choices?.[0]?.message?.content ?? "";

    const parsedReview = parseReviewOutput(rawReviewOutput);
    const reviewResult: WorkspaceReviewResult = {
      ...parsedReview,
      files_reviewed: codeFiles.length,
    };

    let content = renderReviewMessage(reviewResult);
    if (language !== "en") {
      try {
        content = (await translateText({
          text: content,
          sourceLanguage: "en",
          targetLanguage: language as any,
        })).translatedText;
      } catch {
        // non-fatal; keep English content
      }
    }

    const messageId = `msg_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const now = new Date().toISOString();

    try {
      await dynamo.send(
        new PutCommand({
          TableName: CHAT_TABLE,
          Item: {
            messageId,
            repoId,
            userId: user.userId,
            role: "sentinel",
            content,
            language,
            isReview: true,
            review: reviewResult,
            auto_fix: reviewResult.auto_fix,
            timestamp: now,
          },
        })
      );
    } catch (dbErr: any) {
      logger.warn({
        repoId,
        msg: "Failed to persist workspace review message (non-fatal)",
        table: CHAT_TABLE,
        error: dbErr?.message,
      });
    }

    // Log activity for the dashboard
    logActivity({
      userId: user.userId,
      repoId,
      agent: "fortress",
      message: `Code review completed — ${reviewResult.risk_level} risk, ${reviewResult.files_reviewed} files reviewed`,
      severity: reviewResult.risk_level === "critical" ? "critical" : reviewResult.risk_level === "high" ? "warning" : "info",
    });

    return ok({
      message_id: messageId,
      role: "sentinel",
      content,
      review: reviewResult,
      auto_fix: reviewResult.auto_fix,
      timestamp: now,
      timestamp_ago: "Just now",
    });
  } catch (err: any) {
    logger.error({
      msg: "reviewCodebase: unhandled error",
      error: err?.message,
      stack: err?.stack,
      region: BEDROCK_REGION,
      model: DEEPSEEK_V3_MODEL_ID,
    });
    return errors.internal(err?.message ?? "Unexpected error in review handler");
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HANDLER: GET /repos/:repoId/workspace/chat/history
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getChatHistory = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const limit = Math.min(200, parseInt(event.queryStringParameters?.limit ?? "50", 10));

  try {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: CHAT_TABLE,
        FilterExpression: "repoId = :r AND userId = :u",
        ExpressionAttributeValues: { ":r": repoId, ":u": user.userId },
      })
    );

    const messages = (res.Items ?? [])
      .sort((a: any, b: any) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
      .slice(-limit)
      .map((m: any) => ({
        message_id: m.messageId,
        role: m.role,
        content: m.content ?? undefined,
        is_analysis: m.isAnalysis ?? false,
        analysis: m.analysis ?? undefined,
        review: m.review ?? undefined,
        auto_fix: m.auto_fix ?? undefined,
        timestamp: m.timestamp,
        timestamp_ago: timeAgo(m.timestamp),
      }));

    return ok({ messages });
  } catch (e: any) {
    logger.warn({
      repoId,
      msg: "getChatHistory: DynamoDB scan failed (table may not exist)",
      table: CHAT_TABLE,
      error: e?.message,
    });
    // Return empty history rather than crashing
    return ok({ messages: [] });
  }
};

