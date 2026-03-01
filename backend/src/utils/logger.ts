// src/utils/logger.ts
// Structured logging for all Velocis Lambda functions and services
// Built on Pino — the fastest JSON logger for Node.js
// Integrates with AWS Lambda Powertools for CloudWatch metrics + tracing

import pino, { Logger, LoggerOptions, TransportTargetOptions } from "pino";
import { config, isLambda, isTest, isProduction, isDevelopment } from "./config";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface LogContext {
  requestId?: string;           // API Gateway / Lambda request ID
  repoId?: string;              // Repository being processed
  repoFullName?: string;        // "owner/repo"
  userId?: string;              // Authenticated user
  installationId?: number;      // GitHub App installation
  agent?: "sentinel" | "fortress" | "cortex" | "predictor";
  operation?: string;           // e.g. "analyzeLogic", "writeTests"
  durationMs?: number;          // Operation duration
  model?: string;               // Bedrock model ID
  inputTokens?: number;
  outputTokens?: number;
  filePath?: string;
  commitSha?: string;
  prNumber?: number;
  [key: string]: unknown;       // Allow arbitrary extra context
}

export interface TimerResult {
  durationMs: number;
  stop: () => number;
}

// ─────────────────────────────────────────────
// SENSITIVE FIELD REDACTION
// These fields are NEVER written to logs regardless of level
// ─────────────────────────────────────────────

const REDACTED_FIELDS = new Set([
  "accessToken",
  "access_token",
  "token",
  "secret",
  "password",
  "privateKey",
  "private_key",
  "clientSecret",
  "client_secret",
  "encryptionKey",
  "encryption_key",
  "authorization",
  "x-hub-signature-256",
  "cookie",
  "sessionId",
  "session_id",
  "apiKey",
  "api_key",
]);

const REDACTION_PLACEHOLDER = "[REDACTED]";

/**
 * Recursively redacts sensitive fields from a log object.
 * Applied before any log line is written.
 */
function redactSensitiveFields(obj: unknown, depth = 0): unknown {
  // Max depth to prevent circular reference infinite loops
  if (depth > 10 || obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveFields(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key.toLowerCase()) || REDACTED_FIELDS.has(key)) {
      redacted[key] = REDACTION_PLACEHOLDER;
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactSensitiveFields(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// ─────────────────────────────────────────────
// PINO CONFIGURATION
// Different transports for Lambda vs local dev vs test
// ─────────────────────────────────────────────

function buildPinoOptions(): LoggerOptions {
  const base: LoggerOptions = {
    level: config.LOG_LEVEL,

    // Standard fields on every log line
    base: {
      service: config.POWERTOOLS_SERVICE_NAME,
      env: config.NODE_ENV,
      ...(isLambda && {
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        region: config.AWS_REGION,
      }),
    },

    // Rename pino's default "msg" to "message" for CloudWatch compatibility
    messageKey: "message",

    // ISO timestamp string instead of epoch milliseconds
    timestamp: pino.stdTimeFunctions.isoTime,

    // Redact sensitive fields at the Pino level as a safety net
    // (in addition to our manual redactSensitiveFields)
    redact: {
      paths: [
        "token",
        "accessToken",
        "access_token",
        "secret",
        "password",
        "privateKey",
        "*.token",
        "*.accessToken",
        "*.secret",
        "*.password",
      ],
      censor: REDACTION_PLACEHOLDER,
    },

    // Serialize errors properly — plain Error objects lose their stack in JSON
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  return base;
}

function buildTransport(): TransportTargetOptions[] | undefined {
  // ── Lambda / Production: no transport (stdout → CloudWatch) ─────────────
  // In Lambda, stdout is captured by CloudWatch Logs automatically.
  // Using a transport adds overhead — write directly to stdout.
  if (isLambda || isProduction) {
    return undefined;
  }

  // ── Test: suppress all output unless LOG_LEVEL=debug ────────────────────
  if (isTest) {
    return undefined;
  }

  // ── Local Dev: pretty-printed, colorized output ──────────────────────────
  if (isDevelopment) {
    return [
      {
        target: "pino-pretty",
        level: config.LOG_LEVEL,
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname,service",
          messageKey: "message",
          errorLikeObjectKeys: ["err", "error"],
        },
      },
    ];
  }

  return undefined;
}

// ─────────────────────────────────────────────
// BASE LOGGER INSTANCE
// ─────────────────────────────────────────────

const transport = buildTransport();

const baseLogger: Logger = transport
  ? pino(buildPinoOptions(), pino.transport({ targets: transport }))
  : pino(buildPinoOptions());

// ─────────────────────────────────────────────
// VELOCIS LOGGER WRAPPER
// Adds context binding, redaction, and helper methods
// on top of the raw Pino instance
// ─────────────────────────────────────────────

class VelocisLogger {
  private pinoLogger: Logger;
  private boundContext: LogContext;

  constructor(pinoInstance: Logger, context: LogContext = {}) {
    this.pinoLogger = pinoInstance;
    this.boundContext = context;
  }

  // ── Core log methods ──────────────────────────────────────────────────────

  trace(context: LogContext | string, msg?: string): void {
    this.write("trace", context, msg);
  }

  debug(context: LogContext | string, msg?: string): void {
    this.write("debug", context, msg);
  }

  info(context: LogContext | string, msg?: string): void {
    this.write("info", context, msg);
  }

  warn(context: LogContext | string, msg?: string): void {
    this.write("warn", context, msg);
  }

  error(context: LogContext | string, msg?: string): void {
    this.write("error", context, msg);
  }

  fatal(context: LogContext | string, msg?: string): void {
    this.write("fatal", context, msg);
  }

  // ── Context binding ───────────────────────────────────────────────────────

  /**
   * Creates a child logger with persistent context fields.
   * All logs from the child automatically include these fields.
   * Use at the start of a Lambda handler or agent function.
   *
   * @example
   * const log = logger.withContext({
   *   requestId: event.requestContext.requestId,
   *   repoId: "123",
   *   agent: "sentinel",
   * });
   * log.info({ msg: "Starting review" });
   * // → { requestId: "...", repoId: "123", agent: "sentinel", message: "Starting review" }
   */
  withContext(context: LogContext): VelocisLogger {
    const mergedContext = { ...this.boundContext, ...context };
    const childPino = this.pinoLogger.child(
      redactSensitiveFields(mergedContext) as Record<string, unknown>
    );
    return new VelocisLogger(childPino, mergedContext);
  }

  /**
   * Creates a child logger scoped to a specific agent.
   * Shorthand for withContext({ agent: "sentinel" }).
   *
   * @example
   * const log = logger.forAgent("fortress");
   * log.info({ msg: "Writing tests" });
   * // → { agent: "fortress", message: "Writing tests" }
   */
  forAgent(
    agent: "sentinel" | "fortress" | "cortex" | "predictor"
  ): VelocisLogger {
    return this.withContext({ agent });
  }

  /**
   * Creates a child logger scoped to a specific repository operation.
   *
   * @example
   * const log = logger.forRepo("owner/velocis", "abc123");
   * log.info({ msg: "Processing push" });
   */
  forRepo(repoFullName: string, repoId?: string): VelocisLogger {
    return this.withContext({ repoFullName, ...(repoId && { repoId }) });
  }

  /**
   * Creates a child logger scoped to a specific Lambda request.
   *
   * @example
   * const log = logger.forRequest(event.requestContext.requestId);
   */
  forRequest(requestId: string): VelocisLogger {
    return this.withContext({ requestId });
  }

  // ── Performance timing ────────────────────────────────────────────────────

  /**
   * Starts a performance timer.
   * Call stop() to get the duration and auto-log it.
   *
   * @example
   * const timer = logger.startTimer("sentinel.analyzeLogic");
   * await analyzeLogic(...);
   * const { durationMs } = timer.stop();
   * // → logs: { operation: "sentinel.analyzeLogic", durationMs: 1842 }
   */
  startTimer(operation: string): {
    stop: (extraContext?: LogContext) => number;
  } {
    const startTime = Date.now();

    return {
      stop: (extraContext: LogContext = {}): number => {
        const durationMs = Date.now() - startTime;
        this.info({
          msg: `${operation}: completed`,
          operation,
          durationMs,
          ...extraContext,
        });
        return durationMs;
      },
    };
  }

  /**
   * Wraps an async function with automatic timing and error logging.
   * Logs start, end (with duration), and any errors.
   *
   * @example
   * const result = await logger.timed("sentinel.analyzeLogic", () =>
   *   analyzeLogic({ repoId, fileContents })
   * );
   */
  async timed<T>(
    operation: string,
    fn: () => Promise<T>,
    context: LogContext = {}
  ): Promise<T> {
    const startTime = Date.now();

    this.info({
      msg: `${operation}: starting`,
      operation,
      ...context,
    });

    try {
      const result = await fn();
      const durationMs = Date.now() - startTime;

      this.info({
        msg: `${operation}: completed`,
        operation,
        durationMs,
        ...context,
      });

      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;

      this.error({
        msg: `${operation}: failed`,
        operation,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        ...context,
      });

      throw err;
    }
  }

  // ── Agent-specific helpers ────────────────────────────────────────────────

  /**
   * Logs a Bedrock LLM invocation result with token usage and cost.
   * Used in bedrockClient.ts after every model call.
   *
   * @example
   * logger.logLlmInvocation({
   *   model: BEDROCK_MODELS.CLAUDE_SONNET,
   *   inputTokens: 1200,
   *   outputTokens: 340,
   *   latencyMs: 1842,
   *   operation: "sentinel.analyzeLogic",
   * });
   */
  logLlmInvocation(context: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    operation: string;
    repoId?: string;
  }): void {
    this.info({
      msg: "LLM invocation complete",
      ...context,
      totalTokens: context.inputTokens + context.outputTokens,
    });
  }

  /**
   * Logs a Webhook event received at the entry point.
   * Strips sensitive headers before logging.
   *
   * @example
   * logger.logWebhookReceived("push", repoFullName, requestId);
   */
  logWebhookReceived(
    eventType: string,
    repoFullName: string,
    requestId: string
  ): void {
    this.info({
      msg: `Webhook received: ${eventType}`,
      eventType,
      repoFullName,
      requestId,
    });
  }

  /**
   * Logs the result of the full Tri-Agent pipeline.
   *
   * @example
   * logger.logPipelineResult({
   *   repoId: "123",
   *   sentinel: "success",
   *   fortress: "failed",
   *   cortex: "success",
   *   overallStatus: "degraded",
   *   durationMs: 12400,
   * });
   */
  logPipelineResult(context: {
    repoId: string;
    sentinel: string;
    fortress: string;
    cortex: string;
    overallStatus: string;
    durationMs: number;
  }): void {
    const level =
      context.overallStatus === "healthy"
        ? "info"
        : context.overallStatus === "degraded"
          ? "warn"
          : "error";

    this.write(level, {
      msg: `Tri-Agent pipeline ${context.overallStatus}`,
      ...context,
    });
  }

  /**
   * Logs a DynamoDB operation for observability.
   */
  logDynamoOperation(
    operation: string,
    tableName: string,
    durationMs: number,
    success: boolean
  ): void {
    this.info({
      msg: `DynamoDB ${operation}: ${success ? "success" : "failed"}`,
      operation,
      tableName,
      durationMs,
      success,
    });
  }

  // ── Error helpers ─────────────────────────────────────────────────────────

  /**
   * Logs a caught error with full context.
   * Handles both Error instances and unknown throws cleanly.
   *
   * @example
   * try {
   *   await riskyOperation();
   * } catch (err) {
   *   logger.logError("analyzeLogic", err, { repoId: "123" });
   *   throw err;
   * }
   */
  logError(
    operation: string,
    err: unknown,
    context: LogContext = {}
  ): void {
    const isError = err instanceof Error;

    this.error({
      msg: `${operation} threw an error`,
      operation,
      errorName: isError ? err.name : "UnknownError",
      errorMessage: isError ? err.message : String(err),
      stack: isError ? err.stack : undefined,
      cause:
        isError && err.cause
          ? err.cause instanceof Error
            ? err.cause.message
            : String(err.cause)
          : undefined,
      ...context,
    });
  }

  // ── Internal write ────────────────────────────────────────────────────────

  private write(
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal",
    context: LogContext | string,
    msg?: string
  ): void {
    // Support both logger.info("plain string") and logger.info({ msg: "..." })
    if (typeof context === "string") {
      this.pinoLogger[level](context);
      return;
    }

    const { msg: contextMsg, ...rest } = context;
    const message = String(msg ?? contextMsg ?? "");
    const safeContext = redactSensitiveFields(rest) as Record<string, unknown>;

    this.pinoLogger[level](safeContext, message);
  }
}

// ─────────────────────────────────────────────
// LAMBDA REQUEST CONTEXT INJECTOR
// Call this at the top of every Lambda handler to bind
// the Lambda request ID to all logs within that invocation
// ─────────────────────────────────────────────

/**
 * Creates a request-scoped logger from a Lambda context object.
 * Bind this at the start of every Lambda handler.
 *
 * @example
 * export const handler = async (event, context) => {
 *   const log = createLambdaLogger(context);
 *   log.info({ msg: "Handler started" });
 * };
 */
export function createLambdaLogger(
  lambdaContext: {
    awsRequestId: string;
    functionName?: string;
    remainingTimeInMillis?: () => number;
  },
  extraContext: LogContext = {}
): VelocisLogger {
  return logger.withContext({
    requestId: lambdaContext.awsRequestId,
    functionName: lambdaContext.functionName,
    ...extraContext,
  });
}

// ─────────────────────────────────────────────
// COLD START DETECTOR
// Logs whether this Lambda invocation is a cold start
// Cold starts add significant latency — useful for performance debugging
// ─────────────────────────────────────────────

let isColdStart = true;

/**
 * Logs cold start status and returns whether this is a cold start.
 * Call once at the top of your Lambda handler.
 *
 * @example
 * export const handler = async (event, context) => {
 *   const coldStart = detectColdStart();
 *   // → logs "Lambda cold start" or "Lambda warm invocation"
 * };
 */
export function detectColdStart(): boolean {
  if (isColdStart) {
    logger.info({
      msg: "Lambda cold start",
      coldStart: true,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      memoryLimitMB: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    });
    isColdStart = false;
    return true;
  }

  logger.debug({
    msg: "Lambda warm invocation",
    coldStart: false,
  });

  return false;
}

// ─────────────────────────────────────────────
// UNHANDLED REJECTION / EXCEPTION HANDLERS
// Catch anything that escapes normal error handling
// Logs before Lambda forcibly terminates the process
// ─────────────────────────────────────────────

process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({
    msg: "Unhandled Promise Rejection — Lambda may terminate",
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
});

process.on("uncaughtException", (err) => {
  logger.fatal({
    msg: "Uncaught Exception — Lambda will terminate",
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
  });
  // Allow Lambda runtime to handle the exit — don't call process.exit() here
});

// ─────────────────────────────────────────────
// SINGLETON EXPORT
// One logger instance used across the entire backend
// ─────────────────────────────────────────────

export const logger = new VelocisLogger(baseLogger);

// Re-export the type so callers can type-hint child loggers
export type { VelocisLogger };