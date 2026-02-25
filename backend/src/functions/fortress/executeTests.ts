/**
 * executeTests.ts
 * Velocis — Fortress Autonomous QA Engine
 *
 * Responsibility:
 *   Executes AI-generated unit tests (produced by writeTests.ts / Llama 3)
 *   inside a sandboxed Lambda environment using Node.js child_process.
 *   Captures stdout/stderr, parses Jest results, and writes the outcome
 *   back to DynamoDB so the Visual Cortex node map can update in real time.
 *
 * Position in the Fortress Self-Healing Loop (Step Functions ASM):
 *   Code Pushed
 *     → Llama 3 Writes Tests  (writeTests.ts)
 *     → [THIS FILE] Execute Tests
 *     → If FAIL → Claude Analyzes Error  (selfHeal.ts)
 *     → Code Fixed → Execute Tests again (loop back)
 *     → Test Passes → Done ✓
 *
 * Called by:
 *   AWS Step Functions state machine  →  fortress-tdd-loop.asl.json
 *   (State: "ExecuteTests")
 *
 * Input event shape (from Step Functions):
 *   {
 *     repoId: string
 *     repoOwner: string
 *     repoName: string
 *     filePath: string          // The source file under test
 *     testFilePath: string      // The generated test file path
 *     testCode: string          // Raw Jest test code from writeTests.ts
 *     accessToken: string
 *     attemptNumber: number     // 1 on first run, increments on each self-heal retry
 *     maxAttempts: number       // From Step Functions input (default 3)
 *   }
 *
 * Output shape (passed to next Step Functions state):
 *   {
 *     ...input,                 // Pass-through all input fields
 *     executionResult: TestExecutionResult
 *   }
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync, spawnSync, SpawnSyncReturns } from "child_process";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../services/database/dynamoClient";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type TestStatus = "PASS" | "FAIL" | "ERROR" | "TIMEOUT";

export interface TestSuiteResult {
  suiteName: string;       // Describe block name
  passed: number;
  failed: number;
  skipped: number;
  duration: number;        // ms
  testCases: TestCaseResult[];
}

export interface TestCaseResult {
  name: string;            // it/test block name
  status: "passed" | "failed" | "skipped";
  duration: number;        // ms
  errorMessage?: string;   // Only present if failed
  errorStack?: string;
}

export interface TestExecutionResult {
  status: TestStatus;
  filePath: string;
  testFilePath: string;
  attemptNumber: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;           // Total execution time in ms
  suites: TestSuiteResult[];
  /** Raw Jest stdout — passed to selfHeal.ts Claude analysis on failure */
  rawOutput: string;
  /** Raw stderr — includes compilation errors, runtime crashes */
  rawError: string;
  /** Structured failure summary for Claude's selfHeal prompt */
  failureSummary?: string;
  executedAt: string;         // ISO timestamp
  sandboxDir: string;         // Temp dir used (for debugging, cleaned after)
}

export interface ExecuteTestsInput {
  repoId: string;
  repoOwner: string;
  repoName: string;
  filePath: string;
  testFilePath: string;
  testCode: string;
  sourceCode: string;         // The actual source file content to test against
  accessToken: string;
  attemptNumber: number;
  maxAttempts: number;
}

export interface ExecuteTestsOutput extends ExecuteTestsInput {
  executionResult: TestExecutionResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Max time allowed for the entire test suite — Lambda must not timeout */
const TEST_EXECUTION_TIMEOUT_MS = 25_000; // 25 seconds

/** Max characters of raw output captured — prevents DynamoDB item size limits */
const MAX_OUTPUT_CAPTURE_LENGTH = 10_000;

/** Jest config injected inline — no jest.config.js needed in sandbox */
const INLINE_JEST_CONFIG = {
  testEnvironment: "node",
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// SANDBOX SETUP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an isolated temporary directory in /tmp (available in Lambda)
 * with the source file, the generated test file, a minimal package.json,
 * and an inline jest.config.json.
 *
 * Returns the sandbox directory path.
 */
function createSandbox(
  filePath: string,
  sourceCode: string,
  testFilePath: string,
  testCode: string
): string {
  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), "velocis-fortress-"));

  logger.info({ sandboxDir, filePath }, "Fortress: Creating test sandbox");

  // ── Recreate directory structure inside sandbox ──────────────────────────
  const sourceDir = path.dirname(filePath);
  const fullSourceDir = path.join(sandboxDir, sourceDir);
  fs.mkdirSync(fullSourceDir, { recursive: true });

  const testDir = path.dirname(testFilePath);
  const fullTestDir = path.join(sandboxDir, testDir);
  fs.mkdirSync(fullTestDir, { recursive: true });

  // ── Write source file ────────────────────────────────────────────────────
  fs.writeFileSync(path.join(sandboxDir, filePath), sourceCode, "utf-8");

  // ── Write generated test file ────────────────────────────────────────────
  fs.writeFileSync(path.join(sandboxDir, testFilePath), testCode, "utf-8");

  // ── Write minimal package.json ───────────────────────────────────────────
  const packageJson = {
    name: "velocis-sandbox",
    version: "1.0.0",
    private: true,
    scripts: { test: "jest" },
    dependencies: {},
    devDependencies: {
      jest: "^29.7.0",
      "ts-jest": "^29.1.0",
      typescript: "^5.3.0",
      "@types/jest": "^29.5.0",
    },
    jest: {
      ...INLINE_JEST_CONFIG,
      preset: "ts-jest",
      testMatch: [`**/${testFilePath}`],
    },
  };
  fs.writeFileSync(
    path.join(sandboxDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
    "utf-8"
  );

  // ── Write minimal tsconfig.json ──────────────────────────────────────────
  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      module: "commonjs",
      strict: false,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: "./dist",
    },
    include: ["**/*.ts"],
    exclude: ["node_modules"],
  };
  fs.writeFileSync(
    path.join(sandboxDir, "tsconfig.json"),
    JSON.stringify(tsConfig, null, 2),
    "utf-8"
  );

  return sandboxDir;
}

/**
 * Installs Jest and ts-jest in the sandbox using npm.
 * Uses --prefer-offline to hit Lambda layer cache where possible.
 * Throws if installation fails.
 */
function installDependencies(sandboxDir: string): void {
  logger.info({ sandboxDir }, "Fortress: Installing test dependencies");

  try {
    execSync("npm install --prefer-offline --silent", {
      cwd: sandboxDir,
      timeout: 60_000,
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "test",
        // Prevent npm from writing to global locations
        npm_config_prefix: sandboxDir,
        npm_config_cache: path.join(sandboxDir, ".npm-cache"),
      },
    });
  } catch (err: any) {
    throw new Error(
      `Fortress: npm install failed in sandbox.\n${err.stderr?.toString() ?? err.message}`
    );
  }
}

/**
 * Cleans up the temp sandbox directory after execution.
 * Non-fatal — we log but never throw on cleanup failure.
 */
function cleanupSandbox(sandboxDir: string): void {
  try {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
    logger.info({ sandboxDir }, "Fortress: Sandbox cleaned up");
  } catch (err) {
    logger.warn({ sandboxDir, err }, "Fortress: Sandbox cleanup failed — non-fatal");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JEST OUTPUT PARSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses Jest's JSON output (--json flag) into structured TestSuiteResult[].
 * Falls back to regex parsing of verbose text output if JSON is unavailable.
 */
function parseJestOutput(
  jsonOutput: string,
  rawOutput: string
): { suites: TestSuiteResult[]; totals: Omit<TestExecutionResult, "status" | "filePath" | "testFilePath" | "attemptNumber" | "rawOutput" | "rawError" | "executedAt" | "sandboxDir" | "duration"> } {
  // ── Try JSON output first (most reliable) ─────────────────────────────
  try {
    const jestResult = JSON.parse(jsonOutput);

    const suites: TestSuiteResult[] = jestResult.testResults.map((suite: any) => {
      const testCases: TestCaseResult[] = suite.testResults.map((tc: any) => ({
        name: tc.fullName,
        status: tc.status as "passed" | "failed" | "skipped",
        duration: tc.duration ?? 0,
        errorMessage: tc.failureMessages?.[0]?.split("\n")[0],
        errorStack: tc.failureMessages?.[0],
      }));

      return {
        suiteName: suite.testFilePath,
        passed: suite.numPassingTests,
        failed: suite.numFailingTests,
        skipped: suite.numPendingTests,
        duration: suite.perfStats?.end - suite.perfStats?.start ?? 0,
        testCases,
      };
    });

    return {
      suites,
      totals: {
        totalTests: jestResult.numTotalTests,
        passedTests: jestResult.numPassedTests,
        failedTests: jestResult.numFailedTests,
        skippedTests: jestResult.numPendingTests,
      },
    };
  } catch {
    logger.warn("Jest JSON parse failed — falling back to regex parsing");
  }

  // ── Fallback: Regex parsing of verbose text output ───────────────────
  const passMatch = rawOutput.match(/(\d+) passed/);
  const failMatch = rawOutput.match(/(\d+) failed/);
  const skipMatch = rawOutput.match(/(\d+) skipped/);
  const totalMatch = rawOutput.match(/Tests:\s+.*?(\d+) total/);

  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  const skipped = skipMatch ? parseInt(skipMatch[1]) : 0;
  const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed + skipped;

  // Extract individual test names and statuses from verbose output
  const testCases: TestCaseResult[] = [];
  const passedLineRegex = /✓|✔|PASS\s+(.+?)(?:\s+\(\d+ms\))?$/gm;
  const failedLineRegex = /✕|✗|FAIL\s+(.+?)$/gm;

  let match: RegExpExecArray | null;
  while ((match = passedLineRegex.exec(rawOutput)) !== null) {
    testCases.push({ name: match[1]?.trim() ?? "Unknown test", status: "passed", duration: 0 });
  }
  while ((match = failedLineRegex.exec(rawOutput)) !== null) {
    testCases.push({ name: match[1]?.trim() ?? "Unknown test", status: "failed", duration: 0 });
  }

  const suite: TestSuiteResult = {
    suiteName: "Parsed from output",
    passed,
    failed,
    skipped,
    duration: 0,
    testCases,
  };

  return {
    suites: [suite],
    totals: {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
    },
  };
}

/**
 * Generates a concise, structured failure summary string for Claude's
 * selfHeal.ts prompt — focuses on the error messages without noise.
 */
function buildFailureSummary(suites: TestSuiteResult[]): string {
  const failedCases = suites
    .flatMap((s) => s.testCases)
    .filter((tc) => tc.status === "failed");

  if (failedCases.length === 0) return "";

  return failedCases
    .map(
      (tc, i) =>
        `[Failure ${i + 1}] Test: "${tc.name}"\nError: ${tc.errorMessage ?? "Unknown error"}\nStack:\n${tc.errorStack ?? "N/A"}`
    )
    .join("\n\n---\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs Jest inside the sandbox using spawnSync.
 * Uses --json flag to get machine-readable output alongside --verbose for human-readable.
 *
 * Returns raw stdout, stderr, and exit code.
 */
function runJest(sandboxDir: string, testFilePath: string): {
  stdout: string;
  stderr: string;
  jsonOutput: string;
  exitCode: number;
  timedOut: boolean;
} {
  const jestBin = path.join(sandboxDir, "node_modules", ".bin", "jest");
  const jsonOutputPath = path.join(sandboxDir, "jest-results.json");

  const result: SpawnSyncReturns<Buffer> = spawnSync(
    jestBin,
    [
      testFilePath,
      "--verbose",
      "--no-coverage",
      "--forceExit",
      "--json",
      `--outputFile=${jsonOutputPath}`,
      "--testTimeout=10000",
    ],
    {
      cwd: sandboxDir,
      timeout: TEST_EXECUTION_TIMEOUT_MS,
      encoding: "buffer",
      env: {
        ...process.env,
        NODE_ENV: "test",
        CI: "true",
      },
    }
  );

  const stdout = (result.stdout?.toString("utf-8") ?? "").slice(0, MAX_OUTPUT_CAPTURE_LENGTH);
  const stderr = (result.stderr?.toString("utf-8") ?? "").slice(0, MAX_OUTPUT_CAPTURE_LENGTH);
  const timedOut = result.signal === "SIGTERM" || result.status === null;
  const exitCode = result.status ?? 1;

  // Read JSON results from file (more reliable than stdout)
  let jsonOutput = "";
  try {
    if (fs.existsSync(jsonOutputPath)) {
      jsonOutput = fs.readFileSync(jsonOutputPath, "utf-8");
    }
  } catch {
    // JSON output unavailable — fallback parsing will handle it
  }

  return { stdout, stderr, jsonOutput, exitCode, timedOut };
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMODB PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists the test execution result to DynamoDB.
 *
 * Written to two tables:
 * 1. AI_Activity table — keyed by (repoId, filePath) for Cortex node health
 * 2. Repositories table — keyed by repoId for dashboard-level stats
 */
async function persistResultToDynamo(
  repoId: string,
  filePath: string,
  result: TestExecutionResult
): Promise<void> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  try {
    // ── Write to AI_Activity (drives Cortex node color) ──────────────────
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Item: {
          PK: `REPO#${repoId}`,
          SK: `FORTRESS#${filePath}`,
          testStatus: result.status === "PASS" ? "PASS" : "FAIL",
          failureCount: result.failedTests,
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          duration: result.duration,
          attemptNumber: result.attemptNumber,
          failureSummary: result.failureSummary ?? null,
          rawOutput: result.rawOutput.slice(0, 5000), // DynamoDB item size guard
          executedAt: result.executedAt,
          TTL: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7-day TTL
        },
      })
    );

    // ── Update Repositories table aggregate stats ────────────────────────
    await docClient.send(
      new UpdateCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "FORTRESS_STATS" },
        UpdateExpression:
          "SET #lastRun = :lastRun, #totalRuns = if_not_exists(#totalRuns, :zero) + :one, " +
          "#totalPassed = if_not_exists(#totalPassed, :zero) + :passed, " +
          "#totalFailed = if_not_exists(#totalFailed, :zero) + :failed",
        ExpressionAttributeNames: {
          "#lastRun": "lastRun",
          "#totalRuns": "totalRuns",
          "#totalPassed": "totalPassed",
          "#totalFailed": "totalFailed",
        },
        ExpressionAttributeValues: {
          ":lastRun": result.executedAt,
          ":zero": 0,
          ":one": 1,
          ":passed": result.passedTests,
          ":failed": result.failedTests,
        },
      })
    );

    logger.info(
      { repoId, filePath, status: result.status },
      "Fortress: Test result persisted to DynamoDB"
    );
  } catch (err) {
    // Non-fatal — don't block Step Functions execution over a DB write failure
    logger.error({ repoId, filePath, err }, "Fortress: DynamoDB persist failed — non-fatal");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT — LAMBDA / STEP FUNCTIONS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * executeTests()
 *
 * The main exported Lambda handler invoked by AWS Step Functions.
 *
 * Full execution pipeline:
 *   1. Create isolated /tmp sandbox with source + test files
 *   2. Install Jest + ts-jest via npm in sandbox
 *   3. Run Jest with --json output
 *   4. Parse Jest results (JSON → structured types)
 *   5. Build failure summary for Claude's selfHeal prompt
 *   6. Persist result to DynamoDB (drives Cortex node health + dashboard stats)
 *   7. Cleanup sandbox
 *   8. Return ExecuteTestsOutput to Step Functions
 *
 * On TIMEOUT: Returns ERROR status — Step Functions will route to selfHeal.ts
 * On PASS: Step Functions transitions to "TestsPassed" state → pipeline complete
 * On FAIL: Step Functions transitions to "AnalyzeError" state → selfHeal.ts
 */
export async function executeTests(
  event: ExecuteTestsInput
): Promise<ExecuteTestsOutput> {
  const {
    repoId,
    filePath,
    testFilePath,
    testCode,
    sourceCode,
    attemptNumber,
  } = event;

  logger.info(
    { repoId, filePath, attemptNumber },
    "Fortress: executeTests() invoked"
  );

  const startTime = Date.now();
  let sandboxDir = "";

  try {
    // ── Step 1: Create sandbox ─────────────────────────────────────────────
    sandboxDir = createSandbox(filePath, sourceCode, testFilePath, testCode);

    // ── Step 2: Install dependencies ───────────────────────────────────────
    installDependencies(sandboxDir);

    // ── Step 3: Run Jest ───────────────────────────────────────────────────
    logger.info({ repoId, filePath, sandboxDir }, "Fortress: Running Jest");

    const { stdout, stderr, jsonOutput, exitCode, timedOut } = runJest(
      sandboxDir,
      testFilePath
    );

    const duration = Date.now() - startTime;

    // ── Step 4: Handle timeout ─────────────────────────────────────────────
    if (timedOut) {
      logger.warn({ repoId, filePath, duration }, "Fortress: Test execution timed out");

      const timeoutResult: TestExecutionResult = {
        status: "TIMEOUT",
        filePath,
        testFilePath,
        attemptNumber,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration,
        suites: [],
        rawOutput: stdout,
        rawError: `TIMEOUT: Test suite exceeded ${TEST_EXECUTION_TIMEOUT_MS}ms limit.\n${stderr}`,
        failureSummary: `Test suite timed out after ${TEST_EXECUTION_TIMEOUT_MS}ms. This may indicate an infinite loop, unresolved promise, or missing mock for an external service.`,
        executedAt: new Date().toISOString(),
        sandboxDir,
      };

      await persistResultToDynamo(repoId, filePath, timeoutResult);
      return { ...event, executionResult: timeoutResult };
    }

    // ── Step 5: Parse Jest output ──────────────────────────────────────────
    const { suites, totals } = parseJestOutput(jsonOutput, stdout);

    // ── Step 6: Determine overall status ──────────────────────────────────
    let status: TestStatus;
    if (exitCode === 0 && totals.failedTests === 0) {
      status = "PASS";
    } else if (stderr.includes("SyntaxError") || stderr.includes("Cannot find module")) {
      status = "ERROR"; // Compilation/import error — different from test failure
    } else {
      status = "FAIL";
    }

    // ── Step 7: Build failure summary for Claude selfHeal ─────────────────
    const failureSummary =
      status !== "PASS" ? buildFailureSummary(suites) : undefined;

    const executionResult: TestExecutionResult = {
      status,
      filePath,
      testFilePath,
      attemptNumber,
      ...totals,
      duration,
      suites,
      rawOutput: stdout,
      rawError: stderr,
      failureSummary,
      executedAt: new Date().toISOString(),
      sandboxDir,
    };

    // ── Step 8: Persist to DynamoDB ────────────────────────────────────────
    await persistResultToDynamo(repoId, filePath, executionResult);

    logger.info(
      {
        repoId,
        filePath,
        status,
        passed: totals.passedTests,
        failed: totals.failedTests,
        duration,
        attemptNumber,
      },
      "Fortress: executeTests() complete"
    );

    return { ...event, executionResult };
  } catch (err: any) {
    // ── Unexpected runtime error (sandbox setup crash, etc.) ───────────────
    const duration = Date.now() - startTime;
    logger.error({ repoId, filePath, attemptNumber, err }, "Fortress: executeTests() crashed");

    const errorResult: TestExecutionResult = {
      status: "ERROR",
      filePath,
      testFilePath,
      attemptNumber,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration,
      suites: [],
      rawOutput: "",
      rawError: err.message ?? String(err),
      failureSummary: `Fortress execution crashed: ${err.message ?? "Unknown error"}. The test sandbox may have failed to initialize — check npm install logs or Lambda /tmp space.`,
      executedAt: new Date().toISOString(),
      sandboxDir,
    };

    await persistResultToDynamo(repoId, filePath, errorResult);
    return { ...event, executionResult: errorResult };
  } finally {
    // ── Always clean up sandbox ────────────────────────────────────────────
    if (sandboxDir) cleanupSandbox(sandboxDir);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAMBDA ENTRY POINT WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AWS Lambda handler export.
 * Step Functions invokes this directly via the Lambda resource integration.
 */
export const handler = async (event: ExecuteTestsInput): Promise<ExecuteTestsOutput> => {
  return executeTests(event);
};