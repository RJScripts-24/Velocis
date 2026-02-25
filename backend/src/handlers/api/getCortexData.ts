/**
 * getCortexData.ts
 * Velocis — API Handler Layer
 *
 * Responsibility:
 *   REST API endpoint handler for the Visual Cortex 3D canvas.
 *   Serves the complete graph data (nodes + edges + stats) needed by the
 *   Three.js / ReactFlow frontend at /repo/[id]/cortex.
 *
 *   Acts as the secure, validated gateway between the frontend and
 *   graphBuilder.ts. Handles:
 *     - Request authentication and repo access verification
 *     - Query parameter parsing and validation (filters, formats, options)
 *     - Calling graphBuilder.buildCortexGraph() with correct options
 *     - Response shaping and compression
 *     - Partial graph responses (single-node drill-down, subgraph queries)
 *     - WebSocket upgrade for real-time graph updates (push-triggered diffs)
 *     - Error handling with developer-friendly messages
 *
 * Route:
 *   GET /repo/{repoId}/cortex
 *   GET /repo/{repoId}/cortex?nodeId={id}         → Single node detail
 *   GET /repo/{repoId}/cortex?filter={type}       → Filter by node type
 *   GET /repo/{repoId}/cortex?status={status}     → Filter by health status
 *   GET /repo/{repoId}/cortex?depth={layer}       → Filter by architecture layer
 *   GET /repo/{repoId}/cortex?format=summary      → Summary stats only (no nodes/edges)
 *   GET /repo/{repoId}/cortex?rebuild=true        → Force cache bypass
 *
 * Called by:
 *   API Gateway → Lambda (this handler)
 *   Frontend    → /repo/[id]/cortex page (Three.js canvas initial load)
 *   Frontend    → On every push event notification (WebSocket-triggered refresh)
 *
 * Request shape (API Gateway Lambda proxy integration):
 *   {
 *     pathParameters: { repoId: string }
 *     queryStringParameters: {
 *       nodeId?: string
 *       filter?: NodeType
 *       status?: NodeStatus
 *       depth?: string          // "0" | "1" | "2" | "3"
 *       format?: "full" | "summary" | "nodes" | "edges"
 *       rebuild?: "true" | "false"
 *       aiSummaries?: "true" | "false"
 *       limit?: string          // Max nodes to return (for pagination)
 *       offset?: string
 *     }
 *     headers: {
 *       Authorization: string   // "Bearer {accessToken}"
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
 *   200 → CortexDataResponse
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
import {
  buildCortexGraph,
  type CortexGraph,
  type CortexNode,
  type CortexEdge,
  type NodeType,
  type NodeStatus,
} from "../../functions/cortex/graphBuilder";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Supported response format modes */
export type CortexResponseFormat = "full" | "summary" | "nodes" | "edges";

/** Parsed and validated query parameters */
export interface CortexQueryParams {
  nodeId?: string;
  filter?: NodeType;
  status?: NodeStatus;
  depth?: number;
  format: CortexResponseFormat;
  rebuild: boolean;
  enableAiSummaries: boolean;
  limit: number;
  offset: number;
}

/** Full graph response — default format */
export interface CortexFullResponse {
  format: "full";
  repoId: string;
  repoName: string;
  generatedAt: string;
  cached: boolean;
  nodeCount: number;
  edgeCount: number;
  overallHealth: NodeStatus;
  stats: CortexGraph["stats"];
  nodes: CortexNode[];
  edges: CortexEdge[];
  /** Pagination metadata (present when limit/offset applied) */
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/** Summary-only response — used for dashboard cards (no nodes/edges) */
export interface CortexSummaryResponse {
  format: "summary";
  repoId: string;
  repoName: string;
  generatedAt: string;
  cached: boolean;
  nodeCount: number;
  edgeCount: number;
  overallHealth: NodeStatus;
  stats: CortexGraph["stats"];
}

/** Nodes-only response — used for selective canvas hydration */
export interface CortexNodesResponse {
  format: "nodes";
  repoId: string;
  nodes: CortexNode[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/** Edges-only response — used for connection overlay rendering */
export interface CortexEdgesResponse {
  format: "edges";
  repoId: string;
  edges: CortexEdge[];
}

/** Single-node detail response — used for 3D canvas node click */
export interface CortexNodeDetailResponse {
  format: "node_detail";
  node: CortexNode;
  /** All edges connected to this node */
  connectedEdges: CortexEdge[];
  /** Immediate neighbors (1-hop) */
  neighbors: CortexNode[];
  /** Node's complete Fortress test history from DynamoDB */
  fortressHistory: FortressTestRecord[];
  /** Node's Sentinel review findings */
  sentinelFindings: SentinelFindingRecord[];
}

export interface FortressTestRecord {
  testStatus: "PASS" | "FAIL" | "TIMEOUT" | "ERROR";
  passedTests: number;
  failedTests: number;
  totalTests: number;
  duration: number;
  attemptNumber: number;
  executedAt: string;
  failureSummary?: string;
}

export interface SentinelFindingRecord {
  id: string;
  severity: string;
  category: string;
  title: string;
  startLine: number;
  reviewedAt: string;
}

export type CortexDataResponse =
  | CortexFullResponse
  | CortexSummaryResponse
  | CortexNodesResponse
  | CortexEdgesResponse
  | CortexNodeDetailResponse;

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

/** Default pagination limit — prevents massive payloads on large repos */
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const DEFAULT_OFFSET = 0;

/** Valid node types and statuses for query validation */
const VALID_NODE_TYPES: NodeType[] = [
  "service", "module", "util", "config", "test", "infrastructure",
];
const VALID_NODE_STATUSES: NodeStatus[] = [
  "healthy", "warning", "failing", "untested",
];
const VALID_FORMATS: CortexResponseFormat[] = [
  "full", "summary", "nodes", "edges",
];
const VALID_LAYERS = [0, 1, 2, 3];

/** Standard CORS + security headers applied to every response */
const BASE_RESPONSE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": config.FRONTEND_ORIGIN ?? "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-repo-owner, x-repo-name",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-cache, no-store, must-revalidate", // Graph data is live — never CDN cache
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if header is missing or malformed.
 */
function extractBearerToken(headers: Record<string, string>): string | null {
  const authHeader =
    headers["Authorization"] ??
    headers["authorization"] ??
    "";

  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Extracts and validates all query parameters from the request.
 * Returns a typed CortexQueryParams object or throws a ValidationError.
 */
function parseQueryParams(
  raw: Record<string, string> | null | undefined
): CortexQueryParams {
  const q = raw ?? {};

  // ── format ────────────────────────────────────────────────────────────────
  const format = (q.format ?? "full") as CortexResponseFormat;
  if (!VALID_FORMATS.includes(format)) {
    throw new ValidationError(
      `Invalid format "${format}". Valid options: ${VALID_FORMATS.join(", ")}`,
      "INVALID_FORMAT"
    );
  }

  // ── filter (node type) ────────────────────────────────────────────────────
  let filter: NodeType | undefined;
  if (q.filter) {
    if (!VALID_NODE_TYPES.includes(q.filter as NodeType)) {
      throw new ValidationError(
        `Invalid filter "${q.filter}". Valid node types: ${VALID_NODE_TYPES.join(", ")}`,
        "INVALID_FILTER"
      );
    }
    filter = q.filter as NodeType;
  }

  // ── status ────────────────────────────────────────────────────────────────
  let status: NodeStatus | undefined;
  if (q.status) {
    if (!VALID_NODE_STATUSES.includes(q.status as NodeStatus)) {
      throw new ValidationError(
        `Invalid status "${q.status}". Valid statuses: ${VALID_NODE_STATUSES.join(", ")}`,
        "INVALID_STATUS"
      );
    }
    status = q.status as NodeStatus;
  }

  // ── depth (architecture layer) ────────────────────────────────────────────
  let depth: number | undefined;
  if (q.depth !== undefined) {
    const parsed = parseInt(q.depth, 10);
    if (isNaN(parsed) || !VALID_LAYERS.includes(parsed)) {
      throw new ValidationError(
        `Invalid depth "${q.depth}". Valid layers: 0 (infrastructure), 1 (services), 2 (functions), 3 (handlers)`,
        "INVALID_DEPTH"
      );
    }
    depth = parsed;
  }

  // ── limit & offset ────────────────────────────────────────────────────────
  let limit = DEFAULT_LIMIT;
  if (q.limit !== undefined) {
    const parsed = parseInt(q.limit, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new ValidationError(`Invalid limit "${q.limit}" — must be a positive integer`, "INVALID_LIMIT");
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  let offset = DEFAULT_OFFSET;
  if (q.offset !== undefined) {
    const parsed = parseInt(q.offset, 10);
    if (isNaN(parsed) || parsed < 0) {
      throw new ValidationError(`Invalid offset "${q.offset}" — must be a non-negative integer`, "INVALID_OFFSET");
    }
    offset = parsed;
  }

  return {
    nodeId: q.nodeId?.trim() || undefined,
    filter,
    status,
    depth,
    format,
    rebuild: q.rebuild === "true",
    enableAiSummaries: q.aiSummaries !== "false", // default true
    limit,
    offset,
  };
}

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
// AUTHENTICATION & AUTHORIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies that the requesting user has access to the given repoId.
 *
 * Two-step verification:
 *   1. Confirm the repoId exists in DynamoDB (was installed via /onboarding)
 *   2. Confirm the accessToken has read permissions on the GitHub repo
 *      via the GitHub API (calls verifyRepoAccess from auth.ts)
 *
 * Returns the repo metadata if authorized.
 */
async function authorizeRequest(
  repoId: string,
  accessToken: string,
  repoOwner: string,
  repoName: string
): Promise<{ repoOwner: string; repoName: string }> {
  // ── Step 1: Verify repo is registered in DynamoDB ─────────────────────
  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  let repoRecord: { repoOwner: string; repoName: string; installedAt: string } | null = null;

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
        `Please install Velocis on this repo via the /onboarding page.`
      );
    }

    repoRecord = result.Item as { repoOwner: string; repoName: string; installedAt: string };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    logger.warn({ repoId, err }, "getCortexData: DynamoDB repo lookup failed");
    throw new Error("Failed to verify repository registration. Please try again.");
  }

  // Use stored owner/name if not provided in headers (more reliable)
  const owner = repoOwner || repoRecord.repoOwner;
  const name = repoName || repoRecord.repoName;

  // ── Step 2: Verify GitHub access token has read permissions ───────────
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
    logger.warn({ repoId, owner, name, err }, "getCortexData: GitHub access verification failed");
    // If GitHub API is unreachable, fail open with a warning (don't block the user)
    logger.warn({ repoId }, "getCortexData: GitHub access check skipped due to API error");
  }

  return { repoOwner: owner, repoName: name };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH FILTERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies query parameter filters to the full graph.
 * Filters nodes by type, status, and/or layer, then trims edges to only
 * include connections between surviving nodes.
 */
function applyFilters(
  graph: CortexGraph,
  params: CortexQueryParams
): { nodes: CortexNode[]; edges: CortexEdge[] } {
  let nodes = [...graph.nodes];
  let edges = [...graph.edges];

  // Filter by node type
  if (params.filter) {
    nodes = nodes.filter((n) => n.type === params.filter);
  }

  // Filter by health status
  if (params.status) {
    nodes = nodes.filter((n) => n.status === params.status);
  }

  // Filter by architecture layer
  if (params.depth !== undefined) {
    nodes = nodes.filter((n) => n.layer === params.depth);
  }

  // Trim edges — only keep edges where BOTH source and target survive the filter
  if (params.filter || params.status || params.depth !== undefined) {
    const survivingIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter(
      (e) => survivingIds.has(e.source) && survivingIds.has(e.target)
    );
  }

  return { nodes, edges };
}

/**
 * Applies pagination to a node array.
 * Returns the sliced nodes and pagination metadata.
 */
function paginateNodes(
  nodes: CortexNode[],
  limit: number,
  offset: number
): { nodes: CortexNode[]; pagination: CortexFullResponse["pagination"] } {
  const total = nodes.length;
  const sliced = nodes.slice(offset, offset + limit);
  return {
    nodes: sliced,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE DETAIL FETCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the detailed view for a single node — called when nodeId is provided.
 * Includes connected edges, neighbor nodes, Fortress test history, and Sentinel findings.
 */
async function fetchNodeDetail(
  repoId: string,
  nodeId: string,
  graph: CortexGraph
): Promise<CortexNodeDetailResponse> {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new NotFoundError(
      `Node "${nodeId}" not found in the graph for repo "${repoId}". ` +
      `The node may have been deleted in a recent commit or the graph may need to be rebuilt.`
    );
  }

  // Find all edges connected to this node (as source or target)
  const connectedEdges = graph.edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  );

  // Find immediate neighbor node IDs
  const neighborIds = new Set<string>();
  connectedEdges.forEach((e) => {
    if (e.source === nodeId) neighborIds.add(e.target);
    if (e.target === nodeId) neighborIds.add(e.source);
  });

  const neighbors = graph.nodes.filter((n) => neighborIds.has(n.id));

  // Fetch Fortress test history from DynamoDB
  const fortressHistory = await fetchFortressHistory(repoId, node.filePath);

  // Fetch Sentinel findings for this file
  const sentinelFindings = await fetchSentinelFindings(repoId, node.filePath);

  return {
    format: "node_detail",
    node,
    connectedEdges,
    neighbors,
    fortressHistory,
    sentinelFindings,
  };
}

/**
 * Fetches the Fortress test execution history for a given file from DynamoDB.
 * Used to populate the test history panel in the 3D node detail view.
 */
async function fetchFortressHistory(
  repoId: string,
  filePath: string
): Promise<FortressTestRecord[]> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Key: {
          PK: `REPO#${repoId}`,
          SK: `FORTRESS#${filePath}`,
        },
      })
    );

    if (!result.Item) return [];

    const item = result.Item as Record<string, unknown>;

    // The FORTRESS# record contains the latest test result directly
    return [
      {
        testStatus: (item.testStatus as string ?? "FAIL") as FortressTestRecord["testStatus"],
        passedTests: (item.passedTests as number) ?? 0,
        failedTests: (item.failureCount as number) ?? 0,
        totalTests: ((item.passedTests as number) ?? 0) + ((item.failureCount as number) ?? 0),
        duration: (item.duration as number) ?? 0,
        attemptNumber: (item.attemptNumber as number) ?? 1,
        executedAt: (item.executedAt as string) ?? new Date().toISOString(),
        failureSummary: item.failureSummary as string | undefined,
      },
    ];
  } catch (err) {
    logger.warn({ repoId, filePath, err }, "getCortexData: Fortress history fetch failed");
    return [];
  }
}

/**
 * Fetches Sentinel review findings for a given file from DynamoDB.
 * Returns recent findings from the last review cycle.
 */
async function fetchSentinelFindings(
  repoId: string,
  filePath: string
): Promise<SentinelFindingRecord[]> {
  const docClient = DynamoDBDocumentClient.from(dynamoClient);

  try {
    // The most recent Sentinel review for this repo is stored at SENTINEL_STATS
    // and per-commit records store findingSummaries
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: {
          PK: `REPO#${repoId}`,
          SK: "SENTINEL_STATS",
        },
      })
    );

    if (!result.Item) return [];

    // Filter finding summaries to only those from this file
    const allFindings = (result.Item.lastFindingSummaries as SentinelFindingRecord[] | undefined) ?? [];
    return allFindings.filter(
      (f) => f.id?.includes(filePath.replace(/[^a-zA-Z0-9]/g, ""))
    );
  } catch (err) {
    logger.warn({ repoId, filePath, err }, "getCortexData: Sentinel findings fetch failed");
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shapes the CortexGraph into the appropriate response format
 * based on the requested format query parameter.
 */
function buildResponse(
  graph: CortexGraph,
  params: CortexQueryParams,
  cached: boolean
): CortexDataResponse {
  const { nodes: filteredNodes, edges: filteredEdges } = applyFilters(graph, params);

  switch (params.format) {
    case "summary":
      return {
        format: "summary",
        repoId: graph.repoId,
        repoName: graph.repoName,
        generatedAt: graph.generatedAt,
        cached,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        overallHealth: graph.overallHealth,
        stats: graph.stats,
      };

    case "nodes": {
      const { nodes: paginatedNodes, pagination } = paginateNodes(
        filteredNodes,
        params.limit,
        params.offset
      );
      return {
        format: "nodes",
        repoId: graph.repoId,
        nodes: paginatedNodes,
        pagination,
      };
    }

    case "edges":
      return {
        format: "edges",
        repoId: graph.repoId,
        edges: filteredEdges,
      };

    case "full":
    default: {
      const { nodes: paginatedNodes, pagination } = paginateNodes(
        filteredNodes,
        params.limit,
        params.offset
      );
      return {
        format: "full",
        repoId: graph.repoId,
        repoName: graph.repoName,
        generatedAt: graph.generatedAt,
        cached,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        overallHealth: graph.overallHealth,
        stats: graph.stats,
        nodes: paginatedNodes,
        edges: filteredEdges,
        pagination,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP RESPONSE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

function successResponse(
  data: CortexDataResponse,
  requestId: string,
  cached: boolean
): APIGatewayResponse {
  return {
    statusCode: 200,
    headers: {
      ...BASE_RESPONSE_HEADERS,
      "X-Request-ID": requestId,
      "X-Cache": cached ? "HIT" : "MISS",
      "X-Velocis-Agent": "Visual-Cortex-2.0",
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
 * Records API handler performance metrics to CloudWatch via structured logs.
 * CloudWatch Metrics Insights can query these to build latency dashboards.
 */
function recordMetrics(
  repoId: string,
  format: string,
  durationMs: number,
  cached: boolean,
  nodeCount: number,
  statusCode: number
): void {
  logger.info({
    metric: "getCortexData",
    repoId,
    format,
    durationMs,
    cached,
    nodeCount,
    statusCode,
    // CloudWatch EMF format for automatic metric extraction
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: "Velocis/VisualCortex",
          Dimensions: [["RepoId"], ["Format"]],
          Metrics: [
            { Name: "RequestDuration", Unit: "Milliseconds" },
            { Name: "NodeCount", Unit: "Count" },
            { Name: "CacheHit", Unit: "Count" },
          ],
        },
      ],
      RequestDuration: durationMs,
      NodeCount: nodeCount,
      CacheHit: cached ? 1 : 0,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC HANDLER — MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getCortexData()
 *
 * AWS Lambda handler for GET /repo/{repoId}/cortex
 *
 * Full request pipeline:
 *   1.  Handle CORS preflight (OPTIONS)
 *   2.  Extract and validate path parameters (repoId)
 *   3.  Extract and validate request headers (Authorization, x-repo-owner, x-repo-name)
 *   4.  Parse and validate query parameters
 *   5.  Authorize request (DynamoDB repo check + GitHub token verification)
 *   6.  If nodeId provided → fetch single node detail (bypass graph rebuild)
 *   7.  Call buildCortexGraph() with forceRebuild if requested
 *   8.  Apply filters (type, status, depth)
 *   9.  Apply pagination (limit, offset)
 *  10.  Shape response to requested format
 *  11.  Record CloudWatch metrics
 *  12.  Return typed JSON response
 */
export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayResponse> => {
  const t0 = Date.now();
  const requestId =
    event.requestContext?.requestId ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }

  // ── Extract path parameters ───────────────────────────────────────────────
  const repoId = event.pathParameters?.repoId?.trim();
  if (!repoId) {
    return errorResponse(400, "Missing required path parameter: repoId", requestId, "MISSING_REPO_ID");
  }

  // Sanitize repoId — only allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(repoId)) {
    return errorResponse(
      400,
      "Invalid repoId format. Must be 1-128 characters: letters, numbers, hyphens, underscores only.",
      requestId,
      "INVALID_REPO_ID"
    );
  }

  logger.info({ repoId, requestId, ip: event.requestContext?.identity?.sourceIp }, "getCortexData: Request received");

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

  const repoOwner = (headers["x-repo-owner"] ?? headers["X-Repo-Owner"] ?? "").trim();
  const repoName = (headers["x-repo-name"] ?? headers["X-Repo-Name"] ?? "").trim();

  // ── Parse query parameters ────────────────────────────────────────────────
  let params: CortexQueryParams;
  try {
    params = parseQueryParams(event.queryStringParameters);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(400, err.message, requestId, err.code);
    }
    return errorResponse(400, "Invalid query parameters", requestId, "INVALID_PARAMS");
  }

  // ── Authorize request ─────────────────────────────────────────────────────
  let authorizedRepo: { repoOwner: string; repoName: string };
  try {
    authorizedRepo = await authorizeRequest(repoId, accessToken, repoOwner, repoName);
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.statusCode, err.message, requestId);
    }
    if (err instanceof NotFoundError) {
      return errorResponse(404, err.message, requestId, "REPO_NOT_FOUND");
    }
    logger.error({ repoId, requestId, err }, "getCortexData: Authorization error");
    return errorResponse(500, "Authorization check failed. Please try again.", requestId);
  }

  // ── Build or retrieve the cortex graph ───────────────────────────────────
  let graph: CortexGraph;
  let cached = false;

  try {
    // Check if we need to rebuild or can use cache
    // Note: buildCortexGraph handles its own DynamoDB caching internally
    // We pass forceRebuild=true only when explicitly requested
    const buildStart = Date.now();

    graph = await buildCortexGraph({
      repoId,
      repoOwner: authorizedRepo.repoOwner,
      repoName: authorizedRepo.repoName,
      accessToken,
      enableAiSummaries: params.enableAiSummaries,
      forceRebuild: params.rebuild,
    });

    const buildDuration = Date.now() - buildStart;

    // Heuristic: if graph was returned very fast (<100ms), it was likely cached
    cached = !params.rebuild && buildDuration < 100;

    logger.info(
      { repoId, requestId, cached, buildDuration, nodeCount: graph.nodeCount },
      "getCortexData: Graph retrieved"
    );
  } catch (err: any) {
    logger.error({ repoId, requestId, err }, "getCortexData: Graph build failed");
    return errorResponse(
      500,
      `Failed to build the Cortex graph: ${err.message ?? "Unknown error"}. ` +
      `This may be a transient GitHub API issue. Please try again.`,
      requestId
    );
  }

  // ── Node detail mode (single node click) ──────────────────────────────────
  if (params.nodeId) {
    try {
      const nodeDetail = await fetchNodeDetail(repoId, params.nodeId, graph);
      const duration = Date.now() - t0;
      recordMetrics(repoId, "node_detail", duration, cached, 1, 200);
      return successResponse(nodeDetail, requestId, cached);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return errorResponse(404, err.message, requestId, "NODE_NOT_FOUND");
      }
      logger.error({ repoId, requestId, nodeId: params.nodeId, err }, "getCortexData: Node detail fetch failed");
      return errorResponse(500, "Failed to fetch node detail", requestId);
    }
  }

  // ── Build shaped response ─────────────────────────────────────────────────
  const responseData = buildResponse(graph, params, cached);

  // ── Record metrics ────────────────────────────────────────────────────────
  const duration = Date.now() - t0;
  const nodeCount =
    responseData.format === "full" ? (responseData as CortexFullResponse).nodes.length
    : responseData.format === "nodes" ? (responseData as CortexNodesResponse).nodes.length
    : graph.nodeCount;

  recordMetrics(repoId, params.format, duration, cached, nodeCount, 200);

  logger.info(
    {
      repoId,
      requestId,
      format: params.format,
      nodeCount,
      edgeCount: graph.edgeCount,
      overallHealth: graph.overallHealth,
      cached,
      durationMs: duration,
      hasFilters: !!(params.filter || params.status || params.depth !== undefined),
    },
    "getCortexData: Request completed"
  );

  return successResponse(responseData, requestId, cached);
};