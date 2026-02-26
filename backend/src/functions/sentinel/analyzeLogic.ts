/**
 * analyzeLogic.ts
 * Velocis — Sentinel: The Guardian & Multilingual Mentor Agent
 *
 * Responsibility:
 *   The core reasoning engine of the Sentinel agent. When a GitHub push
 *   webhook arrives, this function fetches the changed files, feeds them
 *   to Claude 3.5 Sonnet via Amazon Bedrock, and performs a deep semantic
 *   code review focused exclusively on:
 *     - Business logic correctness and edge case handling
 *     - Security vulnerabilities (injection, auth bypass, data exposure)
 *     - Scalability bottlenecks and architectural anti-patterns
 *     - TypeScript type safety and contract violations
 *     - AWS best practices violations (missing error handling, tight coupling)
 *
 *   Sentinel intentionally IGNORES surface-level linting issues (formatting,
 *   naming conventions, import order) — those belong to ESLint, not an AI
 *   Senior Engineer. It focuses only on what a human senior engineer would
 *   flag in a real code review.
 *
 *   After analysis, it:
 *     1. Persists findings to DynamoDB (drives Sentinel dashboard cards)
 *     2. Optionally posts a PR comment via repoOps.ts
 *     3. Triggers Amazon Translate for multilingual output (if enabled)
 *     4. Returns a structured CodeReviewResult for the Vibe Coding Workspace
 *
 * Called by:
 *   src/handlers/webhooks/githubPush.ts    (on every push event)
 *   src/handlers/api/postChatMessage.ts    (Vibe Coding chat — on-demand review)
 *   src/functions/sentinel/mentorChat.ts   (inline during chat sessions)
 *
 * Input shape:
 *   {
 *     repoId: string
 *     repoOwner: string
 *     repoName: string
 *     filePaths: string[]
 *     commitSha: string
 *     pullRequestNumber?: number
 *     accessToken: string
 *     language?: SupportedLanguage     // For multilingual output
 *     reviewDepth?: ReviewDepth        // "quick" | "standard" | "deep"
 *     context?: string                 // Optional additional context from chat
 *   }
 *
 * Output shape:
 *   {
 *     reviewResult: CodeReviewResult
 *   }
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../services/database/dynamoClient";
import { fetchFileContent, postPullRequestComment } from "../../services/github/repoOps";
import { translateText } from "../../services/aws/translate";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { stripCodeFences as stripMarkdownCodeBlocks } from "../../utils/codeExtractor";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type SupportedLanguage =
  | "en"    // English (default)
  | "hi"    // Hindi
  | "ta"    // Tamil
  | "te"    // Telugu
  | "kn"    // Kannada
  | "mr"    // Marathi
  | "bn";   // Bengali

export type ReviewDepth =
  | "quick"       // Fast scan — 3-5 key issues only. Used during active chat.
  | "standard"    // Full review — all findings. Default for push webhooks.
  | "deep";       // Exhaustive — includes speculative risks, architectural suggestions.

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";
export type IssueCategory =
  | "security"
  | "logic"
  | "scalability"
  | "type-safety"
  | "aws-best-practice"
  | "error-handling"
  | "data-integrity"
  | "performance"
  | "architecture";

export interface CodeLocation {
  filePath: string;
  /** 1-indexed line number where the issue starts */
  startLine: number;
  /** 1-indexed line number where the issue ends */
  endLine: number;
  /** The exact problematic code snippet (max 5 lines) */
  codeSnippet: string;
}

export interface ReviewFinding {
  id: string;                    // Stable hash of filePath + startLine + category
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;                 // Short, scannable title e.g. "SQL Injection Risk in userQuery()"
  description: string;           // What is wrong and why it matters
  /** The mentor explanation: WHY this is a problem architecturally */
  mentorExplanation: string;
  location: CodeLocation;
  /** A complete, corrected code snippet ready to copy-paste */
  suggestedFix: string;
  /** Estimated effort to fix: "5 min" | "30 min" | "2 hours" | "major refactor" */
  estimatedFixEffort: string;
  /** Links to relevant AWS docs, OWASP, or RFC if applicable */
  references: string[];
  /** Translated versions of description + mentorExplanation (populated if language != "en") */
  translations?: Partial<Record<SupportedLanguage, { description: string; mentorExplanation: string }>>;
}

export interface FileReviewSummary {
  filePath: string;
  language: string;
  linesReviewed: number;
  findingCount: number;
  criticalCount: number;
  highCount: number;
  /** Overall file health score 0-100 (100 = no issues) */
  healthScore: number;
  /** One-line summary of the file's primary concern */
  headline: string;
}

export type OverallRisk = "critical" | "high" | "medium" | "low" | "clean";

export interface CodeReviewResult {
  repoId: string;
  commitSha: string;
  pullRequestNumber?: number;
  reviewDepth: ReviewDepth;
  outputLanguage: SupportedLanguage;
  overallRisk: OverallRisk;
  /** Sentinel's overall assessment in 2-3 sentences */
  executiveSummary: string;
  /** Translated executive summary (if outputLanguage != "en") */
  executiveSummaryTranslated?: string;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  findings: ReviewFinding[];
  fileSummaries: FileReviewSummary[];
  /** Top 3 most important fixes Claude recommends doing first */
  prioritizedActionItems: string[];
  /** Whether a PR comment was posted */
  prCommentPosted: boolean;
  reviewedAt: string;
  bedrockLatencyMs: number;
}

export interface AnalyzeLogicInput {
  repoId: string;
  repoOwner: string;
  repoName: string;
  filePaths: string[];
  commitSha: string;
  pullRequestNumber?: number;
  accessToken: string;
  language?: SupportedLanguage;
  reviewDepth?: ReviewDepth;
  /** Extra context injected from the Vibe Coding chat session */
  context?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BEDROCK_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";

/** Token budgets per review depth */
const MAX_TOKENS: Record<ReviewDepth, number> = {
  quick: 2048,
  standard: 4096,
  deep: 8000,
};

/** Max findings Claude will return per depth (prevents overwhelming developers) */
const MAX_FINDINGS: Record<ReviewDepth, number> = {
  quick: 5,
  standard: 15,
  deep: 30,
};

const MAX_SOURCE_CHARS_PER_FILE = 6000;
const MAX_FILES_TO_REVIEW = 8;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3-minute cache for on-demand reviews

/** File extensions Sentinel can meaningfully review */
const REVIEWABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py",
  ".go", ".java", ".rb", ".cs",
]);

/** Skip patterns — no point reviewing generated, test, or config files */
const SKIP_PATTERNS = [
  ".test.", ".spec.", ".d.ts", "node_modules",
  "dist/", ".next/", "coverage/", "yarn.lock",
  "package-lock.json", ".env",
];

/** Severity to numeric weight for health score calculation */
const SEVERITY_WEIGHTS: Record<IssueSeverity, number> = {
  critical: 40,
  high: 20,
  medium: 10,
  low: 3,
  info: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// AWS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: config.AWS_REGION });

// ─────────────────────────────────────────────────────────────────────────────
// FILE ELIGIBILITY
// ─────────────────────────────────────────────────────────────────────────────

function isReviewableFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (!REVIEWABLE_EXTENSIONS.has(ext)) return false;
  return !SKIP_PATTERNS.some((p) => filePath.includes(p));
}

function inferFileLanguage(filePath: string): string {
  const ext = path.extname(filePath);
  const map: Record<string, string> = {
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript",
    ".py": "Python", ".go": "Go",
    ".java": "Java", ".rb": "Ruby", ".cs": "C#",
  };
  return map[ext] ?? "Unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// FINDING ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a stable, reproducible ID for each finding.
 * Keyed on filePath + startLine + category so the same bug
 * produces the same ID across multiple review runs — enabling
 * deduplication in DynamoDB and the frontend.
 */
function generateFindingId(
  filePath: string,
  startLine: number,
  category: IssueCategory
): string {
  const raw = `${filePath}:${startLine}:${category}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `sentinel-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH SCORE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a 0-100 health score for a file based on its findings.
 * 100 = no issues. Each finding deducts weighted points.
 * Score is clamped to 0 minimum.
 */
function computeHealthScore(findings: ReviewFinding[]): number {
  const totalDeduction = findings.reduce(
    (sum, f) => sum + (SEVERITY_WEIGHTS[f.severity] ?? 0),
    0
  );
  return Math.max(0, 100 - totalDeduction);
}

/**
 * Determines overall risk level from the full set of findings.
 */
function computeOverallRisk(findings: ReviewFinding[]): OverallRisk {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "high")) return "high";
  if (findings.some((f) => f.severity === "medium")) return "medium";
  if (findings.some((f) => f.severity === "low")) return "low";
  return "clean";
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(reviewDepth: ReviewDepth): string {
  const depthInstructions: Record<ReviewDepth, string> = {
    quick: `This is a QUICK review. Return only the top 5 most critical issues. Be brief but precise. Focus exclusively on critical and high severity findings. Skip anything medium or below.`,
    standard: `This is a STANDARD review. Return up to 15 findings across all severities. Balance depth with clarity. This is the default mode for push webhook reviews.`,
    deep: `This is a DEEP review. Return up to 30 findings. Be exhaustive. Include speculative architectural risks, future scalability concerns, and subtle type safety issues even if they don't cause immediate failures. Think 6 months ahead.`,
  };

  return `You are Sentinel, the Senior Engineer guardian of the Velocis AI platform. You perform elite-level semantic code reviews that go far beyond surface linting.

## Your Review Focus (in priority order)
1. **Security**: SQL/NoSQL injection, authentication bypass, insecure deserialization, sensitive data exposure, missing input validation, SSRF, path traversal, hardcoded secrets, broken access control, missing rate limiting.
2. **Business Logic**: Race conditions, incorrect state transitions, missing null/undefined guards, off-by-one errors, incorrect async flow (missing await), silent failures, incorrect error propagation.
3. **Scalability**: N+1 query patterns, missing pagination, unbounded loops over external data, synchronous blocking in async contexts, memory leaks, missing connection pooling, Lambda cold start anti-patterns.
4. **Type Safety**: Unsafe type assertions (as any), missing type guards, incorrect generic constraints, runtime vs compile-time type mismatches, unchecked JSON.parse() results.
5. **AWS Best Practices**: Missing DynamoDB condition expressions on writes, no retry logic for Bedrock/Lambda calls, hardcoded ARNs, over-privileged IAM scopes inferred from code, missing CloudWatch metrics.
6. **Error Handling**: Swallowed exceptions, missing finally blocks, unhandled promise rejections, non-specific catch blocks that hide real errors, missing error logging.

## What You IGNORE (do not report these)
- Code style, formatting, indentation
- Naming conventions (camelCase vs snake_case)
- Import ordering
- Missing semicolons
- Console.log vs logger (unless it leaks sensitive data)
- Any issue that ESLint would catch

## Mentor Mode
For every finding, write a \`mentorExplanation\` that teaches the WHY — not just what's wrong, but the deeper architectural or security principle being violated. Write as if explaining to a sharp junior engineer who wants to understand the system deeply.

## Output Format
Respond ONLY with valid XML inside <sentinel_review> tags. No preamble, no explanation outside the XML.

${depthInstructions[reviewDepth]}

<sentinel_review>
  <executive_summary>
    2-3 sentences summarizing the overall code health, most critical concern, and confidence level in the codebase's production-readiness.
  </executive_summary>

  <findings>
    <!-- Repeat <finding> for each issue found -->
    <finding>
      <severity>critical|high|medium|low|info</severity>
      <category>security|logic|scalability|type-safety|aws-best-practice|error-handling|data-integrity|performance|architecture</category>
      <title>Short, scannable title referencing the specific function/variable name</title>
      <file_path>exact/file/path.ts</file_path>
      <start_line>integer</start_line>
      <end_line>integer</end_line>
      <code_snippet>The exact problematic code, max 5 lines</code_snippet>
      <description>
        Precise technical description of what is wrong. Reference specific variable names, function names, and line numbers.
      </description>
      <mentor_explanation>
        The WHY — the architectural or security principle being violated. Written for a junior engineer who wants to grow.
      </mentor_explanation>
      <suggested_fix>
        Complete, working corrected code snippet. Not a description — actual code ready to paste.
      </suggested_fix>
      <estimated_fix_effort>5 min|30 min|2 hours|major refactor</estimated_fix_effort>
      <references>comma-separated URLs to relevant docs, OWASP, AWS docs</references>
    </finding>
  </findings>

  <file_summaries>
    <!-- One <file_summary> per reviewed file -->
    <file_summary>
      <file_path>exact/file/path.ts</file_path>
      <headline>One-line summary of the file's primary concern or "No issues found"</headline>
    </file_summary>
  </file_summaries>

  <prioritized_actions>
    <!-- Top 3 most important fixes, in order -->
    <action>Specific, actionable item #1</action>
    <action>Specific, actionable item #2</action>
    <action>Specific, actionable item #3</action>
  </prioritized_actions>
</sentinel_review>`;
}

function buildUserPrompt(
  fileContents: { path: string; content: string; language: string }[],
  commitSha: string,
  reviewDepth: ReviewDepth,
  context?: string
): string {
  const fileSection = fileContents
    .map(({ path: filePath, content, language }) => {
      const truncated = content.slice(0, MAX_SOURCE_CHARS_PER_FILE);
      const isTruncated = content.length > MAX_SOURCE_CHARS_PER_FILE;
      return `### File: \`${filePath}\` (${language})
\`\`\`${language.toLowerCase()}
${truncated}${isTruncated ? "\n// ... [truncated at 6000 chars]" : ""}
\`\`\``;
    })
    .join("\n\n");

  const contextSection = context
    ? `## Additional Context from Developer\n${context}\n`
    : "";

  const depthNote: Record<ReviewDepth, string> = {
    quick: "⚡ QUICK mode: Report only top 5 most critical issues.",
    standard: "🔍 STANDARD mode: Full review, up to 15 findings.",
    deep: "🔬 DEEP mode: Exhaustive review, up to 30 findings including speculative risks.",
  };

  return `## Code Review Request
Commit: \`${commitSha}\`
Review Mode: ${depthNote[reviewDepth]}
Files Changed: ${fileContents.length}

${contextSection}

## Source Files to Review
${fileSection}

Perform a deep semantic review of the above files now. Respond ONLY with the <sentinel_review> XML block.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK INVOCATION
// ─────────────────────────────────────────────────────────────────────────────

async function invokeClaudeForReview(
  systemPrompt: string,
  userPrompt: string,
  reviewDepth: ReviewDepth
): Promise<{ responseText: string; latencyMs: number }> {
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: MAX_TOKENS[reviewDepth],
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.1,
  };

  const t0 = Date.now();

  try {
    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await bedrockClient.send(command);
    const latencyMs = Date.now() - t0;
    const parsed = JSON.parse(new TextDecoder().decode(response.body));
    const responseText: string = parsed.content?.[0]?.text ?? "";

    logger.info(
      {
        latencyMs,
        inputTokens: parsed.usage?.input_tokens,
        outputTokens: parsed.usage?.output_tokens,
        reviewDepth,
      },
      "Sentinel: Bedrock Claude invocation complete"
    );

    return { responseText, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    logger.error({ err, latencyMs }, "Sentinel: Bedrock invocation failed");
    throw new Error(`Bedrock invocation failed: ${err.message ?? String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// XML RESPONSE PARSER
// ─────────────────────────────────────────────────────────────────────────────

function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return match[0]
    .replace(new RegExp(`^<${tag}>\\s*`, "i"), "")
    .replace(new RegExp(`\\s*<\\/${tag}>$`, "i"), "")
    .trim();
}

function extractAllXmlTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "gi");
  const matches = xml.match(regex) ?? [];
  return matches.map((m) =>
    m
      .replace(new RegExp(`^<${tag}>\\s*`, "i"), "")
      .replace(new RegExp(`\\s*<\\/${tag}>$`, "i"), "")
      .trim()
  );
}

function parseFinding(
  findingXml: string,
  filePaths: string[]
): ReviewFinding | null {
  try {
    const severityRaw = extractXmlTag(findingXml, "severity").toLowerCase() as IssueSeverity;
    const validSeverities: IssueSeverity[] = ["critical", "high", "medium", "low", "info"];
    const severity = validSeverities.includes(severityRaw) ? severityRaw : "medium";

    const categoryRaw = extractXmlTag(findingXml, "category").toLowerCase() as IssueCategory;
    const validCategories: IssueCategory[] = [
      "security", "logic", "scalability", "type-safety",
      "aws-best-practice", "error-handling", "data-integrity",
      "performance", "architecture",
    ];
    const category = validCategories.includes(categoryRaw) ? categoryRaw : "logic";

    const filePath = extractXmlTag(findingXml, "file_path") || filePaths[0] || "unknown";
    const startLine = parseInt(extractXmlTag(findingXml, "start_line"), 10) || 1;
    const endLine = parseInt(extractXmlTag(findingXml, "end_line"), 10) || startLine;

    const title = extractXmlTag(findingXml, "title");
    const description = extractXmlTag(findingXml, "description");
    const mentorExplanation = extractXmlTag(findingXml, "mentor_explanation");
    const codeSnippet = extractXmlTag(findingXml, "code_snippet");
    const suggestedFixRaw = extractXmlTag(findingXml, "suggested_fix");
    const suggestedFix = stripMarkdownCodeBlocks(suggestedFixRaw);
    const estimatedFixEffort = extractXmlTag(findingXml, "estimated_fix_effort") || "30 min";
    const referencesRaw = extractXmlTag(findingXml, "references");
    const references = referencesRaw
      ? referencesRaw.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    if (!title || !description) return null;

    return {
      id: generateFindingId(filePath, startLine, category),
      severity,
      category,
      title,
      description,
      mentorExplanation,
      location: {
        filePath,
        startLine,
        endLine,
        codeSnippet,
      },
      suggestedFix,
      estimatedFixEffort,
      references,
    };
  } catch (err) {
    logger.warn({ err, findingXml: findingXml.slice(0, 200) }, "Sentinel: Failed to parse finding");
    return null;
  }
}

interface ParsedReview {
  executiveSummary: string;
  findings: ReviewFinding[];
  fileSummaries: { filePath: string; headline: string }[];
  prioritizedActions: string[];
}

function parseClaudeReviewResponse(
  rawResponse: string,
  filePaths: string[],
  maxFindings: number
): ParsedReview {
  // Extract the sentinel_review XML block
  const xmlStart = rawResponse.indexOf("<sentinel_review>");
  const xmlEnd = rawResponse.indexOf("</sentinel_review>") + "</sentinel_review>".length;
  const xml =
    xmlStart >= 0 && xmlEnd > xmlStart
      ? rawResponse.slice(xmlStart, xmlEnd)
      : rawResponse;

  const executiveSummary = extractXmlTag(xml, "executive_summary");

  // Extract all <finding> blocks
  const findingsXml = extractAllXmlTags(xml, "finding");
  const findings: ReviewFinding[] = findingsXml
    .slice(0, maxFindings)
    .map((fx) => parseFinding(fx, filePaths))
    .filter((f): f is ReviewFinding => f !== null);

  // Extract <file_summary> blocks
  const fileSummariesXml = extractAllXmlTags(xml, "file_summary");
  const fileSummaries = fileSummariesXml.map((fs) => ({
    filePath: extractXmlTag(fs, "file_path"),
    headline: extractXmlTag(fs, "headline"),
  })).filter((fs) => fs.filePath);

  // Extract <action> items
  const prioritizedActions = extractAllXmlTags(xml, "action").slice(0, 3);

  return { executiveSummary, findings, fileSummaries, prioritizedActions };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE SUMMARIES BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds structured FileReviewSummary objects from findings grouped by file.
 * Merges Claude's parsed file summaries with computed health scores.
 */
function buildFileSummaries(
  fileContents: { path: string; content: string; language: string }[],
  findings: ReviewFinding[],
  parsedSummaries: { filePath: string; headline: string }[]
): FileReviewSummary[] {
  return fileContents.map(({ path: filePath, content, language }) => {
    const fileFindings = findings.filter((f) => f.location.filePath === filePath);
    const criticalCount = fileFindings.filter((f) => f.severity === "critical").length;
    const highCount = fileFindings.filter((f) => f.severity === "high").length;
    const healthScore = computeHealthScore(fileFindings);

    const parsedSummary = parsedSummaries.find((s) => s.filePath === filePath);
    const headline =
      parsedSummary?.headline ??
      (fileFindings.length === 0
        ? "No issues found — code looks clean."
        : `${fileFindings.length} issue${fileFindings.length > 1 ? "s" : ""} detected.`);

    return {
      filePath,
      language,
      linesReviewed: content.split("\n").length,
      findingCount: fileFindings.length,
      criticalCount,
      highCount,
      healthScore,
      headline,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTILINGUAL TRANSLATION
// ─────────────────────────────────────────────────────────────────────────────

/** Amazon Translate language codes for supported languages */
const TRANSLATE_CODES: Record<SupportedLanguage, string> = {
  en: "en",
  hi: "hi",
  ta: "ta",
  te: "te",
  kn: "kn",
  mr: "mr",
  bn: "bn",
};

/**
 * Translates findings' description and mentorExplanation fields into the
 * requested language using Amazon Translate (powered by the translate.ts service).
 *
 * Translations are added to the finding's translations map.
 * Only translates if language !== "en" — skips if already in English.
 *
 * Processes in parallel with a concurrency cap of 5 to avoid rate limits.
 */
async function translateFindings(
  findings: ReviewFinding[],
  targetLanguage: SupportedLanguage
): Promise<ReviewFinding[]> {
  if (targetLanguage === "en") return findings;

  const targetCode = TRANSLATE_CODES[targetLanguage];

  // Process in parallel batches of 5 to respect Translate rate limits
  const BATCH_SIZE = 5;
  const translated = [...findings];

  for (let i = 0; i < findings.length; i += BATCH_SIZE) {
    const batch = findings.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (finding) => {
        try {
          const [translatedDescription, translatedMentorExplanation] = await Promise.all([
            translateText(finding.description, "en", targetCode),
            translateText(finding.mentorExplanation, "en", targetCode),
          ]);

          return {
            findingId: finding.id,
            translation: {
              description: translatedDescription,
              mentorExplanation: translatedMentorExplanation,
            },
          };
        } catch (err) {
          logger.warn({ findingId: finding.id, targetLanguage, err }, "Sentinel: Translation failed for finding");
          return null;
        }
      })
    );

    // Merge translations back into findings
    batchResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        const { findingId, translation } = result.value;
        const idx = translated.findIndex((f) => f.id === findingId);
        if (idx >= 0) {
          translated[idx] = {
            ...translated[idx],
            translations: {
              ...translated[idx].translations,
              [targetLanguage]: translation,
            },
          };
        }
      }
    });
  }

  return translated;
}

/**
 * Translates the executive summary into the target language.
 */
async function translateExecutiveSummary(
  summary: string,
  targetLanguage: SupportedLanguage
): Promise<string> {
  if (targetLanguage === "en") return summary;
  try {
    return await translateText(summary, "en", TRANSLATE_CODES[targetLanguage]);
  } catch (err) {
    logger.warn({ targetLanguage, err }, "Sentinel: Executive summary translation failed");
    return summary;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB PR COMMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats the review result as a GitHub-flavored Markdown comment
 * and posts it to the Pull Request via repoOps.ts.
 */
function formatPrComment(result: CodeReviewResult): string {
  const riskEmoji: Record<OverallRisk, string> = {
    critical: "🚨",
    high: "🔴",
    medium: "🟡",
    low: "🟢",
    clean: "✅",
  };

  const severityEmoji: Record<IssueSeverity, string> = {
    critical: "🚨",
    high: "🔴",
    medium: "🟡",
    low: "🔵",
    info: "ℹ️",
  };

  const header = `## ${riskEmoji[result.overallRisk]} Sentinel Code Review — ${result.overallRisk.toUpperCase()} Risk

> **${result.executiveSummary}**

| Metric | Value |
|--------|-------|
| Files Reviewed | ${result.fileSummaries.length} |
| Total Findings | ${result.totalFindings} |
| 🚨 Critical | ${result.criticalFindings} |
| 🔴 High | ${result.highFindings} |
| 🟡 Medium | ${result.mediumFindings} |
| 🔵 Low | ${result.lowFindings} |`;

  const actionsSection =
    result.prioritizedActionItems.length > 0
      ? `\n\n### 🎯 Top Priority Actions\n${result.prioritizedActionItems.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : "";

  const findingsSection =
    result.findings.length > 0
      ? `\n\n### 🔍 Findings\n\n` +
        result.findings
          .slice(0, 10) // Cap PR comments at 10 findings to avoid overwhelming
          .map(
            (f) => `<details>
<summary>${severityEmoji[f.severity]} <strong>[${f.severity.toUpperCase()}] ${f.category}</strong> — ${f.title} (<code>${f.location.filePath}:${f.location.startLine}</code>)</summary>

**Problem:**
${f.description}

**Why This Matters (Mentor Mode):**
${f.mentorExplanation}

**Suggested Fix:**
\`\`\`typescript
${f.suggestedFix}
\`\`\`

**Estimated Fix Effort:** ${f.estimatedFixEffort}
${f.references.length > 0 ? `\n**References:** ${f.references.join(" | ")}` : ""}
</details>`
          )
          .join("\n\n")
      : "\n\n✅ **No significant issues found in this commit.**";

  const footer = `\n\n---\n*Reviewed by [Velocis Sentinel](https://velocis.ai) — Autonomous AI Senior Engineer | Commit \`${result.commitSha.slice(0, 7)}\`*`;

  return header + actionsSection + findingsSection + footer;
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMODB PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the review result to DynamoDB.
 * Written to two locations:
 *   1. AI_Activity table — per-commit review record (drives activity feed)
 *   2. Repositories table — aggregate Sentinel stats (drives dashboard cards)
 */
async function persistReviewResult(
  repoId: string,
  commitSha: string,
  result: CodeReviewResult
): Promise<void> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  try {
    // ── Write per-commit review record ─────────────────────────────────────
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Item: {
          PK: `REPO#${repoId}`,
          SK: `SENTINEL#${commitSha}`,
          overallRisk: result.overallRisk,
          totalFindings: result.totalFindings,
          criticalFindings: result.criticalFindings,
          highFindings: result.highFindings,
          mediumFindings: result.mediumFindings,
          lowFindings: result.lowFindings,
          executiveSummary: result.executiveSummary,
          prioritizedActionItems: result.prioritizedActionItems,
          // Store findings without full mentor explanations to stay under DynamoDB 400KB limit
          findingSummaries: result.findings.map((f) => ({
            id: f.id,
            severity: f.severity,
            category: f.category,
            title: f.title,
            filePath: f.location.filePath,
            startLine: f.location.startLine,
          })),
          fileSummaries: result.fileSummaries,
          reviewDepth: result.reviewDepth,
          outputLanguage: result.outputLanguage,
          prCommentPosted: result.prCommentPosted,
          reviewedAt: result.reviewedAt,
          bedrockLatencyMs: result.bedrockLatencyMs,
          TTL: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30-day TTL
        },
      })
    );

    // ── Update aggregate Sentinel stats on Repositories table ──────────────
    await docClient.send(
      new UpdateCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "SENTINEL_STATS" },
        UpdateExpression:
          "SET #totalReviews = if_not_exists(#totalReviews, :zero) + :one, " +
          "#lastReviewAt = :reviewedAt, " +
          "#lastRisk = :risk, " +
          "#totalCritical = if_not_exists(#totalCritical, :zero) + :critical, " +
          "#totalHigh = if_not_exists(#totalHigh, :zero) + :high",
        ExpressionAttributeNames: {
          "#totalReviews": "totalReviews",
          "#lastReviewAt": "lastReviewAt",
          "#lastRisk": "lastRisk",
          "#totalCritical": "totalCritical",
          "#totalHigh": "totalHigh",
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":reviewedAt": result.reviewedAt,
          ":risk": result.overallRisk,
          ":critical": result.criticalFindings,
          ":high": result.highFindings,
        },
      })
    );

    logger.info(
      {
        repoId,
        commitSha,
        overallRisk: result.overallRisk,
        totalFindings: result.totalFindings,
      },
      "Sentinel: Review result persisted to DynamoDB"
    );
  } catch (err) {
    logger.warn({ repoId, commitSha, err }, "Sentinel: DynamoDB persist failed — non-fatal");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE LAYER
// ─────────────────────────────────────────────────────────────────────────────

async function getCachedReview(
  repoId: string,
  commitSha: string
): Promise<CodeReviewResult | null> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Key: { PK: `REPO#${repoId}`, SK: `SENTINEL_CACHE#${commitSha}` },
      })
    );

    if (!result.Item) return null;

    const { reviewResult, cachedAt } = result.Item as {
      reviewResult: CodeReviewResult;
      cachedAt: number;
    };

    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;

    logger.info({ repoId, commitSha }, "Sentinel: Cache hit — returning cached review");
    return reviewResult;
  } catch {
    return null;
  }
}

async function setCachedReview(
  repoId: string,
  commitSha: string,
  reviewResult: CodeReviewResult
): Promise<void> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Item: {
          PK: `REPO#${repoId}`,
          SK: `SENTINEL_CACHE#${commitSha}`,
          reviewResult,
          cachedAt: Date.now(),
          TTL: Math.floor(Date.now() / 1000) + 300, // 5-min TTL on cache entry
        },
      })
    );
  } catch {
    // Non-fatal
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * analyzeLogic()
 *
 * Main exported function. The Sentinel agent's core reasoning engine.
 *
 * Full pipeline:
 *   1.  Check DynamoDB review cache (3-min TTL)
 *   2.  Filter file list to reviewable extensions
 *   3.  Fetch source files from GitHub in parallel
 *   4.  Build Claude system prompt (depth-aware) + user prompt
 *   5.  Invoke Claude 3.5 Sonnet via Bedrock
 *   6.  Parse XML response → ReviewFinding[] + summaries
 *   7.  Assign stable IDs and compute health scores
 *   8.  Translate findings if outputLanguage !== "en" (Amazon Translate)
 *   9.  Build FileSummary[] and compute overall risk
 *  10.  Post PR comment if pullRequestNumber provided
 *  11.  Persist to DynamoDB (activity feed + aggregate stats)
 *  12.  Cache result
 *  13.  Return CodeReviewResult to caller
 */
export async function analyzeLogic(
  input: AnalyzeLogicInput
): Promise<CodeReviewResult> {
  const {
    repoId,
    repoOwner,
    repoName,
    filePaths,
    commitSha,
    pullRequestNumber,
    accessToken,
    language = "en",
    reviewDepth = "standard",
    context,
  } = input;

  const reviewedAt = new Date().toISOString();

  logger.info(
    {
      repoId,
      repoOwner,
      repoName,
      filePaths,
      commitSha,
      language,
      reviewDepth,
      hasPR: !!pullRequestNumber,
    },
    "Sentinel: analyzeLogic() invoked"
  );

  // ── Step 1: Cache check ───────────────────────────────────────────────────
  const cached = await getCachedReview(repoId, commitSha);
  if (cached) return cached;

  // ── Step 2: Filter to reviewable files ───────────────────────────────────
  const reviewableFiles = filePaths
    .filter(isReviewableFile)
    .slice(0, MAX_FILES_TO_REVIEW);

  if (reviewableFiles.length === 0) {
    logger.info({ repoId, filePaths }, "Sentinel: No reviewable files in this commit");

    const emptyResult: CodeReviewResult = {
      repoId,
      commitSha,
      pullRequestNumber,
      reviewDepth,
      outputLanguage: language,
      overallRisk: "clean",
      executiveSummary:
        "No reviewable source files were found in this commit. Only documentation, configuration, or generated files were changed.",
      totalFindings: 0,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0,
      findings: [],
      fileSummaries: [],
      prioritizedActionItems: [],
      prCommentPosted: false,
      reviewedAt,
      bedrockLatencyMs: 0,
    };

    await persistReviewResult(repoId, commitSha, emptyResult);
    return emptyResult;
  }

  // ── Step 3: Fetch source files from GitHub ────────────────────────────────
  const fetchResults = await Promise.allSettled(
    reviewableFiles.map(async (filePath) => {
      const content = await fetchFileContent(
        repoOwner,
        repoName,
        filePath,
        accessToken,
        commitSha
      );
      return {
        path: filePath,
        content,
        language: inferFileLanguage(filePath),
      };
    })
  );

  const fileContents = fetchResults
    .filter(
      (r): r is PromiseFulfilledResult<{ path: string; content: string; language: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (fileContents.length === 0) {
    throw new Error("Sentinel: Failed to fetch any source files from GitHub.");
  }

  logger.info(
    { repoId, fetchedFiles: fileContents.map((f) => f.path) },
    "Sentinel: Source files fetched"
  );

  // ── Step 4: Build prompts ─────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(reviewDepth);
  const userPrompt = buildUserPrompt(fileContents, commitSha, reviewDepth, context);

  // ── Step 5: Invoke Claude 3.5 Sonnet ─────────────────────────────────────
  let responseText: string;
  let latencyMs: number;

  try {
    ({ responseText, latencyMs } = await invokeClaudeForReview(
      systemPrompt,
      userPrompt,
      reviewDepth
    ));
  } catch (err: any) {
    logger.error({ repoId, commitSha, err }, "Sentinel: Bedrock invocation failed");
    throw new Error(`Sentinel analysis failed: ${err.message}`);
  }

  // ── Step 6: Parse XML response ────────────────────────────────────────────
  let parsed: ParsedReview;
  try {
    parsed = parseClaudeReviewResponse(
      responseText,
      fileContents.map((f) => f.path),
      MAX_FINDINGS[reviewDepth]
    );
  } catch (err: any) {
    logger.error(
      { repoId, err, responsePreview: responseText.slice(0, 300) },
      "Sentinel: XML parse failed"
    );
    throw new Error(`Sentinel response parsing failed: ${err.message}`);
  }

  logger.info(
    {
      repoId,
      findingsCount: parsed.findings.length,
      overallRisk: computeOverallRisk(parsed.findings),
    },
    "Sentinel: Analysis parsed"
  );

  // ── Step 7: Compute scores and risk ──────────────────────────────────────
  const overallRisk = computeOverallRisk(parsed.findings);

  // ── Step 8: Translate findings if needed ──────────────────────────────────
  let translatedFindings = parsed.findings;
  let executiveSummaryTranslated: string | undefined;

  if (language !== "en") {
    logger.info(
      { repoId, targetLanguage: language, findingsCount: parsed.findings.length },
      "Sentinel: Translating findings via Amazon Translate"
    );

    [translatedFindings, executiveSummaryTranslated] = await Promise.all([
      translateFindings(parsed.findings, language),
      translateExecutiveSummary(parsed.executiveSummary, language),
    ]);
  }

  // ── Step 9: Build file summaries ──────────────────────────────────────────
  const fileSummaries = buildFileSummaries(
    fileContents,
    translatedFindings,
    parsed.fileSummaries
  );

  // ── Step 10: Assemble result ──────────────────────────────────────────────
  const reviewResult: CodeReviewResult = {
    repoId,
    commitSha,
    pullRequestNumber,
    reviewDepth,
    outputLanguage: language,
    overallRisk,
    executiveSummary: parsed.executiveSummary,
    executiveSummaryTranslated,
    totalFindings: translatedFindings.length,
    criticalFindings: translatedFindings.filter((f) => f.severity === "critical").length,
    highFindings: translatedFindings.filter((f) => f.severity === "high").length,
    mediumFindings: translatedFindings.filter((f) => f.severity === "medium").length,
    lowFindings: translatedFindings.filter((f) => f.severity === "low").length,
    findings: translatedFindings,
    fileSummaries,
    prioritizedActionItems: parsed.prioritizedActions,
    prCommentPosted: false,
    reviewedAt,
    bedrockLatencyMs: latencyMs,
  };

  // ── Step 11: Post PR comment ──────────────────────────────────────────────
  let prCommentPosted = false;
  if (pullRequestNumber) {
    try {
      const commentBody = formatPrComment(reviewResult);
      await postPullRequestComment(
        repoOwner,
        repoName,
        pullRequestNumber,
        commentBody,
        accessToken
      );
      prCommentPosted = true;
      logger.info(
        { repoId, pullRequestNumber },
        "Sentinel: PR comment posted successfully"
      );
    } catch (err) {
      logger.warn({ repoId, pullRequestNumber, err }, "Sentinel: PR comment post failed — non-fatal");
    }
  }

  reviewResult.prCommentPosted = prCommentPosted;

  // ── Step 12: Persist to DynamoDB ─────────────────────────────────────────
  await persistReviewResult(repoId, commitSha, reviewResult);

  // ── Step 13: Cache result ─────────────────────────────────────────────────
  await setCachedReview(repoId, commitSha, reviewResult);

  logger.info(
    {
      repoId,
      commitSha,
      overallRisk,
      totalFindings: reviewResult.totalFindings,
      criticalFindings: reviewResult.criticalFindings,
      prCommentPosted,
      latencyMs,
      outputLanguage: language,
    },
    "Sentinel: analyzeLogic() complete"
  );

  return reviewResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAMBDA HANDLER EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AWS Lambda handler export.
 * Invoked directly by githubPush.ts webhook handler and postChatMessage.ts API.
 */
export const handler = async (
  event: AnalyzeLogicInput
): Promise<CodeReviewResult> => {
  return analyzeLogic(event);
};