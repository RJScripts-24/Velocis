/**
 * analyzeFortress.ts
 * Velocis — Fortress QA Strategist
 *
 * Generates a comprehensive BDD Test Plan from source code using
 * DeepSeek V3 via the Amazon Bedrock Converse API.
 *
 * Model:   deepseek.v3.2
 * Region:  us-east-1
 * Credentials are resolved automatically via the AWS SDK default chain
 * (IAM role in Lambda / environment variables locally).
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type Message,
  type SystemContentBlock,
} from "@aws-sdk/client-bedrock-runtime";

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT INITIALISATION
// Credentials are sourced from the AWS default credential chain —
// never hard-coded.
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

const DEEPSEEK_MODEL = "deepseek.v3.2";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const QA_SYSTEM_PROMPT = [
  "You are an elite QA Strategist and Product Manager embedded in a software engineering team.",
  "",
  "You will receive one or more real source files from a codebase.",
  "Each file is clearly delimited with a header in the format:",
  "  === FILE [N/TOTAL]: path/to/file.ext ===",
  "",
  "Produce a comprehensive, actionable Test Plan in clean Markdown using this exact structure:",
  "",
  "1. ## Repository Overview",
  "   One short paragraph describing what this codebase does based on the files provided.",
  "",
  "2. For EACH FILE provided, create a dedicated section headed EXACTLY as:",
  "   ## `path/to/file.ext`",
  "   (Use the exact file path from the delimiter as the Markdown heading.)",
  "   Inside each section include:",
  "   - **Edge Cases** — bullet list of important edge cases specific to this file's logic",
  "   - **Security Considerations** — auth issues, injection risks, missing validation, data exposure, etc.",
  "   - **BDD Scenarios** — write 3–5 scenarios in strict Given / When / Then format,",
  "     each labelled as: **Scenario N:** <descriptive title>",
  "",
  "3. ## Cross-Cutting Concerns",
  "   Integration points, auth flows, and error propagation that span multiple files.",
  "",
  "Rules:",
  "- Do NOT write executable code.",
  "- Every file section must be clearly separated with a horizontal rule (---) below it.",
  "- Format everything in clean, well-structured Markdown.",
].join("\n");

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION — generateQATestPlan
// Role: QA Strategist / BDD Planner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes the provided source code and generates a comprehensive BDD Test
 * Plan in Markdown using DeepSeek V3 via the Bedrock Converse API.
 * Identifies edge cases, security loopholes, and 3–5 Given/When/Then scenarios.
 *
 * @param codeContent - Raw source code to analyze (any language/framework).
 * @returns Markdown-formatted BDD test plan.
 */
export async function generateQATestPlan(codeContent: string): Promise<string> {
  const messages: Message[] = [
    {
      role: "user",
      content: [{ text: codeContent }],
    },
  ];

  const system: SystemContentBlock[] = [{ text: QA_SYSTEM_PROMPT }];

  const input: ConverseCommandInput = {
    modelId: DEEPSEEK_MODEL,
    messages,
    system,
    inferenceConfig: {
      maxTokens: 2000,
      temperature: 0.2,
    },
  };

  const command = new ConverseCommand(input);
  const response = await bedrockClient.send(command);

  // Safely extract the text from the response
  const content = response.output?.message?.content;
  if (Array.isArray(content) && content.length > 0) {
    const firstBlock = content[0];
    if ("text" in firstBlock && typeof firstBlock.text === "string") {
      return firstBlock.text;
    }
  }

  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — API Documenter
// ─────────────────────────────────────────────────────────────────────────────

const API_DOC_SYSTEM_PROMPT =
  "You are Devlin, an expert Technical Writer and API Architect. " +
  "Analyze the provided backend code and generate comprehensive API documentation. " +
  "For each route you find, extract: " +
  "1) The endpoint URL, " +
  "2) The HTTP method, " +
  "3) The required request payload/parameters, and " +
  "4) The expected success and error responses. " +
  "Format the output entirely in beautiful, highly readable Markdown. " +
  "Include a JSON block at the end formatted for Swagger/OpenAPI if possible.";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION — generateApiDocs
// Role: Technical Writer / API Architect
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes the provided backend source code and generates comprehensive
 * API documentation in Markdown (with a Swagger/OpenAPI JSON block)
 * using DeepSeek V3 via the Bedrock Converse API.
 *
 * Temperature is intentionally very low (0.1) to produce deterministic,
 * well-structured Markdown/JSON output.
 *
 * @param codeContent - Raw backend source code to document.
 * @returns Markdown-formatted API documentation string.
 */
export async function generateApiDocs(codeContent: string): Promise<string> {
  const messages: Message[] = [
    {
      role: "user",
      content: [{ text: codeContent }],
    },
  ];

  const system: SystemContentBlock[] = [{ text: API_DOC_SYSTEM_PROMPT }];

  const input: ConverseCommandInput = {
    modelId: DEEPSEEK_MODEL,
    messages,
    system,
    inferenceConfig: {
      maxTokens: 2500,
      temperature: 0.1,
    },
  };

  const command = new ConverseCommand(input);
  const response = await bedrockClient.send(command);

  const outputContent = response.output?.message?.content;
  if (Array.isArray(outputContent) && outputContent.length > 0) {
    const firstBlock = outputContent[0];
    if ("text" in firstBlock && typeof firstBlock.text === "string") {
      return firstBlock.text;
    }
  }

  return "";
}
