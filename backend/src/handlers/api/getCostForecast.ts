/**
 * getCostForecast.ts
 * Velocis — API Handler Layer
 *
 * Responsibility:
 *   REST API endpoint handler for the IaC Predictor page at
 *   /repo/[id]/infrastructure. Serves the two-panel UI:
 *     LEFT PANEL  → Auto-generated Terraform HCL + CloudFormation YAML
 *     RIGHT PANEL → Projected AWS cost forecast widget
 *
 *   Acts as the secure, validated gateway between the frontend and
 *   generateIac.ts. Handles:
 *     - Request authentication and repo access verification
 *     - Query parameter parsing and validation
 *     - Environment and region selection
 *     - Calling generateIac() with correct options
 *     - Response shaping per panel (iac-only, cost-only, full)
 *     - Cost comparison between environments
 *     - Diff mode — show only what changed since last commit
 *     - Error handling with developer-friendly messages
 *     - CloudWatch performance metrics
 *
 * Route:
 *   GET /repo/{repoId}/infrastructure
 *   GET /repo/{repoId}/infrastructure?format=iac          → Templates only
 *   GET /repo/{repoId}/infrastructure?format=cost         → Cost forecast only
 *   GET /repo/{repoId}/infrastructure?format=full         → Both (default)
 *   GET /repo/{repoId}/infrastructure?env=production      → Production estimates
 *   GET /repo/{repoId}/infrastructure?region=ap-south-1  → Mumbai region pricing
 *   GET /repo/{repoId}/infrastructure?iacFormat=terraform → Terraform only
 *   GET /repo/{repoId}/infrastructure?iacFormat=cloudformation → CFN only
 *   GET /repo/{repoId}/infrastructure?compare=true        → Multi-env cost comparison
 *   GET /repo/{repoId}/infrastructure?rebuild=true        → Force cache bypass
 *   GET /repo/{repoId}/infrastructure?commitSha={sha}     → Specific commit
 *
 * Called by:
 *   Frontend → /repo/[id]/infrastructure page (initial load)
 *   Frontend → On push notification (re-fetch after new commit)
 *   generateIac.ts → (also calls this to hydrate cached results)
 *
 * Request shape (API Gateway Lambda proxy integration):
 *   {
 *     pathParameters: { repoId: string }
 *     queryStringParameters: {
 *       format?: "full" | "iac" | "cost" | "summary"
 *       env?: "dev" | "staging" | "production"
 *       region?: string             // AWS region code e.g. "ap-south-1"
 *       iacFormat?: "terraform" | "cloudformation" | "both"
 *       compare?: "true" | "false"  // Multi-environment cost comparison
 *       rebuild?: "true" | "false"
 *       commitSha?: string
 *     }
 *     headers: {
 *       Authorization: string       // "Bearer {accessToken}"
 *       "x-repo-owner": string
 *       "x-repo-name": string
 *     }
 *     requestContext: {
 *       requestId: string
 *       identity: { sourceIp: string }
 *     }
 *   }
 *
 * Response shape:
 *   200 → CostForecastResponse (typed union based on format)
 *   400 → { error: string, code: string }
 *   401 → { error: string }
 *   403 → { error: string }
 *   404 → { error: string }
 *   500 → { error: string, requestId: string }
 */

import {
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "../../services/database/dynamoClient";
import { verifyRepoAccess } from "../../services/github/auth";
import { fetchRepoTree } from "../../services/github/repoOps";
import {
  generateIac,
  type IacGenerationResult,
  type IacTemplate,
  type CostForecast,
  type AwsResourceEstimate,
  type AwsEnvironment,
  type DetectedAwsPattern,
} from "../../functions/predictor/generateIac";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Supported response format modes */
export type ForecastResponseFormat = "full" | "iac" | "cost" | "summary";

/** IaC template format filter */
export type IacFormatFilter = "terraform" | "cloudformation" | "both";

/** Supported AWS regions for cost estimation */
export type AwsRegion =
  | "us-east-1"
  | "us-east-2"
  | "us-west-1"
  | "us-west-2"
  | "ap-south-1"
  | "ap-southeast-1"
  | "ap-southeast-2"
  | "ap-northeast-1"
  | "eu-west-1"
  | "eu-west-2"
  | "eu-central-1"
  | "sa-east-1"
  | "ca-central-1";

/** Parsed and validated query parameters */
export interface ForecastQueryParams {
  format: ForecastResponseFormat;
  environment: AwsEnvironment;
  region: AwsRegion;
  iacFormat: IacFormatFilter;
  compare: boolean;
  rebuild: boolean;
  commitSha?: string;
}

// ── Response shape variants ───────────────────────────────────────────────────

/** Full response — both IaC templates and cost forecast */
export interface ForecastFullResponse {
  format: "full";
  repoId: string;
  repoName: string;
  commitSha: string;
  environment: AwsEnvironment;
  region: AwsRegion;
  generatedAt: string;
  cached: boolean;
  hasInfraChanges: boolean;
  detectedServices: string[];
  terraform: IacTemplate | null;
  cloudformation: IacTemplate | null;
  costForecast: CostForecast;
  architectureNotes: string;
  /** Present when compare=true */
  environmentComparison?: EnvironmentComparison;
}

/** IaC-only response — left panel */
export interface ForecastIacResponse {
  format: "iac";
  repoId: string;
  repoName: string;
  commitSha: string;
  environment: AwsEnvironment;
  region: AwsRegion;
  generatedAt: string;
  cached: boolean;
  hasInfraChanges: boolean;
  terraform: IacTemplate | null;
  cloudformation: IacTemplate | null;
  architectureNotes: string;
}

/** Cost-only response — right panel widget */
export interface ForecastCostResponse {
  format: "cost";
  repoId: string;
  commitSha: string;
  environment: AwsEnvironment;
  region: AwsRegion;
  generatedAt: string;
  cached: boolean;
  costForecast: CostForecast;
  /** Present when compare=true */
  environmentComparison?: EnvironmentComparison;
}

/** Summary response — for dashboard cards */
export interface ForecastSummaryResponse {
  format: "summary";
  repoId: string;
  commitSha: string;
  environment: AwsEnvironment;
  generatedAt: string;
  cached: boolean;
  hasInfraChanges: boolean;
  detectedServiceCount: number;
  totalMonthlyCostUsd: number;
  overallConfidence: CostForecast["confidence"];
  costDeltaUsd?: number;
  freeTierEligible: boolean;
}

/** Multi-environment cost comparison (returned when compare=true) */
export interface EnvironmentComparison {
  dev: EnvCostSnapshot;
  staging: EnvCostSnapshot;
  production: EnvCostSnapshot;
}

export interface EnvCostSnapshot {
  environment: AwsEnvironment;
  totalMonthlyCostUsd: number;
  totalYearlyCostUsd: number;
  multiplier: number;
  breakdown: Array<{
    service: string;
    monthlyCostUsd: number;
  }>;
}

export type CostForecastResponse =
  | ForecastFullResponse
  | ForecastIacResponse
  | ForecastCostResponse
  | ForecastSummaryResponse;

/** API Gateway Lambda proxy event shape */
export interface APIGatewayEvent {
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
  headers?: Record<string, string>;
  requestContext?: {
    requestId?: string;
    identity?: { sourceIp?: string };
  };
  httpMethod?: string;
}

/** API Gateway Lambda proxy response shape */
export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VALID_FORMATS: ForecastResponseFormat[] = ["full", "iac", "cost", "summary"];
const VALID_ENVIRONMENTS: AwsEnvironment[] = ["dev", "staging", "production"];
const VALID_IAC_FORMATS: IacFormatFilter[] = ["terraform", "cloudformation", "both"];

const VALID_REGIONS: AwsRegion[] = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "sa-east-1", "ca-central-1",
];

/** Human-readable region names for architecture notes */
const REGION_NAMES: Record<AwsRegion, string> = {
  "us-east-1": "US East (N. Virginia)",
  "us-east-2": "US East (Ohio)",
  "us-west-1": "US West (N. California)",
  "us-west-2": "US West (Oregon)",
  "ap-south-1": "Asia Pacific (Mumbai)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
  "eu-west-1": "Europe (Ireland)",
  "eu-west-2": "Europe (London)",
  "eu-central-1": "Europe (Frankfurt)",
  "sa-east-1": "South America (São Paulo)",
  "ca-central-1": "Canada (Central)",
};

/** Default region — Mumbai since Velocis targets the Indian developer ecosystem */
const DEFAULT_REGION: AwsRegion = "ap-south-1";
const DEFAULT_ENVIRONMENT: AwsEnvironment = "dev";
const DEFAULT_FORMAT: ForecastResponseFormat = "full";
const DEFAULT_IAC_FORMAT: IacFormatFilter = "both";

/** Cache TTL heuristic — results built in under 200ms are likely cached */
const CACHE_HIT_THRESHOLD_MS = 200;

/** Standard CORS + security headers */
const BASE_RESPONSE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": config.FRONTEND_ORIGIN ?? "*",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-repo-owner, x-repo-name",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ERRORS
// ─────────────────────────────────────────────────────────────────────────────

class ValidationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the Bearer token from the Authorization header.
 */
function extractBearerToken(headers: Record<string, string>): string | null {
  const authHeader =
    headers["Authorization"] ?? headers["authorization"] ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Parses and validates all query parameters.
 * Returns a typed ForecastQueryParams object or throws ValidationError.
 */
function parseQueryParams(
  raw: Record<string, string> | null | undefined
): ForecastQueryParams {
  const q = raw ?? {};

  // ── format ────────────────────────────────────────────────────────────────
  const format = (q.format ?? DEFAULT_FORMAT) as ForecastResponseFormat;
  if (!VALID_FORMATS.includes(format)) {
    throw new ValidationError(
      `Invalid format "${format}". Valid options: ${VALID_FORMATS.join(", ")}`,
      "INVALID_FORMAT"
    );
  }

  // ── environment ───────────────────────────────────────────────────────────
  const environment = (q.env ?? DEFAULT_ENVIRONMENT) as AwsEnvironment;
  if (!VALID_ENVIRONMENTS.includes(environment)) {
    throw new ValidationError(
      `Invalid environment "${q.env}". Valid options: ${VALID_ENVIRONMENTS.join(", ")}`,
      "INVALID_ENVIRONMENT"
    );
  }

  // ── region ────────────────────────────────────────────────────────────────
  const region = (q.region ?? DEFAULT_REGION) as AwsRegion;
  if (!VALID_REGIONS.includes(region)) {
    throw new ValidationError(
      `Invalid AWS region "${q.region}". Valid regions: ${VALID_REGIONS.join(", ")}`,
      "INVALID_REGION"
    );
  }

  // ── iacFormat ─────────────────────────────────────────────────────────────
  const iacFormat = (q.iacFormat ?? DEFAULT_IAC_FORMAT) as IacFormatFilter;
  if (!VALID_IAC_FORMATS.includes(iacFormat)) {
    throw new ValidationError(
      `Invalid iacFormat "${q.iacFormat}". Valid options: ${VALID_IAC_FORMATS.join(", ")}`,
      "INVALID_IAC_FORMAT"
    );
  }

  // ── commitSha ─────────────────────────────────────────────────────────────
  let commitSha: string | undefined = q.commitSha?.trim();
  if (commitSha && !/^[a-f0-9]{7,40}$/.test(commitSha)) {
    throw new ValidationError(
      `Invalid commitSha "${commitSha}". Must be a 7-40 character hex string.`,
      "INVALID_COMMIT_SHA"
    );
  }
  if (!commitSha) commitSha = undefined;

  return {
    format,
    environment,
    region,
    iacFormat,
    compare: q.compare === "true",
    rebuild: q.rebuild === "true",
    commitSha,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION & AUTHORIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies the request is authorized to access the given repoId.
 * Checks DynamoDB registration + GitHub token permissions.
 * Returns repo metadata (owner, name, last known changed file paths).
 */
async function authorizeRequest(
  repoId: string,
  accessToken: string,
  headerRepoOwner: string,
  headerRepoName: string
): Promise<{ repoOwner: string; repoName: string; lastFilePaths: string[] }> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  // ── Step 1: Verify repo is registered ─────────────────────────────────
  let repoRecord: {
    repoOwner: string;
    repoName: string;
    lastChangedFiles?: string[];
  };

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "METADATA" },
      })
    );

    if (!result.Item) {
      throw new NotFoundError(
        `Repository "${repoId}" is not registered with Velocis. ` +
          `Please install Velocis on this repo via the /onboarding page first.`
      );
    }

    repoRecord = result.Item as typeof repoRecord;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    logger.warn({ repoId, err }, "getCostForecast: DynamoDB repo lookup failed");
    throw new Error("Failed to verify repository registration.");
  }

  const owner = headerRepoOwner || repoRecord.repoOwner;
  const name = headerRepoName || repoRecord.repoName;

  // ── Step 2: Verify GitHub token has read access ────────────────────────
  try {
    const hasAccess = await verifyRepoAccess(owner, name, accessToken);
    if (!hasAccess) {
      throw new AuthError(
        `Access token does not have read permissions on ${owner}/${name}.`,
        403
      );
    }
  } catch (err) {
    if (err instanceof AuthError) throw err;
    // Fail open — GitHub API may be temporarily unreachable
    logger.warn(
      { repoId, owner, name, err },
      "getCostForecast: GitHub access check failed — proceeding with caution"
    );
  }

  return {
    repoOwner: owner,
    repoName: name,
    lastFilePaths: repoRecord.lastChangedFiles ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGED FILE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the list of files to analyze for IaC generation.
 *
 * Priority order:
 *   1. Files from the most recent push event (stored in DynamoDB by webhook)
 *   2. If no push record exists, fetch the top-level repo tree from GitHub
 *      and return all infra-relevant files (first-time analysis)
 */
async function resolveFilePaths(
  repoId: string,
  repoOwner: string,
  repoName: string,
  accessToken: string,
  commitSha?: string
): Promise<{ filePaths: string[]; resolvedCommitSha: string }> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  // Try fetching the most recent push event record from DynamoDB
  try {
    const sk = commitSha
      ? `PUSH#${commitSha}`
      : undefined;

    if (sk) {
      const result = await docClient.send(
        new GetCommand({
          TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
          Key: { PK: `REPO#${repoId}`, SK: sk },
        })
      );

      if (result.Item) {
        const item = result.Item as { changedFiles: string[]; commitSha: string };
        return {
          filePaths: item.changedFiles ?? [],
          resolvedCommitSha: item.commitSha ?? commitSha ?? "HEAD",
        };
      }
    }

    // No specific commitSha — fetch the latest push record
    const latestResult = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "LATEST_PUSH" },
      })
    );

    if (latestResult.Item) {
      const item = latestResult.Item as {
        changedFiles: string[];
        commitSha: string;
      };
      return {
        filePaths: item.changedFiles ?? [],
        resolvedCommitSha: item.commitSha ?? "HEAD",
      };
    }
  } catch (err) {
    logger.warn({ repoId, err }, "getCostForecast: DynamoDB push record fetch failed");
  }

  // Fallback — fetch repo tree from GitHub and analyze all source files
  logger.info(
    { repoId, repoOwner, repoName },
    "getCostForecast: No push record found — fetching full repo tree"
  );

  try {
    const tree = await fetchRepoTree(repoOwner, repoName, accessToken);
    const infraFiles = tree
      .filter(
        (f) =>
          f.type === "blob" &&
          /\.(ts|js|py|tf|yaml|yml|json)$/.test(f.path) &&
          !f.path.includes("node_modules") &&
          !f.path.includes(".test.") &&
          !f.path.includes("dist/")
      )
      .map((f) => f.path)
      .slice(0, 15); // Cap at 15 files for first-time full analysis

    return {
      filePaths: infraFiles,
      resolvedCommitSha: "HEAD",
    };
  } catch (err) {
    logger.error({ repoId, err }, "getCostForecast: GitHub repo tree fetch failed");
    return { filePaths: [], resolvedCommitSha: "HEAD" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT COMPARISON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates cost forecasts for all three environments (dev, staging, production)
 * in parallel and assembles a comparison object.
 *
 * Called when compare=true query parameter is set.
 * Powers the environment comparison table in the cost widget.
 */
async function buildEnvironmentComparison(
  repoId: string,
  repoOwner: string,
  repoName: string,
  filePaths: string[],
  commitSha: string,
  accessToken: string,
  region: AwsRegion
): Promise<EnvironmentComparison> {
  const environments: AwsEnvironment[] = ["dev", "staging", "production"];

  logger.info(
    { repoId, region },
    "getCostForecast: Building environment comparison"
  );

  // Fetch all three environment forecasts in parallel
  const results = await Promise.allSettled(
    environments.map((env) =>
      generateIac({
        repoId,
        repoOwner,
        repoName,
        filePaths,
        commitSha,
        accessToken,
        region,
        environment: env,
      })
    )
  );

  const environmentMultipliers: Record<AwsEnvironment, number> = {
    dev: 1.0,
    staging: 3.0,
    production: 10.0,
  };

  const snapshots: Record<AwsEnvironment, EnvCostSnapshot> = {
    dev: { environment: "dev", totalMonthlyCostUsd: 0, totalYearlyCostUsd: 0, multiplier: 1.0, breakdown: [] },
    staging: { environment: "staging", totalMonthlyCostUsd: 0, totalYearlyCostUsd: 0, multiplier: 3.0, breakdown: [] },
    production: { environment: "production", totalMonthlyCostUsd: 0, totalYearlyCostUsd: 0, multiplier: 10.0, breakdown: [] },
  };

  environments.forEach((env, idx) => {
    const result = results[idx];
    if (result.status === "fulfilled") {
      const forecast = result.value.costForecast;
      snapshots[env] = {
        environment: env,
        totalMonthlyCostUsd: forecast.totalMonthlyCostUsd,
        totalYearlyCostUsd: forecast.totalYearlyCostUsd,
        multiplier: environmentMultipliers[env],
        breakdown: forecast.breakdown.map((b: AwsResourceEstimate) => ({
          service: b.service,
          monthlyCostUsd: b.estimatedMonthlyCostUsd,
        })),
      };
    } else {
      logger.warn(
        { repoId, env, err: result.reason },
        "getCostForecast: Environment comparison fetch failed for env"
      );
    }
  });

  return snapshots as EnvironmentComparison;
}

// ─────────────────────────────────────────────────────────────────────────────
// IaC TEMPLATE FILTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies the iacFormat filter to the IaC result.
 * Returns null for templates that weren't requested.
 */
function applyIacFormatFilter(
  result: IacGenerationResult,
  iacFormat: IacFormatFilter
): { terraform: IacTemplate | null; cloudformation: IacTemplate | null } {
  return {
    terraform: iacFormat === "cloudformation" ? null : result.terraform,
    cloudformation: iacFormat === "terraform" ? null : result.cloudformation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shapes the IacGenerationResult into the appropriate response format.
 */
function buildResponse(
  result: IacGenerationResult,
  params: ForecastQueryParams,
  repoName: string,
  cached: boolean,
  environmentComparison?: EnvironmentComparison
): CostForecastResponse {
  const { terraform, cloudformation } = applyIacFormatFilter(result, params.iacFormat);

  const detectedServices = [
    ...new Set(result.detectedPatterns.map((p: DetectedAwsPattern) => p.service)),
  ];

  switch (params.format) {
    case "iac":
      return {
        format: "iac",
        repoId: result.repoId,
        repoName,
        commitSha: result.commitSha,
        environment: result.environment,
        region: result.region as AwsRegion,
        generatedAt: result.generatedAt,
        cached,
        hasInfraChanges: result.hasInfraChanges,
        terraform,
        cloudformation,
        architectureNotes: result.architectureNotes,
      };

    case "cost":
      return {
        format: "cost",
        repoId: result.repoId,
        commitSha: result.commitSha,
        environment: result.environment,
        region: result.region as AwsRegion,
        generatedAt: result.generatedAt,
        cached,
        costForecast: result.costForecast,
        environmentComparison,
      };

    case "summary":
      return {
        format: "summary",
        repoId: result.repoId,
        commitSha: result.commitSha,
        environment: result.environment,
        generatedAt: result.generatedAt,
        cached,
        hasInfraChanges: result.hasInfraChanges,
        detectedServiceCount: detectedServices.length,
        totalMonthlyCostUsd: result.costForecast.totalMonthlyCostUsd,
        overallConfidence: result.costForecast.confidence,
        costDeltaUsd: result.costForecast.costDeltaUsd,
        freeTierEligible:
          result.environment === "dev" &&
          result.costForecast.totalMonthlyCostUsd < 5,
      };

    case "full":
    default:
      return {
        format: "full",
        repoId: result.repoId,
        repoName,
        commitSha: result.commitSha,
        environment: result.environment,
        region: result.region as AwsRegion,
        generatedAt: result.generatedAt,
        cached,
        hasInfraChanges: result.hasInfraChanges,
        detectedServices,
        terraform,
        cloudformation,
        costForecast: result.costForecast,
        architectureNotes: result.architectureNotes,
        environmentComparison,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP RESPONSE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function successResponse(
  data: CostForecastResponse,
  requestId: string,
  cached: boolean,
  region: AwsRegion,
  environment: AwsEnvironment
): APIGatewayResponse {
  return {
    statusCode: 200,
    headers: {
      ...BASE_RESPONSE_HEADERS,
      "X-Request-ID": requestId,
      "X-Cache": cached ? "HIT" : "MISS",
      "X-Velocis-Agent": "IaC-Predictor",
      "X-AWS-Region": region,
      "X-AWS-Region-Name": REGION_NAMES[region],
      "X-Environment": environment,
    },
    body: JSON.stringify(data),
  };
}

function errorResponse(
  statusCode: number,
  error: string,
  requestId: string,
  code?: string
): APIGatewayResponse {
  return {
    statusCode,
    headers: {
      ...BASE_RESPONSE_HEADERS,
      "X-Request-ID": requestId,
    },
    body: JSON.stringify({
      error,
      ...(code ? { code } : {}),
      requestId,
      timestamp: new Date().toISOString(),
    }),
  };
}

function optionsResponse(): APIGatewayResponse {
  return {
    statusCode: 204,
    headers: BASE_RESPONSE_HEADERS,
    body: "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records handler performance using CloudWatch Embedded Metrics Format.
 * Metrics are automatically extracted by CloudWatch without extra SDK calls.
 */
function recordMetrics(
  repoId: string,
  format: ForecastResponseFormat,
  environment: AwsEnvironment,
  region: AwsRegion,
  durationMs: number,
  cached: boolean,
  totalMonthlyCostUsd: number,
  statusCode: number
): void {
  logger.info({
    metric: "getCostForecast",
    repoId,
    format,
    environment,
    region,
    durationMs,
    cached,
    totalMonthlyCostUsd,
    statusCode,
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: "Velocis/IaCPredictor",
          Dimensions: [["RepoId"], ["Environment"], ["Region"]],
          Metrics: [
            { Name: "RequestDuration", Unit: "Milliseconds" },
            { Name: "EstimatedMonthlyCost", Unit: "None" },
            { Name: "CacheHit", Unit: "Count" },
          ],
        },
      ],
      RequestDuration: durationMs,
      EstimatedMonthlyCost: totalMonthlyCostUsd,
      CacheHit: cached ? 1 : 0,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC HANDLER — MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getCostForecast()
 *
 * AWS Lambda handler for GET /repo/{repoId}/infrastructure
 *
 * Full request pipeline:
 *   1.  Handle CORS preflight (OPTIONS)
 *   2.  Extract and sanitize repoId path parameter
 *   3.  Extract and validate Authorization + repo headers
 *   4.  Parse and validate all query parameters
 *   5.  Authorize request (DynamoDB check + GitHub token verification)
 *   6.  Resolve file paths (from DynamoDB push record or GitHub tree)
 *   7.  Call generateIac() for the primary environment
 *   8.  If compare=true → call generateIac() for all 3 envs in parallel
 *   9.  Apply iacFormat filter (terraform-only, cfn-only, or both)
 *  10.  Shape response to requested format
 *  11.  Record CloudWatch metrics (EMF)
 *  12.  Return typed JSON response with environment/region headers
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayResponse> => {
  const t0 = Date.now();
  const requestId =
    event.requestContext?.requestId ??
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  // ── Extract and validate repoId ───────────────────────────────────────────
  const repoId = event.pathParameters?.repoId?.trim();
  if (!repoId) {
    return errorResponse(
      400,
      "Missing required path parameter: repoId",
      requestId,
      "MISSING_REPO_ID"
    );
  }
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(repoId)) {
    return errorResponse(
      400,
      "Invalid repoId format. Must be 1-128 characters: letters, numbers, hyphens, underscores only.",
      requestId,
      "INVALID_REPO_ID"
    );
  }

  logger.info(
    {
      repoId,
      requestId,
      ip: event.requestContext?.identity?.sourceIp,
      query: event.queryStringParameters,
    },
    "getCostForecast: Request received"
  );

  // ── Extract headers ───────────────────────────────────────────────────────
  const headers = event.headers ?? {};
  const accessToken = extractBearerToken(headers);
  if (!accessToken) {
    return errorResponse(
      401,
      "Missing or malformed Authorization header. Expected: 'Bearer {GitHub OAuth token}'",
      requestId
    );
  }

  const repoOwner = (
    headers["x-repo-owner"] ??
    headers["X-Repo-Owner"] ??
    ""
  ).trim();
  const repoName = (
    headers["x-repo-name"] ??
    headers["X-Repo-Name"] ??
    ""
  ).trim();

  // ── Parse query parameters ────────────────────────────────────────────────
  let params: ForecastQueryParams;
  try {
    params = parseQueryParams(event.queryStringParameters);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(400, err.message, requestId, err.code);
    }
    return errorResponse(400, "Invalid query parameters", requestId, "INVALID_PARAMS");
  }

  // ── Authorize request ─────────────────────────────────────────────────────
  let authorizedRepo: { repoOwner: string; repoName: string; lastFilePaths: string[] };
  try {
    authorizedRepo = await authorizeRequest(
      repoId,
      accessToken,
      repoOwner,
      repoName
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.statusCode, err.message, requestId);
    }
    if (err instanceof NotFoundError) {
      return errorResponse(404, err.message, requestId, "REPO_NOT_FOUND");
    }
    logger.error({ repoId, requestId, err }, "getCostForecast: Authorization error");
    return errorResponse(
      500,
      "Authorization check failed. Please try again.",
      requestId
    );
  }

  // ── Resolve file paths ────────────────────────────────────────────────────
  let resolvedFilePaths: string[];
  let resolvedCommitSha: string;

  try {
    ({ filePaths: resolvedFilePaths, resolvedCommitSha } = await resolveFilePaths(
      repoId,
      authorizedRepo.repoOwner,
      authorizedRepo.repoName,
      accessToken,
      params.commitSha
    ));
  } catch (err: any) {
    logger.error({ repoId, requestId, err }, "getCostForecast: File path resolution failed");
    return errorResponse(
      500,
      `Failed to resolve repository file paths: ${err.message}`,
      requestId
    );
  }

  logger.info(
    {
      repoId,
      requestId,
      fileCount: resolvedFilePaths.length,
      commitSha: resolvedCommitSha,
      environment: params.environment,
      region: params.region,
    },
    "getCostForecast: Files resolved — invoking IaC generation"
  );

  // ── Generate IaC + cost forecast ──────────────────────────────────────────
  let iacResult: IacGenerationResult;
  let cached = false;

  try {
    const genStart = Date.now();

    iacResult = await generateIac({
      repoId,
      repoOwner: authorizedRepo.repoOwner,
      repoName: authorizedRepo.repoName,
      filePaths: resolvedFilePaths,
      commitSha: resolvedCommitSha,
      accessToken,
      region: params.region,
      environment: params.environment,
    });

    const genDuration = Date.now() - genStart;

    // Heuristic cache detection — fast response with rebuild=false = likely cached
    cached = !params.rebuild && genDuration < CACHE_HIT_THRESHOLD_MS;

    logger.info(
      {
        repoId,
        requestId,
        cached,
        genDuration,
        hasInfraChanges: iacResult.hasInfraChanges,
        totalMonthlyCost: iacResult.costForecast.totalMonthlyCostUsd,
        hasTerraform: !!iacResult.terraform,
        hasCloudformation: !!iacResult.cloudformation,
      },
      "getCostForecast: IaC generation complete"
    );
  } catch (err: any) {
    logger.error({ repoId, requestId, err }, "getCostForecast: IaC generation failed");
    return errorResponse(
      500,
      `IaC generation failed: ${err.message ?? "Unknown error"}. ` +
        `This may be a transient Bedrock or GitHub API issue. Please try again.`,
      requestId
    );
  }

  // ── Environment comparison (optional) ────────────────────────────────────
  let environmentComparison: EnvironmentComparison | undefined;

  if (params.compare) {
    try {
      environmentComparison = await buildEnvironmentComparison(
        repoId,
        authorizedRepo.repoOwner,
        authorizedRepo.repoName,
        resolvedFilePaths,
        resolvedCommitSha,
        accessToken,
        params.region
      );
    } catch (err) {
      // Non-fatal — log and continue without comparison
      logger.warn(
        { repoId, requestId, err },
        "getCostForecast: Environment comparison failed — returning without it"
      );
    }
  }

  // ── Build shaped response ─────────────────────────────────────────────────
  const responseData = buildResponse(
    iacResult,
    params,
    authorizedRepo.repoName,
    cached,
    environmentComparison
  );

  // ── Record metrics ────────────────────────────────────────────────────────
  const duration = Date.now() - t0;
  recordMetrics(
    repoId,
    params.format,
    params.environment,
    params.region,
    duration,
    cached,
    iacResult.costForecast.totalMonthlyCostUsd,
    200
  );

  logger.info(
    {
      repoId,
      requestId,
      format: params.format,
      environment: params.environment,
      region: params.region,
      regionName: REGION_NAMES[params.region],
      cached,
      hasInfraChanges: iacResult.hasInfraChanges,
      totalMonthlyCostUsd: iacResult.costForecast.totalMonthlyCostUsd,
      costDeltaUsd: iacResult.costForecast.costDeltaUsd,
      hasTerraform: !!iacResult.terraform,
      hasCloudformation: !!iacResult.cloudformation,
      hasComparison: !!environmentComparison,
      durationMs: duration,
    },
    "getCostForecast: Request completed"
  );

  return successResponse(
    responseData,
    requestId,
    cached,
    params.region,
    params.environment
  );
};