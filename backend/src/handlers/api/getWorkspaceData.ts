/**
 * getWorkspaceData.ts
 * Velocis — Workspace Handlers (Monaco editor + Sentinel AI chat panel)
 *
 * Routes:
 *   GET  /repos/:repoId/workspace/branches        → Branch list for selector
 *   GET  /repos/:repoId/workspace/files           → File picker listing
 *   GET  /repos/:repoId/workspace/files/content   → Raw file content
 *   GET  /repos/:repoId/workspace/annotations     → Sentinel annotations for a file
 *   POST /repos/:repoId/workspace/chat            → Send a message (Sentinel AI)
 *   POST /repos/:repoId/workspace/push            → Push edited file to GitHub branch
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
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { ok, errors, preflight, extractBearerToken } from "../../utils/apiResponse";
import { timeAgo } from "./getDashboard";
import { logger } from "../../utils/logger";
import { fetchFileContent, fetchRepoTree, listRepoBranches, pushFixCommit } from "../../services/github/repoOps";
import { translateText } from "../../services/aws/translate";
import { config } from "../../utils/config";
import { logActivity } from "../../utils/activityLogger";
import * as crypto from "crypto";
import axios from "axios";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { getUserToken, getInstallationTokenForRepo, getAppInstallUrl } from "../../services/github/auth";

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

interface WorkspaceChatResult {
  reply: string;
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

// Returns the correct line-comment prefix for a given file extension
function commentPrefix(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (["md", "markdown"].includes(ext)) return "<!--";
  if (["html", "htm", "xml", "svg"].includes(ext)) return "<!--";
  if (["css", "scss", "sass", "less"].includes(ext)) return "/*";
  if (["py", "rb", "sh", "bash", "yml", "yaml", "toml"].includes(ext)) return "#";
  if (["sql"].includes(ext)) return "--";
  // JS/TS/Go/Rust/Java/C/C++/Swift/Kotlin/PHP/C# and everything else
  return "//";
}

function commentLine(filePath: string, text: string): string {
  const prefix = commentPrefix(filePath);
  if (prefix === "<!--") return `<!-- ${text} -->`;
  if (prefix === "/*") return `/* ${text} */`;
  return `${prefix} ${text}`;
}

function buildAppendedContent(originalContent: string, newCode: string, filePath: string): string {
  const separator = commentLine(filePath, "Sentinel changes");
  const trimmedOriginal = originalContent.trimEnd();
  const trimmedNew = newCode.trim();
  return `${trimmedOriginal}\n\n${separator}\n${trimmedNew}\n`;
}

function isEditIntent(message: string): boolean {
  return /\b(edit|fix|update|modify|change|refactor|rewrite|implement|add|remove|rename|optimi[sz]e|improve)\b/i.test(
    message
  );
}

/**
 * Parses Sentinel's edit response using multiple strategies in order of preference.
 *
 * Strategy 1 — XML delimiters (primary, accepts both single/double quotes, strips wrapper fences)
 * Strategy 2 — Largest fenced code block in the response (when model ignores format instructions)
 * Strategy 3 — JSON fallback (old format)
 */
function parseChatOutput(rawModelOutput: string, targetFilePath?: string): WorkspaceChatResult {
  const fallbackReply = rawModelOutput.trim().slice(0, 3000) || "I could not generate a response.";

  // Strip markdown code fences wrapping the entire response (```xml ... ``` or ```json ... ```)
  const stripped = rawModelOutput.replace(/^\s*```[\w]*\n([\s\S]*?)```\s*$/i, "$1").trim();
  const textToSearch = stripped || rawModelOutput;

  // Extract reply block (optional)
  const replyMatch = textToSearch.match(/<SENTINEL_REPLY>([\s\S]*?)<\/SENTINEL_REPLY>/i);
  const reply = replyMatch?.[1]?.trim() || fallbackReply;

  // ── Strategy 1: XML delimiters ────────────────────────────────────────────
  // Accept both single and double quotes on the path attribute
  const fileMatch = textToSearch.match(/<SENTINEL_FILE\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/SENTINEL_FILE>/i);
  if (fileMatch) {
    const filePath = fileMatch[1].trim();
    // Strip a single leading/trailing newline added by the model
    const fixedCode = fileMatch[2].replace(/^\n/, "").replace(/\n$/, "");
    if (filePath && fixedCode.trim().length > 20) {
      logger.info({ msg: "parseChatOutput: matched XML delimiters", filePath, fixedCodeLength: fixedCode.length });
      return { reply, auto_fix: { file_path: filePath, reason: reply, fixed_code: fixedCode } };
    }
  }

  // ── Strategy 2: Largest fenced code block ────────────────────────────────
  // Use when model ignores format instructions but still returns a code block
  if (targetFilePath) {
    const codeBlocks: string[] = [];
    const fenceRe = /```(?:[\w.-]*)\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = fenceRe.exec(textToSearch)) !== null) {
      codeBlocks.push(m[1]);
    }
    const largest = codeBlocks.sort((a, b) => b.length - a.length)[0];
    if (largest && largest.trim().length > 50) {
      logger.info({ msg: "parseChatOutput: matched largest code block", targetFilePath, fixedCodeLength: largest.length });
      return { reply, auto_fix: { file_path: targetFilePath, reason: reply, fixed_code: largest.replace(/\n$/, "") } };
    }
  }

  // ── Strategy 3: JSON fallback ─────────────────────────────────────────────
  const jsonPayload = extractJsonPayload(textToSearch);
  if (jsonPayload) {
    try {
      const parsed = JSON.parse(jsonPayload);
      const autoFixRaw = parsed.auto_fix_candidate ?? parsed.auto_fix;
      if (
        autoFixRaw &&
        typeof autoFixRaw.file_path === "string" &&
        typeof autoFixRaw.fixed_code === "string" &&
        autoFixRaw.fixed_code.trim().length > 20
      ) {
        logger.info({ msg: "parseChatOutput: matched JSON fallback", filePath: autoFixRaw.file_path });
        return {
          reply: typeof parsed.reply === "string" ? parsed.reply.trim() : reply,
          auto_fix: {
            file_path: autoFixRaw.file_path.trim(),
            reason: (autoFixRaw.reason ?? "").trim(),
            fixed_code: autoFixRaw.fixed_code,
          },
        };
      }
    } catch { /* JSON parse failed */ }
  }

  logger.warn({ msg: "parseChatOutput: all strategies failed", rawOutputLength: rawModelOutput.length, firstChars: rawModelOutput.slice(0, 300) });
  return { reply, auto_fix: null };
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

/** Resolves both repoName and repoOwner from DynamoDB in one lookup. */
async function resolveRepoCreds(repoId: string): Promise<{ repoName: string | null; repoOwner: string | null }> {
  try {
    const rec = await dynamoClient.get<{ repoName?: string; repoOwner?: string }>({
      tableName: DYNAMO_TABLES.REPOSITORIES,
      key: { repoId },
    });
    return { repoName: rec?.repoName ?? null, repoOwner: rec?.repoOwner ?? null };
  } catch {
    return { repoName: null, repoOwner: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/workspace/branches
// ─────────────────────────────────────────────────────────────────────────────

export const listBranches = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  let owner = event.headers?.["x-repo-owner"] ?? "";
  const headerName = event.headers?.["x-repo-name"] ?? "";
  const name = headerName || (await resolveRepoName(repoId)) || repoId;

  if (!owner) {
    const inferredOwner = await getGitHubLogin(user.githubToken);
    if (inferredOwner) owner = inferredOwner;
    else return errors.badRequest("Missing x-repo-owner header and could not infer owner.");
  }

  try {
    const { defaultBranch, branches } = await listRepoBranches({
      repoFullName: `${owner}/${name}`,
      token: user.githubToken,
    });

    const names = branches.map((branch) => branch.name);
    const ordered = [
      defaultBranch,
      ...names.filter((branch) => branch !== defaultBranch),
    ];

    return ok({ default_branch: defaultBranch, branches: ordered });
  } catch (e: any) {
    logger.error({ repoId, msg: "listBranches failed", error: e?.message });
    return errors.internal("Failed to list repository branches.");
  }
};

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
  const ref = event.queryStringParameters?.ref ?? "HEAD";

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
    const tree = await fetchRepoTree({
      repoFullName: `${owner}/${name}`,
      token: user.githubToken,
      recursive: true,
      ref,
    });
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

    return ok({ path, ref, files });
  } catch (e: any) {
    logger.error({ repoId, path, ref, msg: "listFiles failed", error: e?.message });
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
      context?: { file_path?: string; line?: number; annotation_id?: string; ref?: string };
      language?: Language;
    };

    if (!message) return errors.badRequest("message is required.");

    const messageId = `msg_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const now = new Date().toISOString();

    // Build the prompt — include current file snapshot for edit requests.
    let systemPrompt = "You are Sentinel, Velocis's AI code review and mentoring assistant. Provide concise, actionable guidance.";
    let userPrompt = message;
    let autoFix: WorkspaceAutoFix | null = null;
    const selectedRef = context?.ref ?? "main";
    const normalizedFilePath = context?.file_path?.startsWith("/") ? context.file_path : context?.file_path ? `/${context.file_path}` : undefined;
    let wantsEdit = Boolean(normalizedFilePath) && isEditIntent(message);
    let currentFileContent = "";

    if (wantsEdit && normalizedFilePath) {
      let fetchedOwner = event.headers?.["x-repo-owner"] ?? "";
      const headerName = event.headers?.["x-repo-name"] ?? "";
      let name = headerName;
      if (!name || !fetchedOwner) {
        const creds = await resolveRepoCreds(repoId);
        if (!name) name = creds.repoName ?? repoId;
        if (!fetchedOwner) fetchedOwner = creds.repoOwner ?? (await getGitHubLogin(user.githubToken)) ?? "";
      }
      if (!fetchedOwner) {
        logger.warn({ repoId, msg: "sendChatMessage: could not resolve repo owner, falling back to conversational mode" });
        wantsEdit = false;
      }

      if (wantsEdit) {
        try {
          currentFileContent = await fetchFileContent(
            fetchedOwner,
            name,
            normalizedFilePath.replace(/^\//, ""),
            user.githubToken,
            selectedRef
          );
        } catch (fileErr: any) {
          logger.warn({
            repoId,
            filePath: normalizedFilePath,
            ref: selectedRef,
            msg: "sendChatMessage: file fetch for edit failed — falling back to conversational mode",
            error: fileErr?.message,
          });
          wantsEdit = false;
        }
      }

      if (wantsEdit) {
        systemPrompt = [
          "You are Sentinel, an autonomous coding assistant in Velocis Workspace.",
          "Apply the user's requested change to the file shown below and return the COMPLETE modified file.",
          "",
          "Respond using EXACTLY this format:",
          "",
          "<SENTINEL_REPLY>",
          "One or two sentences explaining what you changed.",
          "</SENTINEL_REPLY>",
          "<SENTINEL_FILE path=\"<exact file path from the request>\">",
          "<complete modified file content — ALL original code with your changes applied>",
          "</SENTINEL_FILE>",
          "",
          "Rules:",
          "- Return the FULL file content inside SENTINEL_FILE — not just the changed parts.",
          "- Do NOT wrap the code inside SENTINEL_FILE in markdown fences.",
          "- Do NOT include any text outside the two XML blocks above.",
          "- The path attribute must match the target file path exactly.",
        ].join("\n");

        userPrompt = [
          `Target file: ${normalizedFilePath}`,
          `Branch/ref: ${selectedRef}`,
          "",
          `User request: ${message}`,
          "",
          "Existing file content:",
          currentFileContent,
        ].join("\n");
      }
    }

    if (!wantsEdit && context?.file_path) {
      userPrompt = `[File: ${context.file_path}${context.line ? ` line ${context.line}` : ""}]\n\n${message}`;
    }

    let responseContent = "";
    try {
      // DeepSeek V3.2 on Bedrock uses the Converse API (not InvokeModel)
      const cmd = new ConverseCommand({
        modelId: DEEPSEEK_V3_MODEL_ID,
        system: [{ text: systemPrompt }],
        messages: [{ role: "user", content: [{ text: userPrompt }] }],
        inferenceConfig: {
          maxTokens: wantsEdit ? 8192 : 1024,
          temperature: 0.3,
          topP: 0.9,
        },
      });

      const bedrockRes = await bedrock.send(cmd);
      const rawOutput = bedrockRes.output?.message?.content?.[0] &&
        "text" in bedrockRes.output.message.content[0]
        ? (bedrockRes.output.message.content[0] as any).text as string
        : "";

      logger.info({
        repoId,
        msg: "sendChatMessage: model response",
        wantsEdit,
        filePath: normalizedFilePath,
        rawOutputLength: rawOutput.length,
        rawOutputPreview: rawOutput.slice(0, 200),
      });

      if (wantsEdit) {
        const chatResult = parseChatOutput(rawOutput, normalizedFilePath);
        responseContent = chatResult.reply;
        autoFix = chatResult.auto_fix;

        logger.info({
          repoId,
          msg: "sendChatMessage: parseChatOutput result",
          hasAutoFix: !!autoFix,
          autoFixPath: autoFix?.file_path,
        });

        if (autoFix) {
          const normalizedAutoFixPath = autoFix.file_path.startsWith("/")
            ? autoFix.file_path
            : `/${autoFix.file_path.replace(/^\/+/, "")}`;
          autoFix.file_path = normalizedAutoFixPath;
        }
      } else {
        responseContent = rawOutput;
      }
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
            auto_fix: autoFix,
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
      auto_fix: autoFix,
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

    // DeepSeek V3.2 on Bedrock uses the Converse API (not InvokeModel)
    const cmd = new ConverseCommand({
      modelId: DEEPSEEK_V3_MODEL_ID,
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userPrompt }] }],
      inferenceConfig: {
        maxTokens: 3072,
        temperature: 0.2,
        topP: 0.9,
      },
    });

    const bedrockRes = await bedrock.send(cmd);
    const rawReviewOutput = bedrockRes.output?.message?.content?.[0] &&
      "text" in bedrockRes.output.message.content[0]
      ? (bedrockRes.output.message.content[0] as any).text as string
      : "";

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

// HANDLER: POST /repos/:repoId/workspace/push
export const pushWorkspaceFile = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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

  const { file_path, content, branch = "main", commit_message } = body as {
    file_path?: string;
    content?: string;
    branch?: string;
    commit_message?: string;
  };

  if (!file_path || typeof file_path !== "string") return errors.badRequest("file_path is required.");
  if (typeof content !== "string") return errors.badRequest("content is required.");
  if (!branch || typeof branch !== "string") return errors.badRequest("branch is required.");

  if (!user.githubToken) {
    logger.warn({ repoId, msg: "pushWorkspaceFile: stored OAuth token is empty — user needs to re-authenticate" });
    return errors.forbidden("GitHub authentication required. Please reconnect your GitHub account and try again.");
  }

  let owner = event.headers?.["x-repo-owner"] ?? "";
  const headerName = event.headers?.["x-repo-name"] ?? "";
  const name = headerName || (await resolveRepoName(repoId)) || repoId;
  if (!owner) {
    const inferredOwner = await getGitHubLogin(user.githubToken);
    if (inferredOwner) owner = inferredOwner;
    else return errors.badRequest("Missing x-repo-owner header and could not infer owner.");
  }

  // Use App installation token when GitHub App credentials are configured.
  // When running with a classical OAuth App (no GITHUB_APP_ID), skip this
  // and use the user's OAuth token directly — it carries `repo` scope for writes.
  let writeToken = user.githubToken;
  if (config.GITHUB_APP_ID && config.GITHUB_APP_PRIVATE_KEY) {
    try {
      writeToken = await getInstallationTokenForRepo(owner, name);
      logger.info({ repoId, msg: "pushWorkspaceFile: using installation token", owner, name });
    } catch (installErr: any) {
      const installStatus: number | undefined = installErr?.status ?? installErr?.response?.status;
      if (installStatus === 404) {
        let installUrl = 'https://github.com/apps';
        try { installUrl = await getAppInstallUrl(); } catch { /* use fallback */ }
        logger.warn({ repoId, msg: "pushWorkspaceFile: App not installed on repo", owner, name, installUrl });
        return errors.appNotInstalled(installUrl);
      }
      logger.warn({
        repoId,
        msg: "pushWorkspaceFile: installation token unavailable, falling back to user OAuth token",
        owner, name, error: String(installErr),
      });
    }
  } else {
    logger.info({ repoId, msg: "pushWorkspaceFile: GitHub App not configured, using user OAuth token", owner, name });
  }

  const normalizedPath = file_path.startsWith("/") ? file_path : `/${file_path}`;
  const commitMessage = (commit_message && commit_message.trim())
    ? commit_message.trim()
    : `Velocis workspace update: ${normalizedPath}`;

  try {
    const result = await pushFixCommit(
      owner,
      name,
      normalizedPath.replace(/^\//, ""),
      content,
      commitMessage,
      writeToken,
      branch
    );

    return ok({
      success: true,
      file_path: normalizedPath,
      branch,
      commit_sha: result.sha,
      message: `Pushed ${normalizedPath} to ${branch}`,
    });
  } catch (e: any) {
    const statusCode: number | undefined = e?.status ?? e?.response?.status;
    const ghMessage: string = e?.response?.data?.message ?? e?.message ?? String(e);
    logger.error({
      repoId,
      file_path: normalizedPath,
      branch,
      owner,
      name,
      msg: "pushWorkspaceFile failed",
      httpStatus: statusCode,
      error: ghMessage,
      hint: statusCode === 403
        ? "403: Check that the OAuth token has 'repo' scope, the branch is not protected, and the app is authorized on this repository."
        : statusCode === 404
        ? "404: Repository or branch not found — verify owner/name/branch."
        : undefined,
    });
    if (statusCode === 403) {
      return errors.forbidden(
        `GitHub rejected the push (403): ${ghMessage}. ` +
        "This usually means the repository has branch protection rules, " +
        "or the OAuth token lacks write permissions. " +
        "Try pushing to a non-protected branch, or re-authenticate with repo write scope."
      );
    }
    return errors.internal("Failed to push file changes to GitHub.");
  }
};

// HANDLER: GET /repos/:repoId/workspace/chat/history
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


