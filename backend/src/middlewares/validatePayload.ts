// src/middlewares/validatePayload.ts
// Zod-powered runtime validation for all incoming webhook payloads
// Returns a discriminated union — no throwing, just clean success/failure

import { ZodSchema, ZodError, z } from "zod";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ValidationSuccess<T> {
  success: true;
  data: T;
  errors: null;
}

export interface ValidationFailure {
  success: false;
  data: null;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;   // dot-notation path e.g. "repository.id"
  message: string; // human-readable Zod message
  code: string;    // Zod error code e.g. "invalid_type"
  received?: unknown; // what we actually got
  expected?: string;  // what we expected
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ─────────────────────────────────────────────
// MAIN VALIDATOR
// ─────────────────────────────────────────────

/**
 * Validates an unknown payload against a Zod schema.
 * Never throws — always returns a typed discriminated union.
 *
 * @param schema  - Any Zod schema (z.object, z.array, etc.)
 * @param payload - The raw unknown data to validate
 * @returns       - ValidationSuccess<T> | ValidationFailure
 *
 * @example
 * const result = validatePayload(githubPushSchema, parsedBody);
 * if (!result.success) return response(400, { errors: result.errors });
 * const data = result.data; // fully typed
 */
export function validatePayload<T>(
  schema: ZodSchema<T>,
  payload: unknown
): ValidationResult<T> {
  // Guard: reject completely empty/null payloads before Zod even runs
  if (payload === null || payload === undefined) {
    logger.warn({ msg: "validatePayload: received null or undefined payload" });
    return {
      success: false,
      data: null,
      errors: [
        {
          field: "root",
          message: "Payload is null or undefined",
          code: "invalid_type",
          received: payload,
          expected: "object",
        },
      ],
    };
  }

  // Run Zod safe parse — never throws, returns success/error discriminated union
  const result = schema.safeParse(payload);

  if (result.success) {
    logger.info({ msg: "validatePayload: validation passed" });
    return {
      success: true,
      data: result.data,
      errors: null,
    };
  }

  // ── Map Zod errors into our clean ValidationError format ─────────────────
  const errors = mapZodErrors(result.error);

  logger.warn({
    msg: "validatePayload: validation failed",
    errorCount: errors.length,
    errors,
  });

  return {
    success: false,
    data: null,
    errors,
  };
}

// ─────────────────────────────────────────────
// ZOD ERROR MAPPER
// ─────────────────────────────────────────────

/**
 * Flattens Zod's nested ZodError into our clean ValidationError array.
 * Converts Zod's internal path array (["repository", "id"]) into
 * dot-notation strings ("repository.id") for readable API error responses.
 */
function mapZodErrors(zodError: ZodError): ValidationError[] {
  return zodError.issues.map((issue) => {
    const field =
      issue.path.length > 0
        ? issue.path.map(String).join(".")
        : "root";

    const base: ValidationError = {
      field,
      message: issue.message,
      code: issue.code,
    };

    // Enrich with received/expected where Zod provides them
    if (issue.code === "invalid_type") {
      base.received = issue.received;
      base.expected = issue.expected;
    }

    if (issue.code === "invalid_literal") {
      base.received = issue.received;
      base.expected = String(issue.expected);
    }

    if (issue.code === "unrecognized_keys") {
      base.message = `Unrecognized keys: ${issue.keys.join(", ")}`;
    }

    if (issue.code === "too_small") {
      base.message = `Value too small — minimum: ${issue.minimum}`;
      base.expected = String(issue.minimum);
    }

    if (issue.code === "too_big") {
      base.message = `Value too large — maximum: ${issue.maximum}`;
      base.expected = String(issue.maximum);
    }

    return base;
  });
}

// ─────────────────────────────────────────────
// HELPER: Validate and throw (for internal use only)
// ─────────────────────────────────────────────

/**
 * A strict variant for internal service-to-service calls where
 * a validation failure is a hard programmer error, not a user error.
 * ONLY use this inside functions/ — never in handlers/ (use validatePayload there).
 *
 * @throws Error with structured validation details if validation fails
 */
export function assertValidPayload<T>(
  schema: ZodSchema<T>,
  payload: unknown,
  context?: string
): T {
  const result = validatePayload(schema, payload);

  if (!result.success) {
    const label = context ? `[${context}]` : "[assertValidPayload]";
    const summary = result.errors
      .map((e) => `${e.field}: ${e.message}`)
      .join(" | ");

    throw new Error(`${label} Internal validation failed — ${summary}`);
  }

  return result.data;
}

// ─────────────────────────────────────────────
// HELPER: Partial / strip-unknown validator
// ─────────────────────────────────────────────

/**
 * Like validatePayload but uses Zod's .strip() to silently
 * drop unrecognized keys instead of failing on them.
 * Useful for GitHub webhooks that include extra undocumented fields.
 */
export function validateAndStrip<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  payload: unknown
): ValidationResult<z.infer<typeof schema>> {
  return validatePayload(schema.strip(), payload);
}

// ─────────────────────────────────────────────
// HELPER: Format errors for API response body
// ─────────────────────────────────────────────

/**
 * Converts ValidationError[] into a clean, user-facing error payload
 * suitable for returning in a 400 API Gateway response.
 */
export function formatValidationErrors(errors: ValidationError[]): {
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};

  for (const error of errors) {
    fields[error.field] = error.message;
  }

  return {
    message: `Validation failed on ${errors.length} field(s)`,
    fields,
  };
}