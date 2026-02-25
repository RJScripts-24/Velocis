// src/services/aws/translate.ts
// Amazon Translate integration for Sentinel's Regional Mentorship Hub
// Translates architectural feedback into Hindi, Tamil, and Telugu
// Making senior-level code mentorship accessible to every Indian developer

import {
  TranslateClient,
  TranslateTextCommand,
  TranslateTextCommandInput,
  DetectDominantLanguageCommand,
} from "@aws-sdk/client-translate";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────
// SUPPORTED LANGUAGES
// ISO 639-1 codes that Amazon Translate supports
// Velocis Regional Mentorship Hub targets Indian developer ecosystem
// ─────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = {
  ENGLISH: "en",
  HINDI: "hi",
  TAMIL: "ta",
  TELUGU: "te",
  KANNADA: "kn",
  MALAYALAM: "ml",
  BENGALI: "bn",
  MARATHI: "mr",
  GUJARATI: "gu",
} as const;

export type SupportedLanguageCode =
  (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];

export const LANGUAGE_DISPLAY_NAMES: Record<SupportedLanguageCode, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  ta: "தமிழ் (Tamil)",
  te: "తెలుగు (Telugu)",
  kn: "ಕನ್ನಡ (Kannada)",
  ml: "മലയാളം (Malayalam)",
  bn: "বাংলা (Bengali)",
  mr: "मराठी (Marathi)",
  gu: "ગુજરાતી (Gujarati)",
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface TranslateParams {
  text: string;
  targetLanguage: SupportedLanguageCode;
  sourceLanguage?: SupportedLanguageCode; // defaults to "en" (auto-detect fallback)
}

export interface TranslateResult {
  translatedText: string;
  sourceLanguage: SupportedLanguageCode;
  targetLanguage: SupportedLanguageCode;
  characterCount: number;
  latencyMs: number;
}

export interface BatchTranslateParams {
  text: string;
  targetLanguages: SupportedLanguageCode[];
  sourceLanguage?: SupportedLanguageCode;
}

export interface BatchTranslateResult {
  translations: Record<SupportedLanguageCode, TranslateResult>;
  failedLanguages: SupportedLanguageCode[];
  totalCharacters: number;
  totalLatencyMs: number;
}

export interface DetectLanguageResult {
  detectedLanguage: string;
  score: number; // Confidence score 0.0 - 1.0
  latencyMs: number;
}

// Sentinel review structured for translation
export interface MentorReview {
  summary: string;            // High-level issue summary
  explanation: string;        // The "why" behind the issue
  suggestion: string;         // Corrected code explanation
  severity: "critical" | "warning" | "info";
  codeSnippet?: string;       // Code blocks — NOT translated (stays as-is)
}

export interface TranslatedMentorReview {
  original: MentorReview;
  translated: Omit<MentorReview, "codeSnippet"> & { codeSnippet?: string };
  targetLanguage: SupportedLanguageCode;
  languageDisplayName: string;
  latencyMs: number;
}

// ─────────────────────────────────────────────
// CLIENT SINGLETON
// ─────────────────────────────────────────────

let _client: TranslateClient | null = null;

function getClient(): TranslateClient {
  if (!_client) {
    _client = new TranslateClient({
      region: config.AWS_REGION,
      ...(config.IS_LOCAL && {
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        },
      }),
    });
    logger.info({
      msg: "TranslateClient initialized",
      region: config.AWS_REGION,
    });
  }
  return _client;
}

// ─────────────────────────────────────────────
// CORE: Single text translation
// ─────────────────────────────────────────────

/**
 * Translates a single piece of text into the target language.
 * Used internally — most callers should use translateMentorReview.
 *
 * @example
 * const result = await translateText({
 *   text: "This function has a SQL injection vulnerability.",
 *   targetLanguage: SUPPORTED_LANGUAGES.HINDI,
 * });
 */
export async function translateText(
  params: TranslateParams
): Promise<TranslateResult> {
  const {
    text,
    targetLanguage,
    sourceLanguage = SUPPORTED_LANGUAGES.ENGLISH,
  } = params;

  // Skip translation if source and target are the same
  if (sourceLanguage === targetLanguage) {
    logger.info({
      msg: "translateText: source and target are the same — skipping",
      language: targetLanguage,
    });
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage,
      characterCount: text.length,
      latencyMs: 0,
    };
  }

  // Guard: Amazon Translate has a 10,000 byte limit per request
  const byteLength = Buffer.byteLength(text, "utf8");
  if (byteLength > 10000) {
    logger.warn({
      msg: "translateText: text exceeds 10,000 byte limit — chunking required",
      byteLength,
    });
    return translateLongText(params);
  }

  const startTime = Date.now();

  const input: TranslateTextCommandInput = {
    Text: text,
    SourceLanguageCode: sourceLanguage,
    TargetLanguageCode: targetLanguage,
    Settings: {
      // Preserve formatting — important for code review feedback
      Formality: "FORMAL",
      // Profanity masking off — we need exact technical terminology
      Profanity: "MASK",
    },
  };

  try {
    logger.info({
      msg: "translateText: sending translation request",
      targetLanguage,
      characterCount: text.length,
    });

    const command = new TranslateTextCommand(input);
    const response = await getClient().send(command);

    const latencyMs = Date.now() - startTime;
    const translatedText = response.TranslatedText ?? text;

    logger.info({
      msg: "translateText: translation complete",
      targetLanguage,
      latencyMs,
      appliedSettings: response.AppliedSettings,
    });

    return {
      translatedText,
      sourceLanguage: (response.SourceLanguageCode ??
        sourceLanguage) as SupportedLanguageCode,
      targetLanguage,
      characterCount: text.length,
      latencyMs,
    };
  } catch (err) {
    logger.error({
      msg: "translateText: translation failed",
      targetLanguage,
      error: String(err),
      latencyMs: Date.now() - startTime,
    });
    throw new TranslateServiceError(targetLanguage, err);
  }
}

// ─────────────────────────────────────────────
// CORE: Translate a Sentinel Mentor Review
// The heart of the Regional Mentorship Hub
// Translates only text fields — preserves code snippets as-is
// ─────────────────────────────────────────────

/**
 * Translates a structured Sentinel code review into the target language.
 *
 * Critical design: code snippets are NEVER translated.
 * Only the human-readable explanation fields are translated.
 * This ensures developers see correct, unaltered code while reading
 * explanations in their native language.
 *
 * @example
 * const translated = await translateMentorReview({
 *   review: sentinelOutput,
 *   targetLanguage: SUPPORTED_LANGUAGES.TAMIL,
 * });
 * // → summary, explanation, suggestion in Tamil
 * // → codeSnippet unchanged (still valid TypeScript)
 */
export async function translateMentorReview(params: {
  review: MentorReview;
  targetLanguage: SupportedLanguageCode;
}): Promise<TranslatedMentorReview> {
  const { review, targetLanguage } = params;
  const startTime = Date.now();

  // If already English, return as-is with original content mapped
  if (targetLanguage === SUPPORTED_LANGUAGES.ENGLISH) {
    return {
      original: review,
      translated: { ...review },
      targetLanguage,
      languageDisplayName: LANGUAGE_DISPLAY_NAMES[targetLanguage],
      latencyMs: 0,
    };
  }

  // Translate only the human-readable fields in parallel
  // codeSnippet is deliberately excluded — code must never be altered
  const [summaryResult, explanationResult, suggestionResult] =
    await Promise.allSettled([
      translateText({
        text: review.summary,
        targetLanguage,
      }),
      translateText({
        text: review.explanation,
        targetLanguage,
      }),
      translateText({
        text: review.suggestion,
        targetLanguage,
      }),
    ]);

  // Extract translated text — fall back to English original on failure
  const translatedSummary =
    summaryResult.status === "fulfilled"
      ? summaryResult.value.translatedText
      : review.summary;

  const translatedExplanation =
    explanationResult.status === "fulfilled"
      ? explanationResult.value.translatedText
      : review.explanation;

  const translatedSuggestion =
    suggestionResult.status === "fulfilled"
      ? suggestionResult.value.translatedText
      : review.suggestion;

  const latencyMs = Date.now() - startTime;

  logger.info({
    msg: "translateMentorReview: review translated",
    targetLanguage,
    latencyMs,
    summaryOk: summaryResult.status === "fulfilled",
    explanationOk: explanationResult.status === "fulfilled",
    suggestionOk: suggestionResult.status === "fulfilled",
  });

  return {
    original: review,
    translated: {
      summary: translatedSummary,
      explanation: translatedExplanation,
      suggestion: translatedSuggestion,
      severity: review.severity,           // Enum — never translated
      codeSnippet: review.codeSnippet,     // Code — never translated
    },
    targetLanguage,
    languageDisplayName: LANGUAGE_DISPLAY_NAMES[targetLanguage],
    latencyMs,
  };
}

// ─────────────────────────────────────────────
// CORE: Batch translate into multiple languages
// Used when pre-generating all language variants of a review
// ─────────────────────────────────────────────

/**
 * Translates a single text into multiple languages concurrently.
 * Useful for pre-generating all regional variants of a Sentinel review.
 *
 * @example
 * const results = await batchTranslate({
 *   text: "Avoid using any — use strict types.",
 *   targetLanguages: [SUPPORTED_LANGUAGES.HINDI, SUPPORTED_LANGUAGES.TAMIL],
 * });
 */
export async function batchTranslate(
  params: BatchTranslateParams
): Promise<BatchTranslateResult> {
  const {
    text,
    targetLanguages,
    sourceLanguage = SUPPORTED_LANGUAGES.ENGLISH,
  } = params;

  const startTime = Date.now();
  const translations: Partial<Record<SupportedLanguageCode, TranslateResult>> =
    {};
  const failedLanguages: SupportedLanguageCode[] = [];

  logger.info({
    msg: "batchTranslate: starting batch",
    targetLanguages,
    characterCount: text.length,
  });

  const settled = await Promise.allSettled(
    targetLanguages.map((lang) =>
      translateText({ text, targetLanguage: lang, sourceLanguage })
    )
  );

  let totalCharacters = 0;

  settled.forEach((result, index) => {
    const lang = targetLanguages[index];
    if (result.status === "fulfilled") {
      translations[lang] = result.value;
      totalCharacters += result.value.characterCount;
    } else {
      logger.warn({
        msg: `batchTranslate: failed for language ${lang}`,
        error: String(result.reason),
      });
      failedLanguages.push(lang);
    }
  });

  const totalLatencyMs = Date.now() - startTime;

  logger.info({
    msg: "batchTranslate: batch complete",
    success: targetLanguages.length - failedLanguages.length,
    failed: failedLanguages.length,
    totalLatencyMs,
  });

  return {
    translations: translations as Record<SupportedLanguageCode, TranslateResult>,
    failedLanguages,
    totalCharacters,
    totalLatencyMs,
  };
}

// ─────────────────────────────────────────────
// UTILITY: Detect language of incoming text
// Used when a developer writes in their regional language in the chat
// ─────────────────────────────────────────────

/**
 * Detects the dominant language of a text string.
 * Enables the Vibe Coding workspace to auto-detect if a developer
 * types their question in Hindi/Tamil and respond in kind.
 *
 * @example
 * const { detectedLanguage } = await detectLanguage("यह कोड क्या करता है?");
 * // → { detectedLanguage: "hi", score: 0.98 }
 */
export async function detectLanguage(
  text: string
): Promise<DetectLanguageResult> {
  const startTime = Date.now();

  try {
    const command = new DetectDominantLanguageCommand({ Text: text });
    const response = await getClient().send(command);

    const topLanguage = response.Languages?.[0];
    const latencyMs = Date.now() - startTime;

    logger.info({
      msg: "detectLanguage: detection complete",
      detectedLanguage: topLanguage?.LanguageCode,
      score: topLanguage?.Score,
      latencyMs,
    });

    return {
      detectedLanguage: topLanguage?.LanguageCode ?? "en",
      score: topLanguage?.Score ?? 0,
      latencyMs,
    };
  } catch (err) {
    logger.error({
      msg: "detectLanguage: detection failed",
      error: String(err),
      latencyMs: Date.now() - startTime,
    });
    // Gracefully default to English on detection failure
    return {
      detectedLanguage: "en",
      score: 0,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ─────────────────────────────────────────────
// UTILITY: Translate long text via chunking
// Amazon Translate has a 10,000 byte hard limit per request
// This splits, translates in parallel, then reassembles
// ─────────────────────────────────────────────

async function translateLongText(
  params: TranslateParams
): Promise<TranslateResult> {
  const { text, targetLanguage, sourceLanguage = "en" } = params;
  const startTime = Date.now();

  // Split on paragraph boundaries to preserve semantic meaning
  const chunks = splitIntoChunks(text, 8000); // 8000 bytes safe margin

  logger.info({
    msg: "translateLongText: splitting long text",
    chunks: chunks.length,
    totalBytes: Buffer.byteLength(text, "utf8"),
  });

  const chunkResults = await Promise.allSettled(
    chunks.map((chunk) =>
      translateText({ text: chunk, targetLanguage, sourceLanguage })
    )
  );

  const translatedChunks = chunkResults.map((result, i) => {
    if (result.status === "fulfilled") return result.value.translatedText;
    logger.warn({ msg: `translateLongText: chunk ${i} failed, using original` });
    return chunks[i]; // Fallback to original chunk on failure
  });

  return {
    translatedText: translatedChunks.join("\n\n"),
    sourceLanguage: sourceLanguage as SupportedLanguageCode,
    targetLanguage,
    characterCount: text.length,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Splits text into byte-safe chunks at paragraph boundaries.
 * Preserves semantic units — never splits mid-sentence.
 */
function splitIntoChunks(text: string, maxBytes: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const candidateChunk = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;

    if (Buffer.byteLength(candidateChunk, "utf8") > maxBytes) {
      // Flush current chunk and start a new one
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk = candidateChunk;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// ─────────────────────────────────────────────
// UTILITY: Validate language code
// ─────────────────────────────────────────────

export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
  return Object.values(SUPPORTED_LANGUAGES).includes(
    code as SupportedLanguageCode
  );
}

/**
 * Returns the display name for a language code.
 * Used in the frontend language selector dropdown.
 *
 * @example
 * getLanguageDisplayName("ta") // → "தமிழ் (Tamil)"
 */
export function getLanguageDisplayName(code: SupportedLanguageCode): string {
  return LANGUAGE_DISPLAY_NAMES[code] ?? code;
}

/**
 * Returns all supported languages as an array of { code, displayName } objects.
 * Directly consumable by the frontend language toggle component.
 */
export function getSupportedLanguageOptions(): Array<{
  code: SupportedLanguageCode;
  displayName: string;
}> {
  return Object.values(SUPPORTED_LANGUAGES).map((code) => ({
    code,
    displayName: LANGUAGE_DISPLAY_NAMES[code],
  }));
}

// ─────────────────────────────────────────────
// CUSTOM ERROR
// ─────────────────────────────────────────────

export class TranslateServiceError extends Error {
  constructor(targetLanguage: string, cause: unknown) {
    const message =
      cause instanceof Error ? cause.message : String(cause);
    super(`Amazon Translate failed for language '${targetLanguage}': ${message}`);
    this.name = "TranslateServiceError";
    this.cause = cause;
  }
}