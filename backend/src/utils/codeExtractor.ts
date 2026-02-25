// src/utils/codeExtractor.ts
// Strips and extracts structured content from LLM response strings
// LLMs frequently wrap output in markdown fences, JSON blocks, and XML tags
// This utility cleans all of that so downstream code gets pure, usable content

import { logger } from "./logger";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ExtractedCode {
  code: string;                   // The clean extracted code
  language: string | null;        // e.g. "typescript", "python", null if not specified
  fenceType: "backtick" | "tilde" | "none"; // How it was wrapped
}

export interface ExtractedCodeBlock {
  index: number;                  // Position in the original response (0-based)
  language: string | null;
  code: string;
  raw: string;                    // The original fence + content as-is
}

export interface ExtractAllResult {
  blocks: ExtractedCodeBlock[];   // All code blocks found
  textOutsideBlocks: string;      // Prose surrounding the code blocks
  hasCode: boolean;
}

export interface ExtractJsonResult<T> {
  data: T;
  raw: string;                    // The raw JSON string before parsing
  wasWrapped: boolean;            // Whether it was inside a markdown fence
}

export interface ExtractSentinelReviewResult {
  summary: string;
  explanation: string;
  suggestion: string;
  severity: "critical" | "warning" | "info";
  codeSnippet: string | null;
  rawResponse: string;
}

export interface ExtractFortressTestsResult {
  testCode: string;               // Clean, runnable test code
  testFramework: string | null;   // e.g. "jest", "vitest", "pytest"
  language: string | null;
  rawResponse: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

// Matches: ```typescript, ```ts, ```python, ``` (no lang), ~~~javascript
const FENCED_CODE_BLOCK_REGEX =
  /^(?<fence>`{3,}|~{3,})(?<lang>[^\n`~]*)?\n(?<code>[\s\S]*?)\n?\k<fence>\s*$/gm;

// Matches a single leading/trailing fence (malformed LLM output)
const LEADING_FENCE_REGEX = /^```[\w]*\n?/;
const TRAILING_FENCE_REGEX = /\n?```\s*$/;

// Matches <tag>content</tag> — used for structured LLM XML output
const XML_TAG_REGEX = (tag: string) =>
  new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");

// Common language aliases → normalized names
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  tf: "terraform",
  hcl: "terraform",
};

// ─────────────────────────────────────────────
// CORE: Strip all markdown fences from a string
// The simplest, most-used function — just give me the raw code
// ─────────────────────────────────────────────

/**
 * Strips ALL markdown code fences from a string and returns clean content.
 * Handles both triple-backtick and triple-tilde fences.
 * If the string has no fences, returns it as-is (trimmed).
 *
 * Use this when you just want the raw text and don't care about
 * language labels or multiple blocks.
 *
 * @example
 * stripCodeFences("```typescript\nconst x = 1;\n```")
 * // → "const x = 1;"
 *
 * stripCodeFences("Here is code:\n```\nconst x = 1;\n```\n")
 * // → "Here is code:\n\nconst x = 1;\n"
 */
export function stripCodeFences(input: string): string {
  if (!input || input.trim() === "") return "";

  const trimmed = input.trim();

  // Fast path: no fences present at all
  if (!trimmed.includes("```") && !trimmed.includes("~~~")) {
    return trimmed;
  }

  // Replace all fenced blocks with just their inner content
  let result = trimmed.replace(
    /(`{3,}|~{3,})[^\n`~]*\n([\s\S]*?)\1/g,
    (_, _fence, code) => code.trim()
  );

  // Handle malformed single fence (LLM opened but forgot to close)
  result = result.replace(LEADING_FENCE_REGEX, "");
  result = result.replace(TRAILING_FENCE_REGEX, "");

  return result.trim();
}

// ─────────────────────────────────────────────
// CORE: Extract the FIRST code block with metadata
// Returns language label + clean code
// ─────────────────────────────────────────────

/**
 * Extracts the first code block from an LLM response.
 * Returns the clean code, detected language, and fence type.
 * If no fence is found, returns the entire input as plain code.
 *
 * @example
 * extractFirstCodeBlock("```typescript\nconst x = 1;\n```")
 * // → { code: "const x = 1;", language: "typescript", fenceType: "backtick" }
 *
 * extractFirstCodeBlock("const x = 1;")
 * // → { code: "const x = 1;", language: null, fenceType: "none" }
 */
export function extractFirstCodeBlock(input: string): ExtractedCode {
  if (!input || input.trim() === "") {
    return { code: "", language: null, fenceType: "none" };
  }

  const trimmed = input.trim();

  // Match triple-backtick fence
  const backtickMatch = trimmed.match(
    /^```([^\n`~]*)\n([\s\S]*?)\n?```\s*$/s
  );
  if (backtickMatch) {
    const rawLang = backtickMatch[1].trim().toLowerCase();
    return {
      code: backtickMatch[2].trim(),
      language: normalizeLanguage(rawLang),
      fenceType: "backtick",
    };
  }

  // Match triple-tilde fence
  const tildeMatch = trimmed.match(/^~~~([^\n~]*)\n([\s\S]*?)\n?~~~\s*$/s);
  if (tildeMatch) {
    const rawLang = tildeMatch[1].trim().toLowerCase();
    return {
      code: tildeMatch[2].trim(),
      language: normalizeLanguage(rawLang),
      fenceType: "tilde",
    };
  }

  // No fence — check if the string starts mid-fence (malformed LLM output)
  const malformedStripped = trimmed
    .replace(LEADING_FENCE_REGEX, "")
    .replace(TRAILING_FENCE_REGEX, "")
    .trim();

  return {
    code: malformedStripped,
    language: null,
    fenceType: "none",
  };
}

// ─────────────────────────────────────────────
// CORE: Extract ALL code blocks from a response
// For responses with multiple code blocks (e.g. Sentinel review with examples)
// ─────────────────────────────────────────────

/**
 * Extracts ALL code blocks from an LLM response.
 * Returns each block with its index, language, and clean code.
 * Also returns the surrounding prose text with blocks removed.
 *
 * @example
 * const result = extractAllCodeBlocks(sentinelReviewWithExamples);
 * result.blocks[0] // → { index: 0, language: "typescript", code: "..." }
 * result.textOutsideBlocks // → "Here is the issue:\n\nHere is the fix:"
 */
export function extractAllCodeBlocks(input: string): ExtractAllResult {
  if (!input || input.trim() === "") {
    return { blocks: [], textOutsideBlocks: "", hasCode: false };
  }

  const blocks: ExtractedCodeBlock[] = [];
  let textWithoutBlocks = input;
  let index = 0;

  // Reset regex lastIndex before use (global regex is stateful)
  const regex =
    /(`{3,}|~{3,})([^\n`~]*)\n([\s\S]*?)\n?\1/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const [raw, , rawLang, code] = match;
    const language = normalizeLanguage(rawLang.trim().toLowerCase());

    blocks.push({
      index,
      language,
      code: code.trim(),
      raw,
    });

    // Remove this block from the text-only version
    textWithoutBlocks = textWithoutBlocks.replace(raw, `\n`);
    index++;
  }

  return {
    blocks,
    textOutsideBlocks: textWithoutBlocks.trim(),
    hasCode: blocks.length > 0,
  };
}

// ─────────────────────────────────────────────
// CORE: Extract and parse JSON from LLM response
// LLMs often wrap JSON in ```json fences or add prose around it
// ─────────────────────────────────────────────

/**
 * Extracts and safely parses JSON from an LLM response.
 * Handles: bare JSON, ```json fenced JSON, JSON with leading prose,
 *          trailing commas, and common LLM JSON quirks.
 *
 * @example
 * // From: "Here is the data:\n```json\n{\"key\": \"value\"}\n```"
 * const result = extractJson<{ key: string }>(llmResponse);
 * result.data // → { key: "value" }
 * result.wasWrapped // → true
 */
export function extractJson<T = unknown>(
  input: string
): ExtractJsonResult<T> {
  if (!input || input.trim() === "") {
    throw new CodeExtractorError("extractJson", "Input is empty");
  }

  const trimmed = input.trim();

  // ── Attempt 1: Direct JSON parse (LLM returned bare JSON) ────────────────
  try {
    const data = JSON.parse(trimmed) as T;
    return { data, raw: trimmed, wasWrapped: false };
  } catch {
    // Not bare JSON — continue to other strategies
  }

  // ── Attempt 2: Extract from ```json fence ─────────────────────────────────
  const jsonFenceMatch = trimmed.match(
    /```(?:json)?\s*\n([\s\S]*?)\n?```/
  );
  if (jsonFenceMatch) {
    const raw = jsonFenceMatch[1].trim();
    try {
      const cleaned = sanitizeJsonString(raw);
      const data = JSON.parse(cleaned) as T;
      return { data, raw, wasWrapped: true };
    } catch (err) {
      logger.warn({
        msg: "extractJson: JSON fence found but parse failed",
        error: String(err),
        raw: raw.substring(0, 200),
      });
    }
  }

  // ── Attempt 3: Find first { or [ and extract to matching closing bracket ──
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");

  let startIndex = -1;
  let isArray = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isArray = true;
  }

  if (startIndex !== -1) {
    const raw = extractBalancedJson(trimmed, startIndex, isArray);
    if (raw) {
      try {
        const cleaned = sanitizeJsonString(raw);
        const data = JSON.parse(cleaned) as T;
        return { data, raw, wasWrapped: true };
      } catch (err) {
        logger.warn({
          msg: "extractJson: balanced extraction found but parse failed",
          error: String(err),
          raw: raw.substring(0, 200),
        });
      }
    }
  }

  throw new CodeExtractorError(
    "extractJson",
    `Could not extract valid JSON from response. First 200 chars: ${trimmed.substring(0, 200)}`
  );
}

// ─────────────────────────────────────────────
// CORE: Extract XML-tagged sections from LLM response
// Sentinel uses XML tags like <summary>, <explanation>, <suggestion>
// ─────────────────────────────────────────────

/**
 * Extracts the content of a specific XML tag from an LLM response.
 * Returns null if the tag is not found.
 *
 * @example
 * extractXmlTag(response, "summary")
 * // → "This function has a SQL injection vulnerability"
 *
 * extractXmlTag(response, "code_snippet")
 * // → "const query = `SELECT * FROM users WHERE id = ${userId}`"
 */
export function extractXmlTag(
  input: string,
  tag: string
): string | null {
  if (!input || !tag) return null;

  const match = input.match(XML_TAG_REGEX(tag));
  if (!match) return null;

  return match[1].trim();
}

/**
 * Extracts multiple XML tags at once.
 * Returns a map of tag → content (null if tag not found).
 *
 * @example
 * extractXmlTags(sentinelResponse, ["summary", "explanation", "suggestion"])
 * // → { summary: "...", explanation: "...", suggestion: "..." }
 */
export function extractXmlTags(
  input: string,
  tags: string[]
): Record<string, string | null> {
  return Object.fromEntries(
    tags.map((tag) => [tag, extractXmlTag(input, tag)])
  );
}

// ─────────────────────────────────────────────
// DOMAIN: Extract Sentinel review from Claude response
// Sentinel is prompted to return structured XML tags
// This is the canonical parser for Sentinel output
// ─────────────────────────────────────────────

/**
 * Parses a Sentinel architectural review from Claude's response.
 * Sentinel is prompted to wrap output in XML tags:
 *   <summary>, <explanation>, <suggestion>, <severity>, <code_snippet>
 *
 * Falls back to heuristic extraction if XML tags are absent
 * (e.g. Claude went off-script).
 *
 * @example
 * const review = extractSentinelReview(claudeResponse);
 * review.summary     // → "SQL injection vulnerability in getUserById"
 * review.explanation // → "The userId parameter is interpolated directly..."
 * review.severity    // → "critical"
 * review.codeSnippet // → "const query = `SELECT * FROM users WHERE id = ${userId}`"
 */
export function extractSentinelReview(
  rawResponse: string
): ExtractSentinelReviewResult {
  if (!rawResponse || rawResponse.trim() === "") {
    throw new CodeExtractorError(
      "extractSentinelReview",
      "Empty response from Sentinel"
    );
  }

  // ── Primary: Extract structured XML tags ─────────────────────────────────
  const tags = extractXmlTags(rawResponse, [
    "summary",
    "explanation",
    "suggestion",
    "severity",
    "code_snippet",
  ]);

  const hasTags =
    tags.summary !== null ||
    tags.explanation !== null ||
    tags.suggestion !== null;

  if (hasTags) {
    const severity = normalizeSeverity(tags.severity ?? "");

    // code_snippet may itself be wrapped in a code fence — strip it
    const codeSnippet = tags.code_snippet
      ? stripCodeFences(tags.code_snippet)
      : extractFirstCodeBlock(rawResponse).code || null;

    logger.info({
      msg: "extractSentinelReview: extracted via XML tags",
      severity,
      hasCodeSnippet: !!codeSnippet,
    });

    return {
      summary: tags.summary ?? "",
      explanation: tags.explanation ?? "",
      suggestion: tags.suggestion ?? "",
      severity,
      codeSnippet,
      rawResponse,
    };
  }

  // ── Fallback: Heuristic extraction from prose ─────────────────────────────
  // Claude went off-script — extract what we can from the plain text
  logger.warn({
    msg: "extractSentinelReview: no XML tags found — using heuristic fallback",
    responseLength: rawResponse.length,
  });

  const { blocks, textOutsideBlocks } = extractAllCodeBlocks(rawResponse);
  const codeSnippet = blocks[0]?.code ?? null;

  // Use first sentence as summary, rest as explanation
  const sentences = textOutsideBlocks.split(/(?<=[.!?])\s+/);
  const summary = sentences[0]?.trim() ?? "Review generated";
  const explanation = sentences.slice(1).join(" ").trim();

  return {
    summary,
    explanation,
    suggestion: "",           // Cannot reliably extract without structure
    severity: "info",         // Default to non-critical on parse failure
    codeSnippet,
    rawResponse,
  };
}

// ─────────────────────────────────────────────
// DOMAIN: Extract Fortress test code from Llama response
// Llama is prompted to return ONLY the test code in a code fence
// ─────────────────────────────────────────────

/**
 * Extracts clean, runnable test code from Llama 3's response.
 * Llama is prompted to return only a code fence — this extracts
 * the code and detects the test framework.
 *
 * @example
 * const result = extractFortressTests(llamaResponse);
 * result.testCode      // → "describe('auth', () => { it('should...') })"
 * result.testFramework // → "jest"
 * result.language      // → "typescript"
 */
export function extractFortressTests(
  rawResponse: string
): ExtractFortressTestsResult {
  if (!rawResponse || rawResponse.trim() === "") {
    throw new CodeExtractorError(
      "extractFortressTests",
      "Empty response from Fortress/Llama"
    );
  }

  const { code, language } = extractFirstCodeBlock(rawResponse);

  if (!code) {
    // Last resort: use the whole response stripped of any markdown
    const stripped = stripCodeFences(rawResponse);
    if (!stripped) {
      throw new CodeExtractorError(
        "extractFortressTests",
        "No extractable test code found in Llama response"
      );
    }

    logger.warn({
      msg: "extractFortressTests: no code fence found — using stripped full response",
    });

    return {
      testCode: stripped,
      testFramework: detectTestFramework(stripped),
      language: null,
      rawResponse,
    };
  }

  logger.info({
    msg: "extractFortressTests: test code extracted",
    language,
    codeLength: code.length,
    testFramework: detectTestFramework(code),
  });

  return {
    testCode: code,
    testFramework: detectTestFramework(code),
    language,
    rawResponse,
  };
}

// ─────────────────────────────────────────────
// DOMAIN: Extract IaC from LLM response
// Amazon Q Developer returns Terraform/CloudFormation in code fences
// ─────────────────────────────────────────────

/**
 * Extracts Infrastructure-as-Code from an Amazon Q Developer response.
 * Detects whether it's Terraform (.tf / HCL) or CloudFormation (YAML/JSON).
 *
 * @example
 * const { code, iacType } = extractIaCCode(amazonQResponse);
 * iacType // → "terraform" | "cloudformation" | "unknown"
 */
export function extractIaCCode(rawResponse: string): {
  code: string;
  iacType: "terraform" | "cloudformation" | "unknown";
  language: string | null;
} {
  const { blocks } = extractAllCodeBlocks(rawResponse);

  // Prefer explicitly labelled HCL/Terraform/YAML blocks
  const terraformBlock = blocks.find(
    (b) => b.language === "terraform" || b.language === "hcl"
  );
  if (terraformBlock) {
    return {
      code: terraformBlock.code,
      iacType: "terraform",
      language: terraformBlock.language,
    };
  }

  const yamlBlock = blocks.find((b) => b.language === "yaml");
  if (yamlBlock) {
    const isCfn = detectCloudFormation(yamlBlock.code);
    return {
      code: yamlBlock.code,
      iacType: isCfn ? "cloudformation" : "unknown",
      language: "yaml",
    };
  }

  const jsonBlock = blocks.find((b) => b.language === "json");
  if (jsonBlock) {
    const isCfn = detectCloudFormation(jsonBlock.code);
    return {
      code: jsonBlock.code,
      iacType: isCfn ? "cloudformation" : "unknown",
      language: "json",
    };
  }

  // Fall back to first block, whatever it is
  const firstBlock = blocks[0];
  if (firstBlock) {
    return {
      code: firstBlock.code,
      iacType: detectIaCType(firstBlock.code),
      language: firstBlock.language,
    };
  }

  // Absolute fallback — strip fences and return raw
  const stripped = stripCodeFences(rawResponse);
  return {
    code: stripped,
    iacType: detectIaCType(stripped),
    language: null,
  };
}

// ─────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────

/**
 * Normalizes language aliases to canonical names.
 * "ts" → "typescript", "py" → "python", "" → null
 */
function normalizeLanguage(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  const lower = raw.trim().toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

/**
 * Normalizes severity strings from LLM output.
 * Handles variations like "CRITICAL", "Critical", "error" → "critical"
 */
function normalizeSeverity(
  raw: string
): "critical" | "warning" | "info" {
  const lower = raw.trim().toLowerCase();
  if (["critical", "error", "high", "severe"].includes(lower)) return "critical";
  if (["warning", "warn", "medium", "moderate"].includes(lower)) return "warning";
  return "info";
}

/**
 * Extracts a balanced JSON object or array from a string
 * starting at the given index.
 */
function extractBalancedJson(
  input: string,
  startIndex: number,
  isArray: boolean
): string | null {
  const openChar = isArray ? "[" : "{";
  const closeChar = isArray ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i++) {
    const char = input[i];

    if (escaped) { escaped = false; continue; }
    if (char === "\\" && inString) { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return input.substring(startIndex, i + 1);
      }
    }
  }
  return null;
}

/**
 * Cleans common LLM JSON quirks before parsing:
 * - Trailing commas before } or ]
 * - Single-quoted strings → double-quoted
 * - Unquoted keys
 */
function sanitizeJsonString(raw: string): string {
  return raw
    // Remove trailing commas before closing brackets
    .replace(/,\s*([}\]])/g, "$1")
    // Replace single quotes with double quotes (carefully)
    .replace(/'/g, '"')
    // Remove JavaScript-style comments
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

/**
 * Detects the test framework used in a piece of test code.
 */
function detectTestFramework(code: string): string | null {
  if (/\bdescribe\b.*\btest\b|\btest\b.*\bexpect\b|\bexpect\b.*\btoEqual\b|\btoMatchObject\b/s.test(code)) return "jest";
  if (/\bvitest\b|from ['"]vitest['"]/i.test(code)) return "vitest";
  if (/\bpytest\b|def test_/i.test(code)) return "pytest";
  if (/\bunittest\b|TestCase/i.test(code)) return "unittest";
  if (/\bdescribe\b.*\bit\b.*\bexpect\b/s.test(code)) return "jest";
  if (/\bmocha\b|require\(['"]mocha['"]\)/i.test(code)) return "mocha";
  return null;
}

/**
 * Detects if a YAML/JSON string looks like a CloudFormation template.
 */
function detectCloudFormation(code: string): boolean {
  return (
    code.includes("AWSTemplateFormatVersion") ||
    code.includes("Resources:") ||
    code.includes('"Resources"') ||
    code.includes("AWS::") ||
    code.includes('"AWS::')
  );
}

/**
 * Detects IaC type from raw code content.
 */
function detectIaCType(code: string): "terraform" | "cloudformation" | "unknown" {
  if (
    code.includes("resource ") ||
    code.includes("provider ") ||
    code.includes("terraform {") ||
    code.includes("var.")
  ) return "terraform";

  if (detectCloudFormation(code)) return "cloudformation";

  return "unknown";
}

// ─────────────────────────────────────────────
// CUSTOM ERROR
// ─────────────────────────────────────────────

export class CodeExtractorError extends Error {
  constructor(operation: string, reason: string) {
    super(`codeExtractor.${operation} failed: ${reason}`);
    this.name = "CodeExtractorError";
  }
}