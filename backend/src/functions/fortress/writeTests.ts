/**
 * writeTests.ts
 * Velocis — Fortress Autonomous QA Engine
 *
 * Responsibility:
 *   The first stage of the Fortress Self-Healing TDD loop. Invoked immediately
 *   after a GitHub push webhook is received. Uses Meta Llama 3 (via Amazon
 *   Bedrock) to analyze the pushed source file and generate a comprehensive
 *   Jest unit test suite for it — with zero manual intervention.
 *
 *   The generated test code is passed directly to executeTests.ts via Step
 *   Functions, which runs it in an isolated sandbox. If it fails, selfHeal.ts
 *   (Claude 3.5 Sonnet) corrects the source and the loop repeats.
 *
 * Why Llama 3 and not Claude here?
 *   Llama 3 is used for high-speed, high-volume test generation — it's faster
 *   and cheaper for this pattern-heavy boilerplate task. Claude 3.5 Sonnet is
 *   reserved for the deeper semantic reasoning in selfHeal.ts.
 *
 * Position in the Fortress Self-Healing Loop (Step Functions ASM):
 *   Code Pushed (GitHub Webhook)
 *     → [THIS FILE] Llama 3 Writes Tests    (writeTests.ts)
 *     → Execute Tests                       (executeTests.ts)
 *     → If FAIL → Claude Analyzes & Fixes   (selfHeal.ts)
 *     → Loop back to Execute Tests
 *     → Tests Pass → Done ✓
 *
 * Called by:
 *   AWS Step Functions → fortress-tdd-loop.asl.json
 *   (State: "GenerateTests")
 *   Also callable directly from:
 *   src/handlers/webhooks/githubPush.ts (to kick off the pipeline)
 *
 * Input event shape (from Step Functions / webhook handler):
 *   {
 *     repoId: string
 *     repoOwner: string
 *     repoName: string
 *     filePath: string          // The source file changed in the push
 *     commitSha: string         // The triggering commit
 *     accessToken: string
 *     maxAttempts: number       // How many self-heal retries Fortress will attempt
 *   }
 *
 * Output shape (passed to executeTests.ts via Step Functions):
 *   {
 *     ...input,
 *     testFilePath: string      // Where the test file lives (e.g. tests/foo.test.ts)
 *     testCode: string          // The complete Jest test suite
 *     sourceCode: string        // The raw source file content (passed forward)
 *     attemptNumber: number     // Always 1 on first write
 *     writeResult: WriteTestsResult
 *   }
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../services/database/dynamoClient";
import { fetchFileContent } from "../../services/github/repoOps";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { stripCodeFences as stripMarkdownCodeBlocks } from "../../utils/codeExtractor";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type WriteTestStatus =
  | "SUCCESS"       // Tests generated successfully
  | "SKIPPED"       // File type not testable (e.g. config, markdown)
  | "FAILED";       // Llama 3 invocation or parsing failed

export type TestCoverage =
  | "FULL"          // All exported functions have test cases
  | "PARTIAL"       // Some functions covered, some skipped
  | "MINIMAL";      // Only happy-path tests generated

export interface DetectedFunction {
  name: string;
  isAsync: boolean;
  isExported: boolean;
  parameterCount: number;
  returnsPromise: boolean;
  complexity: "LOW" | "MEDIUM" | "HIGH"; // Rough cyclomatic complexity
}

export interface WriteTestsResult {
  status: WriteTestStatus;
  testFilePath: string;
  testCode: string;
  coverage: TestCoverage;
  detectedFunctions: DetectedFunction[];
  /** How many it() / test() blocks were generated */
  testCaseCount: number;
  /** Functions the model intentionally skipped with reasons */
  skippedFunctions: { name: string; reason: string }[];
  /** Llama 3 model's self-assessment of test quality (0-100) */
  qualityScore: number;
  bedrockLatencyMs: number;
  generatedAt: string;
  /** Set when status is SKIPPED — explains why no tests were generated */
  skipReason?: string;
}

export interface WriteTestsInput {
  repoId: string;
  repoOwner: string;
  repoName: string;
  filePath: string;
  commitSha: string;
  accessToken: string;
  maxAttempts: number;
}

export interface WriteTestsOutput extends WriteTestsInput {
  testFilePath: string;
  testCode: string;
  sourceCode: string;
  attemptNumber: number;
  writeResult: WriteTestsResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Llama 3 70B Instruct — fast and cost-effective for test generation.
 * Model ID for Amazon Bedrock cross-region inference profile.
 */
const LLAMA3_MODEL_ID = "meta.llama3-70b-instruct-v1:0";

const MAX_TOKENS = 4096;
const MAX_SOURCE_CHARS = 10_000; // Truncate massive files before sending to Bedrock

/**
 * File extensions we can meaningfully generate tests for.
 * Config files, markdown, JSON etc. are skipped.
 */
const TESTABLE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * File path patterns that should never be tested
 * (test files themselves, config files, type-only files).
 */
const SKIP_PATTERNS = [
  ".test.",
  ".spec.",
  ".d.ts",
  "/mocks/",
  "/types/",
  "/interfaces/",
  "index.ts",           // Re-export barrels — nothing to test
  "config.ts",
  "logger.ts",
  ".config.",
  "tsconfig",
];

/**
 * Maps source file paths to their test file paths.
 * e.g. src/functions/sentinel/analyzeLogic.ts
 *   →  tests/functions/sentinel/analyzeLogic.test.ts
 */
function deriveTestFilePath(filePath: string): string {
  const ext = path.extname(filePath);
  const withoutExt = filePath.slice(0, filePath.length - ext.length);
  // Strip leading src/ if present, prepend tests/
  const normalized = withoutExt.replace(/^src\//, "");
  return `tests/${normalized}.test${ext}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE ELIGIBILITY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines whether a file is worth generating tests for.
 * Returns { eligible: true } or { eligible: false, reason: string }.
 */
function checkEligibility(
  filePath: string,
  sourceCode: string
): { eligible: boolean; reason?: string } {
  const ext = path.extname(filePath);

  if (!TESTABLE_EXTENSIONS.has(ext)) {
    return {
      eligible: false,
      reason: `File extension '${ext}' is not a testable JavaScript/TypeScript file.`,
    };
  }

  for (const pattern of SKIP_PATTERNS) {
    if (filePath.includes(pattern)) {
      return {
        eligible: false,
        reason: `File matches skip pattern '${pattern}' — configuration, type definition, or existing test file.`,
      };
    }
  }

  // Files with no exports have nothing to test
  const hasExports =
    /export\s+(const|function|class|async|default|type|interface)/.test(sourceCode) ||
    /module\.exports/.test(sourceCode);

  if (!hasExports) {
    return {
      eligible: false,
      reason: "File has no exported functions, classes, or constants — nothing to unit test.",
    };
  }

  // Skip very tiny files (likely just re-exports or type aliases)
  if (sourceCode.trim().length < 100) {
    return {
      eligible: false,
      reason: "File is too small (< 100 characters) to meaningfully test.",
    };
  }

  return { eligible: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CODE ANALYSIS — FUNCTION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Performs lightweight static analysis of the source file to detect
 * exported functions and their signatures. This data is:
 *   1. Passed to Llama 3 in the prompt for more accurate test generation
 *   2. Stored in DynamoDB for the Visual Cortex node metadata
 *   3. Used post-generation to validate coverage
 *
 * Uses regex — intentionally avoids a full AST parser to stay
 * Lambda-lightweight (no @babel/parser or ts-morph in the bundle).
 */
function detectExportedFunctions(sourceCode: string): DetectedFunction[] {
  const functions: DetectedFunction[] = [];

  // Pattern 1: export async function foo(a, b, c) {
  const asyncFunctionRegex =
    /export\s+(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;

  // Pattern 2: export const foo = async (a, b) =>
  const arrowFunctionRegex =
    /export\s+const\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*(?::\s*[\w<>,\[\]\s|]+)?\s*=>/g;

  // Pattern 3: Detect class method exports (less common in this codebase)
  const classMethodRegex =
    /(?:public\s+|private\s+|protected\s+)?(async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*[\w<>[\]\s|]+)?\s*\{/g;

  let match: RegExpExecArray | null;

  // ── Named function declarations ──────────────────────────────────────────
  while ((match = asyncFunctionRegex.exec(sourceCode)) !== null) {
    const isAsync = !!match[1]?.trim();
    const name = match[2];
    const params = match[3].split(",").filter((p) => p.trim().length > 0);

    // Avoid duplicates
    if (functions.some((f) => f.name === name)) continue;

    // Rough complexity: count if/for/while/switch/catch in surrounding 500 chars
    const surroundingCode = sourceCode.slice(
      Math.max(0, match.index),
      Math.min(sourceCode.length, match.index + 500)
    );
    const branchCount = (surroundingCode.match(/\b(if|for|while|switch|catch)\b/g) ?? []).length;
    const complexity: DetectedFunction["complexity"] =
      branchCount > 5 ? "HIGH" : branchCount > 2 ? "MEDIUM" : "LOW";

    functions.push({
      name,
      isAsync,
      isExported: true,
      parameterCount: params.length,
      returnsPromise: isAsync || surroundingCode.includes("Promise"),
      complexity,
    });
  }

  // ── Arrow function exports ───────────────────────────────────────────────
  while ((match = arrowFunctionRegex.exec(sourceCode)) !== null) {
    const name = match[1];
    const isAsync = !!match[2]?.trim();
    const params = match[3].split(",").filter((p) => p.trim().length > 0);

    if (functions.some((f) => f.name === name)) continue;

    const surroundingCode = sourceCode.slice(
      Math.max(0, match.index),
      Math.min(sourceCode.length, match.index + 500)
    );
    const branchCount = (surroundingCode.match(/\b(if|for|while|switch|catch)\b/g) ?? []).length;
    const complexity: DetectedFunction["complexity"] =
      branchCount > 5 ? "HIGH" : branchCount > 2 ? "MEDIUM" : "LOW";

    functions.push({
      name,
      isAsync,
      isExported: true,
      parameterCount: params.length,
      returnsPromise: isAsync || surroundingCode.includes("Promise"),
      complexity,
    });
  }

  return functions;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the Llama 3 system prompt that establishes the test-writer persona
 * and defines the strict output format.
 */
function buildSystemPrompt(filePath: string): string {
  return `You are Fortress, an elite autonomous test engineer embedded in the Velocis AI platform. Your sole job is to write comprehensive, production-grade Jest unit tests for TypeScript/JavaScript source files.

## Your Testing Philosophy
1. TEST BEHAVIOR, not implementation — test what a function does, not how it does it.
2. Every exported function must have at minimum: one happy-path test, one edge-case test, and one error/exception test.
3. Mock ALL external dependencies (AWS SDK, database clients, network calls, file system) using Jest mocks. Never let tests make real network or I/O calls.
4. Use descriptive test names that explain the scenario: "should return null when input is empty" not "test 1".
5. Arrange-Act-Assert (AAA) pattern in every test case.
6. For async functions, always use async/await — never callbacks or raw promises.
7. Test TypeScript types implicitly by passing correctly and incorrectly typed values.

## Output Format
Respond ONLY with a raw TypeScript code block — no explanation, no preamble, no markdown fences. Just the complete, runnable Jest test file starting with the imports.

The test file should import from the source file using a relative path based on: ${filePath}

Include at the very end of the file a commented JSON block with this metadata:
// @velocis-meta: {"qualityScore": 0-100, "coverage": "FULL|PARTIAL|MINIMAL", "skipped": [{"name": "funcName", "reason": "why"}]}`;
}

/**
 * Builds the Llama 3 user prompt with full source context and analysis hints.
 */
function buildUserPrompt(
  filePath: string,
  testFilePath: string,
  sourceCode: string,
  detectedFunctions: DetectedFunction[]
): string {
  const truncatedSource = sourceCode.slice(0, MAX_SOURCE_CHARS);
  const isTruncated = sourceCode.length > MAX_SOURCE_CHARS;

  const functionSummary = detectedFunctions
    .map(
      (fn) =>
        `  - ${fn.name}(${fn.parameterCount} params) | async: ${fn.isAsync} | returns Promise: ${fn.returnsPromise} | complexity: ${fn.complexity}`
    )
    .join("\n");

  return `## Source File to Test
Path: \`${filePath}\`
Test file should be saved at: \`${testFilePath}\`

## Pre-analyzed Exported Functions
${functionSummary || "  (none detected by static analysis — scan the source manually)"}

## Source Code
${truncatedSource}${isTruncated ? "\n// ... [source truncated at 10,000 chars]" : ""}

## Instructions
1. Write a complete Jest test file for the above source.
2. Import the file using: \`import { ... } from '${path.relative(path.dirname(testFilePath), filePath).replace(/\\/g, "/").replace(/\.(ts|tsx|js|jsx)$/, "")}'\`
3. Mock every external module (AWS SDK, DynamoDB, GitHub API, Bedrock, logger, config).
4. Cover: happy paths, edge cases (null, undefined, empty string, 0), and error scenarios (thrown exceptions, rejected promises).
5. For functions that write to DynamoDB or call Bedrock, mock those clients and assert they were called with the right arguments.
6. Do NOT use real API keys, real AWS resources, or any I/O.
7. Aim for 100% branch coverage on the business logic.

Write the complete test file now:`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK CLIENT & INVOCATION
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: config.AWS_REGION });

/**
 * Invokes Meta Llama 3 70B Instruct via Amazon Bedrock.
 * Llama 3 uses a different request body format from Claude — uses the
 * native Llama chat template with <|begin_of_text|> tokens.
 */
async function invokeLlamaForTests(
  systemPrompt: string,
  userPrompt: string
): Promise<{ responseText: string; latencyMs: number }> {
  /**
   * Llama 3 Instruct prompt format:
   * <|begin_of_text|>
   * <|start_header_id|>system<|end_header_id|>{system}<|eot_id|>
   * <|start_header_id|>user<|end_header_id|>{user}<|eot_id|>
   * <|start_header_id|>assistant<|end_header_id|>
   */
  const formattedPrompt =
    `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${systemPrompt}<|eot_id|>` +
    `<|start_header_id|>user<|end_header_id|>\n${userPrompt}<|eot_id|>` +
    `<|start_header_id|>assistant<|end_header_id|>\n`;

  const requestBody = {
    prompt: formattedPrompt,
    max_gen_len: MAX_TOKENS,
    temperature: 0.2,   // Slightly creative for varied test scenarios, but still predictable
    top_p: 0.9,
  };

  const t0 = Date.now();

  try {
    const command = new InvokeModelCommand({
      modelId: LLAMA3_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await bedrockClient.send(command);
    const latencyMs = Date.now() - t0;
    const parsed = JSON.parse(new TextDecoder().decode(response.body));

    // Llama 3 returns { generation: "...", prompt_token_count: N, generation_token_count: N }
    const responseText: string = parsed.generation ?? "";

    logger.info(
      {
        latencyMs,
        promptTokens: parsed.prompt_token_count,
        generationTokens: parsed.generation_token_count,
        modelId: LLAMA3_MODEL_ID,
      },
      "Fortress: Llama 3 invocation complete"
    );

    return { responseText, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    logger.error({ err, latencyMs }, "Fortress: Llama 3 Bedrock invocation failed");
    throw new Error(`Llama 3 invocation failed: ${err.message ?? String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT PARSING
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedTestOutput {
  testCode: string;
  qualityScore: number;
  coverage: TestCoverage;
  skippedFunctions: { name: string; reason: string }[];
  testCaseCount: number;
}

/**
 * Parses Llama 3's raw text output into structured test data.
 *
 * The model is prompted to embed a @velocis-meta JSON comment at the end
 * of the file. This function extracts that metadata and the clean test code.
 */
function parseLlamaOutput(
  rawResponse: string,
  detectedFunctions: DetectedFunction[]
): ParsedTestOutput {
  // Strip any markdown code fences the model may have added despite instructions
  let testCode = stripMarkdownCodeBlocks(rawResponse.trim());

  // Extract the @velocis-meta comment at the end
  let qualityScore = 70;
  let coverage: TestCoverage = "PARTIAL";
  let skippedFunctions: { name: string; reason: string }[] = [];

  const metaMatch = testCode.match(
    /\/\/\s*@velocis-meta:\s*(\{[\s\S]+?\})\s*$/m
  );

  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1]);
      qualityScore = typeof meta.qualityScore === "number"
        ? Math.max(0, Math.min(100, meta.qualityScore))
        : 70;
      coverage = ["FULL", "PARTIAL", "MINIMAL"].includes(meta.coverage)
        ? (meta.coverage as TestCoverage)
        : "PARTIAL";
      skippedFunctions = Array.isArray(meta.skipped) ? meta.skipped : [];
    } catch {
      logger.warn("Fortress: Could not parse @velocis-meta JSON — using defaults");
    }
  }

  // Count it() / test() blocks for reporting
  const testCaseCount = (testCode.match(/\b(?:it|test)\s*\(/g) ?? []).length;

  // Infer coverage if model didn't report it
  if (!metaMatch) {
    const testedFunctionNames = detectedFunctions.filter((fn) =>
      testCode.includes(fn.name)
    ).length;
    const totalFunctions = detectedFunctions.length;

    if (totalFunctions === 0 || testedFunctionNames === totalFunctions) {
      coverage = "FULL";
    } else if (testedFunctionNames >= totalFunctions * 0.6) {
      coverage = "PARTIAL";
    } else {
      coverage = "MINIMAL";
    }
  }

  // Validate the output is actually TypeScript/Jest code
  const looksLikeTests =
    testCode.includes("describe(") ||
    testCode.includes("it(") ||
    testCode.includes("test(") ||
    testCode.includes("expect(");

  if (!looksLikeTests || testCode.length < 100) {
    throw new Error(
      "Llama 3 output does not appear to contain valid Jest test code. " +
      `Output length: ${testCode.length} chars. Preview: ${testCode.slice(0, 200)}`
    );
  }

  return { testCode, qualityScore, coverage, skippedFunctions, testCaseCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMODB PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the test generation result to DynamoDB AI_Activity table.
 * This record:
 * - Seeds the initial "UNTESTED" → first-run state for Cortex node health
 * - Lets the Fortress Pipeline UI show "Tests Generated" in the flowchart
 * - Gives Sentinel context on which files have auto-generated test suites
 */
async function persistWriteResult(
  repoId: string,
  filePath: string,
  commitSha: string,
  result: WriteTestsResult
): Promise<void> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  try {
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Item: {
          PK: `REPO#${repoId}`,
          SK: `WRITETESTS#${filePath}`,
          writeStatus: result.status,
          testFilePath: result.testFilePath,
          coverage: result.coverage,
          testCaseCount: result.testCaseCount,
          qualityScore: result.qualityScore,
          skippedFunctions: result.skippedFunctions,
          detectedFunctions: result.detectedFunctions.map((f) => f.name),
          bedrockLatencyMs: result.bedrockLatencyMs,
          commitSha,
          generatedAt: result.generatedAt,
          skipReason: result.skipReason ?? null,
          TTL: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7-day TTL
        },
      })
    );

    logger.info(
      { repoId, filePath, status: result.status, testCaseCount: result.testCaseCount },
      "Fortress: Write result persisted to DynamoDB"
    );
  } catch (err) {
    logger.warn(
      { repoId, filePath, err },
      "Fortress: DynamoDB write result persist failed — non-fatal"
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * writeTests()
 *
 * Main exported function. Invoked by AWS Step Functions as the first state
 * in the Fortress self-healing TDD loop.
 *
 * Full pipeline:
 *   1.  Fetch source file content from GitHub via repoOps
 *   2.  Check file eligibility (extension, skip patterns, has exports)
 *   3.  Detect exported functions via static regex analysis
 *   4.  Derive test file path from source file path
 *   5.  Build Llama 3 system + user prompts
 *   6.  Invoke Llama 3 70B via Amazon Bedrock
 *   7.  Parse and validate the generated test code
 *   8.  Persist result to DynamoDB
 *   9.  Return WriteTestsOutput to Step Functions
 *       → executeTests.ts receives testCode + sourceCode and runs the suite
 */
export async function writeTests(event: WriteTestsInput): Promise<WriteTestsOutput> {
  const {
    repoId,
    repoOwner,
    repoName,
    filePath,
    commitSha,
    accessToken,
    maxAttempts,
  } = event;

  const generatedAt = new Date().toISOString();

  logger.info(
    { repoId, repoOwner, repoName, filePath, commitSha },
    "Fortress: writeTests() invoked"
  );

  // ── Step 1: Fetch source file from GitHub ────────────────────────────────
  let sourceCode: string;
  try {
    sourceCode = await fetchFileContent(
      repoOwner,
      repoName,
      filePath,
      accessToken,
      commitSha // Fetch at the exact commit SHA — not HEAD — for consistency
    );
  } catch (err: any) {
    logger.error({ repoId, filePath, commitSha, err }, "Fortress: Failed to fetch source file");

    const failedResult: WriteTestsResult = {
      status: "FAILED",
      testFilePath: deriveTestFilePath(filePath),
      testCode: "",
      coverage: "MINIMAL",
      detectedFunctions: [],
      testCaseCount: 0,
      skippedFunctions: [],
      qualityScore: 0,
      bedrockLatencyMs: 0,
      generatedAt,
      skipReason: `Could not fetch source file from GitHub: ${err.message}`,
    };

    await persistWriteResult(repoId, filePath, commitSha, failedResult);

    // On a hard fetch failure, we can't proceed — escalate immediately
    return {
      ...event,
      testFilePath: failedResult.testFilePath,
      testCode: "",
      sourceCode: "",
      attemptNumber: 1,
      writeResult: failedResult,
    };
  }

  // ── Step 2: Check eligibility ────────────────────────────────────────────
  const { eligible, reason: skipReason } = checkEligibility(filePath, sourceCode);

  if (!eligible) {
    logger.info({ repoId, filePath, skipReason }, "Fortress: File skipped — not eligible");

    const skippedResult: WriteTestsResult = {
      status: "SKIPPED",
      testFilePath: deriveTestFilePath(filePath),
      testCode: "",
      coverage: "MINIMAL",
      detectedFunctions: [],
      testCaseCount: 0,
      skippedFunctions: [],
      qualityScore: 0,
      bedrockLatencyMs: 0,
      generatedAt,
      skipReason,
    };

    await persistWriteResult(repoId, filePath, commitSha, skippedResult);

    // Step Functions should short-circuit on SKIPPED — no tests to run
    return {
      ...event,
      testFilePath: skippedResult.testFilePath,
      testCode: "",
      sourceCode,
      attemptNumber: 1,
      writeResult: skippedResult,
    };
  }

  // ── Step 3: Detect exported functions ───────────────────────────────────
  const detectedFunctions = detectExportedFunctions(sourceCode);

  logger.info(
    { repoId, filePath, detectedFunctions: detectedFunctions.map((f) => f.name) },
    "Fortress: Detected exported functions"
  );

  // ── Step 4: Derive test file path ────────────────────────────────────────
  const testFilePath = deriveTestFilePath(filePath);

  // ── Step 5: Build Llama 3 prompts ────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(filePath);
  const userPrompt = buildUserPrompt(filePath, testFilePath, sourceCode, detectedFunctions);

  // ── Step 6: Invoke Llama 3 via Bedrock ──────────────────────────────────
  let responseText: string;
  let latencyMs: number;

  try {
    ({ responseText, latencyMs } = await invokeLlamaForTests(systemPrompt, userPrompt));
  } catch (err: any) {
    logger.error({ repoId, filePath, err }, "Fortress: Llama 3 invocation failed");

    const failedResult: WriteTestsResult = {
      status: "FAILED",
      testFilePath,
      testCode: "",
      coverage: "MINIMAL",
      detectedFunctions,
      testCaseCount: 0,
      skippedFunctions: [],
      qualityScore: 0,
      bedrockLatencyMs: 0,
      generatedAt,
      skipReason: `Llama 3 Bedrock invocation failed: ${err.message}`,
    };

    await persistWriteResult(repoId, filePath, commitSha, failedResult);

    return {
      ...event,
      testFilePath,
      testCode: "",
      sourceCode,
      attemptNumber: 1,
      writeResult: failedResult,
    };
  }

  // ── Step 7: Parse and validate output ────────────────────────────────────
  let parsed: ParsedTestOutput;

  try {
    parsed = parseLlamaOutput(responseText, detectedFunctions);
  } catch (err: any) {
    logger.error(
      { repoId, filePath, err, responsePreview: responseText.slice(0, 300) },
      "Fortress: Llama 3 output parsing failed"
    );

    const failedResult: WriteTestsResult = {
      status: "FAILED",
      testFilePath,
      testCode: "",
      coverage: "MINIMAL",
      detectedFunctions,
      testCaseCount: 0,
      skippedFunctions: [],
      qualityScore: 0,
      bedrockLatencyMs: latencyMs,
      generatedAt,
      skipReason: `Llama 3 output validation failed: ${err.message}`,
    };

    await persistWriteResult(repoId, filePath, commitSha, failedResult);

    return {
      ...event,
      testFilePath,
      testCode: "",
      sourceCode,
      attemptNumber: 1,
      writeResult: failedResult,
    };
  }

  logger.info(
    {
      repoId,
      filePath,
      testFilePath,
      testCaseCount: parsed.testCaseCount,
      coverage: parsed.coverage,
      qualityScore: parsed.qualityScore,
      latencyMs,
    },
    "Fortress: Tests generated successfully"
  );

  // ── Step 8: Assemble result ──────────────────────────────────────────────
  const writeResult: WriteTestsResult = {
    status: "SUCCESS",
    testFilePath,
    testCode: parsed.testCode,
    coverage: parsed.coverage,
    detectedFunctions,
    testCaseCount: parsed.testCaseCount,
    skippedFunctions: parsed.skippedFunctions,
    qualityScore: parsed.qualityScore,
    bedrockLatencyMs: latencyMs,
    generatedAt,
  };

  // ── Step 9: Persist to DynamoDB ──────────────────────────────────────────
  await persistWriteResult(repoId, filePath, commitSha, writeResult);

  // ── Return to Step Functions ─────────────────────────────────────────────
  return {
    ...event,
    testFilePath,
    testCode: parsed.testCode,
    sourceCode,
    attemptNumber: 1,
    writeResult,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAMBDA / STEP FUNCTIONS ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AWS Lambda handler export.
 * Step Functions invokes this via the Lambda resource integration.
 *
 * The ASM Choice state after this checks writeResult.status:
 *   - "SUCCESS"  → route to "ExecuteTests" state
 *   - "SKIPPED"  → route to "PipelineComplete" (no tests to run)
 *   - "FAILED"   → route to "PipelineFailed" (notify developer)
 */
export const handler = async (event: WriteTestsInput): Promise<WriteTestsOutput> => {
  return writeTests(event);
};