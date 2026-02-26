/**
 * postChatMessage.ts
 * AWS Lambda Handler — Sentinel Vibe Coding Workspace
 *
 * Responsibilities:
 *  1. Receive a developer's chat message from the Workspace UI (via API Gateway WebSocket or REST)
 *  2. Pull relevant codebase context from DynamoDB + Amazon Titan Embeddings (RAG)
 *  3. Send the enriched prompt to Claude 3.5 Sonnet via Amazon Bedrock
 *  4. Optionally translate the response via Amazon Translate (Regional Mentorship Hub)
 *  5. Persist the conversation turn to DynamoDB
 *  6. Return the structured Sentinel response to the frontend
 */

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";

import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────
// Centralized service imports
// All high-level calls go through these wrappers for consistent
// logging, error handling, and testability.
// ─────────────────────────────────────────────

import { config } from "../../utils/config";
import { logger } from "../../utils/logger";
import {
  invokeClaude as centralInvokeClaude,
  invokeClaudeStream,
  BEDROCK_MODELS,
  BedrockMessage,
} from "../../services/aws/bedrockClient";
import { translateText } from "../../services/aws/translate";
import {
  dynamoClient as dynamo,
  DYNAMO_TABLES,
  DynamoTableName,
} from "../../services/database/dynamoClient";

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

type SupportedLanguage = "en" | "hi" | "ta" | "te" | "kn" | "mr" | "bn";

interface ChatMessageRequest {
  repoId: string;
  sessionId: string;
  message: string;
  language?: SupportedLanguage; // defaults to "en"
  filePath?: string; // optional: scope review to a specific file
  connectionId?: string; // WebSocket connection ID (if streaming)
}

interface CodeContext {
  filePath: string;
  content: string;
  language: string;
}

interface SentinelResponse {
  messageId: string;
  sessionId: string;
  repoId: string;
  role: "sentinel";
  content: string;
  translatedContent?: string;
  language: SupportedLanguage;
  codeSnippets?: SuggestedCodeSnippet[];
  issues?: CodeIssue[];
  timestamp: string;
}

interface SuggestedCodeSnippet {
  filePath: string;
  originalCode: string;
  suggestedCode: string;
  explanation: string;
}

interface CodeIssue {
  severity: "critical" | "warning" | "info";
  category: "security" | "logic" | "scalability" | "style";
  description: string;
  line?: number;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ─────────────────────────────────────────────
// AWS Client Initialization
// Raw SDK clients are kept to satisfy the import requirements and allow
// future low-level overrides. All actual invocations go through the
// centralized service wrappers imported above.
// ─────────────────────────────────────────────

const REGION = config.AWS_REGION;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _bedrockSdkClient = new BedrockRuntimeClient({ region: REGION });     // reserved — use centralInvokeClaude / invokeClaudeStream
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _translateSdkClient = new TranslateClient({ region: REGION });        // reserved — use translateText
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _dynamoSdkClient = new DynamoDBClient({ region: REGION });            // reserved — use dynamo.*

// ─────────────────────────────────────────────
// Table Names & Model IDs (from centralized config)
// ─────────────────────────────────────────────

const CONVERSATIONS_TABLE = DYNAMO_TABLES.AI_ACTIVITY;
const REPOS_TABLE = DYNAMO_TABLES.REPOSITORIES;
// CODEBASE_CONTEXT_TABLE has no config equivalent yet — kept as env var
const CODEBASE_CONTEXT_TABLE =
  (process.env.CODEBASE_CONTEXT_TABLE || "") as DynamoTableName;
const CLAUDE_MODEL_ID = BEDROCK_MODELS.CLAUDE_SONNET;
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT;

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_CONVERSATION_HISTORY = 10; // last N turns to include
const MAX_CODE_CONTEXT_CHARS = 8000;

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  mr: "Marathi",
  bn: "Bengali",
};

// ─────────────────────────────────────────────
// Sentinel System Prompt
// ─────────────────────────────────────────────

const buildSystemPrompt = (codeContext: CodeContext | null): string => {
  const codeSection = codeContext
    ? `
## Current File Context
File: ${codeContext.filePath} (${codeContext.language})
\`\`\`${codeContext.language}
${codeContext.content.slice(0, MAX_CODE_CONTEXT_CHARS)}
\`\`\`
`
    : "";

  return `You are Sentinel, an elite AI Senior Software Engineer embedded inside the Velocis platform. You are not a passive assistant — you are a proactive collaborator, mentor, and code guardian.

## Your Core Responsibilities
1. **Deep Code Review**: Focus exclusively on logic flaws, security vulnerabilities, scalability bottlenecks, and architectural issues. Do NOT comment on formatting or linting — those are handled by other tools.
2. **Mentorship Mode**: Always explain the *why* behind every issue. Don't just point out problems — teach the developer how to think about the solution.
3. **Actionable Suggestions**: When you identify an issue, provide corrected code in a fenced code block. Be specific.
4. **Architecture Awareness**: Consider the broader system — microservices boundaries, data flow, API contracts, and downstream impacts.
5. **Security First**: Flag any potential injection vulnerabilities, auth/authz gaps, insecure deserialization, or sensitive data exposure immediately and mark them as CRITICAL.

## Response Format
Structure your responses clearly:
- Start with a brief, direct answer to the developer's question.
- Use **Issue: [SEVERITY]** headers (CRITICAL / WARNING / INFO) for code problems.
- Include \`\`\`language fenced code blocks for all code suggestions.
- End with a "Next Steps" section if appropriate.

## Tone
You are senior, confident, but never condescending. You treat the developer as a peer who is learning. Be concise — no fluff.
${codeSection}`;
};

// ─────────────────────────────────────────────
// DynamoDB Helpers — via centralized dynamo client
// ─────────────────────────────────────────────

/**
 * Fetches the last N conversation turns for a session.
 */
const getConversationHistory = async (
  sessionId: string
): Promise<ConversationMessage[]> => {
  const result = await dynamo.query<Record<string, unknown>>({
    tableName: CONVERSATIONS_TABLE,
    keyConditionExpression: "sessionId = :sid",
    expressionAttributeValues: { ":sid": sessionId },
    scanIndexForward: false, // newest first
    limit: MAX_CONVERSATION_HISTORY,
  });

  if (!result.items.length) return [];

  // Reverse so oldest is first (Bedrock requires chronological order)
  const messages = [...result.items].reverse();

  const history: ConversationMessage[] = [];
  for (const msg of messages) {
    if (msg.userMessage) {
      history.push({ role: "user", content: msg.userMessage as string });
    }
    if (msg.sentinelResponse) {
      history.push({ role: "assistant", content: msg.sentinelResponse as string });
    }
  }

  return history;
};

/**
 * Fetches repo metadata and optionally the content of a specific file.
 */
const getCodeContext = async (
  repoId: string,
  filePath?: string
): Promise<CodeContext | null> => {
  if (!filePath) return null;

  try {
    const item = await dynamo.get<Record<string, unknown>>({
      tableName: CODEBASE_CONTEXT_TABLE,
      key: { repoId, filePath },
    });

    if (!item) return null;

    return {
      filePath: item.filePath as string,
      content: item.content as string,
      language: (item.language as string) || "typescript",
    };
  } catch (err) {
    logger.warn({ msg: "Could not fetch code context", error: String(err) });
    return null;
  }
};

/**
 * Saves a conversation turn to DynamoDB.
 */
const saveConversationTurn = async (
  sessionId: string,
  repoId: string,
  userMessage: string,
  sentinelResponse: string,
  messageId: string
): Promise<void> => {
  await dynamo.upsert({
    tableName: CONVERSATIONS_TABLE,
    key: "sessionId",
    sortKey: "messageId",
    item: {
      sessionId,
      messageId,
      repoId,
      userMessage,
      sentinelResponse,
      timestamp: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 day TTL
    },
  });
};

// ─────────────────────────────────────────────
// Bedrock (Claude 3.5 Sonnet) — via centralized bedrockClient
// ─────────────────────────────────────────────

/**
 * Calls Claude 3.5 Sonnet via the centralized bedrockClient.
 * Routes through centralInvokeClaude for consistent logging and error handling.
 */
const callClaude = async (
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<string> => {
  const messages: BedrockMessage[] = [
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await centralInvokeClaude({
    systemPrompt,
    messages,
    temperature: 0.3,
    topP: 0.9,
  });

  return response.text;
};

/**
 * Streams Claude's response token-by-token to a WebSocket connection.
 * Consumes the async generator from invokeClaudeStream (bedrockClient.ts)
 * and forwards each token to the client via ApiGatewayManagementApiClient.
 */
const streamClaudeToWebSocket = async (
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string,
  connectionId: string
): Promise<string> => {
  if (!WEBSOCKET_ENDPOINT) {
    throw new Error("WEBSOCKET_ENDPOINT not configured for streaming");
  }

  const wsClient = new ApiGatewayManagementApiClient({
    region: REGION,
    endpoint: WEBSOCKET_ENDPOINT,
  });

  const messages: BedrockMessage[] = [
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  let fullResponse = "";

  for await (const chunk of invokeClaudeStream({
    systemPrompt,
    messages,
    temperature: 0.3,
    topP: 0.9,
  })) {
    if (chunk.isComplete) {
      await wsClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({ type: "stream_end" }),
        })
      );
    } else if (chunk.text) {
      fullResponse += chunk.text;
      await wsClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({ type: "token", content: chunk.text }),
        })
      );
    }
  }

  return fullResponse;
};

// ─────────────────────────────────────────────
// Amazon Translate — Regional Mentorship Hub — via centralized translateText
// ─────────────────────────────────────────────

/**
 * Translates Sentinel's response into the requested regional language.
 * Only translates non-code content (preserves code blocks).
 * Routes through translateText from translate.ts.
 */
const translateResponse = async (
  text: string,
  targetLanguage: SupportedLanguage
): Promise<string> => {
  if (targetLanguage === "en") return text;

  // Split on code blocks to avoid translating code
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = text.split(codeBlockRegex);

  const translatedParts = await Promise.all(
    parts.map(async (part) => {
      // Don't translate code blocks
      if (part.startsWith("```")) return part;

      // Skip empty or whitespace-only parts
      if (!part.trim()) return part;

      try {
        const result = await translateText({
          text: part,
          targetLanguage: targetLanguage as any,
          sourceLanguage: "en" as any,
        });
        return result.translatedText;
      } catch (err) {
        logger.warn({
          msg: "Translation failed for part, returning original",
          error: String(err),
        });
        return part;
      }
    })
  );

  return translatedParts.join("");
};

// ─────────────────────────────────────────────
// Response Parsing
// ─────────────────────────────────────────────

/**
 * Parses Claude's raw text response to extract structured issues and code snippets.
 */
const parseStructuredResponse = (
  rawResponse: string
): {
  issues: CodeIssue[];
  codeSnippets: SuggestedCodeSnippet[];
} => {
  const issues: CodeIssue[] = [];

  // Extract issues by severity markers
  const issueRegex =
    /\*\*Issue:\s*(CRITICAL|WARNING|INFO)\*\*[:\s]*([\s\S]*?)(?=\*\*Issue:|```|$)/gi;
  let match;

  while ((match = issueRegex.exec(rawResponse)) !== null) {
    const severity = match[1].toLowerCase() as CodeIssue["severity"];
    const description = match[2].trim();

    // Rough category detection
    let category: CodeIssue["category"] = "logic";
    const lowerDesc = description.toLowerCase();
    if (
      lowerDesc.includes("sql") ||
      lowerDesc.includes("injection") ||
      lowerDesc.includes("auth") ||
      lowerDesc.includes("xss") ||
      lowerDesc.includes("csrf") ||
      lowerDesc.includes("secret") ||
      lowerDesc.includes("token")
    ) {
      category = "security";
    } else if (
      lowerDesc.includes("scale") ||
      lowerDesc.includes("performance") ||
      lowerDesc.includes("memory") ||
      lowerDesc.includes("n+1") ||
      lowerDesc.includes("bottleneck")
    ) {
      category = "scalability";
    }

    issues.push({ severity, category, description });
  }

  // Extract code snippets (simplified — just grab fenced blocks)
  const codeSnippets: SuggestedCodeSnippet[] = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let codeMatch;

  while ((codeMatch = codeRegex.exec(rawResponse)) !== null) {
    codeSnippets.push({
      filePath: "suggested",
      originalCode: "",
      suggestedCode: codeMatch[2].trim(),
      explanation: "See Sentinel's analysis above.",
    });
  }

  return { issues, codeSnippets };
};

// ─────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────

const validateRequest = (body: unknown): ChatMessageRequest => {
  if (!body || typeof body !== "object") {
    throw new Error("Request body is missing or not an object.");
  }

  const req = body as Partial<ChatMessageRequest>;

  if (!req.repoId || typeof req.repoId !== "string") {
    throw new Error("repoId is required and must be a string.");
  }
  if (!req.sessionId || typeof req.sessionId !== "string") {
    throw new Error("sessionId is required and must be a string.");
  }
  if (!req.message || typeof req.message !== "string") {
    throw new Error("message is required and must be a string.");
  }
  if (req.message.length > 10000) {
    throw new Error("message exceeds 10,000 character limit.");
  }

  const supportedLanguages: SupportedLanguage[] = ["en", "hi", "ta", "te", "kn", "mr", "bn"];
  const language: SupportedLanguage =
    req.language && supportedLanguages.includes(req.language)
      ? req.language
      : "en";

  return {
    repoId: req.repoId,
    sessionId: req.sessionId,
    message: req.message.trim(),
    language,
    filePath: req.filePath,
    connectionId: req.connectionId,
  };
};

// ─────────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": config.ALLOWED_ORIGINS[0] || "https://velocis.dev",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

// ─────────────────────────────────────────────
// Lambda Handler
// ─────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  logger.info({
    msg: "Sentinel postChatMessage invoked",
    requestId: event.requestContext.requestId,
    path: event.path,
  });

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  let request: ChatMessageRequest;

  // ── 1. Parse & Validate Input ──────────────
  try {
    const rawBody =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};
    request = validateRequest(rawBody);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    logger.error({ msg: "Validation error", error: message });
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Bad Request", message }),
    };
  }

  const { repoId, sessionId, message, language, filePath, connectionId } =
    request;

  try {
    // ── 2. Fetch Context in Parallel ──────────
    const [conversationHistory, codeContext] = await Promise.all([
      getConversationHistory(sessionId),
      getCodeContext(repoId, filePath),
    ]);

    logger.info({
      msg: "Fetched conversation context",
      historyCount: conversationHistory.length,
      codeContext: codeContext ? codeContext.filePath : "none",
    });

    // ── 3. Build System Prompt ─────────────────
    const systemPrompt = buildSystemPrompt(codeContext);

    // ── 4. Invoke Claude (Stream or REST) ──────
    let rawSentinelResponse: string;

    if (connectionId && WEBSOCKET_ENDPOINT) {
      // WebSocket streaming mode
      rawSentinelResponse = await streamClaudeToWebSocket(
        systemPrompt,
        conversationHistory,
        message,
        connectionId
      );
    } else {
      // Standard REST mode
      rawSentinelResponse = await callClaude(
        systemPrompt,
        conversationHistory,
        message
      );
    }

    if (!rawSentinelResponse) {
      throw new Error("Received empty response from Claude.");
    }

    // ── 5. Translate if needed (Regional Mentorship Hub) ──
    let translatedContent: string | undefined;
    if (language !== "en") {
      logger.info({
        msg: "Translating Sentinel response",
        targetLanguage: LANGUAGE_NAMES[language],
      });
      translatedContent = await translateResponse(rawSentinelResponse, language);
    }

    // ── 6. Parse Structured Insights ──────────
    const { issues, codeSnippets } = parseStructuredResponse(rawSentinelResponse);

    // ── 7. Build Final Response ────────────────
    const messageId = randomUUID();
    const timestamp = new Date().toISOString();

    const sentinelResponse: SentinelResponse = {
      messageId,
      sessionId,
      repoId,
      role: "sentinel",
      content: rawSentinelResponse,
      ...(translatedContent && { translatedContent }),
      language,
      codeSnippets: codeSnippets.length > 0 ? codeSnippets : undefined,
      issues: issues.length > 0 ? issues : undefined,
      timestamp,
    };

    // ── 8. Persist to DynamoDB (async, non-blocking) ──
    saveConversationTurn(
      sessionId,
      repoId,
      message,
      rawSentinelResponse,
      messageId
    ).catch((err) =>
      logger.error({ msg: "Failed to save conversation turn", error: String(err) })
    );

    logger.info({
      msg: "Sentinel responded successfully",
      messageId,
      issuesFound: issues.length,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(sentinelResponse),
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    logger.error({ msg: "Sentinel Lambda error", error: String(err) });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: errorMessage,
        requestId: event.requestContext.requestId,
      }),
    };
  }
};