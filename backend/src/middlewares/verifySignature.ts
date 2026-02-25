// src/middlewares/verifySignature.ts
// Cryptographic verification of incoming GitHub webhook signatures
// GitHub signs every payload with HMAC-SHA256 using your webhook secret
// We MUST verify this before processing anything — prevents spoofed webhooks

import * as crypto from "crypto";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface VerifySignatureParams {
  rawBody: string;       // The raw, unparsed request body string
  signature: string;     // Value of x-hub-signature-256 header from GitHub
  secret: string;        // Your GITHUB_WEBHOOK_SECRET from config
}

export interface VerifySignatureResult {
  valid: boolean;
  reason?: string;       // Human-readable failure reason for logging
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SIGNATURE_PREFIX = "sha256=";
const HMAC_ALGORITHM = "sha256";

// Minimum viable signature length:
// "sha256=" (7 chars) + 64 hex chars = 71
const MIN_SIGNATURE_LENGTH = 71;

// ─────────────────────────────────────────────
// MAIN VERIFIER
// ─────────────────────────────────────────────

/**
 * Verifies that an incoming webhook request genuinely came from GitHub.
 *
 * GitHub's signing process:
 *   1. Takes the raw request body as bytes
 *   2. Computes HMAC-SHA256 using your webhook secret as the key
 *   3. Sends the result as: x-hub-signature-256: sha256=<hex_digest>
 *
 * We replicate step 2 and use a timing-safe comparison (timingSafeEqual)
 * to prevent timing attacks that could leak the secret character by character.
 *
 * @returns boolean — true if signature is valid, false otherwise
 *
 * @example
 * const isValid = verifySignature({
 *   rawBody: event.body ?? "",
 *   signature: event.headers["x-hub-signature-256"] ?? "",
 *   secret: config.GITHUB_WEBHOOK_SECRET,
 * });
 */
export function verifySignature({
  rawBody,
  signature,
  secret,
}: VerifySignatureParams): boolean {
  const result = verifySignatureDetailed({ rawBody, signature, secret });

  if (!result.valid) {
    logger.warn({
      msg: "verifySignature: webhook signature verification failed",
      reason: result.reason,
      // Never log the signature itself or the secret
    });
  }

  return result.valid;
}

// ─────────────────────────────────────────────
// DETAILED VERIFIER (returns reason for logging)
// ─────────────────────────────────────────────

/**
 * Same as verifySignature but returns a detailed result object.
 * Use this when you need to know WHY verification failed (e.g., in tests).
 */
export function verifySignatureDetailed({
  rawBody,
  signature,
  secret,
}: VerifySignatureParams): VerifySignatureResult {
  // ── Guard 1: Signature header must be present ─────────────────────────────
  if (!signature || signature.trim() === "") {
    return {
      valid: false,
      reason: "Missing x-hub-signature-256 header",
    };
  }

  // ── Guard 2: Secret must be configured ────────────────────────────────────
  if (!secret || secret.trim() === "") {
    return {
      valid: false,
      reason: "GITHUB_WEBHOOK_SECRET is not configured",
    };
  }

  // ── Guard 3: Signature must start with "sha256=" ──────────────────────────
  if (!signature.startsWith(SIGNATURE_PREFIX)) {
    return {
      valid: false,
      reason: `Signature does not start with '${SIGNATURE_PREFIX}' — got: ${signature.substring(0, 10)}...`,
    };
  }

  // ── Guard 4: Signature must meet minimum length ───────────────────────────
  if (signature.length < MIN_SIGNATURE_LENGTH) {
    return {
      valid: false,
      reason: `Signature too short — expected at least ${MIN_SIGNATURE_LENGTH} chars, got ${signature.length}`,
    };
  }

  // ── Guard 5: Raw body must not be empty ───────────────────────────────────
  if (!rawBody || rawBody.trim() === "") {
    return {
      valid: false,
      reason: "Raw body is empty — cannot compute HMAC",
    };
  }

  // ── Core: Compute our own HMAC-SHA256 digest ──────────────────────────────
  let expectedSignature: Buffer;
  let receivedSignature: Buffer;

  try {
    // Compute HMAC-SHA256 of the raw body using our secret
    const hmac = crypto.createHmac(HMAC_ALGORITHM, secret);
    hmac.update(rawBody, "utf8");
    const digest = hmac.digest("hex");
    const expectedSignatureHex = `${SIGNATURE_PREFIX}${digest}`;

    // Convert both signatures to Buffers for timing-safe comparison
    // Both MUST be the same byte length for timingSafeEqual to work
    expectedSignature = Buffer.from(expectedSignatureHex, "utf8");
    receivedSignature = Buffer.from(signature, "utf8");
  } catch (err) {
    logger.error({
      msg: "verifySignature: HMAC computation error",
      error: String(err),
    });
    return {
      valid: false,
      reason: `HMAC computation failed: ${String(err)}`,
    };
  }

  // ── Guard 6: Length mismatch means definite forgery ───────────────────────
  // Must check BEFORE timingSafeEqual — it throws if lengths differ
  if (expectedSignature.length !== receivedSignature.length) {
    return {
      valid: false,
      reason: `Signature length mismatch — expected ${expectedSignature.length} bytes, received ${receivedSignature.length} bytes`,
    };
  }

  // ── Timing-safe comparison ────────────────────────────────────────────────
  // crypto.timingSafeEqual prevents timing attacks where an attacker could
  // deduce the correct signature by measuring how long comparisons take.
  // A naive `===` string comparison short-circuits on the first mismatch,
  // leaking information. timingSafeEqual always takes the same amount of time.
  const isValid = crypto.timingSafeEqual(expectedSignature, receivedSignature);

  if (!isValid) {
    return {
      valid: false,
      reason: "HMAC digest mismatch — signature does not match computed value",
    };
  }

  logger.info({ msg: "verifySignature: webhook signature verified successfully" });

  return { valid: true };
}

// ─────────────────────────────────────────────
// UTILITY: Extract raw hex digest (for testing/debugging only)
// ─────────────────────────────────────────────

/**
 * Computes what the expected signature SHOULD be for a given body + secret.
 * Use this in local dev to generate test signatures for mock webhook payloads.
 * NEVER expose this in a production API endpoint.
 *
 * @example
 * // In your test setup or pushEvent.json generator:
 * const sig = computeExpectedSignature(JSON.stringify(mockPayload), secret);
 * // → "sha256=abc123..."
 */
export function computeExpectedSignature(
  rawBody: string,
  secret: string
): string {
  const hmac = crypto.createHmac(HMAC_ALGORITHM, secret);
  hmac.update(rawBody, "utf8");
  return `${SIGNATURE_PREFIX}${hmac.digest("hex")}`;
}

// ─────────────────────────────────────────────
// UTILITY: Validate signature format only (no secret needed)
// ─────────────────────────────────────────────

/**
 * Checks only that the signature string is structurally valid.
 * Does NOT verify cryptographic correctness — use verifySignature for that.
 * Useful for quick pre-checks in API Gateway request validators.
 */
export function isValidSignatureFormat(signature: string): boolean {
  if (!signature || !signature.startsWith(SIGNATURE_PREFIX)) return false;

  const hexPart = signature.slice(SIGNATURE_PREFIX.length);

  // SHA-256 hex digest is always exactly 64 hex characters
  return /^[a-f0-9]{64}$/.test(hexPart);
}