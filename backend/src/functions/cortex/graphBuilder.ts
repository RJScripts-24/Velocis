/**
 * graphBuilder.ts
 * Velocis — Visual Cortex 2.0
 *
 * Responsibility:
 *   Analyzes a GitHub repository's file tree and dependency graph,
 *   then transforms it into a structured node/edge payload that the
 *   Three.js / ReactFlow frontend can render as a live 3D Codebase City.
 *
 * Called by:
 *   src/handlers/api/getCortexData.ts  (REST endpoint)
 *   src/handlers/webhooks/githubPush.ts (after every push — updates node health)
 *
 * Output consumed by:
 *   Frontend → /repo/[id]/cortex  (Three.js WebGL canvas)
 */

import * as path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { fetchRepoTree, fetchFileContent } from "../../services/github/repoOps";
import { dynamoClient } from "../../services/database/dynamoClient";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type NodeStatus = "healthy" | "warning" | "failing" | "untested";
export type NodeType = "service" | "module" | "util" | "config" | "test" | "infrastructure";

export interface CortexNode {
  id: string;               // Unique: sha or file path hash
  label: string;            // Display name (file/service name)
  filePath: string;         // Full repo path e.g. "src/functions/sentinel/analyzeLogic.ts"
  type: NodeType;
  status: NodeStatus;       // Driven by Fortress TDD results
  language: string;         // "typescript" | "python" | "json" | etc.
  linesOfCode: number;
  lastModified: string;     // ISO timestamp from GitHub
  importCount: number;      // How many other modules this node imports
  dependencyCount: number;  // How many nodes depend on this node
  /** 3D positioning hints (frontend assigns final coordinates) */
  layer: number;            // 0 = infrastructure, 1 = services, 2 = functions, 3 = handlers
  position?: {
    x: number;
    y: number;
    z: number;
  };
  /** AI-generated summary of this file's responsibility */
  aiSummary?: string;
}

export interface CortexEdge {
  id: string;               // `${sourceId}→${targetId}`
  source: string;           // CortexNode.id
  target: string;           // CortexNode.id
  type: "import" | "calls" | "triggers" | "orchestrates";
  strength: number;         // 1–10: how tightly coupled (used for edge thickness in WebGL)
}

export interface CortexGraph {
  repoId: string;
  repoName: string;
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  overallHealth: NodeStatus;
  nodes: CortexNode[];
  edges: CortexEdge[];
  /** Summary stats for the dashboard cards */
  stats: {
    totalFiles: number;
    testedFiles: number;
    failingNodes: number;
    warningNodes: number;
    averageDependencyDepth: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Files/directories to skip — noise with no architectural value */
const IGNORED_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  ".next",
  "coverage",
  ".env",
  "yarn.lock",
  "package-lock.json",
];

/** Maps directory segments to layer numbers for 3D Z-axis grouping */
const LAYER_MAP: Record<string, number> = {
  infrastructure: 0,
  services: 1,
  utils: 1,
  models: 1,
  prompts: 1,
  functions: 2,
  handlers: 3,
  mocks: 0,
  tests: 2,
};

/** Maps file extensions to language labels */
const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".tf": "terraform",
  ".asl.json": "step-functions",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a stable, short ID from a file path.
 * Uses a simple djb2 hash — consistent across runs.
 */
function hashPath(filePath: string): string {
  let hash = 5381;
  for (let i = 0; i < filePath.length; i++) {
    hash = (hash * 33) ^ filePath.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Determines if a file should be ignored based on IGNORED_PATTERNS.
 */
function shouldIgnore(filePath: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => filePath.includes(pattern));
}

/**
 * Infers the NodeType from the file path.
 */
function inferNodeType(filePath: string): NodeType {
  if (filePath.includes("/tests/") || filePath.includes(".test.")) return "test";
  if (filePath.includes("/infrastructure/")) return "infrastructure";
  if (filePath.includes("/handlers/")) return "service";
  if (filePath.includes("/services/")) return "service";
  if (filePath.includes("/functions/")) return "module";
  if (filePath.includes("/utils/")) return "util";
  if (filePath.includes("/models/") || filePath.includes("/prompts/")) return "config";
  return "module";
}

/**
 * Infers the 3D layer from the file path segments.
 */
function inferLayer(filePath: string): number {
  const segments = filePath.split("/");
  for (const segment of segments) {
    if (LAYER_MAP[segment] !== undefined) return LAYER_MAP[segment];
  }
  return 2; // default: functions layer
}

/**
 * Extracts the language from the file extension.
 */
function inferLanguage(filePath: string): string {
  // Handle double extensions like .asl.json
  if (filePath.endsWith(".asl.json")) return LANGUAGE_MAP[".asl.json"];
  const ext = path.extname(filePath);
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

/**
 * Parses static import/require statements from TypeScript/JavaScript source.
 * Returns a list of relative paths that this file imports.
 * This is intentionally static (no AST) to stay Lambda-lightweight.
 */
function extractImports(sourceCode: string, currentFilePath: string): string[] {
  const importRegex =
    /(?:import\s+.*?\s+from\s+['"](.+?)['"]|require\s*\(\s*['"](.+?)['"]\s*\))/g;

  const imports: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(sourceCode)) !== null) {
    const importPath = match[1] ?? match[2];
    // Only track relative imports — skip npm packages & AWS SDK
    if (importPath.startsWith(".")) {
      const dir = path.dirname(currentFilePath);
      const resolved = path.normalize(path.join(dir, importPath));
      imports.push(resolved);
    }
  }

  return imports;
}

/**
 * Counts non-empty, non-comment lines in source code.
 */
function countLinesOfCode(source: string): number {
  return source
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("*");
    }).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SUMMARY GENERATION (Claude 3.5 Sonnet via Bedrock)
// ─────────────────────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: config.AWS_REGION });

/**
 * Calls Claude 3.5 Sonnet to generate a one-line architectural summary
 * for a given file. Used to populate the tooltip in the 3D canvas.
 *
 * Only called for key architectural files (services, handlers, functions)
 * to minimize Bedrock costs.
 */
async function generateAiSummary(
  filePath: string,
  sourceCode: string
): Promise<string> {
  try {
    const truncatedSource = sourceCode.slice(0, 2000); // Keep token cost low
    const prompt = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `You are analyzing a file in the Velocis codebase.
File: ${filePath}

Source (truncated):
\`\`\`
${truncatedSource}
\`\`\`

Respond with ONLY a single sentence (max 20 words) describing what this file does architecturally. No preamble.`,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt),
    });

    const response = await bedrockClient.send(command);
    const parsed = JSON.parse(new TextDecoder().decode(response.body));
    return parsed.content?.[0]?.text?.trim() ?? "No summary available.";
  } catch (err) {
    logger.warn({ filePath, err }, "AI summary generation failed — skipping");
    return "Summary unavailable.";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORTRESS HEALTH STATUS INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the latest test result status for a given file path from DynamoDB.
 * The Fortress TDD pipeline writes results keyed by filePath after each run.
 *
 * Returns "untested" if no Fortress record exists for this file.
 */
async function getFortressStatus(
  repoId: string,
  filePath: string
): Promise<NodeStatus> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_AI_ACTIVITY,
        Key: {
          PK: `REPO#${repoId}`,
          SK: `FORTRESS#${filePath}`,
        },
      })
    );

    if (!result.Item) return "untested";

    const { testStatus, failureCount } = result.Item as {
      testStatus: string;
      failureCount: number;
    };

    if (testStatus === "PASS") return "healthy";
    if (testStatus === "FAIL" && failureCount >= 3) return "failing";
    if (testStatus === "FAIL") return "warning";

    return "untested";
  } catch (err) {
    logger.warn({ repoId, filePath, err }, "DynamoDB Fortress status fetch failed");
    return "untested";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH CONSTRUCTION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STEP 1 — Build raw nodes from the GitHub repo file tree.
 *
 * Fetches every file, reads source, extracts metadata,
 * and enriches with Fortress health status + AI summary.
 */
async function buildNodes(
  repoId: string,
  repoOwner: string,
  repoName: string,
  accessToken: string,
  enableAiSummaries = true
): Promise<{ nodes: CortexNode[]; importMap: Map<string, string[]> }> {
  logger.info({ repoId, repoName }, "Cortex: Fetching repo file tree");

  const tree = await fetchRepoTree(repoOwner, repoName, accessToken);
  const importMap = new Map<string, string[]>(); // nodeId → [importedNodeIds]
  const nodes: CortexNode[] = [];

  // Determine which files get AI summaries (only key architectural files)
  const AI_SUMMARY_ELIGIBLE_PATHS = [
    "/handlers/",
    "/functions/",
    "/services/",
  ];

  for (const file of tree) {
    if (shouldIgnore(file.path)) continue;
    if (file.type !== "blob") continue; // Skip directories

    const nodeId = hashPath(file.path);
    const language = inferLanguage(file.path);
    const nodeType = inferNodeType(file.path);
    const layer = inferLayer(file.path);

    let linesOfCode = 0;
    let imports: string[] = [];
    let aiSummary: string | undefined;

    // Fetch source only for code files (skip binary/large files)
    const isCodeFile = ["typescript", "javascript", "python"].includes(language);

    if (isCodeFile) {
      try {
        const source = await fetchFileContent(
          repoOwner,
          repoName,
          file.path,
          accessToken
        );
        linesOfCode = countLinesOfCode(source);
        imports = extractImports(source, file.path);

        const isEligibleForAi = AI_SUMMARY_ELIGIBLE_PATHS.some((p) =>
          file.path.includes(p)
        );

        if (enableAiSummaries && isEligibleForAi) {
          aiSummary = await generateAiSummary(file.path, source);
        }
      } catch (err) {
        logger.warn({ filePath: file.path, err }, "Could not fetch file content");
      }
    }

    // Fetch Fortress test health from DynamoDB
    const status = await getFortressStatus(repoId, file.path);

    const node: CortexNode = {
      id: nodeId,
      label: path.basename(file.path),
      filePath: file.path,
      type: nodeType,
      status,
      language,
      linesOfCode,
      lastModified: file.lastModified ?? new Date().toISOString(),
      importCount: imports.length,
      dependencyCount: 0, // Calculated in step 2
      layer,
      aiSummary,
    };

    nodes.push(node);
    importMap.set(
      nodeId,
      imports.map((importPath) => hashPath(importPath))
    );
  }

  logger.info({ repoId, nodeCount: nodes.length }, "Cortex: Nodes built");
  return { nodes, importMap };
}

/**
 * STEP 2 — Build edges from the import map and calculate dependency counts.
 */
function buildEdges(
  nodes: CortexNode[],
  importMap: Map<string, string[]>
): CortexEdge[] {
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const dependencyCounter = new Map<string, number>();
  const edges: CortexEdge[] = [];

  for (const [sourceId, targetIds] of importMap.entries()) {
    for (const targetId of targetIds) {
      // Only create edges between nodes that exist in our graph
      if (!nodeIdSet.has(targetId)) continue;
      if (sourceId === targetId) continue; // No self-loops

      const edgeId = `${sourceId}→${targetId}`;

      // Avoid duplicate edges
      if (edges.some((e) => e.id === edgeId)) continue;

      // Determine edge type based on layer relationship
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);

      let edgeType: CortexEdge["type"] = "import";
      if (
        sourceNode?.type === "service" &&
        targetNode?.type === "module"
      ) {
        edgeType = "calls";
      } else if (
        sourceNode?.type === "infrastructure" &&
        targetNode?.type === "service"
      ) {
        edgeType = "orchestrates";
      }

      // Strength: higher if target is a shared utility (many things depend on it)
      const existingDeps = dependencyCounter.get(targetId) ?? 0;
      const strength = Math.min(10, existingDeps + 1);
      dependencyCounter.set(targetId, existingDeps + 1);

      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: edgeType,
        strength,
      });
    }
  }

  // Back-fill dependencyCount on each node
  for (const node of nodes) {
    node.dependencyCount = dependencyCounter.get(node.id) ?? 0;
  }

  return edges;
}

/**
 * STEP 3 — Assign 3D positions to nodes.
 *
 * Uses a layered radial layout:
 * - Z axis = layer (infrastructure at bottom, handlers at top)
 * - X/Y = evenly distributed in a circle per layer
 *
 * The frontend can override these with physics-based simulation (e.g. d3-force-3d),
 * but these serve as stable initial coordinates for SSR and snapshot diffing.
 */
function assign3DPositions(nodes: CortexNode[]): CortexNode[] {
  const layerGroups = new Map<number, CortexNode[]>();

  for (const node of nodes) {
    const group = layerGroups.get(node.layer) ?? [];
    group.push(node);
    layerGroups.set(node.layer, group);
  }

  const LAYER_SPACING = 150; // Z units between layers
  const RADIUS_PER_LAYER = [100, 200, 300, 400]; // X/Y spread per layer

  for (const [layer, group] of layerGroups.entries()) {
    const radius = RADIUS_PER_LAYER[layer] ?? 300;
    const z = layer * LAYER_SPACING;

    group.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      node.position = {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
        z,
      };
    });
  }

  return nodes;
}

/**
 * STEP 4 — Compute overall graph health and stats.
 */
function computeStats(nodes: CortexNode[], edges: CortexEdge[]) {
  const failing = nodes.filter((n) => n.status === "failing").length;
  const warning = nodes.filter((n) => n.status === "warning").length;
  const tested = nodes.filter(
    (n) => n.status === "healthy" || n.status === "failing" || n.status === "warning"
  ).length;

  const totalDeps = nodes.reduce((sum, n) => sum + n.dependencyCount, 0);
  const avgDepth = nodes.length > 0 ? totalDeps / nodes.length : 0;

  let overallHealth: NodeStatus = "healthy";
  if (failing > 0) overallHealth = "failing";
  else if (warning > 0) overallHealth = "warning";
  else if (tested === 0) overallHealth = "untested";

  return {
    stats: {
      totalFiles: nodes.length,
      testedFiles: tested,
      failingNodes: failing,
      warningNodes: warning,
      averageDependencyDepth: Math.round(avgDepth * 100) / 100,
    },
    overallHealth,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHING LAYER (DynamoDB)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — fast enough for "live" feel

async function getCachedGraph(repoId: string): Promise<CortexGraph | null> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Key: { PK: `REPO#${repoId}`, SK: "CORTEX_GRAPH" },
      })
    );

    if (!result.Item) return null;

    const { graph, cachedAt } = result.Item as {
      graph: CortexGraph;
      cachedAt: number;
    };

    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      logger.info({ repoId }, "Cortex cache expired — rebuilding");
      return null;
    }

    logger.info({ repoId }, "Cortex cache hit — returning cached graph");
    return graph;
  } catch (err) {
    logger.warn({ repoId, err }, "Cortex cache read failed — rebuilding");
    return null;
  }
}

async function setCachedGraph(repoId: string, graph: CortexGraph): Promise<void> {
  try {
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_TABLE_REPOSITORIES,
        Item: {
          PK: `REPO#${repoId}`,
          SK: "CORTEX_GRAPH",
          graph,
          cachedAt: Date.now(),
        },
      })
    );
    logger.info({ repoId }, "Cortex graph cached to DynamoDB");
  } catch (err) {
    logger.warn({ repoId, err }, "Cortex cache write failed — non-fatal");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildGraphOptions {
  repoId: string;
  repoOwner: string;
  repoName: string;
  accessToken: string;
  /** Set to false during CI or cost-sensitive runs to skip Bedrock calls */
  enableAiSummaries?: boolean;
  /** Set to true to bypass DynamoDB cache (e.g. on a fresh push event) */
  forceRebuild?: boolean;
}

/**
 * buildCortexGraph()
 *
 * The main exported function consumed by:
 *   - GET /repo/[id]/cortex  → getCortexData.ts handler
 *   - Webhook push event     → githubPush.ts (with forceRebuild: true)
 *
 * Pipeline:
 *   1. Check DynamoDB cache (skip if forceRebuild)
 *   2. Fetch repo tree from GitHub
 *   3. Build CortexNode[] with Fortress health + AI summaries
 *   4. Build CortexEdge[] from static import analysis
 *   5. Assign 3D positions
 *   6. Compute stats & overall health
 *   7. Cache result in DynamoDB
 *   8. Return CortexGraph
 */
export async function buildCortexGraph(
  options: BuildGraphOptions
): Promise<CortexGraph> {
  const {
    repoId,
    repoOwner,
    repoName,
    accessToken,
    enableAiSummaries = true,
    forceRebuild = false,
  } = options;

  logger.info({ repoId, forceRebuild }, "buildCortexGraph() called");

  // ── Cache check ──────────────────────────────────────────────────────────
  if (!forceRebuild) {
    const cached = await getCachedGraph(repoId);
    if (cached) return cached;
  }

  // ── Step 1: Build nodes ──────────────────────────────────────────────────
  const { nodes: rawNodes, importMap } = await buildNodes(
    repoId,
    repoOwner,
    repoName,
    accessToken,
    enableAiSummaries
  );

  // ── Step 2: Build edges ──────────────────────────────────────────────────
  const edges = buildEdges(rawNodes, importMap);

  // ── Step 3: Assign 3D positions ──────────────────────────────────────────
  const positionedNodes = assign3DPositions(rawNodes);

  // ── Step 4: Compute stats ────────────────────────────────────────────────
  const { stats, overallHealth } = computeStats(positionedNodes, edges);

  // ── Assemble final graph ─────────────────────────────────────────────────
  const graph: CortexGraph = {
    repoId,
    repoName,
    generatedAt: new Date().toISOString(),
    nodeCount: positionedNodes.length,
    edgeCount: edges.length,
    overallHealth,
    nodes: positionedNodes,
    edges,
    stats,
  };

  // ── Cache to DynamoDB ────────────────────────────────────────────────────
  await setCachedGraph(repoId, graph);

  logger.info(
    {
      repoId,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      overallHealth,
    },
    "buildCortexGraph() complete"
  );

  return graph;
}