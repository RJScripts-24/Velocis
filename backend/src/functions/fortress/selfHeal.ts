/**
 * selfHeal.ts
 * Velocis — Fortress Autonomous QA Engine
 *
 * Responsibility:
 *   When executeTests.ts reports a FAIL, ERROR, or TIMEOUT, this function
 *   is invoked by AWS Step Functions. It uses Claude 3.5 Sonnet (via Amazon
 *   Bedrock) to perform deep semantic analysis of the test failure, generate
 *   a corrected version of the source code, and — if the fix is confident —
 *   automatically push a corrective commit back to GitHub via repoOps.ts.
 *
 *   After producing the fix, it hands control back to Step Functions, which
 *   loops back to executeTests.ts for re-validation. This loop continues
 *   until tests pass or maxAttempts is exhausted.
 *
 * Position in the Fortress Self-Healing Loop (Step Functions ASM):
 *   Code Pushed
 *     → Llama 3 Writes Tests       (writeTests.ts)
 *     → Execute Tests              (executeTests.ts)
 *     → [FAIL] → [THIS FILE]       selfHeal.ts
 *     →           Fixed Code → Execute Tests (loop)
 *     →           Tests Pass → Done ✓
 *     →           maxAttempts hit → Escalate to Sentinel
 *
 * Called by:
 *   AWS Step Functions → fortress-tdd-loop.asl.json
 *   (State: "AnalyzeAndHeal")
 *
 * Input event shape (from Step Functions, output of executeTests.ts):
 *   {
 *     repoId: string
 *     repoOwner: string
 *     repoName: string
 *     filePath: string
 *     testFilePath: string
 *     testCode: string
 *     sourceCode: string
 *     accessToken: string
 *     attemptNumber: number
 *     maxAttempts: number
 *     executionResult: TestExecutionResult   // from executeTests.ts
 *   }
 *
 * Output shape (passed to next Step Functions state):
 *   {
 *     ...input,
 *     healResult: SelfHealResult
 *     sourceCode: string        // UPDATED — the fixed source for next execution
 *     attemptNumber: number     // INCREMENTED
 *     shouldEscalate: boolean   // true if maxAttempts exhausted
 *   }
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../services/database/dynamoClient";
import { pushFixCommit, fetchFileContent } from "../../services/github/repoOps";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { stripCodeFences as stripMarkdownCodeBlocks } from "../../utils/codeExtractor";
import type { TestExecutionResult } from "./executeTests";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type HealStrategy =
  | "LOGIC_FIX"        // Claude identified a logic bug in the source
  | "MOCK_ADJUSTMENT"  // Test expected wrong mock/stub behavior
  | "TYPE_FIX"         // TypeScript type mismatch caused test failure
  | "IMPORT_FIX"       // Missing or incorrect module import
  | "ASYNC_FIX"        // Missing await / improper promise handling
  | "TEST_FIX"         // Test itself was incorrect — fix the test, not the source
  | "UNKNOWN";         // Claude couldn't determine root cause

export type HealStatus =
  | "FIXED"            // Claude produced a high-confidence fix, code updated
  | "PARTIAL"          // Fix applied but confidence is low — needs re-review
  | "ESCALATED"        // maxAttempts exhausted — handed off to Sentinel
  | "FAILED";          // Claude could not determine a fix

export interface SelfHealResult {
  status: HealStatus;
  strategy: HealStrategy;
  attemptNumber: number;
  /** The fixed source code Claude generated (undefined if FAILED/ESCALATED) */
  fixedSourceCode?: string;
  /** The fixed test code (only set when strategy is TEST_FIX) */
  fixedTestCode?: string;
  /** Human-readable explanation of what was wrong and what was changed */
  explanation: string;
  /** Confidence score 0–100 from Claude's self-assessment */
  confidenceScore: number;
  /** Whether the fix was committed back to GitHub */
  commitPushed: boolean;
  commitSha?: string;
  /** Sentinel escalation message (only when ESCALATED) */
  escalationMessage?: string;
  healedAt: string;
  bedrockLatencyMs: number;
}

export interface SelfHealInput {
  repoId: string;
  repoOwner: string;
  repoName: string;
  filePath: string;
  testFilePath: string;
  testCode: string;
  sourceCode: string;
  accessToken: string;
  attemptNumber: number;
  maxAttempts: number;
  executionResult: TestExecutionResult;
}

export interface SelfHealOutput extends SelfHealInput {
  healResult: SelfHealResult;
  /** Updated source code for next executeTests.ts invocation */
  sourceCode: string;
  /** Updated test code (only changes if strategy === TEST_FIX) */
  testCode: string;
  /** Incremented for next loop iteration */
  attemptNumber: number;
  /** True when maxAttempts hit — Step Functions routes to escalation state */
  shouldEscalate: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BEDROCK_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";
const MAX_TOKENS = 4096;
const MAX_SOURCE_CHARS = 8000;   // Truncate very large files before sending to Bedrock
const MAX_OUTPUT_CHARS = 5000;   // Truncate raw test output before sending to Bedrock

/**
 * Confidence threshold below which we mark the result PARTIAL
 * instead of FIXED, triggering an extra Sentinel review.
 */
const CONFIDENCE_THRESHOLD = 70;

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: config.AWS_REGION });

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the system prompt that gives Claude its Fortress "Self-Healing Engineer"
 * persona and defines the strict XML output format it must follow.
 */
function buildSystemPrompt(): string {
  return `You are Fortress, an elite autonomous QA engineer embedded in the Velocis AI platform.

Your role is to perform deep semantic analysis of failing unit tests and produce a precise, production-grade fix for the source code that causes them to pass.

## Your Core Principles
1. Fix the ROOT CAUSE — never patch over symptoms or write tests that trivially pass without real validation.
2. Preserve ALL existing working functionality. A fix that breaks other tests is worse than no fix.
3. Maintain the original code style, naming conventions, and architectural patterns.
4. If the test itself is wrong (incorrect assertion, bad mock, unreasonable expectation), fix the TEST rather than corrupting the source.
5. Be honest about your confidence. A partial, uncertain fix with a clear explanation is more valuable than a confidently wrong one.

## Output Format
You MUST respond ONLY with a valid XML block in this exact structure. No preamble, no explanation outside the XML.

<fortress_analysis>
  <root_cause>
    A precise technical explanation of WHY the test is failing. Reference specific line numbers, function names, and variable names. Be surgical.
  </root_cause>
  
  <strategy>LOGIC_FIX | MOCK_ADJUSTMENT | TYPE_FIX | IMPORT_FIX | ASYNC_FIX | TEST_FIX | UNKNOWN</strategy>
  
  <confidence_score>0-100</confidence_score>
  
  <explanation>
    A clear, mentor-quality explanation of:
    1. What was wrong
    2. Why it was wrong  
    3. What you changed and why that fix is correct
    This will be surfaced to the developer in the Velocis dashboard.
  </explanation>
  
  <fixed_source_code>
    The COMPLETE, corrected source file. Not a diff. Not a snippet. The entire file, ready to save.
    Only populate this if strategy is NOT TEST_FIX.
    If strategy is TEST_FIX, leave this tag empty.
  </fixed_source_code>
  
  <fixed_test_code>
    The COMPLETE, corrected test file. Only populate this if strategy IS TEST_FIX.
    If strategy is NOT TEST_FIX, leave this tag empty.
  </fixed_test_code>
  
  <breaking_change_risk>LOW | MEDIUM | HIGH</breaking_change_risk>
  
  <affected_functions>
    Comma-separated list of function/method names that were modified.
  </affected_functions>
</fortress_analysis>`;
}

/**
 * Builds the user-turn prompt with all the context Claude needs:
 * the source file, the test file, the failure output, and history of attempts.
 */
function buildUserPrompt(
  filePath: string,
  testFilePath: string,
  sourceCode: string,
  testCode: string,
  executionResult: TestExecutionResult,
  attemptNumber: number,
  previousExplanations: string[]
): string {
  const truncatedSource = sourceCode.slice(0, MAX_SOURCE_CHARS);
  const truncatedOutput = executionResult.rawOutput.slice(0, MAX_OUTPUT_CHARS);
  const truncatedError = executionResult.rawError.slice(0, MAX_OUTPUT_CHARS);

  const historySection =
    previousExplanations.length > 0
      ? `## Previous Healing Attempts (All Failed)
These fixes have already been tried and did NOT work. Do NOT repeat them.
${previousExplanations
  .map((exp, i) => `### Attempt ${i + 1}:\n${exp}`)
  .join("\n\n")}`
      : "";

  return `## Task
Analyze this failing test and produce a fix. This is attempt #${attemptNumber}.

## Source File Under Test
Path: \`${filePath}\`
\`\`\`typescript
${truncatedSource}${sourceCode.length > MAX_SOURCE_CHARS ? "\n... [truncated]" : ""}
\`\`\`

## Generated Test File
Path: \`${testFilePath}\`
\`\`\`typescript
${testCode}
\`\`\`

## Test Execution Result
Status: ${executionResult.status}
Total: ${executionResult.totalTests} | Passed: ${executionResult.passedTests} | Failed: ${executionResult.failedTests}
Duration: ${executionResult.duration}ms

## Structured Failure Summary
${executionResult.failureSummary ?? "No structured failure data available."}

## Raw Jest Output
\`\`\`
${truncatedOutput}
\`\`\`

## Raw Stderr / Compiler Errors
\`\`\`
${truncatedError || "None"}
\`\`\`

${historySection}

Now analyze and respond ONLY with the <fortress_analysis> XML block.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// XML RESPONSE PARSER
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedAnalysis {
  rootCause: string;
  strategy: HealStrategy;
  confidenceScore: number;
  explanation: string;
  fixedSourceCode: string;
  fixedTestCode: string;
  breakingChangeRisk: "LOW" | "MEDIUM" | "HIGH";
  affectedFunctions: string[];
}

/**
 * Extracts text content from a single XML tag in Claude's response.
 * Uses a non-greedy regex match — safe for nested content.
 */
function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return match[0]
    .replace(new RegExp(`^<${tag}>`, "i"), "")
    .replace(new RegExp(`<\\/${tag}>$`, "i"), "")
    .trim();
}

/**
 * Parses Claude's XML response into a structured object.
 * Falls back gracefully on malformed output.
 */
function parseClaudeResponse(rawResponse: string): ParsedAnalysis {
  // Extract the XML block (Claude may occasionally add a tiny preamble)
  const xmlStart = rawResponse.indexOf("<fortress_analysis>");
  const xmlEnd = rawResponse.indexOf("</fortress_analysis>") + "</fortress_analysis>".length;
  const xml = xmlStart >= 0 && xmlEnd > xmlStart
    ? rawResponse.slice(xmlStart, xmlEnd)
    : rawResponse;

  const strategyRaw = extractXmlTag(xml, "strategy").toUpperCase() as HealStrategy;
  const validStrategies: HealStrategy[] = [
    "LOGIC_FIX", "MOCK_ADJUSTMENT", "TYPE_FIX",
    "IMPORT_FIX", "ASYNC_FIX", "TEST_FIX", "UNKNOWN",
  ];
  const strategy = validStrategies.includes(strategyRaw) ? strategyRaw : "UNKNOWN";

  const confidenceRaw = parseInt(extractXmlTag(xml, "confidence_score"), 10);
  const confidenceScore = isNaN(confidenceRaw)
    ? 50
    : Math.max(0, Math.min(100, confidenceRaw));

  const breakingRaw = extractXmlTag(xml, "breaking_change_risk").toUpperCase();
  const breakingChangeRisk =
    breakingRaw === "LOW" || breakingRaw === "MEDIUM" || breakingRaw === "HIGH"
      ? (breakingRaw as "LOW" | "MEDIUM" | "HIGH")
      : "MEDIUM";

  const affectedFunctionsRaw = extractXmlTag(xml, "affected_functions");
  const affectedFunctions = affectedFunctionsRaw
    ? affectedFunctionsRaw.split(",").map((f) => f.trim()).filter(Boolean)
    : [];

  // Strip markdown code fences from code blocks (LLMs sometimes add them)
  const fixedSourceCode = stripMarkdownCodeBlocks(
    extractXmlTag(xml, "fixed_source_code")
  );
  const fixedTestCode = stripMarkdownCodeBlocks(
    extractXmlTag(xml, "fixed_test_code")
  );

  return {
    rootCause: extractXmlTag(xml, "root_cause"),
    strategy,
    confidenceScore,
    explanation: extractXmlTag(xml, "explanation"),
    fixedSourceCode,
    fixedTestCode,
    breakingChangeRisk,
    affectedFunctions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK INVOCATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls Claude 3.5 Sonnet via Amazon Bedrock with the self-healing prompt.
 * Returns the raw text response and latency.
 */
async function invokeClaudeForHeal(
  systemPrompt: string,
  userPrompt: string
): Promise<{ responseText: string; latencyMs: number }> {
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.1, // Low temperature — we want deterministic, precise fixes
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
        outputTokens: parsed.usage?.output_tokens,
        inputTokens: parsed.usage?.input_tokens,
      },
      "Fortress: Bedrock Claude invocation complete"
    );

    return { responseText, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    logger.error({ err, latencyMs }, "Fortress: Bedrock invocation failed");
    throw new Error(`Bedrock invocation failed: ${err.message ?? String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When maxAttempts is exhausted, builds a rich escalation message for Sentinel
 * summarizing all failed healing attempts so a human developer gets full context.
 */
function buildEscalationMessage(
  filePath: string,
  executionResult: TestExecutionResult,
  attemptNumber: number,
  previousExplanations: string[]
): string {
  return `🚨 Fortress Escalation — Self-Healing Failed After ${attemptNumber} Attempts

File: \`${filePath}\`
Final Test Status: ${executionResult.status}
Failed Tests: ${executionResult.failedTests}/${executionResult.totalTests}

## Failure Summary
${executionResult.failureSummary ?? "No structured failure data."}

## Healing Attempts Log
${previousExplanations.map((exp, i) => `### Attempt ${i + 1}\n${exp}`).join("\n\n")}

## Recommended Actions for Human Review
1. Check if the failing test has unreasonable assumptions about external dependencies.
2. Verify that the business logic in \`${filePath}\` matches the intended specification.
3. Consider whether this file requires manual mocking of AWS SDK calls.
4. Review if a recent upstream change broke this module's contract.

Sentinel has been notified to perform a deep architectural review of this file.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMODB PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the self-heal attempt result to DynamoDB AI_Activity table.
 * This record is used by the Visual Cortex dashboard to show healing history
 * and by Sentinel to understand which files have chronic test failures.
 */
async function persistHealResult(
  repoId: string,
  filePath: string,
  attemptNumber: number,
  healResult: SelfHealResult,
  analysis: ParsedAnalysis
): Promise<void> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  try {
    // ── Write per-attempt heal record ─────────────────────────────────────
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Item: {
          PK: `REPO#${repoId}`,
          SK: `SELFHEAL#${filePath}#ATTEMPT#${attemptNumber}`,
          healStatus: healResult.status,
          strategy: healResult.strategy,
          confidenceScore: healResult.confidenceScore,
          explanation: healResult.explanation,
          affectedFunctions: analysis.affectedFunctions,
          breakingChangeRisk: analysis.breakingChangeRisk,
          commitPushed: healResult.commitPushed,
          commitSha: healResult.commitSha ?? null,
          bedrockLatencyMs: healResult.bedrockLatencyMs,
          healedAt: healResult.healedAt,
          TTL: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30-day TTL
        },
      })
    );

    // ── Update the aggregate heal stats for this file ─────────────────────
    await docClient.send(
      new UpdateCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Key: {
          PK: `REPO#${repoId}`,
          SK: `FORTRESS#${filePath}`,
        },
        UpdateExpression:
          "SET #healAttempts = if_not_exists(#healAttempts, :zero) + :one, " +
          "#lastHealStatus = :status, #lastHealAt = :healedAt, " +
          "#lastStrategy = :strategy",
        ExpressionAttributeNames: {
          "#healAttempts": "healAttempts",
          "#lastHealStatus": "lastHealStatus",
          "#lastHealAt": "lastHealAt",
          "#lastStrategy": "lastStrategy",
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":status": healResult.status,
          ":healedAt": healResult.healedAt,
          ":strategy": healResult.strategy,
        },
      })
    );

    logger.info(
      { repoId, filePath, attemptNumber, status: healResult.status },
      "Fortress: Heal result persisted to DynamoDB"
    );
  } catch (err) {
    logger.warn({ repoId, filePath, err }, "Fortress: DynamoDB heal persist failed — non-fatal");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIOUS ATTEMPT HISTORY LOADER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads explanations from all previous healing attempts for this file
 * so Claude knows what's already been tried and can avoid repeating failed fixes.
 */
async function loadPreviousExplanations(
  repoId: string,
  filePath: string,
  currentAttempt: number
): Promise<string[]> {
  if (currentAttempt <= 1) return [];

  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  const explanations: string[] = [];

  for (let attempt = 1; attempt < currentAttempt; attempt++) {
    try {
      const { Item } = await docClient.send(
        new PutCommand({
          TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
          Item: {
            PK: `REPO#${repoId}`,
            SK: `SELFHEAL#${filePath}#ATTEMPT#${attempt}`,
          },
        }) as any
      ) as any;

      if (Item?.explanation) {
        explanations.push(`Strategy: ${Item.strategy}\n${Item.explanation}`);
      }
    } catch {
      // Attempt record not found — skip
    }
  }

  return explanations;
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB COMMIT PUSH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pushes the fixed code back to GitHub as an automated commit.
 * Uses repoOps.pushFixCommit which handles branch detection and Git API calls.
 *
 * Commit message follows Conventional Commits format for traceability.
 */
async function commitFix(
  repoOwner: string,
  repoName: string,
  filePath: string,
  fixedCode: string,
  strategy: HealStrategy,
  attemptNumber: number,
  accessToken: string
): Promise<{ sha: string } | null> {
  const commitMessage = `fix(fortress): auto-heal ${filePath} [attempt ${attemptNumber}]

Strategy: ${strategy}
Healed by: Velocis Fortress Autonomous QA Engine
Trigger: Self-healing loop — test failure detected and corrected

Co-authored-by: Fortress[bot] <fortress@velocis.ai>`;

  try {
    const result = await pushFixCommit(
      repoOwner,
      repoName,
      filePath,
      fixedCode,
      commitMessage,
      accessToken
    );
    logger.info(
      { repoOwner, repoName, filePath, sha: result.sha },
      "Fortress: Fix committed to GitHub"
    );
    return result;
  } catch (err) {
    logger.error({ repoOwner, repoName, filePath, err }, "Fortress: GitHub commit failed");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * selfHeal()
 *
 * Main exported function invoked by AWS Step Functions.
 *
 * Full pipeline:
 *   1. Check if maxAttempts exhausted → escalate to Sentinel immediately
 *   2. Load history of previous healing attempts from DynamoDB
 *   3. Build system + user prompts for Claude
 *   4. Invoke Claude 3.5 Sonnet via Bedrock
 *   5. Parse XML response into structured analysis
 *   6. Validate fix quality (non-empty, different from original)
 *   7. Determine heal status (FIXED / PARTIAL / FAILED)
 *   8. If FIXED or PARTIAL → push commit to GitHub
 *   9. Persist heal result to DynamoDB
 *  10. Return updated SelfHealOutput to Step Functions
 *       - sourceCode updated → executeTests.ts re-runs against fixed code
 *       - attemptNumber incremented
 *       - shouldEscalate flag set if maxAttempts hit after this attempt
 */
export async function selfHeal(event: SelfHealInput): Promise<SelfHealOutput> {
  const {
    repoId,
    repoOwner,
    repoName,
    filePath,
    testFilePath,
    testCode,
    sourceCode,
    accessToken,
    attemptNumber,
    maxAttempts,
    executionResult,
  } = event;

  logger.info(
    { repoId, filePath, attemptNumber, maxAttempts, testStatus: executionResult.status },
    "Fortress: selfHeal() invoked"
  );

  const healedAt = new Date().toISOString();

  // ── Step 1: Check if we've already exhausted all attempts ────────────────
  if (attemptNumber > maxAttempts) {
    logger.warn(
      { repoId, filePath, attemptNumber, maxAttempts },
      "Fortress: maxAttempts exhausted — escalating to Sentinel"
    );

    const previousExplanations = await loadPreviousExplanations(
      repoId,
      filePath,
      attemptNumber
    );

    const escalationMessage = buildEscalationMessage(
      filePath,
      executionResult,
      attemptNumber,
      previousExplanations
    );

    const healResult: SelfHealResult = {
      status: "ESCALATED",
      strategy: "UNKNOWN",
      attemptNumber,
      explanation: escalationMessage,
      confidenceScore: 0,
      commitPushed: false,
      escalationMessage,
      healedAt,
      bedrockLatencyMs: 0,
    };

    await persistHealResult(repoId, filePath, attemptNumber, healResult, {
      rootCause: "Max attempts exhausted",
      strategy: "UNKNOWN",
      confidenceScore: 0,
      explanation: escalationMessage,
      fixedSourceCode: "",
      fixedTestCode: "",
      breakingChangeRisk: "HIGH",
      affectedFunctions: [],
    });

    return {
      ...event,
      healResult,
      sourceCode,      // Unchanged — no fix was applied
      testCode,        // Unchanged
      attemptNumber: attemptNumber + 1,
      shouldEscalate: true,
    };
  }

  // ── Step 2: Load previous attempt history ────────────────────────────────
  const previousExplanations = await loadPreviousExplanations(
    repoId,
    filePath,
    attemptNumber
  );

  // ── Step 3: Build prompts ────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    filePath,
    testFilePath,
    sourceCode,
    testCode,
    executionResult,
    attemptNumber,
    previousExplanations
  );

  // ── Step 4: Invoke Claude 3.5 Sonnet ────────────────────────────────────
  let responseText: string;
  let latencyMs: number;

  try {
    ({ responseText, latencyMs } = await invokeClaudeForHeal(systemPrompt, userPrompt));
  } catch (err: any) {
    logger.error({ repoId, filePath, err }, "Fortress: Claude invocation failed");

    const failedResult: SelfHealResult = {
      status: "FAILED",
      strategy: "UNKNOWN",
      attemptNumber,
      explanation: `Bedrock/Claude invocation failed: ${err.message}. The self-healing engine could not reach the AI backend. This may be a transient AWS error — the pipeline will retry on the next commit.`,
      confidenceScore: 0,
      commitPushed: false,
      healedAt,
      bedrockLatencyMs: 0,
    };

    await persistHealResult(repoId, filePath, attemptNumber, failedResult, {
      rootCause: "Bedrock invocation error",
      strategy: "UNKNOWN",
      confidenceScore: 0,
      explanation: failedResult.explanation,
      fixedSourceCode: "",
      fixedTestCode: "",
      breakingChangeRisk: "LOW",
      affectedFunctions: [],
    });

    return {
      ...event,
      healResult: failedResult,
      sourceCode,
      testCode,
      attemptNumber: attemptNumber + 1,
      shouldEscalate: attemptNumber + 1 > maxAttempts,
    };
  }

  // ── Step 5: Parse XML response ───────────────────────────────────────────
  let analysis: ParsedAnalysis;
  try {
    analysis = parseClaudeResponse(responseText);
  } catch (err) {
    logger.error({ repoId, filePath, err, responseText }, "Fortress: XML parse failed");
    analysis = {
      rootCause: "Response parsing failed",
      strategy: "UNKNOWN",
      confidenceScore: 0,
      explanation: `Claude returned a malformed response that could not be parsed. Raw response has been logged for debugging.`,
      fixedSourceCode: "",
      fixedTestCode: "",
      breakingChangeRisk: "HIGH",
      affectedFunctions: [],
    };
  }

  logger.info(
    {
      repoId,
      filePath,
      strategy: analysis.strategy,
      confidence: analysis.confidenceScore,
      breakingChangeRisk: analysis.breakingChangeRisk,
    },
    "Fortress: Claude analysis complete"
  );

  // ── Step 6: Validate fix quality ─────────────────────────────────────────
  const isTestFix = analysis.strategy === "STRATEGY_FIX" || analysis.strategy === "TEST_FIX";
  const fixedCode = isTestFix ? analysis.fixedTestCode : analysis.fixedSourceCode;
  const codeToCompare = isTestFix ? testCode : sourceCode;

  const hasFixedCode = fixedCode.trim().length > 50;
  const isActuallyDifferent = fixedCode.trim() !== codeToCompare.trim();
  const isHighConfidence = analysis.confidenceScore >= CONFIDENCE_THRESHOLD;
  const isUnknownStrategy = analysis.strategy === "UNKNOWN";

  // ── Step 7: Determine heal status ────────────────────────────────────────
  let healStatus: HealStatus;

  if (!hasFixedCode || !isActuallyDifferent || isUnknownStrategy) {
    healStatus = "FAILED";
  } else if (isHighConfidence && analysis.breakingChangeRisk !== "HIGH") {
    healStatus = "FIXED";
  } else {
    healStatus = "PARTIAL";
  }

  // ── Step 8: Push commit to GitHub (if we have a usable fix) ──────────────
  let commitPushed = false;
  let commitSha: string | undefined;
  let updatedSourceCode = sourceCode;
  let updatedTestCode = testCode;

  if (healStatus === "FIXED" || healStatus === "PARTIAL") {
    const targetFilePath = isTestFix ? testFilePath : filePath;
    const commitResult = await commitFix(
      repoOwner,
      repoName,
      targetFilePath,
      fixedCode,
      analysis.strategy,
      attemptNumber,
      accessToken
    );

    if (commitResult) {
      commitPushed = true;
      commitSha = commitResult.sha;
      // Update the code that will be passed to the next executeTests.ts iteration
      if (isTestFix) {
        updatedTestCode = fixedCode;
      } else {
        updatedSourceCode = fixedCode;
      }
    } else {
      // Commit failed but we still pass the fixed code in-memory to Step Functions
      // so the next executeTests.ts iteration can still validate it
      logger.warn(
        { repoId, filePath },
        "Fortress: Commit push failed — passing fix in-memory for re-test"
      );
      if (isTestFix) {
        updatedTestCode = fixedCode;
      } else {
        updatedSourceCode = fixedCode;
      }
    }
  }

  // ── Step 9: Assemble final heal result ───────────────────────────────────
  const healResult: SelfHealResult = {
    status: healStatus,
    strategy: analysis.strategy,
    attemptNumber,
    fixedSourceCode: isTestFix ? undefined : (hasFixedCode ? fixedCode : undefined),
    fixedTestCode: isTestFix ? (hasFixedCode ? fixedCode : undefined) : undefined,
    explanation: analysis.explanation || analysis.rootCause || "No explanation generated.",
    confidenceScore: analysis.confidenceScore,
    commitPushed,
    commitSha,
    healedAt,
    bedrockLatencyMs: latencyMs,
  };

  // ── Step 10: Persist to DynamoDB ─────────────────────────────────────────
  await persistHealResult(repoId, filePath, attemptNumber, healResult, analysis);

  const nextAttemptNumber = attemptNumber + 1;
  const shouldEscalate = healStatus === "FAILED" && nextAttemptNumber > maxAttempts;

  logger.info(
    {
      repoId,
      filePath,
      healStatus,
      strategy: analysis.strategy,
      confidence: analysis.confidenceScore,
      commitPushed,
      commitSha,
      nextAttempt: nextAttemptNumber,
      shouldEscalate,
    },
    "Fortress: selfHeal() complete"
  );

  return {
    ...event,
    healResult,
    sourceCode: updatedSourceCode,
    testCode: updatedTestCode,
    attemptNumber: nextAttemptNumber,
    shouldEscalate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAMBDA / STEP FUNCTIONS ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AWS Lambda handler export.
 * Step Functions invokes this via the Lambda resource integration.
 * The output is routed by the ASM Choice state:
 *   - shouldEscalate: true  → "EscalateToSentinel" state
 *   - healStatus: FIXED     → "ExecuteTests" state (re-run loop)
 *   - healStatus: PARTIAL   → "ExecuteTests" state (re-run with lower confidence flag)
 *   - healStatus: FAILED    → "ExecuteTests" state if attempts remain, else "EscalateToSentinel"
 */
export const handler = async (event: SelfHealInput): Promise<SelfHealOutput> => {
  return selfHeal(event);
};