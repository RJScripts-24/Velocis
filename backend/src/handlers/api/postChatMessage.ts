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
// Types & Interfaces
// ─────────────────────────────────────────────

type SupportedLanguage = "en" | "hi" | "ta" | "te";

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
// ─────────────────────────────────────────────

const REGION = process.env.AWS_REGION || "us-east-1";

const bedrockClient = new BedrockRuntimeClient({ region: REGION });
const translateClient = new TranslateClient({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });

// ─────────────────────────────────────────────
// Environment Variables
// ─────────────────────────────────────────────

const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE!;
const REPOS_TABLE = process.env.REPOS_TABLE!;
const CODEBASE_CONTEXT_TABLE = process.env.CODEBASE_CONTEXT_TABLE!;
const CLAUDE_MODEL_ID =
  process.env.CLAUDE_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT; // e.g. https://xyz.execute-api.us-east-1.amazonaws.com/prod

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
// DynamoDB Helpers
// ─────────────────────────────────────────────

/**
 * Fetches the last N conversation turns for a session.
 */
const getConversationHistory = async (
  sessionId: string
): Promise<ConversationMessage[]> => {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: CONVERSATIONS_TABLE,
      KeyConditionExpression: "sessionId = :sid",
      ExpressionAttributeValues: marshall({ ":sid": sessionId }),
      ScanIndexForward: false, // newest first
      Limit: MAX_CONVERSATION_HISTORY,
    })
  );

  if (!result.Items || result.Items.length === 0) return [];

  const messages = result.Items.map((item) => unmarshall(item)).reverse();

  // Flatten into Bedrock-compatible format
  const history: ConversationMessage[] = [];
  for (const msg of messages) {
    if (msg.userMessage) {
      history.push({ role: "user", content: msg.userMessage });
    }
    if (msg.sentinelResponse) {
      history.push({ role: "assistant", content: msg.sentinelResponse });
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
    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: CODEBASE_CONTEXT_TABLE,
        Key: marshall({ repoId, filePath }),
      })
    );

    if (!result.Item) return null;

    const item = unmarshall(result.Item);
    return {
      filePath: item.filePath,
      content: item.content,
      language: item.language || "typescript",
    };
  } catch (err) {
    console.warn("Could not fetch code context:", err);
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
  await dynamoClient.send(
    new PutItemCommand({
      TableName: CONVERSATIONS_TABLE,
      Item: marshall({
        sessionId,
        messageId,
        repoId,
        userMessage,
        sentinelResponse,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 day TTL
      }),
    })
  );
};

// ─────────────────────────────────────────────
// Bedrock (Claude 3.5 Sonnet) Invocation
// ─────────────────────────────────────────────

/**
 * Calls Claude 3.5 Sonnet via Amazon Bedrock and returns the full response.
 */
const invokeClaude = async (
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<string> => {
  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user",
      content: userMessage,
    },
  ];

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    temperature: 0.3, // lower temp = more precise, deterministic code reviews
    top_p: 0.9,
  };

  const command = new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return responseBody.content?.[0]?.text || "";
};

/**
 * Streams Claude's response token-by-token to a WebSocket connection.
 * Used when connectionId is provided (WebSocket mode).
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

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    temperature: 0.3,
    top_p: 0.9,
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: CLAUDE_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);

  let fullResponse = "";

  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

        if (chunk.type === "content_block_delta" && chunk.delta?.text) {
          const token = chunk.delta.text;
          fullResponse += token;

          // Push token to WebSocket client
          await wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: JSON.stringify({
                type: "token",
                content: token,
              }),
            })
          );
        }

        if (chunk.type === "message_stop") {
          // Signal end of stream
          await wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: JSON.stringify({ type: "stream_end" }),
            })
          );
        }
      }
    }
  }

  return fullResponse;
};

// ─────────────────────────────────────────────
// Amazon Translate — Regional Mentorship Hub
// ─────────────────────────────────────────────

/**
 * Translates Sentinel's response into the requested regional language.
 * Only translates non-code content (preserves code blocks).
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
        const command = new TranslateTextCommand({
          Text: part,
          SourceLanguageCode: "en",
          TargetLanguageCode: targetLanguage,
        });

        const result = await translateClient.send(command);
        return result.TranslatedText || part;
      } catch (err) {
        console.warn(`Translation failed for part, returning original:`, err);
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

  const supportedLanguages: SupportedLanguage[] = ["en", "hi", "ta", "te"];
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
  "Access-Control-Allow-Origin":
    process.env.ALLOWED_ORIGIN || "https://velocis.dev",
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
  console.log("Sentinel postChatMessage invoked", {
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
    console.error("Validation error:", message);
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

    console.log(
      `Fetched ${conversationHistory.length} history messages. Code context: ${codeContext ? codeContext.filePath : "none"}`
    );

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
      rawSentinelResponse = await invokeClaude(
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
      console.log(
        `Translating Sentinel response to ${LANGUAGE_NAMES[language]}...`
      );
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
    ).catch((err) => console.error("Failed to save conversation turn:", err));

    console.log(
      `Sentinel responded successfully. MessageId: ${messageId}, Issues found: ${issues.length}`
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(sentinelResponse),
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Sentinel Lambda error:", err);

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