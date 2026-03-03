// src/services/aws/bedrockClient.ts
// Centralized LLM orchestration for all three Velocis agents
// All Bedrock calls flow through here — no agent talks to Bedrock directly
// Handles: Amazon Nova Pro 1.0 (Sentinel), Llama 3 (Fortress), Titan Embeddings (RAG)

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  InvokeModelCommandInput,
} from "@aws-sdk/client-bedrock-runtime";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────
// MODEL IDs
// Centralised here — change model version in one place
// ─────────────────────────────────────────────

export const BEDROCK_MODELS = {
  // Sentinel: Deep logic, security, architectural review, self-healing
  // DeepSeek V3 on Bedrock uses OpenAI-compatible request/response format
  DEEPSEEK_V3: "deepseek.v3.2",

  // Fortress: High-speed unit test generation
  LLAMA3: "meta.llama3-70b-instruct-v1:0",

  // RAG: Vectorizing the codebase for semantic search
  TITAN_EMBEDDINGS: "amazon.titan-embed-text-v2:0",
} as const;

export type BedrockModelId = (typeof BEDROCK_MODELS)[keyof typeof BEDROCK_MODELS];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface BedrockMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeInvokeParams {
  systemPrompt: string;
  messages: BedrockMessage[];
  maxTokens?: number;
  temperature?: number;       // 0.0 = deterministic, 1.0 = creative
  topP?: number;
  stopSequences?: string[];
}

export interface LlamaInvokeParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface TitanEmbeddingParams {
  text: string;
  dimensions?: 256 | 512 | 1024; // Titan Embeddings v2 supported dimensions
  normalize?: boolean;
}

export interface BedrockTextResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
  model: BedrockModelId;
  latencyMs: number;
}

export interface BedrockEmbeddingResponse {
  embedding: number[];
  inputTokens: number;
  model: BedrockModelId;
  latencyMs: number;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  stopReason?: string;
}

// ─────────────────────────────────────────────
// CLIENT SINGLETON
// One client instance reused across all Lambda invocations (warm starts)
// ─────────────────────────────────────────────

let _client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!_client) {
    // Nova Pro uses the "us." cross-region inference prefix which requires a US region.
    // BEDROCK_REGION defaults to us-east-1; set it explicitly in .env to override.
    const bedrockRegion = config.BEDROCK_REGION || config.AWS_REGION;
    _client = new BedrockRuntimeClient({
      region: bedrockRegion,
      // In Lambda, credentials come from the execution role automatically
      // For local dev, AWS_PROFILE or env vars are used
      ...(config.IS_LOCAL && config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY && {
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY as string,
        },
      }),
    });
    logger.info({ msg: "BedrockRuntimeClient initialized", region: bedrockRegion });
  }
  return _client;
}

// ─────────────────────────────────────────────
// DEEPSEEK V3 — Sentinel & Self-Healing
// Used for: deep logic review, security analysis,
//           architectural mentorship, Fortress self-healing
// DeepSeek V3 uses OpenAI-compatible request format:
//   - messages: [{ role: "system"|"user"|"assistant", content: string }]
//   - max_tokens, temperature, top_p at top level
// Response: choices[0].message.content (OpenAI format)
// ─────────────────────────────────────────────

/**
 * Invokes DeepSeek V3 via the Bedrock InvokeModel API.
 * Uses OpenAI-compatible request/response format.
 * Supports multi-turn conversation history for the Vibe Coding workspace.
 *
 * @example
 * const result = await invokeClaude({
 *   systemPrompt: sentinelMentorPrompt,
 *   messages: [{ role: "user", content: codeContent }],
 *   temperature: 0.2,
 * });
 */
export async function invokeClaude(
  params: ClaudeInvokeParams
): Promise<BedrockTextResponse> {
  const {
    systemPrompt,
    messages,
    maxTokens = 4096,
    temperature = 0.2,
    topP = 0.9,
  } = params;

  const startTime = Date.now();

  // DeepSeek V3 uses OpenAI-compatible request format
  const requestBody = {
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODELS.DEEPSEEK_V3,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  } as InvokeModelCommandInput);

  try {
    logger.info({
      msg: "invokeDeepSeekV3: sending request",
      model: BEDROCK_MODELS.DEEPSEEK_V3,
      inputMessages: messages.length,
      maxTokens,
      temperature,
      region: config.BEDROCK_REGION || config.AWS_REGION,
    });

    const response = await getClient().send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    const latencyMs = Date.now() - startTime;
    // DeepSeek V3 response: OpenAI-compatible — choices[0].message.content
    const text = responseBody.choices?.[0]?.message?.content ?? "";
    const inputTokens = responseBody.usage?.prompt_tokens ?? 0;
    const outputTokens = responseBody.usage?.completion_tokens ?? 0;
    const stopReason = responseBody.choices?.[0]?.finish_reason ?? "unknown";

    logger.info({
      msg: "invokeDeepSeekV3: response received",
      latencyMs,
      inputTokens,
      outputTokens,
      stopReason,
      region: config.BEDROCK_REGION || config.AWS_REGION,
    });

    return {
      text,
      inputTokens,
      outputTokens,
      stopReason,
      model: BEDROCK_MODELS.DEEPSEEK_V3,
      latencyMs,
    };
  } catch (err) {
    logger.error({
      msg: "invokeDeepSeekV3: invocation failed",
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      region: config.BEDROCK_REGION || config.AWS_REGION,
      model: BEDROCK_MODELS.DEEPSEEK_V3,
      latencyMs: Date.now() - startTime,
    });
    throw new BedrockInvocationError("DeepSeekV3", err);
  }
}

// ─────────────────────────────────────────────
// DEEPSEEK V3 STREAMING — Vibe Coding WebSocket Chat
// Streams tokens back in real-time for the split-screen workspace
// DeepSeek streaming uses OpenAI SSE-compatible delta format:
//   chunk: { choices: [{ delta: { content: "..." }, finish_reason: null }] }
//   final: { choices: [{ delta: {}, finish_reason: "stop" }] }
// ─────────────────────────────────────────────

/**
 * Streams DeepSeek V3's response token by token.
 * Each chunk is yielded as it arrives — perfect for the WebSocket chat UI.
 */
export async function* invokeClaudeStream(
  params: ClaudeInvokeParams
): AsyncGenerator<StreamChunk> {
  const {
    systemPrompt,
    messages,
    maxTokens = 4096,
    temperature = 0.3,
    topP = 0.9,
  } = params;

  // DeepSeek V3 uses OpenAI-compatible request format
  const requestBody = {
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    stream: true,
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: BEDROCK_MODELS.DEEPSEEK_V3,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  } as InvokeModelCommandInput);

  try {
    logger.info({
      msg: "invokeDeepSeekV3Stream: starting stream",
      model: BEDROCK_MODELS.DEEPSEEK_V3,
      region: config.BEDROCK_REGION || config.AWS_REGION,
    });

    const response = await getClient().send(command);

    if (!response.body) {
      throw new Error("No stream body returned from Bedrock");
    }

    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const decoded = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

        // DeepSeek V3 streaming: OpenAI-compatible delta format
        const choice = decoded.choices?.[0];
        if (!choice) continue;

        if (choice.finish_reason) {
          // Stream complete
          yield {
            text: "",
            isComplete: true,
            stopReason: choice.finish_reason,
          };
        } else if (choice.delta?.content) {
          yield {
            text: choice.delta.content,
            isComplete: false,
          };
        }
      }
    }
  } catch (err) {
    logger.error({
      msg: "invokeDeepSeekV3Stream: stream failed",
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      region: config.BEDROCK_REGION || config.AWS_REGION,
      model: BEDROCK_MODELS.DEEPSEEK_V3,
    });
    throw new BedrockInvocationError("DeepSeekV3Stream", err);
  }
}

// ─────────────────────────────────────────────
// LLAMA 3 — Fortress Test Generation
// High-speed test writing — lower cost, faster than Claude for structured output
// ─────────────────────────────────────────────

/**
 * Invokes Meta Llama 3 70B for unit test generation.
 * Uses Llama's native prompt format with [INST] tags.
 *
 * @example
 * const result = await invokeLlama({
 *   systemPrompt: fortressTddPrompt,
 *   userPrompt: `Generate unit tests for:\n${fileContent}`,
 *   temperature: 0.1,  // Very low = predictable test structure
 * });
 */
export async function invokeLlama(
  params: LlamaInvokeParams
): Promise<BedrockTextResponse> {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.1,
    topP = 0.9,
  } = params;

  const startTime = Date.now();

  // Llama 3 uses a specific prompt format
  const formattedPrompt = formatLlamaPrompt(systemPrompt, userPrompt);

  const requestBody = {
    prompt: formattedPrompt,
    max_gen_len: maxTokens,
    temperature,
    top_p: topP,
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODELS.LLAMA3,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  } as InvokeModelCommandInput);

  try {
    logger.info({
      msg: "invokeLlama: sending request",
      model: BEDROCK_MODELS.LLAMA3,
      maxTokens,
      temperature,
    });

    const response = await getClient().send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    const latencyMs = Date.now() - startTime;
    const text = responseBody.generation ?? "";
    const inputTokens = responseBody.prompt_token_count ?? 0;
    const outputTokens = responseBody.generation_token_count ?? 0;
    const stopReason = responseBody.stop_reason ?? "unknown";

    logger.info({
      msg: "invokeLlama: response received",
      latencyMs,
      inputTokens,
      outputTokens,
      stopReason,
    });

    return {
      text,
      inputTokens,
      outputTokens,
      stopReason,
      model: BEDROCK_MODELS.LLAMA3,
      latencyMs,
    };
  } catch (err) {
    logger.error({
      msg: "invokeLlama: invocation failed",
      error: String(err),
      latencyMs: Date.now() - startTime,
    });
    throw new BedrockInvocationError("Llama3", err);
  }
}

// ─────────────────────────────────────────────
// TITAN EMBEDDINGS V2 — RAG Codebase Vectorization
// Converts code files into vectors for semantic search
// Powers Sentinel's ability to find related code across the repo
// ─────────────────────────────────────────────

/**
 * Generates a vector embedding for a piece of text/code.
 * Used to build the RAG index of the codebase in DynamoDB/Vector store.
 *
 * @example
 * const { embedding } = await invokeTitanEmbedding({
 *   text: fileContent,
 *   dimensions: 1024,
 *   normalize: true,
 * });
 * // Store embedding vector in DynamoDB alongside the file path
 */
export async function invokeTitanEmbedding(
  params: TitanEmbeddingParams
): Promise<BedrockEmbeddingResponse> {
  const { text, dimensions = 1024, normalize = true } = params;

  const startTime = Date.now();

  const requestBody = {
    inputText: text,
    dimensions,
    normalize,
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODELS.TITAN_EMBEDDINGS,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  } as InvokeModelCommandInput);

  try {
    logger.info({
      msg: "invokeTitanEmbedding: generating embedding",
      model: BEDROCK_MODELS.TITAN_EMBEDDINGS,
      dimensions,
      textLength: text.length,
    });

    const response = await getClient().send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    const latencyMs = Date.now() - startTime;

    logger.info({
      msg: "invokeTitanEmbedding: embedding generated",
      latencyMs,
      embeddingDimensions: responseBody.embedding?.length,
    });

    return {
      embedding: responseBody.embedding ?? [],
      inputTokens: responseBody.inputTextTokenCount ?? 0,
      model: BEDROCK_MODELS.TITAN_EMBEDDINGS,
      latencyMs,
    };
  } catch (err) {
    logger.error({
      msg: "invokeTitanEmbedding: invocation failed",
      error: String(err),
      latencyMs: Date.now() - startTime,
    });
    throw new BedrockInvocationError("TitanEmbeddings", err);
  }
}

// ─────────────────────────────────────────────
// BATCH EMBEDDING — Vectorize multiple files at once
// Used during initial repo onboarding to index the whole codebase
// ─────────────────────────────────────────────

/**
 * Generates embeddings for multiple files with concurrency control.
 * Respects Bedrock rate limits by processing in controlled batches.
 *
 * @param files   - Map of filePath → fileContent
 * @param batchSize - Number of concurrent embedding requests (default: 5)
 */
export async function batchEmbedFiles(
  files: Record<string, string>,
  batchSize = 5
): Promise<Record<string, BedrockEmbeddingResponse>> {
  const entries = Object.entries(files);
  const results: Record<string, BedrockEmbeddingResponse> = {};

  logger.info({
    msg: "batchEmbedFiles: starting batch embedding",
    totalFiles: entries.length,
    batchSize,
  });

  // Process in chunks to avoid Bedrock rate limits
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async ([filePath, content]) => {
        const result = await invokeTitanEmbedding({ text: content });
        return { filePath, result };
      })
    );

    for (const settled of batchResults) {
      if (settled.status === "fulfilled") {
        results[settled.value.filePath] = settled.value.result;
      } else {
        logger.warn({
          msg: "batchEmbedFiles: one file failed to embed",
          error: String(settled.reason),
        });
      }
    }

    logger.info({
      msg: `batchEmbedFiles: processed batch ${Math.floor(i / batchSize) + 1}`,
      processed: Math.min(i + batchSize, entries.length),
      total: entries.length,
    });
  }

  return results;
}

// ─────────────────────────────────────────────
// UTILITY: Llama 3 Prompt Formatter
// Llama 3 requires a specific chat template format
// ─────────────────────────────────────────────

function formatLlamaPrompt(systemPrompt: string, userPrompt: string): string {
  return [
    "<|begin_of_text|>",
    "<|start_header_id|>system<|end_header_id|>",
    "",
    systemPrompt,
    "<|eot_id|>",
    "<|start_header_id|>user<|end_header_id|>",
    "",
    userPrompt,
    "<|eot_id|>",
    "<|start_header_id|>assistant<|end_header_id|>",
  ].join("\n");
}

// ─────────────────────────────────────────────
// UTILITY: Token cost estimator
// Helps feed the IaC Predictor's cost widget
// ─────────────────────────────────────────────

const TOKEN_COSTS_PER_1K = {
  // DeepSeek V3 pricing: ~$0.14/1M input, ~$0.28/1M output tokens
  [BEDROCK_MODELS.DEEPSEEK_V3]: { input: 0.00014, output: 0.00028 },
  [BEDROCK_MODELS.LLAMA3]: { input: 0.00265, output: 0.0035 },
  [BEDROCK_MODELS.TITAN_EMBEDDINGS]: { input: 0.0001, output: 0 },
} as const;

export function estimateInvocationCost(
  model: BedrockModelId,
  inputTokens: number,
  outputTokens: number
): { inputCostUsd: number; outputCostUsd: number; totalCostUsd: number } {
  const costs = TOKEN_COSTS_PER_1K[model];

  const inputCostUsd = (inputTokens / 1000) * costs.input;
  const outputCostUsd = (outputTokens / 1000) * costs.output;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  return {
    inputCostUsd: parseFloat(inputCostUsd.toFixed(6)),
    outputCostUsd: parseFloat(outputCostUsd.toFixed(6)),
    totalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
  };
}

// ─────────────────────────────────────────────
// CUSTOM ERROR
// ─────────────────────────────────────────────

export class BedrockInvocationError extends Error {
  constructor(model: string, cause: unknown) {
    const message =
      cause instanceof Error ? cause.message : String(cause);
    super(`Bedrock ${model} invocation failed: ${message}`);
    this.name = "BedrockInvocationError";
    this.cause = cause;
  }
}