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
import { fetchRepoTree, fetchFileContent } from "../../services/github/repoOps";
import { dynamoClient, getDocClient } from "../../services/database/dynamoClient";
import { invokeClaude } from "../../services/aws/bedrockClient";
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
  /** Resolved file paths this node imports (populated after edge building) */
  importsFrom: string[];
  /** Resolved file paths that import this node (populated after edge building) */
  importedBy: string[];
  /** Top-level exported function / class names extracted from source */
  functions: string[];
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
  "__pycache__",
  ".pyc",
  ".pyo",
  ".pyd",
  ".egg-info",
  "site-packages",
  ".venv",
  "venv",
  ".pytest_cache",
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
 * Fallback regex: extracts relative import paths from JS/TS/Python source.
 * Used when AI analysis is disabled or fails.
 */
function extractImportsFallback(sourceCode: string, currentFilePath: string): string[] {
  const imports: string[] = [];
  const isPython = currentFilePath.endsWith(".py");

  if (isPython) {
    const fromRe = /^\s*from\s+([\w.]+)\s+import/gm;
    const dir = path.dirname(currentFilePath).replace(/\\/g, "/");
    let m: RegExpExecArray | null;
    while ((m = fromRe.exec(sourceCode)) !== null) {
      const mod = m[1];
      if (mod.startsWith(".")) {
        const dots = mod.match(/^\.+/)?.[0].length ?? 1;
        const rest = mod.replace(/^\.+/, "").replace(/\./g, "/");
        let base = dir;
        for (let i = 1; i < dots; i++) base = path.dirname(base).replace(/\\/g, "/");
        imports.push(rest ? `${base}/${rest}` : base);
      } else {
        imports.push(mod.replace(/\./g, "/"));
      }
    }
  } else {
    const re = /(?:import\s+.*?\s+from\s+['"](.+?)['"]|require\s*\(\s*['"](.+?)['"]\s*\))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sourceCode)) !== null) {
      const p = m[1] ?? m[2];
      if (p?.startsWith(".")) {
        const resolved = path.normalize(path.join(path.dirname(currentFilePath), p)).replace(/\\/g, "/");
        imports.push(resolved);
      }
    }
  }
  return imports;
}

/**
 * Fallback regex: extracts top-level function/class names from JS/TS/Python source.
 */
function extractFunctionsFallback(source: string, filePath = ""): string[] {
  const names = new Set<string>();
  const isPython = filePath.endsWith(".py");
  const patterns = isPython
    ? [/^def\s+(\w+)\s*\(/gm, /^async\s+def\s+(\w+)\s*\(/gm, /^class\s+(\w+)[:(]/gm]
    : [
        /export\s+(?:async\s+)?function\s+(\w+)/g,
        /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/g,
        /export\s+class\s+(\w+)/g,
        /^(?:async\s+)?function\s+(\w+)/gm,
        /^const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/gm,
      ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      if (m[1] && m[1].length > 1 && m[1] !== "default") names.add(m[1]);
    }
  }
  return Array.from(names).slice(0, 30);
}

// ─────────────────────────────────────────────────────────────────────────────
// AI FILE ANALYSIS (DeepSeek V3.2 via AWS Bedrock)
// ─────────────────────────────────────────────────────────────────────────────

interface FileAnalysis {
  functions: string[];   // exported / top-level function and class names
  imports: string[];     // raw import paths exactly as written in the source
  summary: string;       // one-sentence architectural description
}

/**
 * Uses DeepSeek V3.2 to analyse a source file and return structured metadata.
 * A single AI call replaces both extractImports + extractFunctionNames + generateAiSummary.
 *
 * The model is instructed to return ONLY a JSON object — no prose, no markdown.
 * Falls back to regex extraction if the call fails or returns unparseable output.
 */
async function analyzeFileWithAI(
  filePath: string,
  sourceCode: string,
): Promise<FileAnalysis> {
  // Truncate to ~3 KB to keep token cost very low
  const snippet = sourceCode.slice(0, 3000);
  const ext = path.extname(filePath);

  try {
    const result = await invokeClaude({
      systemPrompt:
        "You are a code analysis engine. You read source files and return ONLY a JSON object — no markdown, no explanation, no prose. " +
        "The JSON object must have exactly three keys:\n" +
        '  "functions": array of strings — all top-level/exported function and class names defined in this file (max 30)\n' +
        '  "imports": array of strings — the MODULE PATH portion only from every import statement (e.g. "./utils/auth", "../../lib/db", ".models", "flask", "express"). ' +
        'For JS/TS: the string after "from" or in "require()". For Python: the string after "import" or "from" (before "import"). Do NOT include the word "from" or "import" or any symbol names.\n' +
        '  "summary": string — one sentence (max 20 words) describing what this file does architecturally.\n' +
        "Return nothing except the JSON object.",
      messages: [
        {
          role: "user",
          content: `File path: ${filePath}\nLanguage: ${ext}\n\nSource:\n\`\`\`\n${snippet}\n\`\`\`\n\nReturn the JSON object now.`,
        },
      ],
      maxTokens: 400,
      temperature: 0.0,
    });

    // Strip any accidental markdown fences
    const raw = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(raw) as FileAnalysis;

    // Normalise: ensure all fields are the right types
    return {
      functions: Array.isArray(parsed.functions) ? parsed.functions.slice(0, 30) : extractFunctionsFallback(sourceCode, filePath),
      imports:   Array.isArray(parsed.imports)   ? parsed.imports               : extractImportsFallback(sourceCode, filePath),
      summary:   typeof parsed.summary === "string" && parsed.summary.length > 3
                   ? parsed.summary
                   : "No summary available.",
    };
  } catch (err) {
    logger.warn({ filePath, err }, "AI file analysis failed — falling back to regex");
    return {
      functions: extractFunctionsFallback(sourceCode, filePath),
      imports:   extractImportsFallback(sourceCode, filePath),
      summary:   "Summary unavailable.",
    };
  }
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
// AI SUMMARY GENERATION (DeepSeek V3.2 via AWS Bedrock)
// ─────────────────────────────────────────────────────────────────────────────

/**
/**
 * Resolves raw import paths as returned by AI (exactly as written in source)
 * to root-relative file paths, for both JS/TS relative imports and Python
 * relative/absolute imports.
 *
 * Non-relative imports that don't resolve to a known file are kept as-is so
 * the edge-dedup step can drop them when building the graph.
 */
function resolveRawImportPaths(rawPaths: string[], currentFilePath: string): string[] {
  const isPython = currentFilePath.endsWith(".py");
  const dir = path.dirname(currentFilePath).replace(/\\/g, "/");
  const resolved: string[] = [];

  for (const raw of rawPaths) {
    if (!raw || raw.length === 0) continue;

    if (isPython) {
      // Python relative: ".models", "..services", "..utils.db"
      if (raw.startsWith(".")) {
        const dots = raw.match(/^\.+/)?.[0].length ?? 1;
        const rest = raw.replace(/^\.+/, "").replace(/\./g, "/");
        let base = dir;
        for (let i = 1; i < dots; i++) base = path.dirname(base).replace(/\\/g, "/");
        resolved.push(rest ? `${base}/${rest}` : base);
      } else {
        // Absolute Python import: "services.auth" → "services/auth"
        resolved.push(raw.replace(/\./g, "/"));
      }
    } else {
      // JS/TS: relative paths starting with "."
      if (raw.startsWith(".")) {
        const r = path.normalize(path.join(dir, raw)).replace(/\\/g, "/");
        resolved.push(r);
      }
      // Non-relative (npm packages) are intentionally skipped
    }
  }

  return resolved;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORTRESS HEALTH STATUS INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the latest Fortress TDD status for a file.
 *
 * NOTE: The live `velocis-ai-activity` DynamoDB table uses `RepoID`/`CommitHash` as
 * its key schema, not `PK`/`SK`. Fortress writes a separate record per commit rather
 * than per file path, so a file-level lookup is not yet supported.
 * Until the Fortress pipeline is updated to write per-file results we return
 * "untested" immediately to avoid a guaranteed-to-fail DynamoDB round-trip on
 * every file during every graph build.
 */
function getFortressStatus(
  _repoId: string,
  _filePath: string
): Promise<NodeStatus> {
  return Promise.resolve("untested");
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
): Promise<{ nodes: CortexNode[]; importMap: Map<string, string[]>; rawImportPaths: Map<string, string[]> }> {
  logger.info({ repoId, repoName }, "Cortex: Fetching repo file tree");

  const tree = await fetchRepoTree({ repoFullName: `${repoOwner}/${repoName}`, token: accessToken, recursive: true });
  const importMap = new Map<string, string[]>();     // nodeId → [importedNodeIds (hashed)]
  const rawImportPaths = new Map<string, string[]>(); // nodeId → [resolved root-relative file paths]

  // Filter to processable files upfront
  const files = tree.filter(f => f.type === "blob" && !shouldIgnore(f.path));
  logger.info({ repoId, totalFiles: files.length }, "Cortex: Processing files in parallel");

  // Process files in parallel batches to avoid GitHub/Bedrock rate-limit while
  // dramatically cutting wall-clock time vs sequential await.
  const CONCURRENCY = 6;
  const results: CortexNode[] = [];
  const importMapEntries: [string, string[]][] = [];
  const rawImportEntries: [string, string[]][] = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const nodeId = hashPath(file.path);
        const language = inferLanguage(file.path);
        const nodeType = inferNodeType(file.path);
        const layer = inferLayer(file.path);
        const isCodeFile = ["typescript", "javascript", "python"].includes(language);

        let linesOfCode = 0;
        let resolvedImports: string[] = [];
        let functionNames: string[] = [];
        let aiSummary: string | undefined;

        if (isCodeFile) {
          try {
            const source = await fetchFileContent(repoOwner, repoName, file.path, accessToken);
            linesOfCode = countLinesOfCode(source);

            if (enableAiSummaries) {
              const analysis = await analyzeFileWithAI(file.path, source);
              functionNames   = analysis.functions;
              aiSummary       = analysis.summary;
              resolvedImports = resolveRawImportPaths(analysis.imports, file.path);
            } else {
              resolvedImports = extractImportsFallback(source, file.path);
              functionNames   = extractFunctionsFallback(source, file.path);
            }
          } catch (err) {
            logger.warn({ filePath: file.path, err }, "Could not fetch/analyse file");
          }
        }

        // getFortressStatus is a no-op until the Fortress pipeline writes per-file records
        const status = await getFortressStatus(repoId, file.path);

        const node: CortexNode = {
          id: nodeId,
          label: path.basename(file.path),
          filePath: file.path,
          type: nodeType,
          status,
          language,
          linesOfCode,
          lastModified: new Date().toISOString(),
          importCount: resolvedImports.length,
          dependencyCount: 0,
          importsFrom: [],   // Back-filled after edge building
          importedBy: [],    // Back-filled after edge building
          functions: functionNames,
          layer,
          aiSummary,
        };

        return {
          node,
          importEntry:   [nodeId, resolvedImports.map((p) => hashPath(p))] as [string, string[]],
          rawImportEntry: [nodeId, resolvedImports] as [string, string[]],
        };
      })
    );

    for (const r of batchResults) {
      results.push(r.node);
      importMapEntries.push(r.importEntry);
      rawImportEntries.push(r.rawImportEntry);
    }
  }

  for (const [k, v] of importMapEntries)  importMap.set(k, v);
  for (const [k, v] of rawImportEntries)  rawImportPaths.set(k, v);

  const nodes = results;
  logger.info({ repoId, nodeCount: nodes.length }, "Cortex: Nodes built");
  return { nodes, importMap, rawImportPaths };
}

/**
 * STEP 2 — Build edges from the import map and calculate dependency counts.
 */
function buildEdges(
  nodes: CortexNode[],
  importMap: Map<string, string[]>
): CortexEdge[] {
  const nodeIdSet = new Set(nodes.map((n) => n.id));

  // Secondary lookup: imports often omit the file extension (e.g. "./bar" instead of "./bar.ts").
  // Map hashPath(path-without-extension) → node id so we can still resolve them.
  const noExtMap = new Map<string, string>();
  for (const node of nodes) {
    const noExt = node.filePath.replace(/\.[^/.]+$/, "");
    noExtMap.set(hashPath(noExt), node.id);
    // Handle barrel imports: "./utils/index" imported as "./utils"
    if (noExt.endsWith("/index")) {
      noExtMap.set(hashPath(noExt.replace(/\/index$/, "")), node.id);
    }
  }

  const resolveTarget = (rawId: string): string | undefined => {
    if (nodeIdSet.has(rawId)) return rawId;
    return noExtMap.get(rawId);
  };

  const dependencyCounter = new Map<string, number>();
  const edges: CortexEdge[] = [];

  for (const [sourceId, targetIds] of importMap.entries()) {
    for (const rawTargetId of targetIds) {
      const targetId = resolveTarget(rawTargetId);
      // Only create edges between nodes that exist in our graph
      if (!targetId) continue;
      if (sourceId === targetId) continue; // No self-loops

      const edgeId = `${sourceId}→${targetId}`;

      // Avoid duplicate edges
      if (edges.some((e) => e.id === edgeId)) continue;

      // Determine edge type based on layer relationship
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId); // targetId is already resolved

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
    const docClient = getDocClient();
    const result = await docClient.send(
      new GetCommand({
        TableName: config.DYNAMO_REPOSITORIES_TABLE,
        Key: { repoId: `${repoId}#CORTEX_GRAPH` },
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
    const docClient = getDocClient();
    await docClient.send(
      new PutCommand({
        TableName: config.DYNAMO_REPOSITORIES_TABLE,
        Item: {
          repoId: `${repoId}#CORTEX_GRAPH`,
          graph,
          cachedAt: Date.now(),
          updatedAt: new Date().toISOString(),
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
  const { nodes: rawNodes, importMap, rawImportPaths } = await buildNodes(
    repoId,
    repoOwner,
    repoName,
    accessToken,
    enableAiSummaries
  );

  // ── Step 2: Build edges ──────────────────────────────────────────────────
  const edges = buildEdges(rawNodes, importMap);

  // ── Step 2b: Back-fill importsFrom / importedBy on every node ────────────
  // Build lookup tables so we can resolve raw import paths → actual file paths
  const filePathSet = new Set(rawNodes.map((n) => n.filePath));
  const nodeByFilePath = new Map(rawNodes.map((n) => [n.filePath, n]));

  const resolveToFilePath = (rawPath: string): string | null => {
    if (filePathSet.has(rawPath)) return rawPath;
    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".py"]) {
      if (filePathSet.has(rawPath + ext)) return rawPath + ext;
    }
    // Try /index variants: "./utils" → "./utils/index.ts" etc.
    for (const ext of [".ts", ".tsx", ".js", ".py"]) {
      if (filePathSet.has(rawPath + "/index" + ext)) return rawPath + "/index" + ext;
      if (filePathSet.has(rawPath + "/__init__" + ext)) return rawPath + "/__init__" + ext;
    }
    return null;
  };

  for (const node of rawNodes) {
    const rawPaths = rawImportPaths.get(node.id) ?? [];
    node.importsFrom = rawPaths
      .map(resolveToFilePath)
      .filter((p): p is string => p !== null);
  }

  // importedBy is the reverse of importsFrom
  for (const node of rawNodes) {
    for (const importedPath of node.importsFrom) {
      const target = nodeByFilePath.get(importedPath);
      if (target && !target.importedBy.includes(node.filePath)) {
        target.importedBy.push(node.filePath);
      }
    }
  }

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