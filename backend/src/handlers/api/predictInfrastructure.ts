/**
 * predictInfrastructure.ts
 * Velocis - Infrastructure View: IaC Predictor
 *
 * Route:
 *   POST /api/infrastructure/predict
 *
 * Accepts a `codeContent` string in the request body, sends it to DeepSeek V3
 * on AWS Bedrock via the ConverseCommand API, and returns a structured JSON
 * response containing:
 *   - impactSummary   (string[])
 *   - iacCode         (string - Terraform HCL)
 *   - costProjection  (string)
 *   - confidenceScore (number 0-100)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { ok, errors, preflight } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { logActivity } from "../../utils/activityLogger";
import { BEDROCK_MODELS } from "../../services/aws/bedrockClient";

export interface InfrastructurePredictionData {
  impactSummary: string[];
  iacCode: string;
  costProjection: string;
  confidenceScore: number;
}

let _client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!_client) {
    _client = new BedrockRuntimeClient({ region: "us-east-1" });
    logger.info({ msg: "IaC Predictor: BedrockRuntimeClient initialized", region: "us-east-1" });
  }
  return _client;
}

const SYSTEM_PROMPT = `Develop, an elite AWS Cloud Architect. Analyze the provided application code and determine the exact AWS serverless infrastructure required to deploy it. You MUST respond ONLY with a valid JSON object. Do not include markdown code blocks or any conversational text. The JSON object must have exactly these four keys:

impactSummary: An array of short strings describing changes (e.g., ['+ 1 Lambda Function', '~ 1 IAM Role modified', '+ 1 DynamoDB Table']).

iacCode: A string containing the complete, production-ready Terraform (HCL) deployment script.

costProjection: A short string estimating the monthly AWS cost (e.g., '$0.00/month (Free Tier)').

confidenceScore: An integer between 0 and 100 representing how confident you are in this architecture.`;

function stripMarkdownJson(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```\s*$/, "");
  return cleaned.trim();
}

function parsePredictionResponse(rawText: string): InfrastructurePredictionData {
  const cleaned = stripMarkdownJson(rawText);
  const parsed = JSON.parse(cleaned) as Partial<InfrastructurePredictionData>;

  return {
    impactSummary: Array.isArray(parsed.impactSummary) ? parsed.impactSummary.map(String) : [],
    iacCode: typeof parsed.iacCode === "string" ? parsed.iacCode : "",
    costProjection: typeof parsed.costProjection === "string" ? parsed.costProjection : "",
    confidenceScore:
      typeof parsed.confidenceScore === "number"
        ? parsed.confidenceScore
        : Number(parsed.confidenceScore ?? 0),
  };
}

export async function predictInfrastructureFromCodeContent(
  codeContent: string
): Promise<InfrastructurePredictionData> {
  const command = new ConverseCommand({
    modelId: BEDROCK_MODELS.DEEPSEEK_V3,
    system: [{ text: SYSTEM_PROMPT }],
    messages: [
      {
        role: "user",
        content: [{ text: codeContent }],
      },
    ],
    inferenceConfig: {
      maxTokens: 8000,
      temperature: 0.1,
    },
  });

  logger.info({
    msg: "IaC Predictor: sending ConverseCommand",
    model: BEDROCK_MODELS.DEEPSEEK_V3,
    codeContentLength: codeContent.length,
  });

  const response = await getClient().send(command);
  const rawText = response.output?.message?.content?.[0]?.text ?? "";

  if (!rawText) {
    throw new Error("AI returned an empty response.");
  }

  logger.info({
    msg: "IaC Predictor: response received",
    stopReason: response.stopReason,
    inputTokens: response.usage?.inputTokens,
    outputTokens: response.usage?.outputTokens,
    rawTextLength: rawText.length,
  });

  try {
    return parsePredictionResponse(rawText);
  } catch (parseErr) {
    logger.error({
      msg: "IaC Predictor: failed to parse AI response as JSON",
      rawText: rawText.slice(0, 500),
      error: String(parseErr),
    });
    throw new Error("AI response was not valid JSON.");
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  let body: { codeContent?: string } = {};
  try {
    if (event.body) body = JSON.parse(event.body);
  } catch {
    return errors.badRequest("Invalid JSON body.");
  }

  const { codeContent } = body;
  if (!codeContent || typeof codeContent !== "string" || codeContent.trim().length === 0) {
    return errors.badRequest("Missing or empty 'codeContent' in request body.");
  }

  try {
    const parsed = await predictInfrastructureFromCodeContent(codeContent);

    logActivity({
      userId: "system",
      repoId: "infrastructure",
      agent: "predictor",
      message: `Infrastructure predicted - confidence ${parsed.confidenceScore}%, cost: ${parsed.costProjection}`,
      severity: "info",
    });

    return ok({ status: "success", data: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("empty response")) {
      return errors.internal("AI returned an empty response. Please try again.");
    }

    if (message.includes("valid JSON")) {
      return errors.internal("AI response was not valid JSON. Please try again.");
    }

    logger.error({
      msg: "IaC Predictor: Bedrock invocation failed",
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    });

    return errors.internal("Infrastructure prediction failed. Please try again later.");
  }
};
