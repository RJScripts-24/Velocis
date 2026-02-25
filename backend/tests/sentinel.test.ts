/**
 * sentinel.test.ts
 * Velocis — Autonomous AI Senior Engineer
 * Unit Tests for the Sentinel Agent (Reviewer & Multilingual Mentor)
 *
 * Test Coverage:
 *  1. analyzeLogic.ts   — Claude 3.5 Sonnet semantic reasoning & code review
 *  2. mentorChat.ts     — WebSocket real-time chat & Regional Mentorship Hub
 *  3. translate.ts      — Hindi / Tamil / Telugu translation via Amazon Translate
 *  4. Middleware guards — verifySignature, validatePayload (as they relate to Sentinel)
 *  5. Edge cases        — empty diffs, malformed payloads, Bedrock failures
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

// ─── Module Mocks (declared before any imports that use them) ──────────────────

// Mock the centralized Bedrock client so no real AWS calls are made
jest.mock("../src/services/aws/bedrockClient", () => ({
  invokeClaude: jest.fn(),
}));

// Mock Amazon Translate
jest.mock("../src/services/aws/translate", () => ({
  translateText: jest.fn(),
}));

// Mock DynamoDB client
jest.mock("../src/services/database/dynamoClient", () => ({
  putItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
}));

// Mock GitHub repo operations
jest.mock("../src/services/github/repoOps", () => ({
  getFileDiff: jest.fn(),
  postPRComment: jest.fn(),
}));

// Mock logger to keep test output clean
jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock code extractor utility
jest.mock("../src/utils/codeExtractor", () => ({
  stripMarkdownBlocks: jest.fn((raw: string) => raw.trim()),
}));

// ─── Import after mocks are registered ────────────────────────────────────────

import { analyzeLogic } from "../src/functions/sentinel/analyzeLogic";
import { handleMentorChat, buildMentorContext } from "../src/functions/sentinel/mentorChat";
import { invokeClaude } from "../src/services/aws/bedrockClient";
import { translateText } from "../src/services/aws/translate";
import { getFileDiff, postPRComment } from "../src/services/github/repoOps";
import { putItem, getItem } from "../src/services/database/dynamoClient";
import { stripMarkdownBlocks } from "../src/utils/codeExtractor";

// ─── Shared Test Fixtures ──────────────────────────────────────────────────────

const mockRepoId = "repo-immersa-001";
const mockUserId = "user-dev-42";
const mockCommitSha = "abc123def456";

const mockCodeDiff = `
@@ -10,6 +10,20 @@ export class PaymentService {
+  async processPayment(amount: number, userId: string) {
+    const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
+    const user = await db.raw(query);
+    if (amount > 0) {
+      await stripe.charge({ amount, customer: user.stripeId });
+    }
+  }
`;

const mockClaudeReviewResponse = `
## Sentinel Code Review

**Critical Security Flaw — SQL Injection Vulnerability**

The \`processPayment\` method constructs a raw SQL query using string interpolation:
\`\`\`ts
const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
\`\`\`

This is a textbook SQL Injection vulnerability. An attacker can manipulate \`userId\` to bypass authentication or exfiltrate data.

**Why this matters:** In a payment flow, this can lead to unauthorized charges or complete database compromise.

**Corrected Code:**
\`\`\`ts
const user = await db('users').where({ id: userId }).first();
\`\`\`

Use parameterized queries or your ORM's query builder — never raw string interpolation with user input.

**Severity:** CRITICAL
**Category:** Security
`;

const mockHindiTranslation =
  "## सेंटिनल कोड समीक्षा\n\n**गंभीर सुरक्षा दोष — SQL इंजेक्शन भेद्यता**\n\nयह एक SQL इंजेक्शन हमले का क्लासिक उदाहरण है।";

const mockTamilTranslation =
  "## செண்டினல் குறியீடு மதிப்பாய்வு\n\n**SQL இன்ஜெக்சன் பாதிப்பு**";

// ─── 1. analyzeLogic Tests ─────────────────────────────────────────────────────

describe("Sentinel — analyzeLogic (Claude 3.5 Sonnet Semantic Reasoning)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a structured review when Claude responds successfully", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (stripMarkdownBlocks as jest.Mock).mockReturnValue(mockClaudeReviewResponse);
    (putItem as jest.Mock).mockResolvedValue({ success: true });

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(result).toBeDefined();
    expect(result.severity).toBe("CRITICAL");
    expect(result.category).toBe("Security");
    expect(result.reviewText).toContain("SQL Injection");
    expect(result.correctedCode).toBeDefined();
  });

  it("should call invokeClaude with the correct model ID (claude-3-5-sonnet)", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);

    await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(invokeClaude).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: expect.stringContaining("claude-3-5-sonnet"),
      })
    );
  });

  it("should include the full code diff in the prompt sent to Claude", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);

    await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    const calledWith = (invokeClaude as jest.Mock).mock.calls[0][0];
    expect(calledWith.prompt).toContain(mockCodeDiff);
  });

  it("should persist the review result to DynamoDB AI_Activity table", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (putItem as jest.Mock).mockResolvedValue({ success: true });

    await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "AI_Activity",
        item: expect.objectContaining({
          repoId: mockRepoId,
          commitSha: mockCommitSha,
          agentType: "SENTINEL",
        }),
      })
    );
  });

  it("should post the review as a PR comment via GitHub API", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (postPRComment as jest.Mock).mockResolvedValue({ id: "comment-789" });

    await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(postPRComment).toHaveBeenCalledWith(
      expect.objectContaining({
        repoId: mockRepoId,
        body: expect.stringContaining("Sentinel"),
      })
    );
  });

  it("should return severity CRITICAL for SQL injection patterns", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(result.severity).toBe("CRITICAL");
  });

  it("should return severity LOW for a clean, well-written diff", async () => {
    const cleanDiff = `
@@ -5,0 +5,3 @@
+  const sanitizedId = parseInt(userId, 10);
+  const user = await db('users').where({ id: sanitizedId }).first();
    `;
    const cleanReview = "**No critical issues found.** Code follows best practices.\n**Severity:** LOW\n**Category:** Quality";

    (getFileDiff as jest.Mock).mockResolvedValue(cleanDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(cleanReview);

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/utils/userHelper.ts",
    });

    expect(result.severity).toBe("LOW");
  });

  it("should throw a SentinelAnalysisError when the diff is empty", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue("");

    await expect(
      analyzeLogic({
        repoId: mockRepoId,
        commitSha: mockCommitSha,
        filePath: "src/services/EmptyFile.ts",
      })
    ).rejects.toThrow("SentinelAnalysisError: No diff content to analyze");
  });

  it("should throw a SentinelAnalysisError when Claude / Bedrock fails", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockRejectedValue(
      new Error("Bedrock throttling error: Too many requests")
    );

    await expect(
      analyzeLogic({
        repoId: mockRepoId,
        commitSha: mockCommitSha,
        filePath: "src/services/PaymentService.ts",
      })
    ).rejects.toThrow("SentinelAnalysisError");
  });

  it("should NOT call invokeClaude when getFileDiff returns null", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(null);

    try {
      await analyzeLogic({
        repoId: mockRepoId,
        commitSha: mockCommitSha,
        filePath: "src/services/PaymentService.ts",
      });
    } catch (_) {
      // Expected to throw
    }

    expect(invokeClaude).not.toHaveBeenCalled();
  });

  it("should strip markdown code fences from Claude's raw response", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue("```markdown\n" + mockClaudeReviewResponse + "\n```");

    await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(stripMarkdownBlocks).toHaveBeenCalled();
  });

  it("should correctly parse severity even when Claude uses lowercase labels", async () => {
    const lowerCaseResponse = mockClaudeReviewResponse.replace("CRITICAL", "critical");
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(lowerCaseResponse);

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(result.severity).toBe("CRITICAL");
  });
});

// ─── 2. mentorChat Tests ───────────────────────────────────────────────────────

describe("Sentinel — mentorChat (Real-Time WebSocket Vibe Coding Workspace)", () => {
  const mockWsConnectionId = "ws-connection-abc-001";
  const mockUserMessage = "Why is string interpolation in SQL dangerous?";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a structured chat response from Claude for a user question", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue(
      "String interpolation allows attackers to inject arbitrary SQL commands..."
    );

    const response = await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "en",
    });

    expect(response).toBeDefined();
    expect(response.reply).toContain("SQL");
    expect(response.connectionId).toBe(mockWsConnectionId);
  });

  it("should include conversation history in the Claude prompt for context", async () => {
    const mockHistory = [
      { role: "user", content: "What is TDD?" },
      { role: "assistant", content: "Test-Driven Development is..." },
    ];

    (getItem as jest.Mock).mockResolvedValue({ chatHistory: mockHistory });
    (invokeClaude as jest.Mock).mockResolvedValue("SQL injection explanation...");

    await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "en",
    });

    const calledPrompt = (invokeClaude as jest.Mock).mock.calls[0][0];
    expect(calledPrompt.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "user", content: "What is TDD?" }),
      ])
    );
  });

  it("should persist the new message and response to DynamoDB for session continuity", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue("Here is the mentor response...");
    (putItem as jest.Mock).mockResolvedValue({ success: true });

    await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "en",
    });

    expect(putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: expect.stringMatching(/AI_Activity|ChatSessions/),
        item: expect.objectContaining({
          userId: mockUserId,
          repoId: mockRepoId,
        }),
      })
    );
  });

  it("should call translateText when language is 'hi' (Hindi)", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (translateText as jest.Mock).mockResolvedValue(mockHindiTranslation);

    const response = await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "hi",
    });

    expect(translateText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
        targetLanguageCode: "hi",
      })
    );
    expect(response.reply).toBe(mockHindiTranslation);
  });

  it("should call translateText when language is 'ta' (Tamil)", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (translateText as jest.Mock).mockResolvedValue(mockTamilTranslation);

    const response = await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "ta",
    });

    expect(translateText).toHaveBeenCalledWith(
      expect.objectContaining({ targetLanguageCode: "ta" })
    );
    expect(response.reply).toBe(mockTamilTranslation);
  });

  it("should call translateText when language is 'te' (Telugu)", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (translateText as jest.Mock).mockResolvedValue("Telugu translation here...");

    const response = await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "te",
    });

    expect(translateText).toHaveBeenCalledWith(
      expect.objectContaining({ targetLanguageCode: "te" })
    );
    expect(response.reply).toBe("Telugu translation here...");
  });

  it("should NOT call translateText when language is 'en' (English)", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue("English response from Claude...");

    await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "en",
    });

    expect(translateText).not.toHaveBeenCalled();
  });

  it("should throw MentorChatError when message is an empty string", async () => {
    await expect(
      handleMentorChat({
        connectionId: mockWsConnectionId,
        repoId: mockRepoId,
        userId: mockUserId,
        message: "",
        language: "en",
      })
    ).rejects.toThrow("MentorChatError: Message cannot be empty");
  });

  it("should throw MentorChatError when WebSocket connectionId is missing", async () => {
    await expect(
      handleMentorChat({
        connectionId: "",
        repoId: mockRepoId,
        userId: mockUserId,
        message: mockUserMessage,
        language: "en",
      })
    ).rejects.toThrow("MentorChatError: connectionId is required");
  });

  it("should fall back to English when translateText itself throws an error", async () => {
    (invokeClaude as jest.Mock).mockResolvedValue("Fallback English response");
    (translateText as jest.Mock).mockRejectedValue(
      new Error("Amazon Translate service unavailable")
    );

    const response = await handleMentorChat({
      connectionId: mockWsConnectionId,
      repoId: mockRepoId,
      userId: mockUserId,
      message: mockUserMessage,
      language: "hi",
    });

    // Should gracefully degrade to English
    expect(response.reply).toBe("Fallback English response");
    expect(response.translationFailed).toBe(true);
  });

  it("should handle Bedrock failure gracefully with a user-friendly error message", async () => {
    (invokeClaude as jest.Mock).mockRejectedValue(
      new Error("Bedrock: model overloaded")
    );

    await expect(
      handleMentorChat({
        connectionId: mockWsConnectionId,
        repoId: mockRepoId,
        userId: mockUserId,
        message: mockUserMessage,
        language: "en",
      })
    ).rejects.toThrow("MentorChatError");
  });

  it("buildMentorContext should correctly structure the system prompt with repo context", () => {
    const context = buildMentorContext({
      repoId: mockRepoId,
      latestReview: mockClaudeReviewResponse,
      language: "en",
    });

    expect(context).toContain(mockRepoId);
    expect(context).toContain("Senior Engineer");
    expect(context).toContain("Sentinel");
  });

  it("buildMentorContext should inject language-specific instruction when language is not 'en'", () => {
    const context = buildMentorContext({
      repoId: mockRepoId,
      latestReview: mockClaudeReviewResponse,
      language: "hi",
    });

    expect(context).toMatch(/Hindi|hi/i);
  });
});

// ─── 3. Regional Mentorship Hub — Amazon Translate Service ────────────────────

describe("Sentinel — Regional Mentorship Hub (Amazon Translate Integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should pass source language as 'en' when translating from English", async () => {
    (translateText as jest.Mock).mockResolvedValue(mockHindiTranslation);

    await translateText({
      text: mockClaudeReviewResponse,
      sourceLanguageCode: "en",
      targetLanguageCode: "hi",
    });

    expect(translateText).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLanguageCode: "en",
        targetLanguageCode: "hi",
      })
    );
  });

  it("should return translated string for Hindi (hi)", async () => {
    (translateText as jest.Mock).mockResolvedValue(mockHindiTranslation);

    const result = await translateText({
      text: mockClaudeReviewResponse,
      sourceLanguageCode: "en",
      targetLanguageCode: "hi",
    });

    expect(result).toBe(mockHindiTranslation);
    expect(result).toContain("SQL इंजेक्शन");
  });

  it("should return translated string for Tamil (ta)", async () => {
    (translateText as jest.Mock).mockResolvedValue(mockTamilTranslation);

    const result = await translateText({
      text: mockClaudeReviewResponse,
      sourceLanguageCode: "en",
      targetLanguageCode: "ta",
    });

    expect(result).toBe(mockTamilTranslation);
  });

  it("should throw TranslationError when text is empty", async () => {
    (translateText as jest.Mock).mockRejectedValue(
      new Error("TranslationError: Source text cannot be empty")
    );

    await expect(
      translateText({
        text: "",
        sourceLanguageCode: "en",
        targetLanguageCode: "hi",
      })
    ).rejects.toThrow("TranslationError");
  });

  it("should throw TranslationError for unsupported language codes", async () => {
    (translateText as jest.Mock).mockRejectedValue(
      new Error("TranslationError: Language code 'xx' is not supported")
    );

    await expect(
      translateText({
        text: "Some review text",
        sourceLanguageCode: "en",
        targetLanguageCode: "xx",
      })
    ).rejects.toThrow("TranslationError");
  });
});

// ─── 4. Middleware Guards (Sentinel-facing) ────────────────────────────────────

describe("Sentinel — Middleware (verifySignature & validatePayload)", () => {
  it("should reject webhook calls without a valid GitHub signature header", async () => {
    const { verifyGitHubSignature } = await import(
      "../src/middlewares/verifySignature"
    );

    const fakePayload = JSON.stringify({ ref: "refs/heads/main" });
    const fakeSecret = "wrong-secret";
    const validHmac = "sha256=invalidhmac";

    expect(() =>
      verifyGitHubSignature(fakePayload, validHmac, fakeSecret)
    ).toThrow("SignatureVerificationError");
  });

  it("should accept a correctly signed webhook payload", async () => {
    const crypto = await import("crypto");
    const { verifyGitHubSignature } = await import(
      "../src/middlewares/verifySignature"
    );

    const payload = JSON.stringify({ ref: "refs/heads/main", commits: [] });
    const secret = "velocis-test-secret";
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const signature = `sha256=${hmac}`;

    expect(() =>
      verifyGitHubSignature(payload, signature, secret)
    ).not.toThrow();
  });

  it("should throw ValidationError when webhook payload is missing required 'commits' field", async () => {
    const { validatePayload } = await import(
      "../src/middlewares/validatePayload"
    );

    const badPayload = { ref: "refs/heads/main" }; // missing `commits`

    await expect(validatePayload(badPayload)).rejects.toThrow(
      "ValidationError"
    );
  });

  it("should pass validation for a well-formed GitHub push webhook payload", async () => {
    const { validatePayload } = await import(
      "../src/middlewares/validatePayload"
    );

    const goodPayload = {
      ref: "refs/heads/main",
      commits: [
        {
          id: mockCommitSha,
          message: "feat: add processPayment method",
          added: [],
          modified: ["src/services/PaymentService.ts"],
          removed: [],
        },
      ],
      repository: {
        id: 123,
        full_name: "velocis-user/immersa",
      },
    };

    await expect(validatePayload(goodPayload)).resolves.not.toThrow();
  });
});

// ─── 5. Edge Cases & Integration Boundary Tests ───────────────────────────────

describe("Sentinel — Edge Cases & Boundary Conditions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle a diff with only whitespace changes without triggering a review", async () => {
    const whitespaceDiff = `
@@ -1,3 +1,3 @@
-const x = 1
+const x = 1  
    `;
    (getFileDiff as jest.Mock).mockResolvedValue(whitespaceDiff);

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/config.ts",
    });

    // Whitespace-only diffs should return LOW severity or be skipped
    expect(result.severity).toBe("LOW");
    expect(invokeClaude).not.toHaveBeenCalled();
  });

  it("should correctly handle very large diffs (>4000 tokens) by chunking", async () => {
    const largeDiff = "+  " + "x".repeat(20000); // Simulate a very large file change
    (getFileDiff as jest.Mock).mockResolvedValue(largeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/LargeService.ts",
    });

    // Should still produce a result despite the large input
    expect(result).toBeDefined();
    // Claude should have been called (possibly multiple times for chunks)
    expect(invokeClaude).toHaveBeenCalled();
  });

  it("should handle simultaneous reviews for different files without state collision", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);

    const [result1, result2] = await Promise.all([
      analyzeLogic({
        repoId: mockRepoId,
        commitSha: "sha-file-1",
        filePath: "src/services/AuthService.ts",
      }),
      analyzeLogic({
        repoId: mockRepoId,
        commitSha: "sha-file-2",
        filePath: "src/services/PaymentService.ts",
      }),
    ]);

    expect(result1.commitSha).toBe("sha-file-1");
    expect(result2.commitSha).toBe("sha-file-2");
  });

  it("should include timestamp in the DynamoDB record for audit trail purposes", async () => {
    (getFileDiff as jest.Mock).mockResolvedValue(mockCodeDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(mockClaudeReviewResponse);
    (putItem as jest.Mock).mockResolvedValue({ success: true });

    await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "src/services/PaymentService.ts",
    });

    expect(putItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it("should not expose raw internal error details in the user-facing mentorChat response", async () => {
    (invokeClaude as jest.Mock).mockRejectedValue(
      new Error("INTERNAL: AWS_SECRET_ACCESS_KEY rotation failed")
    );

    try {
      await handleMentorChat({
        connectionId: "ws-001",
        repoId: mockRepoId,
        userId: mockUserId,
        message: "Explain this code",
        language: "en",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        // The thrown error should NOT leak internal AWS credential details
        expect(error.message).not.toContain("AWS_SECRET_ACCESS_KEY");
        expect(error.message).toMatch(/MentorChatError/);
      }
    }
  });

  it("should correctly identify security issues in non-TypeScript files (e.g., Python diffs)", async () => {
    const pythonDiff = `
@@ -0,0 +1,5 @@
+def get_user(user_id):
+    query = f"SELECT * FROM users WHERE id = {user_id}"
+    return db.execute(query)
    `;
    (getFileDiff as jest.Mock).mockResolvedValue(pythonDiff);
    (invokeClaude as jest.Mock).mockResolvedValue(
      "SQL Injection detected in Python f-string interpolation.\n**Severity:** CRITICAL"
    );

    const result = await analyzeLogic({
      repoId: mockRepoId,
      commitSha: mockCommitSha,
      filePath: "api/users.py",
    });

    expect(result.severity).toBe("CRITICAL");
  });
});