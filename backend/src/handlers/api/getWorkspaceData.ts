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
import * as crypto from "crypto";
import axios from "axios";
import { dynamoClient, DYNAMO_TABLES } from "../../services/database/dynamoClient";
import { getUserToken } from "../../services/github/auth";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({ region: config.AWS_REGION });
const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-in-production";
const USERS_TABLE = process.env.USERS_TABLE ?? "velocis-users";
const ANNOTATIONS_TABLE = process.env.ANNOTATIONS_TABLE ?? "velocis-annotations";
const CHAT_TABLE = process.env.CHAT_TABLE ?? "velocis-workspace-chat";

type Language = "en" | "hi" | "ta";

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
  const name = event.headers?.["x-repo-name"] ?? repoId;

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
  const name = event.headers?.["x-repo-name"] ?? repoId;
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
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: POST /repos/:repoId/workspace/chat
// ─────────────────────────────────────────────────────────────────────────────

export const sendChatMessage = async (
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
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };

    const cmd = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const bedrockRes = await bedrock.send(cmd);
    const parsed = JSON.parse(new TextDecoder().decode(bedrockRes.body));
    responseContent = parsed.content?.[0]?.text ?? "";
  } catch (e: any) {
    logger.error({ repoId, msg: "Bedrock invocation failed", error: e?.message });
    return errors.agentUnavailable("Sentinel");
  }

  // Translate if requested
  let finalContent = responseContent;
  if (language !== "en") {
    try {
      finalContent = (await translateText({ text: responseContent, sourceLanguage: "en", targetLanguage: language as any })).translatedText;
    } catch (_) { /* fallback to English */ }
  }

  // Persist to DynamoDB
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

  return ok({
    message_id: messageId,
    role: "sentinel",
    content: finalContent,
    timestamp: now,
    timestamp_ago: "Just now",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: GET /repos/:repoId/workspace/chat/history
// ─────────────────────────────────────────────────────────────────────────────

export const getChatHistory = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const user = await resolveUser(event);
  if (!user) return errors.unauthorized();

  const repoId = event.pathParameters?.repoId;
  if (!repoId) return errors.badRequest("Missing repoId.");

  const limit = Math.min(200, parseInt(event.queryStringParameters?.limit ?? "50", 10));

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
      timestamp: m.timestamp,
      timestamp_ago: timeAgo(m.timestamp),
    }));

  return ok({ messages });
};
