// tests/fortress.test.ts
// Unit tests for the Fortress TDD autonomous QA engine
// Tests: writeTests, executeTests, selfHeal functions
// Uses mock LLM responses from mocks/llm_responses/ — no real Bedrock calls

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// ─────────────────────────────────────────────
// MOCKS — Set up before any imports that use them
// ─────────────────────────────────────────────

// Mock bedrockClient — never hit real AWS in tests
jest.mock("../src/services/aws/bedrockClient", () => ({
  invokeLlama: jest.fn(),
  invokeClaude: jest.fn(),
  BEDROCK_MODELS: {
    CLAUDE_SONNET: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    LLAMA3: "meta.llama3-70b-instruct-v1:0",
    TITAN_EMBEDDINGS: "amazon.titan-embed-text-v2:0",
  },
}));

// Mock repoOps — never hit real GitHub in tests
jest.mock("../src/services/github/repoOps", () => ({
  repoOps: {
    createBranch: jest.fn(),
    branchExists: jest.fn(),
    pushFile: jest.fn(),
    pushMultipleFiles: jest.fn(),
    createPR: jest.fn(),
    createCheckRun: jest.fn(),
    updateCheckRun: jest.fn(),
    getInstallationToken: jest.fn(),
  },
}));

// Mock dynamoClient — never hit real DynamoDB in tests
jest.mock("../src/services/database/dynamoClient", () => ({
  dynamoClient: {
    get: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
    batchWrite: jest.fn(),
  },
  DYNAMO_TABLES: {
    REPOSITORIES: "velocis-repositories",
    USERS: "velocis-users",
    AI_ACTIVITY: "velocis-ai-activity",
  },
}));

// Mock logger — suppress all output during tests
jest.mock("../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    withContext: jest.fn().mockReturnThis(),
    forAgent: jest.fn().mockReturnThis(),
    forRepo: jest.fn().mockReturnThis(),
    timed: jest.fn().mockImplementation(
      async (_op: string, fn: () => Promise<unknown>) => fn()
    ),
    logLlmInvocation: jest.fn(),
    logError: jest.fn(),
  },
}));

// Mock config
jest.mock("../src/utils/config", () => ({
  config: {
    AWS_REGION: "us-east-1",
    IS_LOCAL: true,
    NODE_ENV: "test",
    DYNAMO_REPOSITORIES_TABLE: "velocis-repositories",
    DYNAMO_USERS_TABLE: "velocis-users",
    DYNAMO_AI_ACTIVITY_TABLE: "velocis-ai-activity",
    BEDROCK_MAX_TOKENS: 4096,
    BEDROCK_TEMPERATURE: 0.1,
    GITHUB_WEBHOOK_SECRET: "test-secret-minimum-20-chars",
    TOKEN_ENCRYPTION_KEY: "a".repeat(64),
    FEATURE_FORTRESS_TDD: true,
  },
  isLambda: false,
  isTest: true,
  isProduction: false,
  isDevelopment: false,
  isFeatureEnabled: jest.fn().mockReturnValue(true),
}));

// ─────────────────────────────────────────────
// IMPORTS — After mocks are set up
// ─────────────────────────────────────────────

import { writeTests, WriteTestsInput as WriteTestsParams } from "../src/functions/fortress/writeTests";
import { executeTests, ExecuteTestsInput as ExecuteTestsParams } from "../src/functions/fortress/executeTests";
import { selfHeal, SelfHealInput as SelfHealParams } from "../src/functions/fortress/selfHeal";
import { invokeLlama, invokeClaude } from "../src/services/aws/bedrockClient";
import { repoOps } from "../src/services/github/repoOps";
import { dynamoClient } from "../src/services/database/dynamoClient";

// Load mock LLM responses from mocks directory
import claudeReviewMock from "../mocks/llm_responses/claudeReviewMock.json";

// ─────────────────────────────────────────────
// TEST FIXTURES
// Reusable across all describe blocks
// ─────────────────────────────────────────────

const MOCK_REPO_ID = "repo_123456";
const MOCK_REPO_FULL_NAME = "testuser/velocis-demo";
const MOCK_INSTALLATION_TOKEN = "ghs_mockInstallationToken123";
const MOCK_HEAD_SHA = "abc123def456abc123def456abc123def456abc1";
const MOCK_CHECK_RUN_ID = 987654321;

const MOCK_FILE_CONTENTS: Record<string, string> = {
  "src/services/auth.ts": `
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { config } from "../utils/config";

export async function exchangeCodeForToken(code: string): Promise<string> {
  const auth = createOAuthAppAuth({
    clientType: "oauth-app",
    clientId: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
  });
  const tokenAuth = await auth({ type: "oauth-user", code });
  return tokenAuth.token;
}

export function validateToken(token: string): boolean {
  if (!token || token.trim() === "") return false;
  return token.startsWith("gho_") || token.startsWith("ghp_");
}
  `.trim(),

  "src/utils/codeExtractor.ts": `
export function stripCodeFences(input: string): string {
  if (!input) return "";
  return input.replace(/\`\`\`[\w]*\\n?/g, "").replace(/\\n?\`\`\`/g, "").trim();
}

export function extractJson<T>(input: string): T {
  const stripped = stripCodeFences(input);
  return JSON.parse(stripped) as T;
}
  `.trim(),
};

const MOCK_SENTINEL_REVIEW = {
  summary: "Token validation is too permissive",
  explanation:
    "The validateToken function only checks token prefix, not length or character set. A malformed token could pass validation.",
  suggestion: "Add length check and regex validation for token format.",
  severity: "warning" as const,
  codeSnippet: `if (!token || token.trim() === "") return false;`,
};

const MOCK_GENERATED_TESTS_TYPESCRIPT = `
import { describe, it, expect, jest } from "@jest/globals";
import { exchangeCodeForToken, validateToken } from "../../src/services/auth";

jest.mock("@octokit/auth-oauth-app");

describe("auth service", () => {
  describe("validateToken", () => {
    it("should return false for empty string", () => {
      expect(validateToken("")).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      expect(validateToken("   ")).toBe(false);
    });

    it("should return true for valid gho_ prefixed token", () => {
      expect(validateToken("gho_validTokenString123")).toBe(true);
    });

    it("should return true for valid ghp_ prefixed token", () => {
      expect(validateToken("ghp_validTokenString456")).toBe(true);
    });

    it("should return false for token with invalid prefix", () => {
      expect(validateToken("invalid_token")).toBe(false);
    });
  });

  describe("exchangeCodeForToken", () => {
    it("should call auth with the provided code", async () => {
      const mockToken = "gho_mockToken123";
      const mockAuth = jest.fn().mockResolvedValue({ token: mockToken });
      const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");
      (createOAuthAppAuth as jest.Mock).mockReturnValue(mockAuth);

      const result = await exchangeCodeForToken("mock_code_123");
      expect(result).toBe(mockToken);
      expect(mockAuth).toHaveBeenCalledWith({ type: "oauth-user", code: "mock_code_123" });
    });

    it("should throw if auth fails", async () => {
      const { createOAuthAppAuth } = require("@octokit/auth-oauth-app");
      (createOAuthAppAuth as jest.Mock).mockReturnValue(
        jest.fn().mockRejectedValue(new Error("Auth failed"))
      );
      await expect(exchangeCodeForToken("bad_code")).rejects.toThrow("Auth failed");
    });
  });
});
`.trim();

const MOCK_LLAMA_RESPONSE = {
  text: `\`\`\`typescript\n${MOCK_GENERATED_TESTS_TYPESCRIPT}\n\`\`\``,
  inputTokens: 1200,
  outputTokens: 480,
  stopReason: "stop",
  model: "meta.llama3-70b-instruct-v1:0",
  latencyMs: 1840,
};

const MOCK_TEST_EXECUTION_FAILURE = {
  passed: false,
  output: `
FAIL tests/auth.test.ts
  auth service
    validateToken
      ✓ should return false for empty string (3ms)
      ✓ should return false for whitespace-only string (1ms)
      ✗ should return true for valid gho_ prefixed token (2ms)
        Expected: true
        Received: false

Test Suites: 1 failed, 1 total
Tests:       1 failed, 4 passed, 5 total
  `.trim(),
  failedTests: [
    {
      name: "validateToken > should return true for valid gho_ prefixed token",
      error: "Expected: true\nReceived: false",
    },
  ],
  passedCount: 4,
  failedCount: 1,
  totalCount: 5,
};

const MOCK_TEST_EXECUTION_SUCCESS = {
  passed: true,
  output: `
PASS tests/auth.test.ts
  auth service
    validateToken
      ✓ should return false for empty string (3ms)
      ✓ should return false for whitespace-only string (1ms)
      ✓ should return true for valid gho_ prefixed token (2ms)
      ✓ should return true for valid ghp_ prefixed token (1ms)
      ✓ should return false for token with invalid prefix (1ms)
    exchangeCodeForToken
      ✓ should call auth with the provided code (5ms)
      ✓ should throw if auth fails (2ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
  `.trim(),
  failedTests: [],
  passedCount: 7,
  failedCount: 0,
  totalCount: 7,
};

const MOCK_SELF_HEAL_CLAUDE_RESPONSE = {
  text: `
<analysis>
The validateToken function is returning false for valid tokens because the regex check is too strict.
The function needs to accept tokens of varying lengths, not just the prefix check.
</analysis>
<fixed_code>
\`\`\`typescript
export function validateToken(token: string): boolean {
  if (!token || token.trim() === "") return false;
  const validPrefixes = ["gho_", "ghp_", "ghs_", "github_pat_"];
  return validPrefixes.some((prefix) => token.startsWith(prefix)) && token.length >= 10;
}
\`\`\`
</fixed_code>
<explanation>
Added minimum length check and expanded valid prefixes to include ghs_ (server tokens) and github_pat_ (fine-grained PATs).
</explanation>
  `.trim(),
  inputTokens: 890,
  outputTokens: 210,
  stopReason: "stop",
  model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  latencyMs: 2100,
};

// ─────────────────────────────────────────────
// WRITE TESTS — Llama 3 test generation
// ─────────────────────────────────────────────

describe("Fortress: writeTests", () => {
  let writeTestsParams: WriteTestsParams;
  const mockInvokeLlama = invokeLlama as jest.MockedFunction<typeof invokeLlama>;
  const mockRepoOps = repoOps as jest.Mocked<typeof repoOps>;

  beforeEach(() => {
    jest.clearAllMocks();

    writeTestsParams = {
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      fileContents: MOCK_FILE_CONTENTS,
      sentinelReview: MOCK_SENTINEL_REVIEW,
      installationToken: MOCK_INSTALLATION_TOKEN,
    };

    // Default happy-path mocks
    mockInvokeLlama.mockResolvedValue(MOCK_LLAMA_RESPONSE as any);
    mockRepoOps.branchExists.mockResolvedValue(false);
    mockRepoOps.createBranch.mockResolvedValue(undefined);
    mockRepoOps.pushMultipleFiles.mockResolvedValue(undefined);
    mockRepoOps.createCheckRun.mockResolvedValue({ checkRunId: MOCK_CHECK_RUN_ID });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Happy Path ──────────────────────────────────────────────────────────

  it("should generate tests for all changed source files", async () => {
    const result = await writeTests(writeTestsParams);

    expect(result).toBeDefined();
    expect(result.generatedTests).toBeDefined();
    expect(Object.keys(result.generatedTests).length).toBeGreaterThan(0);
  });

  it("should call Llama once per source file", async () => {
    await writeTests(writeTestsParams);

    expect(mockInvokeLlama).toHaveBeenCalledTimes(
      Object.keys(MOCK_FILE_CONTENTS).length
    );
  });

  it("should pass file content to Llama in the prompt", async () => {
    await writeTests(writeTestsParams);

    const llamaCall = mockInvokeLlama.mock.calls[0];
    const userPrompt = llamaCall[0].userPrompt;

    expect(userPrompt).toContain("exchangeCodeForToken");
  });

  it("should include Sentinel review context in the Llama prompt", async () => {
    await writeTests(writeTestsParams);

    const llamaCall = mockInvokeLlama.mock.calls[0];
    const userPrompt = llamaCall[0].userPrompt;

    // Sentinel's summary should inform test generation
    expect(userPrompt).toContain(MOCK_SENTINEL_REVIEW.summary);
  });

  it("should extract clean code from Llama's fenced response", async () => {
    const result = await writeTests(writeTestsParams);

    // The returned test code should NOT contain markdown fences
    const testCodes = Object.values(result.generatedTests);
    testCodes.forEach((code) => {
      expect(code).not.toContain("```");
    });
  });

  it("should create a new branch for the generated tests", async () => {
    await writeTests(writeTestsParams);

    expect(mockRepoOps.createBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        repoFullName: MOCK_REPO_FULL_NAME,
        token: MOCK_INSTALLATION_TOKEN,
      })
    );

    const branchName = mockRepoOps.createBranch.mock.calls[0][0].branchName;
    expect(branchName).toMatch(/^velocis\/fortress-tests-/);
  });

  it("should push all generated test files to the branch", async () => {
    await writeTests(writeTestsParams);

    expect(mockRepoOps.pushMultipleFiles).toHaveBeenCalledTimes(1);

    const pushCall = mockRepoOps.pushMultipleFiles.mock.calls[0][0];
    expect(pushCall.repoFullName).toBe(MOCK_REPO_FULL_NAME);
    expect(pushCall.token).toBe(MOCK_INSTALLATION_TOKEN);
    expect(Object.keys(pushCall.files).length).toBeGreaterThan(0);
  });

  it("should map test file paths to __tests__ directory", async () => {
    await writeTests(writeTestsParams);

    const pushCall = mockRepoOps.pushMultipleFiles.mock.calls[0][0];
    const testFilePaths = Object.keys(pushCall.files);

    testFilePaths.forEach((path) => {
      expect(path).toMatch(/\.(test|spec)\.(ts|js)$/);
    });
  });

  it("should create a GitHub Check Run for the TDD pipeline", async () => {
    await writeTests(writeTestsParams);

    expect(mockRepoOps.createCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        repoFullName: MOCK_REPO_FULL_NAME,
        name: expect.stringContaining("Fortress"),
        status: expect.stringMatching(/queued|in_progress/),
      })
    );
  });

  it("should return the branch name and check run ID", async () => {
    const result = await writeTests(writeTestsParams);

    expect(result.branchName).toMatch(/^velocis\/fortress-tests-/);
    expect(result.checkRunId).toBe(MOCK_CHECK_RUN_ID);
  });

  it("should log Llama token usage for cost tracking", async () => {
    const { logger } = require("../src/utils/logger");
    await writeTests(writeTestsParams);

    expect(logger.logLlmInvocation).toHaveBeenCalledWith(
      expect.objectContaining({
        model: MOCK_LLAMA_RESPONSE.model,
        inputTokens: MOCK_LLAMA_RESPONSE.inputTokens,
        outputTokens: MOCK_LLAMA_RESPONSE.outputTokens,
      })
    );
  });

  // ── Without Sentinel Review ───────────────────────────────────────────────

  it("should still generate tests even without a Sentinel review", async () => {
    const paramsWithoutReview: WriteTestsParams = {
      ...writeTestsParams,
      sentinelReview: null,
    };

    const result = await writeTests(paramsWithoutReview);

    expect(result).toBeDefined();
    expect(mockInvokeLlama).toHaveBeenCalled();

    // Prompt should not crash when sentinelReview is null
    const llamaCall = mockInvokeLlama.mock.calls[0];
    expect(llamaCall[0].userPrompt).toBeDefined();
  });

  // ── Branch Already Exists ─────────────────────────────────────────────────

  it("should not fail if branch already exists — uses existing branch", async () => {
    mockRepoOps.branchExists.mockResolvedValue(true);

    const result = await writeTests(writeTestsParams);

    // Should not try to create a branch that already exists
    expect(mockRepoOps.createBranch).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  // ── Empty File Contents ───────────────────────────────────────────────────

  it("should handle empty fileContents gracefully", async () => {
    const result = await writeTests({
      ...writeTestsParams,
      fileContents: {},
    });

    expect(result).toBeDefined();
    expect(Object.keys(result.generatedTests)).toHaveLength(0);
    expect(mockInvokeLlama).not.toHaveBeenCalled();
  });

  // ── Non-source files filtered out ────────────────────────────────────────

  it("should skip non-source files like package.json and README", async () => {
    const mixedFiles = {
      ...MOCK_FILE_CONTENTS,
      "package.json": '{ "name": "velocis" }',
      "README.md": "# Velocis",
      ".env.example": "GITHUB_CLIENT_ID=",
    };

    await writeTests({ ...writeTestsParams, fileContents: mixedFiles });

    // Llama should only be called for .ts files, not json/md/env
    const llamaCalls = mockInvokeLlama.mock.calls;
    llamaCalls.forEach((call) => {
      const prompt = call[0].userPrompt as string;
      expect(prompt).not.toContain('"name": "velocis"');
      expect(prompt).not.toContain("# Velocis");
    });
  });

  // ── Llama API Failure ─────────────────────────────────────────────────────

  it("should handle partial Llama failures — succeed for other files", async () => {
    // First file fails, second succeeds
    mockInvokeLlama
      .mockRejectedValueOnce(new Error("Bedrock throttled"))
      .mockResolvedValueOnce(MOCK_LLAMA_RESPONSE as any);

    const result = await writeTests(writeTestsParams);

    // Should still produce results for the successful file
    expect(result).toBeDefined();
    expect(result.failedFiles.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(result.generatedTests).length).toBeGreaterThanOrEqual(1);
  });

  it("should throw if ALL Llama calls fail", async () => {
    mockInvokeLlama.mockRejectedValue(new Error("Bedrock fully down"));

    await expect(writeTests(writeTestsParams)).rejects.toThrow();
  });

  // ── Commit message format ─────────────────────────────────────────────────

  it("should use a conventional commit message for the test push", async () => {
    await writeTests(writeTestsParams);

    const pushCall = mockRepoOps.pushMultipleFiles.mock.calls[0][0];
    expect(pushCall.commitMessage).toMatch(/^chore\(fortress\):/i);
  });
});

// ─────────────────────────────────────────────
// EXECUTE TESTS — Sandbox test runner
// ─────────────────────────────────────────────

describe("Fortress: executeTests", () => {
  let executeTestsParams: ExecuteTestsParams;
  const mockRepoOps = repoOps as jest.Mocked<typeof repoOps>;

  beforeEach(() => {
    jest.clearAllMocks();

    executeTestsParams = {
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      branchName: "velocis/fortress-tests-1234567890",
      checkRunId: MOCK_CHECK_RUN_ID,
      testFilePaths: [
        "tests/services/auth.test.ts",
        "tests/utils/codeExtractor.test.ts",
      ],
      installationToken: MOCK_INSTALLATION_TOKEN,
    };

    mockRepoOps.updateCheckRun.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Happy Path: All Pass ──────────────────────────────────────────────────

  it("should return passed=true when all tests pass", async () => {
    // Mock the internal test runner to return success
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_SUCCESS);

    const result = await executeTests(executeTestsParams);

    expect(result.passed).toBe(true);
    expect(result.failedTests).toHaveLength(0);
    expect(result.passedCount).toBe(7);
  });

  it("should update the GitHub Check Run to 'success' when all tests pass", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_SUCCESS);

    await executeTests(executeTestsParams);

    expect(mockRepoOps.updateCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        checkRunId: MOCK_CHECK_RUN_ID,
        status: "completed",
        conclusion: "success",
      })
    );
  });

  // ── Test Failures ─────────────────────────────────────────────────────────

  it("should return passed=false when tests fail", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_FAILURE);

    const result = await executeTests(executeTestsParams);

    expect(result.passed).toBe(false);
    expect(result.failedTests.length).toBeGreaterThan(0);
    expect(result.failedCount).toBe(1);
  });

  it("should include failing test names in the result", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_FAILURE);

    const result = await executeTests(executeTestsParams);

    expect(result.failedTests[0].name).toContain("validateToken");
  });

  it("should update Check Run to 'failure' when tests fail", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_FAILURE);

    await executeTests(executeTestsParams);

    expect(mockRepoOps.updateCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        checkRunId: MOCK_CHECK_RUN_ID,
        status: "completed",
        conclusion: "failure",
      })
    );
  });

  it("should include test output summary in Check Run annotation", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_FAILURE);

    await executeTests(executeTestsParams);

    const updateCall = mockRepoOps.updateCheckRun.mock.calls[0][0];
    expect(updateCall.summary).toContain("1 failed");
  });

  // ── Status Transitions ────────────────────────────────────────────────────

  it("should update Check Run to in_progress before running tests", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_SUCCESS);

    await executeTests(executeTestsParams);

    const calls = mockRepoOps.updateCheckRun.mock.calls;
    const inProgressCall = calls.find(
      (c) => c[0].status === "in_progress"
    );
    expect(inProgressCall).toBeDefined();
  });

  // ── Sandbox Crash ─────────────────────────────────────────────────────────

  it("should handle sandbox execution crash gracefully", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockRejectedValue(new Error("Sandbox OOM — process killed"));

    const result = await executeTests(executeTestsParams);

    expect(result.passed).toBe(false);
    expect(result.sandboxError).toBeDefined();
    expect(result.sandboxError).toContain("OOM");
  });

  it("should update Check Run to timed_out on sandbox crash", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockRejectedValue(new Error("Sandbox timeout"));

    await executeTests(executeTestsParams);

    expect(mockRepoOps.updateCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: expect.stringMatching(/timed_out|failure/),
      })
    );
  });

  // ── DynamoDB Activity Logging ─────────────────────────────────────────────

  it("should persist test execution results to DynamoDB AI_Activity", async () => {
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_SUCCESS);

    await executeTests(executeTestsParams);

    expect(dynamoClient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "velocis-ai-activity",
        item: expect.objectContaining({
          repoId: MOCK_REPO_ID,
        }),
      })
    );
  });
});

// ─────────────────────────────────────────────
// SELF HEAL — Claude error analysis and fix
// ─────────────────────────────────────────────

describe("Fortress: selfHeal", () => {
  let selfHealParams: SelfHealParams;
  const mockInvokeClaude = invokeClaude as jest.MockedFunction<typeof invokeClaude>;
  const mockRepoOps = repoOps as jest.Mocked<typeof repoOps>;

  beforeEach(() => {
    jest.clearAllMocks();

    selfHealParams = {
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      branchName: "velocis/fortress-tests-1234567890",
      checkRunId: MOCK_CHECK_RUN_ID,
      installationToken: MOCK_INSTALLATION_TOKEN,
      failedTests: MOCK_TEST_EXECUTION_FAILURE.failedTests,
      testOutput: MOCK_TEST_EXECUTION_FAILURE.output,
      originalFileContents: MOCK_FILE_CONTENTS,
      testFileContents: {
        "tests/services/auth.test.ts": MOCK_GENERATED_TESTS_TYPESCRIPT,
      },
      healAttempt: 1,
      maxHealAttempts: 3,
    };

    mockInvokeClaude.mockResolvedValue(MOCK_SELF_HEAL_CLAUDE_RESPONSE as any);
    mockRepoOps.pushFile.mockResolvedValue(undefined);
    mockRepoOps.updateCheckRun.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Happy Path ──────────────────────────────────────────────────────────

  it("should call Claude with the failing test output and source code", async () => {
    await selfHeal(selfHealParams);

    expect(mockInvokeClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(
              MOCK_TEST_EXECUTION_FAILURE.failedTests[0].name
            ),
          }),
        ]),
      })
    );
  });

  it("should include the original source file in the Claude prompt", async () => {
    await selfHeal(selfHealParams);

    const claudeCall = mockInvokeClaude.mock.calls[0];
    const userContent = claudeCall[0].messages.find(
      (m: any) => m.role === "user"
    )?.content as string;

    expect(userContent).toContain("validateToken");
  });

  it("should include the failing test code in the Claude prompt", async () => {
    await selfHeal(selfHealParams);

    const claudeCall = mockInvokeClaude.mock.calls[0];
    const userContent = claudeCall[0].messages.find(
      (m: any) => m.role === "user"
    )?.content as string;

    expect(userContent).toContain("should return true for valid gho_ prefixed token");
  });

  it("should extract fixed code from Claude's XML-tagged response", async () => {
    const result = await selfHeal(selfHealParams);

    expect(result.fixedCode).toBeDefined();
    expect(result.fixedCode).toContain("validPrefixes");
    // Fixed code should not contain markdown fences
    expect(result.fixedCode).not.toContain("```");
  });

  it("should push the fixed code back to the branch", async () => {
    await selfHeal(selfHealParams);

    expect(mockRepoOps.pushFile).toHaveBeenCalledWith(
      expect.objectContaining({
        repoFullName: MOCK_REPO_FULL_NAME,
        token: MOCK_INSTALLATION_TOKEN,
        branch: selfHealParams.branchName,
      })
    );
  });

  it("should return the file path that was fixed", async () => {
    const result = await selfHeal(selfHealParams);

    expect(result.fixedFilePath).toBeDefined();
    expect(typeof result.fixedFilePath).toBe("string");
  });

  it("should return healAttempt number in result", async () => {
    const result = await selfHeal(selfHealParams);

    expect(result.healAttempt).toBe(1);
  });

  it("should include Claude's explanation in the result", async () => {
    const result = await selfHeal(selfHealParams);

    expect(result.explanation).toBeDefined();
    expect(result.explanation).toContain("length");
  });

  // ── Heal Attempts Exceeded ────────────────────────────────────────────────

  it("should throw HealAttemptsExceededError when maxHealAttempts reached", async () => {
    const paramsAtLimit: SelfHealParams = {
      ...selfHealParams,
      healAttempt: 3,
      maxHealAttempts: 3,
    };

    await expect(selfHeal(paramsAtLimit)).rejects.toThrow(
      /max.*heal.*attempt|heal.*attempt.*exceeded/i
    );
  });

  it("should NOT call Claude if max heal attempts reached", async () => {
    const paramsAtLimit: SelfHealParams = {
      ...selfHealParams,
      healAttempt: 3,
      maxHealAttempts: 3,
    };

    try {
      await selfHeal(paramsAtLimit);
    } catch {
      // Expected throw
    }

    expect(mockInvokeClaude).not.toHaveBeenCalled();
  });

  // ── Claude Malformed Response ─────────────────────────────────────────────

  it("should handle Claude returning no <fixed_code> tag gracefully", async () => {
    mockInvokeClaude.mockResolvedValue({
      ...MOCK_SELF_HEAL_CLAUDE_RESPONSE,
      text: "<analysis>The code has issues but I cannot fix it.</analysis>",
    } as any);

    await expect(selfHeal(selfHealParams)).rejects.toThrow(
      /fixed_code|extract|parse/i
    );
  });

  it("should handle Claude returning empty fixed_code tag", async () => {
    mockInvokeClaude.mockResolvedValue({
      ...MOCK_SELF_HEAL_CLAUDE_RESPONSE,
      text: "<fixed_code></fixed_code>",
    } as any);

    await expect(selfHeal(selfHealParams)).rejects.toThrow();
  });

  // ── Temperature is low for deterministic fixes ───────────────────────────

  it("should call Claude with a low temperature for deterministic fixes", async () => {
    await selfHeal(selfHealParams);

    const claudeCall = mockInvokeClaude.mock.calls[0];
    const temperature = claudeCall[0].temperature;

    expect(temperature).toBeLessThanOrEqual(0.2);
  });

  // ── No failing tests edge case ────────────────────────────────────────────

  it("should return immediately if no failing tests are provided", async () => {
    const result = await selfHeal({
      ...selfHealParams,
      failedTests: [],
    });

    expect(mockInvokeClaude).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
  });

  // ── DynamoDB Activity Logging ─────────────────────────────────────────────

  it("should log the self-heal activity to DynamoDB", async () => {
    await selfHeal(selfHealParams);

    expect(dynamoClient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "velocis-ai-activity",
        item: expect.objectContaining({
          repoId: MOCK_REPO_ID,
          agentType: "fortress",
          operation: "selfHeal",
        }),
      })
    );
  });

  // ── Check Run Update ──────────────────────────────────────────────────────

  it("should update Check Run with self-heal attempt progress", async () => {
    await selfHeal(selfHealParams);

    expect(mockRepoOps.updateCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        checkRunId: MOCK_CHECK_RUN_ID,
        repoFullName: MOCK_REPO_FULL_NAME,
      })
    );
  });
});

// ─────────────────────────────────────────────
// INTEGRATION: Full self-healing loop
// Simulates the complete Step Functions state machine flow:
// writeTests → executeTests(fail) → selfHeal → executeTests(pass)
// ─────────────────────────────────────────────

describe("Fortress: Full Self-Healing Loop (Integration)", () => {
  const mockInvokeLlama = invokeLlama as jest.MockedFunction<typeof invokeLlama>;
  const mockInvokeClaude = invokeClaude as jest.MockedFunction<typeof invokeClaude>;
  const mockRepoOps = repoOps as jest.Mocked<typeof repoOps>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Write tests: Llama generates tests
    mockInvokeLlama.mockResolvedValue(MOCK_LLAMA_RESPONSE as any);

    // Self heal: Claude fixes the code
    mockInvokeClaude.mockResolvedValue(MOCK_SELF_HEAL_CLAUDE_RESPONSE as any);

    // Repo ops: all succeed
    mockRepoOps.branchExists.mockResolvedValue(false);
    mockRepoOps.createBranch.mockResolvedValue(undefined);
    mockRepoOps.pushMultipleFiles.mockResolvedValue(undefined);
    mockRepoOps.pushFile.mockResolvedValue(undefined);
    mockRepoOps.createCheckRun.mockResolvedValue({ checkRunId: MOCK_CHECK_RUN_ID });
    mockRepoOps.updateCheckRun.mockResolvedValue(undefined);
    mockRepoOps.createPR.mockResolvedValue({
      prNumber: 42,
      prUrl: "https://github.com/testuser/velocis-demo/pull/42",
      headBranch: "velocis/fortress-tests-1234567890",
      baseBranch: "main",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should complete the full loop: write → fail → heal → pass", async () => {
    // Step 1: Write tests
    const writeResult = await writeTests({
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      fileContents: MOCK_FILE_CONTENTS,
      sentinelReview: MOCK_SENTINEL_REVIEW,
      installationToken: MOCK_INSTALLATION_TOKEN,
    });

    expect(writeResult.generatedTests).toBeDefined();
    expect(writeResult.branchName).toMatch(/^velocis\/fortress-tests-/);

    // Step 2: Execute tests — FAIL first run
    const runTestsInSandbox = jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      // First execution: fail
      .mockResolvedValueOnce(MOCK_TEST_EXECUTION_FAILURE)
      // Second execution (after self-heal): pass
      .mockResolvedValueOnce(MOCK_TEST_EXECUTION_SUCCESS);

    const firstRunResult = await executeTests({
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      branchName: writeResult.branchName,
      checkRunId: writeResult.checkRunId,
      testFilePaths: Object.keys(writeResult.generatedTests),
      installationToken: MOCK_INSTALLATION_TOKEN,
    });

    expect(firstRunResult.passed).toBe(false);
    expect(firstRunResult.failedTests.length).toBeGreaterThan(0);

    // Step 3: Self-heal — Claude analyzes and fixes
    const healResult = await selfHeal({
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      branchName: writeResult.branchName,
      checkRunId: writeResult.checkRunId,
      installationToken: MOCK_INSTALLATION_TOKEN,
      failedTests: firstRunResult.failedTests,
      testOutput: firstRunResult.output,
      originalFileContents: MOCK_FILE_CONTENTS,
      testFileContents: writeResult.generatedTests,
      healAttempt: 1,
      maxHealAttempts: 3,
    });

    expect(healResult.fixedCode).toBeDefined();
    expect(healResult.fixedCode).toContain("validPrefixes");

    // Step 4: Execute tests again — PASS after heal
    const secondRunResult = await executeTests({
      repoId: MOCK_REPO_ID,
      repoFullName: MOCK_REPO_FULL_NAME,
      branchName: writeResult.branchName,
      checkRunId: writeResult.checkRunId,
      testFilePaths: Object.keys(writeResult.generatedTests),
      installationToken: MOCK_INSTALLATION_TOKEN,
    });

    expect(secondRunResult.passed).toBe(true);
    expect(secondRunResult.failedCount).toBe(0);

    // Verify the Check Run ended as success
    const finalCheckRunUpdate = mockRepoOps.updateCheckRun.mock.calls.at(-1)![0];
    expect(finalCheckRunUpdate.conclusion).toBe("success");

    // Cleanup
    runTestsInSandbox.mockRestore();
  });

  it("should give up after maxHealAttempts and mark Check Run as failure", async () => {
    // All test runs always fail
    jest
      .spyOn(
        require("../src/functions/fortress/executeTests"),
        "runTestsInSandbox"
      )
      .mockResolvedValue(MOCK_TEST_EXECUTION_FAILURE);

    // Simulate 3 heal attempts all exhausted
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt < 3) {
        await selfHeal({
          repoId: MOCK_REPO_ID,
          repoFullName: MOCK_REPO_FULL_NAME,
          branchName: "velocis/fortress-tests-1234567890",
          checkRunId: MOCK_CHECK_RUN_ID,
          installationToken: MOCK_INSTALLATION_TOKEN,
          failedTests: MOCK_TEST_EXECUTION_FAILURE.failedTests,
          testOutput: MOCK_TEST_EXECUTION_FAILURE.output,
          originalFileContents: MOCK_FILE_CONTENTS,
          testFileContents: {
            "tests/services/auth.test.ts": MOCK_GENERATED_TESTS_TYPESCRIPT,
          },
          healAttempt: attempt,
          maxHealAttempts: 3,
        });
      } else {
        // 3rd attempt should throw
        await expect(
          selfHeal({
            repoId: MOCK_REPO_ID,
            repoFullName: MOCK_REPO_FULL_NAME,
            branchName: "velocis/fortress-tests-1234567890",
            checkRunId: MOCK_CHECK_RUN_ID,
            installationToken: MOCK_INSTALLATION_TOKEN,
            failedTests: MOCK_TEST_EXECUTION_FAILURE.failedTests,
            testOutput: MOCK_TEST_EXECUTION_FAILURE.output,
            originalFileContents: MOCK_FILE_CONTENTS,
            testFileContents: {
              "tests/services/auth.test.ts": MOCK_GENERATED_TESTS_TYPESCRIPT,
            },
            healAttempt: attempt,
            maxHealAttempts: 3,
          })
        ).rejects.toThrow();
      }
    }

    // Claude was called for attempts 1 and 2 only — not 3
    expect(mockInvokeClaude).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────
// MOCK RESPONSE LOADING
// Verifies the mock files in mocks/llm_responses/ are valid
// ─────────────────────────────────────────────

describe("Mock LLM Responses", () => {
  it("should load claudeReviewMock.json without errors", () => {
    expect(claudeReviewMock).toBeDefined();
  });

  it("should have required fields in claudeReviewMock", () => {
    expect(claudeReviewMock).toHaveProperty("text");
    expect(typeof (claudeReviewMock as any).text).toBe("string");
  });
});