/**
 * generateIac.ts
 * Velocis — IaC Predictor (Infrastructure as Code)
 *
 * Responsibility:
 *   Analyzes the latest code changes pushed to a repository and generates
 *   production-grade Infrastructure as Code (Terraform HCL and AWS
 *   CloudFormation YAML) for any new AWS resources implied by those changes.
 *   Simultaneously produces a projected AWS cost forecast for the generated
 *   infrastructure, powering the two-panel UI at /repo/[id]/infrastructure.
 *
 *   Uses Amazon Bedrock (Claude 3.5 Sonnet) as the primary reasoning engine,
 *   augmented by Amazon Q Developer patterns for IaC best practices and
 *   AWS Pricing API for real cost estimates.
 *
 * Position in the Velocis Architecture:
 *   GitHub Push Webhook
 *     → githubPush.ts (detects infra-relevant changes)
 *     → [THIS FILE] generateIac.ts
 *     → Result cached in DynamoDB
 *     → Frontend /repo/[id]/infrastructure fetches via getCostForecast.ts
 *
 * Called by:
 *   src/handlers/api/getCostForecast.ts   (on-demand REST endpoint)
 *   src/handlers/webhooks/githubPush.ts   (triggered on every push)
 *
 * Input shape:
 *   {
 *     repoId: string
 *     repoOwner: string
 *     repoName: string
 *     filePaths: string[]        // Changed files from the push diff
 *     commitSha: string
 *     accessToken: string
 *     region: string             // Target AWS deployment region
 *     environment: string        // "dev" | "staging" | "production"
 *   }
 *
 * Output shape:
 *   {
 *     iacResult: IacGenerationResult
 *   }
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  PricingClient,
  GetProductsCommand,
  type Filter,
} from "@aws-sdk/client-pricing";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../services/database/dynamoClient";
import { fetchFileContent } from "../../services/github/repoOps";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";
import { stripMarkdownCodeBlocks } from "../../utils/codeExtractor";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type IacFormat = "terraform" | "cloudformation";
export type AwsEnvironment = "dev" | "staging" | "production";

export interface AwsResourceEstimate {
  /** Human-readable service name e.g. "AWS Lambda", "Amazon DynamoDB" */
  service: string;
  /** AWS service code used in Pricing API e.g. "AWSLambda", "AmazonDynamoDB" */
  serviceCode: string;
  /** Resource identifier inferred from the code e.g. "analysisLogic-function" */
  resourceName: string;
  /** Configuration details inferred from code */
  configuration: Record<string, string | number>;
  /** Monthly cost in USD */
  estimatedMonthlyCostUsd: number;
  /** Pricing model: "pay-per-use" | "provisioned" | "free-tier" */
  pricingModel: string;
  /** Assumptions made when exact config wasn't available in code */
  assumptions: string[];
}

export interface CostForecast {
  totalMonthlyCostUsd: number;
  totalYearlyCostUsd: number;
  currency: "USD";
  /** Confidence of estimate: HIGH (all services found in Pricing API), MEDIUM, LOW */
  confidence: "HIGH" | "MEDIUM" | "LOW";
  breakdown: AwsResourceEstimate[];
  /** Cost delta vs previously cached estimate (positive = more expensive) */
  costDeltaUsd?: number;
  /** Environment multiplier applied (prod gets higher traffic assumptions) */
  environmentMultiplier: number;
  forecastedAt: string;
  /** Free tier eligibility notice if applicable */
  freeTierNotice?: string;
}

export interface IacTemplate {
  format: IacFormat;
  /** The complete HCL (Terraform) or YAML (CloudFormation) source */
  code: string;
  /** List of AWS resource types declared in the template */
  resourceTypes: string[];
  /** Variable/parameter names requiring user input */
  requiredInputs: string[];
  /** S3 backend config (Terraform) or stack name (CloudFormation) */
  deploymentHint: string;
}

export interface DetectedAwsPattern {
  /** The AWS service detected e.g. "Lambda", "DynamoDB", "S3", "Bedrock" */
  service: string;
  /** File where it was detected */
  detectedInFile: string;
  /** The import/SDK call that triggered detection */
  trigger: string;
  /** Whether this is a new resource (not seen in previous commit) */
  isNew: boolean;
}

export interface IacGenerationResult {
  repoId: string;
  commitSha: string;
  environment: AwsEnvironment;
  region: string;
  /** AWS services and patterns detected from the changed files */
  detectedPatterns: DetectedAwsPattern[];
  /** Whether any infra-relevant changes were found */
  hasInfraChanges: boolean;
  terraform: IacTemplate | null;
  cloudformation: IacTemplate | null;
  costForecast: CostForecast;
  /** Claude's architectural recommendations for the generated infra */
  architectureNotes: string;
  generatedAt: string;
  bedrockLatencyMs: number;
}

export interface GenerateIacInput {
  repoId: string;
  repoOwner: string;
  repoName: string;
  filePaths: string[];
  commitSha: string;
  accessToken: string;
  region: string;
  environment: AwsEnvironment;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BEDROCK_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";
const MAX_TOKENS = 8000;
const MAX_SOURCE_CHARS_PER_FILE = 4000;
const MAX_FILES_TO_ANALYZE = 10;

/** Cache TTL — 10 minutes. IaC doesn't need to update on every single push */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Environment multipliers for cost forecasting.
 * Production gets 10x traffic assumptions vs dev.
 */
const ENVIRONMENT_MULTIPLIERS: Record<AwsEnvironment, number> = {
  dev: 1.0,
  staging: 3.0,
  production: 10.0,
};

/**
 * AWS SDK import patterns → detected service mapping.
 * Used for static analysis of changed files.
 */
const AWS_SERVICE_PATTERNS: { pattern: RegExp; service: string; serviceCode: string }[] = [
  { pattern: /@aws-sdk\/client-lambda|aws-lambda/, service: "AWS Lambda", serviceCode: "AWSLambda" },
  { pattern: /@aws-sdk\/client-dynamodb|dynamodb/, service: "Amazon DynamoDB", serviceCode: "AmazonDynamoDB" },
  { pattern: /@aws-sdk\/client-s3|aws-s3/, service: "Amazon S3", serviceCode: "AmazonS3" },
  { pattern: /@aws-sdk\/client-bedrock/, service: "Amazon Bedrock", serviceCode: "AmazonBedrock" },
  { pattern: /@aws-sdk\/client-sqs/, service: "Amazon SQS", serviceCode: "AWSQueueService" },
  { pattern: /@aws-sdk\/client-sns/, service: "Amazon SNS", serviceCode: "AmazonSNS" },
  { pattern: /@aws-sdk\/client-step-functions/, service: "AWS Step Functions", serviceCode: "AWSStepFunctions" },
  { pattern: /@aws-sdk\/client-api-gateway/, service: "Amazon API Gateway", serviceCode: "AmazonApiGateway" },
  { pattern: /@aws-sdk\/client-cognito/, service: "Amazon Cognito", serviceCode: "AmazonCognito" },
  { pattern: /@aws-sdk\/client-secrets-manager/, service: "AWS Secrets Manager", serviceCode: "AWSSecretsManager" },
  { pattern: /@aws-sdk\/client-cloudwatch/, service: "Amazon CloudWatch", serviceCode: "AmazonCloudWatch" },
  { pattern: /@aws-sdk\/client-ecs/, service: "Amazon ECS", serviceCode: "AmazonECS" },
  { pattern: /@aws-sdk\/client-pricing/, service: "AWS Pricing", serviceCode: "AWSPricing" },
  { pattern: /amazon-translate|@aws-sdk\/client-translate/, service: "Amazon Translate", serviceCode: "AmazonTranslate" },
];

/**
 * Files that are infra-relevant — always include even if not directly changed.
 */
const INFRA_RELEVANT_EXTENSIONS = new Set([
  ".ts", ".js", ".py", ".tf", ".yaml", ".yml", ".json",
]);

// ─────────────────────────────────────────────────────────────────────────────
// AWS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: config.AWS_REGION });

/**
 * AWS Pricing API is only available in us-east-1 — always use that region
 * regardless of the deployment target region.
 */
const pricingClient = new PricingClient({ region: "us-east-1" });

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CODE ANALYSIS — AWS PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans changed source files for AWS SDK imports and usage patterns.
 * Returns a list of detected AWS services with file attribution.
 *
 * This is the first stage — gives Claude focused context rather than
 * dumping the entire codebase into the prompt.
 */
function detectAwsPatterns(
  filePath: string,
  sourceCode: string
): DetectedAwsPattern[] {
  const detected: DetectedAwsPattern[] = [];

  for (const { pattern, service } of AWS_SERVICE_PATTERNS) {
    const matches = sourceCode.match(pattern);
    if (matches) {
      detected.push({
        service,
        detectedInFile: filePath,
        trigger: matches[0],
        isNew: true, // Assumed new — would diff against previous commit in production
      });
    }
  }

  // Also detect resource names from common patterns
  // e.g. TableName: config.DYNAMO_TABLE_REPOSITORIES → DynamoDB table detected
  const tableNameMatches = sourceCode.match(/TableName[:\s]+["'`]?([A-Za-z_\-]+)["'`]?/g);
  const bucketNameMatches = sourceCode.match(/Bucket[:\s]+["'`]?([A-Za-z_\-]+)["'`]?/g);
  const functionNameMatches = sourceCode.match(/FunctionName[:\s]+["'`]?([A-Za-z_\-]+)["'`]?/g);

  if (tableNameMatches && !detected.some((d) => d.service === "Amazon DynamoDB")) {
    detected.push({
      service: "Amazon DynamoDB",
      detectedInFile: filePath,
      trigger: tableNameMatches[0],
      isNew: false,
    });
  }

  if (bucketNameMatches && !detected.some((d) => d.service === "Amazon S3")) {
    detected.push({
      service: "Amazon S3",
      detectedInFile: filePath,
      trigger: bucketNameMatches[0],
      isNew: false,
    });
  }

  if (functionNameMatches && !detected.some((d) => d.service === "AWS Lambda")) {
    detected.push({
      service: "AWS Lambda",
      detectedInFile: filePath,
      trigger: functionNameMatches[0],
      isNew: false,
    });
  }

  return detected;
}

/**
 * Determines if a file is relevant for IaC analysis.
 * Filters out test files, type definitions, and lockfiles.
 */
function isInfraRelevantFile(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  if (!INFRA_RELEVANT_EXTENSIONS.has(ext)) return false;

  const skipPatterns = [
    ".test.", ".spec.", ".d.ts", "node_modules",
    "yarn.lock", "package-lock.json", ".env", "jest.config",
  ];
  return !skipPatterns.some((p) => filePath.includes(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// AWS PRICING API INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default fallback costs (USD/month) when Pricing API returns no data.
 * Based on AWS Free Tier + typical low-traffic usage.
 */
const FALLBACK_COSTS: Record<string, number> = {
  "AWS Lambda": 0.20,
  "Amazon DynamoDB": 1.25,
  "Amazon S3": 0.50,
  "Amazon Bedrock": 15.00,
  "Amazon SQS": 0.40,
  "Amazon SNS": 0.50,
  "AWS Step Functions": 0.025,
  "Amazon API Gateway": 3.50,
  "Amazon Cognito": 0.00,
  "AWS Secrets Manager": 0.40,
  "Amazon CloudWatch": 0.30,
  "Amazon ECS": 8.00,
  "Amazon Translate": 15.00,
  DEFAULT: 1.00,
};

/**
 * Fetches real pricing data from the AWS Pricing API for a given service.
 * Returns estimated monthly cost in USD based on typical low-to-medium usage.
 *
 * Note: AWS Pricing API uses US East 1 regardless of deployment region.
 * We apply a regional surcharge for non-standard regions post-fetch.
 */
async function fetchServiceCost(
  serviceCode: string,
  serviceName: string,
  region: string
): Promise<number> {
  try {
    const filters: Filter[] = [
      { Type: "TERM_MATCH", Field: "ServiceCode", Value: serviceCode },
      { Type: "TERM_MATCH", Field: "location", Value: "US East (N. Virginia)" },
    ];

    const command = new GetProductsCommand({
      ServiceCode: serviceCode,
      Filters: filters,
      MaxResults: 5,
      FormatVersion: "aws_v1",
    });

    const response = await pricingClient.send(command);

    if (!response.PriceList || response.PriceList.length === 0) {
      logger.warn({ serviceCode, serviceName }, "Pricing API: No price data found — using fallback");
      return FALLBACK_COSTS[serviceName] ?? FALLBACK_COSTS.DEFAULT;
    }

    // Parse the first pricing result — extract the first on-demand price
    const priceItem = JSON.parse(response.PriceList[0]);
    const onDemandTerms = priceItem?.terms?.OnDemand;

    if (!onDemandTerms) {
      return FALLBACK_COSTS[serviceName] ?? FALLBACK_COSTS.DEFAULT;
    }

    // Walk the nested pricing structure to find a USD price per unit
    const termKey = Object.keys(onDemandTerms)[0];
    const priceDimensions = onDemandTerms[termKey]?.priceDimensions;
    const dimensionKey = Object.keys(priceDimensions)[0];
    const pricePerUnit = parseFloat(
      priceDimensions[dimensionKey]?.pricePerUnit?.USD ?? "0"
    );

    // Estimate monthly cost: price-per-unit × typical usage units
    // These multipliers are conservative "typical small app" estimates
    const USAGE_MULTIPLIERS: Record<string, number> = {
      AWSLambda: 500_000,       // 500K invocations/month
      AmazonDynamoDB: 1_000_000, // 1M read/write units
      AmazonS3: 10_000,          // 10K requests
      AmazonBedrock: 100_000,    // 100K tokens
      AWSQueueService: 1_000_000,
      AmazonSNS: 1_000_000,
      AWSStepFunctions: 10_000,
      AmazonApiGateway: 100_000,
      AmazonTranslate: 1_000_000,
    };

    const usageMultiplier = USAGE_MULTIPLIERS[serviceCode] ?? 100_000;
    const baseMonthlyCost = pricePerUnit * usageMultiplier;

    // Apply regional pricing surcharge (some regions cost 10-20% more)
    const REGIONAL_SURCHARGES: Record<string, number> = {
      "ap-south-1": 1.1,    // Mumbai — +10%
      "ap-southeast-1": 1.15,
      "eu-west-2": 1.12,
      "sa-east-1": 1.5,     // São Paulo — +50%
      "us-east-1": 1.0,
      "us-west-2": 1.0,
    };

    const surcharge = REGIONAL_SURCHARGES[region] ?? 1.1;
    const finalCost = baseMonthlyCost * surcharge;

    // Cap unreasonably high estimates (Pricing API sometimes returns per-GB rates)
    return Math.min(finalCost, 500);
  } catch (err) {
    logger.warn(
      { serviceCode, serviceName, err },
      "Pricing API fetch failed — using fallback cost"
    );
    return FALLBACK_COSTS[serviceName] ?? FALLBACK_COSTS.DEFAULT;
  }
}

/**
 * Builds a full CostForecast from detected AWS patterns.
 * Calls the Pricing API in parallel for all detected services.
 */
async function buildCostForecast(
  detectedPatterns: DetectedAwsPattern[],
  environment: AwsEnvironment,
  region: string,
  previousForecast?: CostForecast
): Promise<CostForecast> {
  const environmentMultiplier = ENVIRONMENT_MULTIPLIERS[environment];
  const forecastedAt = new Date().toISOString();

  // De-duplicate services
  const uniqueServices = Array.from(
    new Map(detectedPatterns.map((p) => [p.service, p])).values()
  );

  if (uniqueServices.length === 0) {
    return {
      totalMonthlyCostUsd: 0,
      totalYearlyCostUsd: 0,
      currency: "USD",
      confidence: "HIGH",
      breakdown: [],
      environmentMultiplier,
      forecastedAt,
      freeTierNotice: "No AWS resources detected in the changed files.",
    };
  }

  // Fetch all service costs in parallel
  const breakdownPromises = uniqueServices.map(async (pattern) => {
    const serviceEntry = AWS_SERVICE_PATTERNS.find(
      (p) => p.service === pattern.service
    );
    const serviceCode = serviceEntry?.serviceCode ?? "DEFAULT";

    const baseCost = await fetchServiceCost(serviceCode, pattern.service, region);
    const adjustedCost = baseCost * environmentMultiplier;

    const estimate: AwsResourceEstimate = {
      service: pattern.service,
      serviceCode,
      resourceName: `${pattern.detectedInFile.split("/").pop()?.replace(/\.(ts|js)$/, "")}-${pattern.service.toLowerCase().replace(/\s+/g, "-")}`,
      configuration: {
        region,
        environment,
        estimatedMonthlyInvocations: `${(100_000 * environmentMultiplier).toLocaleString()}`,
      },
      estimatedMonthlyCostUsd: Math.round(adjustedCost * 100) / 100,
      pricingModel: ["Amazon DynamoDB", "Amazon S3", "AWS Lambda"].includes(pattern.service)
        ? "pay-per-use"
        : "provisioned",
      assumptions: [
        `Based on ${environment} environment traffic assumptions`,
        `Region: ${region}`,
        `Multiplier applied: ${environmentMultiplier}x vs dev baseline`,
      ],
    };

    return estimate;
  });

  const breakdown = await Promise.all(breakdownPromises);

  const totalMonthlyCostUsd =
    Math.round(breakdown.reduce((sum, r) => sum + r.estimatedMonthlyCostUsd, 0) * 100) / 100;

  const totalYearlyCostUsd = Math.round(totalMonthlyCostUsd * 12 * 100) / 100;

  // Confidence: HIGH if all services found in Pricing API (no fallback used)
  const allHaveRealData = breakdown.every(
    (b) => b.estimatedMonthlyCostUsd !== (FALLBACK_COSTS[b.service] ?? FALLBACK_COSTS.DEFAULT)
  );
  const confidence: CostForecast["confidence"] = allHaveRealData ? "HIGH" : "MEDIUM";

  // Calculate cost delta vs previous estimate
  const costDeltaUsd = previousForecast
    ? Math.round((totalMonthlyCostUsd - previousForecast.totalMonthlyCostUsd) * 100) / 100
    : undefined;

  // Free tier notice for dev environments
  const freeTierNotice =
    environment === "dev" && totalMonthlyCostUsd < 5
      ? "This infrastructure may qualify for the AWS Free Tier. Verify eligibility at aws.amazon.com/free."
      : undefined;

  return {
    totalMonthlyCostUsd,
    totalYearlyCostUsd,
    currency: "USD",
    confidence,
    breakdown,
    costDeltaUsd,
    environmentMultiplier,
    forecastedAt,
    freeTierNotice,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are Velocis IaC Predictor, an expert AWS Solutions Architect and Infrastructure as Code engineer. You analyze application source code and generate production-grade IaC templates that accurately reflect the AWS resources the application needs.

## Your Core Principles
1. Generate IaC for resources you can PROVE are needed from the code — never hallucinate resources.
2. Follow AWS Well-Architected Framework principles: security, reliability, performance, cost optimization, operational excellence.
3. Apply least-privilege IAM policies — scope every permission to exactly what's needed.
4. Apply environment-appropriate configurations (dev: minimal, production: HA + backups + encryption).
5. Include all required dependencies (IAM roles, VPCs if needed, security groups).
6. Tag all resources with project, environment, and managed-by tags.
7. For Terraform: use the latest AWS provider (~> 5.0) and HCL2 syntax only.
8. For CloudFormation: use YAML format with Parameters for configurable values.

## Output Format
You MUST respond ONLY with valid XML in this exact structure. No preamble outside the XML.

<iac_output>
  <terraform>
    Complete, valid Terraform HCL code only. No markdown fences. Include provider block, variables, and all resources.
  </terraform>
  
  <cloudformation>
    Complete, valid CloudFormation YAML only. No markdown fences. Include AWSTemplateFormatVersion, Description, Parameters, Resources, and Outputs.
  </cloudformation>
  
  <resource_types>
    Comma-separated list of AWS resource types declared (e.g. aws_lambda_function, aws_dynamodb_table)
  </resource_types>
  
  <required_inputs>
    Comma-separated list of variable/parameter names requiring user input before deployment
  </required_inputs>
  
  <architecture_notes>
    2-4 paragraphs of senior architect commentary: what was generated, why, key security decisions, cost optimization suggestions, and any risks or limitations of the generated templates.
  </architecture_notes>
</iac_output>`;
}

function buildUserPrompt(
  filePaths: string[],
  fileContents: { path: string; content: string }[],
  detectedPatterns: DetectedAwsPattern[],
  environment: AwsEnvironment,
  region: string,
  costForecast: CostForecast
): string {
  const detectedServicesList = [...new Set(detectedPatterns.map((p) => p.service))].join(", ");

  const fileSection = fileContents
    .map(
      ({ path: filePath, content }) =>
        `### ${filePath}\n\`\`\`typescript\n${content.slice(0, MAX_SOURCE_CHARS_PER_FILE)}${content.length > MAX_SOURCE_CHARS_PER_FILE ? "\n// ... [truncated]" : ""}\n\`\`\``
    )
    .join("\n\n");

  return `## Task
Generate Terraform HCL and CloudFormation YAML for the AWS infrastructure required by the following changed source files.

## Deployment Context
- Target Region: ${region}
- Environment: ${environment}
- Changed Files: ${filePaths.join(", ")}

## Pre-Detected AWS Services
Static analysis detected the following AWS services in the changed files:
${detectedServicesList || "None detected — infer from code patterns"}

Detected patterns detail:
${detectedPatterns.map((p) => `- ${p.service} in \`${p.detectedInFile}\` (trigger: ${p.trigger})`).join("\n")}

## Cost Forecast Context
The following monthly costs have been estimated for ${environment}:
${costForecast.breakdown.map((b) => `- ${b.service}: $${b.estimatedMonthlyCostUsd}/month`).join("\n")}
Total: $${costForecast.totalMonthlyCostUsd}/month

## Changed Source Files
${fileSection}

## IaC Requirements
1. Generate Terraform for the Lambda functions, DynamoDB tables, API Gateway routes, Step Functions, and any other AWS resources the code explicitly uses.
2. Apply ${environment} environment settings:
   ${environment === "production"
      ? "- Multi-AZ DynamoDB, Lambda reserved concurrency, S3 versioning + lifecycle, CloudWatch alarms, KMS encryption"
      : "- Minimal provisioning, no reserved concurrency, pay-per-request billing modes, basic logging"
    }
3. Tag all resources: Project=Velocis, Environment=${environment}, ManagedBy=VelocisIaCPredictor
4. Region: ${region}
5. Use variables/parameters for sensitive values (account IDs, API keys, ARNs).

Generate the complete IaC now and respond ONLY with the <iac_output> XML block.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK INVOCATION
// ─────────────────────────────────────────────────────────────────────────────

async function invokeClaudeForIac(
  systemPrompt: string,
  userPrompt: string
): Promise<{ responseText: string; latencyMs: number }> {
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.1, // IaC must be precise — near-deterministic output
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
      },
      "IaC Predictor: Bedrock Claude invocation complete"
    );

    return { responseText, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    logger.error({ err, latencyMs }, "IaC Predictor: Bedrock invocation failed");
    throw new Error(`Bedrock invocation failed: ${err.message ?? String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// XML RESPONSE PARSER
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedIacOutput {
  terraformCode: string;
  cloudformationCode: string;
  resourceTypes: string[];
  requiredInputs: string[];
  architectureNotes: string;
}

function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return match[0]
    .replace(new RegExp(`^<${tag}>\\s*`, "i"), "")
    .replace(new RegExp(`\\s*<\\/${tag}>$`, "i"), "")
    .trim();
}

function parseClaudeIacResponse(rawResponse: string): ParsedIacOutput {
  const xmlStart = rawResponse.indexOf("<iac_output>");
  const xmlEnd = rawResponse.indexOf("</iac_output>") + "</iac_output>".length;
  const xml =
    xmlStart >= 0 && xmlEnd > xmlStart
      ? rawResponse.slice(xmlStart, xmlEnd)
      : rawResponse;

  const terraformRaw = extractXmlTag(xml, "terraform");
  const cloudformationRaw = extractXmlTag(xml, "cloudformation");

  // Strip markdown fences if Claude accidentally added them despite instructions
  const terraformCode = stripMarkdownCodeBlocks(terraformRaw);
  const cloudformationCode = stripMarkdownCodeBlocks(cloudformationRaw);

  const resourceTypesRaw = extractXmlTag(xml, "resource_types");
  const resourceTypes = resourceTypesRaw
    ? resourceTypesRaw.split(",").map((r) => r.trim()).filter(Boolean)
    : [];

  const requiredInputsRaw = extractXmlTag(xml, "required_inputs");
  const requiredInputs = requiredInputsRaw
    ? requiredInputsRaw.split(",").map((r) => r.trim()).filter(Boolean)
    : [];

  const architectureNotes = extractXmlTag(xml, "architecture_notes");

  return {
    terraformCode,
    cloudformationCode,
    resourceTypes,
    requiredInputs,
    architectureNotes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IaC TEMPLATE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a Terraform IaC template object from Claude's generated code.
 * Returns null if no meaningful Terraform was generated.
 */
function buildTerraformTemplate(
  code: string,
  resourceTypes: string[],
  requiredInputs: string[],
  environment: AwsEnvironment,
  region: string
): IacTemplate | null {
  if (!code || code.length < 50) return null;

  // Validate it looks like Terraform HCL (has at least one resource block)
  const hasTerraformSyntax =
    code.includes("resource \"") || code.includes("terraform {") || code.includes("variable \"");

  if (!hasTerraformSyntax) {
    logger.warn("IaC Predictor: Generated Terraform code doesn't appear to be valid HCL");
    return null;
  }

  return {
    format: "terraform",
    code,
    resourceTypes: resourceTypes.filter((r) => !r.includes("aws_cloudformation")),
    requiredInputs,
    deploymentHint: `terraform init && terraform workspace select ${environment} && terraform plan -var="region=${region}" && terraform apply`,
  };
}

/**
 * Builds a CloudFormation IaC template object from Claude's generated code.
 * Returns null if no meaningful CloudFormation was generated.
 */
function buildCloudFormationTemplate(
  code: string,
  resourceTypes: string[],
  requiredInputs: string[],
  environment: AwsEnvironment
): IacTemplate | null {
  if (!code || code.length < 50) return null;

  // Validate it looks like CloudFormation YAML
  const hasCfnSyntax =
    code.includes("AWSTemplateFormatVersion") ||
    code.includes("Resources:") ||
    code.includes("Type: AWS::");

  if (!hasCfnSyntax) {
    logger.warn("IaC Predictor: Generated CloudFormation code doesn't appear to be valid YAML");
    return null;
  }

  return {
    format: "cloudformation",
    code,
    resourceTypes: resourceTypes.filter((r) => r.startsWith("AWS::")),
    requiredInputs,
    deploymentHint: `aws cloudformation deploy --template-file template.yaml --stack-name velocis-${environment} --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHING LAYER
// ─────────────────────────────────────────────────────────────────────────────

async function getCachedResult(repoId: string): Promise<IacGenerationResult | null> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "IAC_RESULT" },
      })
    );

    if (!result.Item) return null;

    const { iacResult, cachedAt } = result.Item as {
      iacResult: IacGenerationResult;
      cachedAt: number;
    };

    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      logger.info({ repoId }, "IaC Predictor: Cache expired — regenerating");
      return null;
    }

    logger.info({ repoId }, "IaC Predictor: Cache hit — returning cached result");
    return iacResult;
  } catch (err) {
    logger.warn({ repoId, err }, "IaC Predictor: Cache read failed — regenerating");
    return null;
  }
}

async function setCachedResult(
  repoId: string,
  iacResult: IacGenerationResult
): Promise<void> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Item: {
          PK: `REPO#${repoId}`,
          SK: "IAC_RESULT",
          iacResult,
          cachedAt: Date.now(),
          TTL: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24-hour TTL
        },
      })
    );
    logger.info({ repoId }, "IaC Predictor: Result cached to DynamoDB");
  } catch (err) {
    logger.warn({ repoId, err }, "IaC Predictor: Cache write failed — non-fatal");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateIac()
 *
 * Main exported function. Called by:
 *   - getCostForecast.ts handler (REST GET /repo/[id]/infrastructure)
 *   - githubPush.ts webhook (on every relevant push)
 *
 * Full pipeline:
 *   1.  Check DynamoDB cache (10-min TTL)
 *   2.  Filter and fetch changed source files from GitHub
 *   3.  Static analysis — detect AWS service patterns per file
 *   4.  Build cost forecast via AWS Pricing API (parallel fetches)
 *   5.  Build Claude system + user prompts with full context
 *   6.  Invoke Claude 3.5 Sonnet via Bedrock
 *   7.  Parse XML response into Terraform + CloudFormation templates
 *   8.  Validate and assemble IacTemplate objects
 *   9.  Cache result in DynamoDB
 *  10.  Return IacGenerationResult
 */
export async function generateIac(
  input: GenerateIacInput
): Promise<IacGenerationResult> {
  const {
    repoId,
    repoOwner,
    repoName,
    filePaths,
    commitSha,
    accessToken,
    region,
    environment,
  } = input;

  const generatedAt = new Date().toISOString();

  logger.info(
    { repoId, repoOwner, repoName, filePaths, commitSha, environment, region },
    "IaC Predictor: generateIac() invoked"
  );

  // ── Step 1: Check DynamoDB cache ──────────────────────────────────────────
  const cached = await getCachedResult(repoId);
  if (cached) return cached;

  // ── Step 2: Fetch source files ────────────────────────────────────────────
  const infraRelevantPaths = filePaths
    .filter(isInfraRelevantFile)
    .slice(0, MAX_FILES_TO_ANALYZE);

  if (infraRelevantPaths.length === 0) {
    logger.info({ repoId, filePaths }, "IaC Predictor: No infra-relevant files found");

    const emptyResult: IacGenerationResult = {
      repoId,
      commitSha,
      environment,
      region,
      detectedPatterns: [],
      hasInfraChanges: false,
      terraform: null,
      cloudformation: null,
      costForecast: {
        totalMonthlyCostUsd: 0,
        totalYearlyCostUsd: 0,
        currency: "USD",
        confidence: "HIGH",
        breakdown: [],
        environmentMultiplier: ENVIRONMENT_MULTIPLIERS[environment],
        forecastedAt: generatedAt,
        freeTierNotice: "No infrastructure-relevant files were changed in this commit.",
      },
      architectureNotes: "No infrastructure-relevant file changes were detected in this commit. Only documentation, test, or configuration files were modified.",
      generatedAt,
      bedrockLatencyMs: 0,
    };

    await setCachedResult(repoId, emptyResult);
    return emptyResult;
  }

  // Fetch file contents in parallel
  const fileContentsResults = await Promise.allSettled(
    infraRelevantPaths.map(async (filePath) => {
      const content = await fetchFileContent(repoOwner, repoName, filePath, accessToken, commitSha);
      return { path: filePath, content };
    })
  );

  const fileContents = fileContentsResults
    .filter(
      (r): r is PromiseFulfilledResult<{ path: string; content: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (fileContents.length === 0) {
    logger.error({ repoId }, "IaC Predictor: All file fetches failed");
    throw new Error("Could not fetch any source files from GitHub for IaC generation.");
  }

  // ── Step 3: Detect AWS patterns ───────────────────────────────────────────
  const allDetectedPatterns: DetectedAwsPattern[] = fileContents.flatMap(
    ({ path: filePath, content }) => detectAwsPatterns(filePath, content)
  );

  // De-duplicate patterns by service name
  const uniquePatterns = Array.from(
    new Map(allDetectedPatterns.map((p) => [`${p.service}:${p.detectedInFile}`, p])).values()
  );

  const hasInfraChanges = uniquePatterns.length > 0;

  logger.info(
    {
      repoId,
      detectedServices: uniquePatterns.map((p) => p.service),
      hasInfraChanges,
    },
    "IaC Predictor: AWS pattern detection complete"
  );

  // ── Step 4: Load previous forecast for delta calculation ──────────────────
  // (We read from DynamoDB even though we just confirmed no live cache above,
  //  because the previous cached result may have been for a different commitSha)
  let previousForecast: CostForecast | undefined;
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const prev = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "IAC_RESULT_PREV" },
      })
    );
    if (prev.Item?.iacResult?.costForecast) {
      previousForecast = prev.Item.iacResult.costForecast as CostForecast;
    }
  } catch {
    // Non-fatal — delta just won't be shown
  }

  // ── Step 5: Build cost forecast ───────────────────────────────────────────
  const costForecast = await buildCostForecast(
    uniquePatterns,
    environment,
    region,
    previousForecast
  );

  logger.info(
    {
      repoId,
      totalMonthlyCost: costForecast.totalMonthlyCostUsd,
      confidence: costForecast.confidence,
    },
    "IaC Predictor: Cost forecast built"
  );

  // ── Step 6: Build and invoke Claude prompts ───────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    infraRelevantPaths,
    fileContents,
    uniquePatterns,
    environment,
    region,
    costForecast
  );

  let responseText: string;
  let latencyMs: number;

  try {
    ({ responseText, latencyMs } = await invokeClaudeForIac(systemPrompt, userPrompt));
  } catch (err: any) {
    logger.error({ repoId, err }, "IaC Predictor: Bedrock invocation failed");
    throw new Error(`IaC generation failed: ${err.message}`);
  }

  // ── Step 7: Parse XML response ────────────────────────────────────────────
  let parsed: ParsedIacOutput;
  try {
    parsed = parseClaudeIacResponse(responseText);
  } catch (err: any) {
    logger.error(
      { repoId, err, responsePreview: responseText.slice(0, 300) },
      "IaC Predictor: XML parse failed"
    );
    throw new Error(`IaC response parsing failed: ${err.message}`);
  }

  // ── Step 8: Build IaC template objects ───────────────────────────────────
  const terraform = buildTerraformTemplate(
    parsed.terraformCode,
    parsed.resourceTypes,
    parsed.requiredInputs,
    environment,
    region
  );

  const cloudformation = buildCloudFormationTemplate(
    parsed.cloudformationCode,
    parsed.resourceTypes,
    parsed.requiredInputs,
    environment
  );

  logger.info(
    {
      repoId,
      hasTerraform: !!terraform,
      hasCloudformation: !!cloudformation,
      resourceTypes: parsed.resourceTypes,
      latencyMs,
    },
    "IaC Predictor: Templates generated"
  );

  // ── Step 9: Assemble final result ─────────────────────────────────────────
  const iacResult: IacGenerationResult = {
    repoId,
    commitSha,
    environment,
    region,
    detectedPatterns: uniquePatterns,
    hasInfraChanges,
    terraform,
    cloudformation,
    costForecast,
    architectureNotes: parsed.architectureNotes,
    generatedAt,
    bedrockLatencyMs: latencyMs,
  };

  // ── Step 10: Cache to DynamoDB ────────────────────────────────────────────
  await setCachedResult(repoId, iacResult);

  // Also persist as "previous" for next run's delta calculation
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Item: {
          PK: `REPO#${repoId}`,
          SK: "IAC_RESULT_PREV",
          iacResult,
          cachedAt: Date.now(),
          TTL: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7-day TTL
        },
      })
    );
  } catch {
    // Non-fatal
  }

  logger.info(
    {
      repoId,
      totalMonthlyCostUsd: costForecast.totalMonthlyCostUsd,
      costDeltaUsd: costForecast.costDeltaUsd,
      hasTerraform: !!terraform,
      hasCloudformation: !!cloudformation,
      latencyMs,
    },
    "IaC Predictor: generateIac() complete"
  );

  return iacResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAMBDA HANDLER EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AWS Lambda handler export.
 * Invoked directly by getCostForecast.ts API handler or githubPush.ts webhook.
 */
export const handler = async (event: GenerateIacInput): Promise<IacGenerationResult> => {
  return generateIac(event);
};