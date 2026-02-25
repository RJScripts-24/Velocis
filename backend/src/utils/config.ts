// src/utils/config.ts
// Strictly typed, validated environment variable configuration
// All env vars are accessed ONLY through this module — never process.env directly
// Fails fast at startup if required variables are missing or malformed

import { z } from "zod";

// ─────────────────────────────────────────────
// ENVIRONMENT SCHEMA
// Every variable Velocis needs — grouped by concern
// ─────────────────────────────────────────────

const ConfigSchema = z.object({

  // ── Runtime ────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  IS_LOCAL: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  PORT: z
    .string()
    .optional()
    .default("3001")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: "PORT must be a valid port number (1–65535)",
    }),

  // ── AWS Core ───────────────────────────────────────────────────────────────
  AWS_REGION: z
    .string()
    .min(1)
    .default("ap-south-1")              // Default to Mumbai — Indian developer focus
    .refine((val) => /^[a-z]{2}-[a-z]+-\d$/.test(val), {
      message: "AWS_REGION must be a valid AWS region e.g. ap-south-1",
    }),

  AWS_ACCESS_KEY_ID: z
    .string()
    .min(16)
    .max(128)
    .optional()                          // Not required in Lambda (uses execution role)
    .refine(
      (val) => !val || /^[A-Z0-9]+$/.test(val),
      { message: "AWS_ACCESS_KEY_ID must contain only uppercase letters and digits" }
    ),

  AWS_SECRET_ACCESS_KEY: z
    .string()
    .min(1)
    .optional(),                         // Not required in Lambda (uses execution role)

  AWS_ACCOUNT_ID: z
    .string()
    .regex(/^\d{12}$/, "AWS_ACCOUNT_ID must be exactly 12 digits")
    .optional(),

  // ── Amazon Bedrock ─────────────────────────────────────────────────────────
  BEDROCK_REGION: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[a-z]{2}-[a-z]+-\d$/.test(val),
      { message: "BEDROCK_REGION must be a valid AWS region" }
    ),

  BEDROCK_CLAUDE_MODEL_ID: z
    .string()
    .default("anthropic.claude-3-5-sonnet-20241022-v2:0"),

  BEDROCK_LLAMA_MODEL_ID: z
    .string()
    .default("meta.llama3-70b-instruct-v1:0"),

  BEDROCK_TITAN_MODEL_ID: z
    .string()
    .default("amazon.titan-embed-text-v2:0"),

  BEDROCK_MAX_TOKENS: z
    .string()
    .default("4096")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 200000, {
      message: "BEDROCK_MAX_TOKENS must be between 1 and 200,000",
    }),

  BEDROCK_TEMPERATURE: z
    .string()
    .default("0.2")
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0 && val <= 1, {
      message: "BEDROCK_TEMPERATURE must be between 0.0 and 1.0",
    }),

  // ── DynamoDB ───────────────────────────────────────────────────────────────
  DYNAMO_REPOSITORIES_TABLE: z
    .string()
    .min(3)
    .max(255)
    .default("velocis-repositories"),

  DYNAMO_USERS_TABLE: z
    .string()
    .min(3)
    .max(255)
    .default("velocis-users"),

  DYNAMO_AI_ACTIVITY_TABLE: z
    .string()
    .min(3)
    .max(255)
    .default("velocis-ai-activity"),

  DYNAMO_LOCAL_ENDPOINT: z
    .string()
    .url()
    .optional()
    .default("http://localhost:8000"),  // docker-compose DynamoDB Local

  // ── GitHub OAuth App ───────────────────────────────────────────────────────
  GITHUB_CLIENT_ID: z
    .string()
    .min(1, "GITHUB_CLIENT_ID is required")
    .refine(
      (val) => /^(Iv1\.|[0-9a-f]{20})/.test(val),
      { message: "GITHUB_CLIENT_ID must start with 'Iv1.' (OAuth App) or be a 20-char hex string" }
    ),

  GITHUB_CLIENT_SECRET: z
    .string()
    .min(40, "GITHUB_CLIENT_SECRET must be at least 40 characters"),

  GITHUB_OAUTH_REDIRECT_URI: z
    .string()
    .url("GITHUB_OAUTH_REDIRECT_URI must be a valid URL"),

  // ── GitHub App (Installation) ──────────────────────────────────────────────
  GITHUB_APP_ID: z
    .string()
    .regex(/^\d+$/, "GITHUB_APP_ID must be a numeric string")
    .transform((val) => parseInt(val, 10)),

  GITHUB_APP_PRIVATE_KEY: z
    .string()
    .min(1, "GITHUB_APP_PRIVATE_KEY is required")
    .refine(
      (val) =>
        val.includes("-----BEGIN RSA PRIVATE KEY-----") ||
        val.includes("-----BEGIN PRIVATE KEY-----"),
      { message: "GITHUB_APP_PRIVATE_KEY must be a valid PEM-formatted RSA private key" }
    )
    .transform((val) =>
      // Lambda env vars collapse newlines — restore them
      val.replace(/\\n/g, "\n")
    ),

  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(20, "GITHUB_WEBHOOK_SECRET must be at least 20 characters for security")
    .max(255),

  // ── Token Encryption ───────────────────────────────────────────────────────
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, "TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256)")
    .refine(
      (val) => /^[0-9a-fA-F]{64}$/.test(val),
      { message: "TOKEN_ENCRYPTION_KEY must be a 64-character hex string" }
    ),

  // ── AWS Step Functions (Fortress TDD Loop) ─────────────────────────────────
  STEP_FUNCTIONS_STATE_MACHINE_ARN: z
    .string()
    .regex(
      /^arn:aws:states:[a-z0-9-]+:\d{12}:stateMachine:.+$/,
      "STEP_FUNCTIONS_STATE_MACHINE_ARN must be a valid Step Functions ARN"
    )
    .optional(),

  // ── Amazon Translate ───────────────────────────────────────────────────────
  TRANSLATE_DEFAULT_SOURCE_LANG: z
    .string()
    .length(2)
    .default("en"),

  TRANSLATE_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  // ── API Gateway ────────────────────────────────────────────────────────────
  API_GATEWAY_BASE_URL: z
    .string()
    .url()
    .optional(),

  API_RATE_LIMIT_PER_MINUTE: z
    .string()
    .default("60")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "API_RATE_LIMIT_PER_MINUTE must be a positive number",
    }),

  // ── WebSocket (Vibe Coding Workspace) ──────────────────────────────────────
  WEBSOCKET_API_ENDPOINT: z
    .string()
    .url()
    .optional(),

  WEBSOCKET_CONNECTION_TABLE: z
    .string()
    .default("velocis-ws-connections"),

  // ── Frontend / CORS ────────────────────────────────────────────────────────
  FRONTEND_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((val) =>
      val.split(",").map((origin) => origin.trim()).filter(Boolean)
    ),

  // ── Observability ──────────────────────────────────────────────────────────
  SENTRY_DSN: z
    .string()
    .url()
    .optional(),

  POWERTOOLS_SERVICE_NAME: z
    .string()
    .default("velocis-backend"),

  POWERTOOLS_METRICS_NAMESPACE: z
    .string()
    .default("Velocis"),

  // ── Feature Flags ──────────────────────────────────────────────────────────
  FEATURE_MULTILINGUAL_MENTOR: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  FEATURE_IAC_PREDICTOR: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  FEATURE_CORTEX_3D: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  FEATURE_FORTRESS_TDD: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  FEATURE_VIBE_CODING: z
    .string()
    .default("true")
    .transform((val) => val === "true"),
});

// ─────────────────────────────────────────────
// INFERRED TYPE
// Derive the config type from the schema so it
// stays in sync automatically — no manual interface
// ─────────────────────────────────────────────

export type Config = z.infer<typeof ConfigSchema>;

// ─────────────────────────────────────────────
// PARSE & VALIDATE
// Runs once at module load time — fails fast before
// any Lambda handler can execute with bad config
// ─────────────────────────────────────────────

function parseConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    // Format all errors into a clear, actionable startup message
    const errorLines = result.error.issues.map((issue) => {
      const field = issue.path.join(".") || "root";
      return `  ✗ ${field}: ${issue.message}`;
    });

    const message = [
      "",
      "═══════════════════════════════════════════════════",
      "  VELOCIS CONFIG ERROR — Missing or invalid env vars",
      "═══════════════════════════════════════════════════",
      ...errorLines,
      "",
      "  Copy .env.example to .env.development and fill in",
      "  all required values before starting the server.",
      "═══════════════════════════════════════════════════",
      "",
    ].join("\n");

    // Use console.error directly — logger depends on config, can't use it here
    console.error(message);
    process.exit(1);
  }

  return result.data;
}

// ─────────────────────────────────────────────
// SINGLETON EXPORT
// Parsed once, reused everywhere
// All imports get the same validated object
// ─────────────────────────────────────────────

export const config = parseConfig();

// ─────────────────────────────────────────────
// DERIVED HELPERS
// Convenience properties computed from raw config
// ─────────────────────────────────────────────

/** True when running in AWS Lambda (not local dev) */
export const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/** True when running unit tests */
export const isTest = config.NODE_ENV === "test";

/** True when running in production */
export const isProduction = config.NODE_ENV === "production";

/** True when running locally (local dev or test) */
export const isDevelopment = config.NODE_ENV === "development";

/**
 * The effective Bedrock region.
 * Falls back to the main AWS region if BEDROCK_REGION is not set.
 * Bedrock may not be available in all regions — ap-south-1 falls back to us-east-1.
 */
export const bedrockRegion =
  config.BEDROCK_REGION ??
  (config.AWS_REGION === "ap-south-1" ? "us-east-1" : config.AWS_REGION);

/**
 * Returns true if a given feature flag is enabled.
 *
 * @example
 * if (isFeatureEnabled("MULTILINGUAL_MENTOR")) {
 *   await translateMentorReview(...);
 * }
 */
export function isFeatureEnabled(
  feature:
    | "MULTILINGUAL_MENTOR"
    | "IAC_PREDICTOR"
    | "CORTEX_3D"
    | "FORTRESS_TDD"
    | "VIBE_CODING"
): boolean {
  const key = `FEATURE_${feature}` as keyof Config;
  return config[key] === true;
}

/**
 * Returns the full table name for a given logical table key.
 * Useful for switching between prod and staging tables.
 *
 * @example
 * getTableName("REPOSITORIES") // → "velocis-repositories"
 */
export function getTableName(
  table: "REPOSITORIES" | "USERS" | "AI_ACTIVITY"
): string {
  const map: Record<typeof table, string> = {
    REPOSITORIES: config.DYNAMO_REPOSITORIES_TABLE,
    USERS: config.DYNAMO_USERS_TABLE,
    AI_ACTIVITY: config.DYNAMO_AI_ACTIVITY_TABLE,
  };
  return map[table];
}

/**
 * Redacts sensitive config values for safe logging.
 * Never log the raw config — this gives you a safe snapshot.
 *
 * @example
 * logger.info({ config: getSafeConfigSnapshot() });
 */
export function getSafeConfigSnapshot(): Record<string, unknown> {
  return {
    NODE_ENV: config.NODE_ENV,
    IS_LOCAL: config.IS_LOCAL,
    LOG_LEVEL: config.LOG_LEVEL,
    AWS_REGION: config.AWS_REGION,
    BEDROCK_REGION: bedrockRegion,
    BEDROCK_CLAUDE_MODEL_ID: config.BEDROCK_CLAUDE_MODEL_ID,
    BEDROCK_LLAMA_MODEL_ID: config.BEDROCK_LLAMA_MODEL_ID,
    DYNAMO_REPOSITORIES_TABLE: config.DYNAMO_REPOSITORIES_TABLE,
    DYNAMO_USERS_TABLE: config.DYNAMO_USERS_TABLE,
    DYNAMO_AI_ACTIVITY_TABLE: config.DYNAMO_AI_ACTIVITY_TABLE,
    FRONTEND_URL: config.FRONTEND_URL,
    ALLOWED_ORIGINS: config.ALLOWED_ORIGINS,
    TRANSLATE_ENABLED: config.TRANSLATE_ENABLED,
    FEATURE_MULTILINGUAL_MENTOR: config.FEATURE_MULTILINGUAL_MENTOR,
    FEATURE_IAC_PREDICTOR: config.FEATURE_IAC_PREDICTOR,
    FEATURE_CORTEX_3D: config.FEATURE_CORTEX_3D,
    FEATURE_FORTRESS_TDD: config.FEATURE_FORTRESS_TDD,
    FEATURE_VIBE_CODING: config.FEATURE_VIBE_CODING,
    // Sensitive keys are explicitly EXCLUDED:
    // GITHUB_CLIENT_SECRET, GITHUB_APP_PRIVATE_KEY,
    // GITHUB_WEBHOOK_SECRET, TOKEN_ENCRYPTION_KEY,
    // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    GITHUB_CLIENT_ID: config.GITHUB_CLIENT_ID,
    GITHUB_APP_ID: config.GITHUB_APP_ID,
    GITHUB_OAUTH_REDIRECT_URI: config.GITHUB_OAUTH_REDIRECT_URI,
  };
}

/**
 * Validates that AWS credentials are available for the current environment.
 * In Lambda: checks for the execution role (no explicit keys needed).
 * In local dev: checks for explicit key + secret in config.
 * Throws clearly if credentials are missing before any AWS call is made.
 */
export function assertAwsCredentials(): void {
  if (isLambda) {
    // Lambda execution role provides credentials automatically
    // via the instance metadata service — no explicit keys needed
    return;
  }

  if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "AWS credentials missing for local dev. " +
        "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.development " +
        "or configure an AWS profile via the AWS CLI."
    );
  }
}