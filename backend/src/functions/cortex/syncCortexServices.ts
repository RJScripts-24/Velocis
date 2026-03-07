/**
 * syncCortexServices.ts
 * Velocis — Visual Cortex Service-Level Aggregator
 *
 * Responsibility:
 *   Transforms the file-level CortexGraph produced by graphBuilder.ts into
 *   the service-level rows expected by the frontend 3D canvas.
 *
 *   The frontend page (CortexPage.tsx) calls GET /repos/:repoId/cortex/services
 *   which is handled by getCortexServices.ts. That handler reads from CORTEX_TABLE
 *   filtering on recordType = "SERVICE". This module is the ONLY writer of those
 *   rows — bridging the gap between the file-level AST and the service-map view.
 *
 * Data Flow:
 *   graphBuilder.buildCortexGraph() → CortexGraph { nodes[], edges[] }
 *       ↓
 *   syncCortexServices(repoId, graph) ← THIS MODULE
 *       ↓
 *   CORTEX_TABLE rows  (recordType = "SERVICE", one row per logical service)
 *   TIMELINE_TABLE row (one "System Scan" event per sync)
 *
 * Called by:
 *   - githubPush.ts   → after buildCortexGraph succeeds in the push pipeline
 *   - installRepo.ts  → during the "Activating Visual Cortex" install step
 */

import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand, QueryCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CortexGraph, CortexNode, CortexEdge } from "./graphBuilder";
import { getDocClient } from "../../services/database/dynamoClient";
import { invokeClaude } from "../../services/aws/bedrockClient";
import { logger } from "../../utils/logger";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMO CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const docClient = getDocClient();

const CORTEX_TABLE = process.env.CORTEX_TABLE ?? "velocis-cortex";
const TIMELINE_TABLE = process.env.TIMELINE_TABLE ?? "velocis-timeline";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — Internal to this module
// ─────────────────────────────────────────────────────────────────────────────

/** A logical microservice group derived from file-level CortexNodes */
interface ServiceGroup {
    name: string;
    layer: "edge" | "compute" | "data";
    type: "api" | "worker" | "database" | "cache" | "frontend";
    nodes: CortexNode[];
}

/** The DynamoDB row shape written to CORTEX_TABLE (matches what getCortexServices.ts reads) */
interface CortexServiceRow {
    id: string;                      // DynamoDB partition key — "REPO#<repoId>#SVC#<serviceId>"
    repoId: string;
    recordType: "SERVICE";           // getCortexServices.ts filters on this
    serviceId: number;               // Numeric ID used by the frontend
    name: string;
    status: "healthy" | "warning" | "critical";
    layer: "edge" | "compute" | "data";
    position: { x: number; y: number; z: number };
    connections: number[];           // Array of other serviceIds this connects to
    p95Latency: string;              // e.g. "142ms"
    errorRatePct: number;            // e.g. 0.3
    sparkline: number[];             // 10-element array for the miniature chart
    testsTotal: number;
    testsPassing: number;
    testsErrors: number;
    lastDeployedAt: string;
    updatedAt: string;
    
    // Enhanced metrics for ReactFlow view
    metrics: {
        linesOfCode: number;
        fileCount: number;
        complexity: number;           // 0-100 scale
        dependenciesIn: number;
        dependenciesOut: number;
        lastModified?: string;
    };
    files: string[];                  // List of file paths in this service
    health: {
        score: number;                // 0-100
        issues: string[];
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC HASH — Generates stable numeric values from a string seed
// ─────────────────────────────────────────────────────────────────────────────

function djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/** Returns a pseudo-random float in [0, 1) seeded from the input string */
function seededRandom(seed: string, index = 0): number {
    return Math.abs(Math.sin(djb2Hash(seed) + index * 127.1)) % 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY GENERATORS — Deterministic mock telemetry based on code health
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a 10-element sparkline array.
 * Healthy services get low, stable values; unhealthy ones get volatile spikes.
 */
function generateSparkline(seed: string, isHealthy: boolean): number[] {
    const baseline = isHealthy ? 15 : 55;
    const variance = isHealthy ? 12 : 35;
    return Array.from({ length: 10 }, (_, i) =>
        Math.floor(baseline + seededRandom(seed, i) * variance)
    );
}

/**
 * Generates a realistic p95 latency string based on health status.
 * Healthy: 18ms–130ms. Degraded: 200ms–900ms.
 */
function generateP95(seed: string, status: string): string {
    const r = seededRandom(seed, 42);
    if (status === "healthy") return `${Math.floor(18 + r * 112)}ms`;
    if (status === "warning") return `${Math.floor(200 + r * 300)}ms`;
    return `${Math.floor(500 + r * 400)}ms`; // critical
}

/**
 * Generates a realistic error rate percentage.
 * Healthy: 0.01%–0.5%. Warning: 1%–5%. Critical: 5%–15%.
 */
function generateErrorRate(seed: string, status: string): number {
    const r = seededRandom(seed, 99);
    if (status === "healthy") return Number((0.01 + r * 0.49).toFixed(2));
    if (status === "warning") return Number((1 + r * 4).toFixed(1));
    return Number((5 + r * 10).toFixed(1)); // critical
}

/**
 * Checks if a file should be skipped (cache, build artifacts, etc.)
 */
function shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [
        '/.cache/',
        '/__pycache__/',
        '/node_modules/',
        '/dist/',
        '/build/',
        '/.next/',
        '/coverage/',
        '/.vscode/',
        '/.idea/',
        '/tmp/',
        '/temp/',
        '.DS_Store',
        'Thumbs.db',
    ];
    
    const skipExtensions = [
        '.pyc',
        '.pyo',
        '.pyd',
        '.so',
        '.dylib',
        '.dll',
    ];
    
    // Check directory patterns
    if (skipPatterns.some(pattern => filePath.includes(pattern))) {
        return true;
    }
    
    // Check file extensions
    return skipExtensions.some(ext => filePath.endsWith(ext));
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE GROUPING — Maps file-level nodes into logical microservices
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS for adaptive grouping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if any segment of the path matches one of the given keyword dirs.
 * The match is case-insensitive.
 */
function pathContainsDir(segments: string[], dirs: string[]): boolean {
    const lower = segments.map(s => s.toLowerCase());
    return dirs.some(d => lower.includes(d.toLowerCase()));
}

/** Returns the segment immediately after the first matching dir keyword. */
function segmentAfterDir(segments: string[], dirs: string[]): string {
    const lower = segments.map(s => s.toLowerCase());
    for (const d of dirs) {
        const idx = lower.indexOf(d.toLowerCase());
        if (idx !== -1 && segments[idx + 1]) {
            // strip file extension if it's a file name
            const next = segments[idx + 1];
            return next.includes(".") ? next.split(".")[0] : next;
        }
    }
    return "core";
}

/**
 * Guesses the layer (edge / compute / data) from a directory name.
 * Used for the top-level-dir fallback when no well-known pattern matches.
 */
function guessLayer(dirName: string): ServiceGroup["layer"] {
    const d = dirName.toLowerCase();
    if (/^(api|gateway|routes?|router|endpoint|handler|controller|entry|server|web|http|rest|graphql|grpc|frontend|ui|client|view|page|template|static|public|asset)/.test(d)) return "edge";
    if (/^(db|database|data|store|storage|model|entity|schema|migration|repository|repo|seeder|seed|dynamo|mongo|postgres|mysql|redis|cache|persist|orm|prisma|knex)/.test(d)) return "data";
    return "compute";
}

/** Guesses the service type from a directory name. */
function guessType(dirName: string): ServiceGroup["type"] {
    const d = dirName.toLowerCase();
    if (/^(api|route|router|controller|handler|endpoint|gateway|rest|graphql|grpc)/.test(d)) return "api";
    if (/^(db|database|data|store|storage|model|entity|schema|migration|repository|repo|dynamo|mongo|postgres|mysql|redis|cache|persist)/.test(d)) return "database";
    if (/^(frontend|ui|client|view|page|template|component)/.test(d)) return "frontend";
    return "worker";
}

/** Generic roots that shouldn't be used as service names by themselves — we look one level deeper. */
const GENERIC_ROOTS = new Set(["src", "source", "app", "main", "core", "code", "pkg", "packages", "apps", "modules", "lib", "libs"]);

// ─────────────────────────────────────────────────────────────────────────────
// AI-POWERED SERVICE GROUPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses DeepSeek V3.2 (via AWS Bedrock) to group file nodes into logical
 * services. One prompt — the AI understands the actual intent of each file
 * rather than relying on directory names and regex patterns.
 *
 * Falls back to the regex heuristic grouper if the AI call fails or
 * returns unparseable output.
 */
async function groupNodesWithAI(nodes: CortexNode[]): Promise<ServiceGroup[]> {
    const codeNodes = nodes.filter(n => !shouldSkipFile(n.filePath));
    if (codeNodes.length === 0) return groupNodesIntoServices(nodes);

    // Send paths only — summaries inflate input tokens and leave less room for
    // the output JSON (which must repeat every file path). Cap at 300 files.
    const trimmed = codeNodes.slice(0, 300);
    const fileLines = trimmed.map(n => n.filePath).join("\n");

    try {
        const result = await invokeClaude({
            systemPrompt:
                "You are an expert software architect. You receive a list of source file paths (and optional one-line summaries) from a repository. " +
                "Group them into logical services or modules — think about what makes sense architecturally, not just by directory name. " +
                "Return ONLY a JSON object with a single key \"services\" whose value is an array. Each element must have:\n" +
                "  \"name\": human-readable service name (2-4 words, Title Case)\n" +
                "  \"layer\": one of \"edge\" (API/UI/entry-point), \"compute\" (business logic/workers), or \"data\" (database/storage/infra)\n" +
                "  \"type\": one of \"api\", \"worker\", \"database\", \"cache\", or \"frontend\"\n" +
                "  \"files\": array of file paths from the input (exact paths, no modifications)\n" +
                "Rules: every file must appear in exactly one service. Aim for 2–12 meaningful groups. No service should contain only config/docs files unless that is the entire repo.",
            messages: [
                {
                    role: "user",
                    content: `Repository files:\n\n${fileLines}\n\nReturn the JSON object now.`,
                },
            ],
            maxTokens: 4096,
            temperature: 0.0,
        });

        // Log stop reason so we can detect future truncation
        const stopReason = result.stopReason ?? "unknown";
        if (stopReason === "length") {
            logger.warn("AI service grouping hit token limit — output was truncated, falling back to regex");
            return groupNodesIntoServices(nodes);
        }

        const raw = result.text.trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "");

        const parsed = JSON.parse(raw) as {
            services: { name: string; layer: string; type: string; files: string[] }[];
        };

        if (!Array.isArray(parsed.services) || parsed.services.length === 0) {
            throw new Error("AI returned empty services array");
        }

        // Build a reverse map: filePath → node, for fast lookup
        const nodeByPath = new Map(nodes.map(n => [n.filePath, n]));

        // Track which paths the AI assigned so we can catch any it missed
        const assignedPaths = new Set<string>();

        const groups: ServiceGroup[] = [];
        for (const svc of parsed.services) {
            const svcNodes: CortexNode[] = [];
            for (const fp of (svc.files ?? [])) {
                const n = nodeByPath.get(fp);
                if (n) {
                    svcNodes.push(n);
                    assignedPaths.add(fp);
                }
            }
            if (svcNodes.length === 0) continue;

            const layer = ["edge", "compute", "data"].includes(svc.layer)
                ? svc.layer as ServiceGroup["layer"]
                : "compute";
            const type = ["api", "worker", "database", "cache", "frontend"].includes(svc.type)
                ? svc.type as ServiceGroup["type"]
                : "worker";

            groups.push({ name: svc.name, layer, type, nodes: svcNodes });
        }

        // Any file the AI missed → fall back to regex classification for just those
        const missed = nodes.filter(n => !assignedPaths.has(n.filePath) && !shouldSkipFile(n.filePath));
        if (missed.length > 0) {
            logger.warn({ count: missed.length }, "AI grouping missed some files — running regex fallback for them");
            const fallbackGroups = groupNodesIntoServices(missed);
            // Merge into existing groups by name, or add as new groups
            for (const fg of fallbackGroups) {
                const existing = groups.find(g => g.name === fg.name);
                if (existing) existing.nodes.push(...fg.nodes);
                else groups.push(fg);
            }
        }

        logger.info({ groupCount: groups.length }, "AI service grouping complete");
        return groups;

    } catch (err) {
        logger.warn({ err }, "AI service grouping failed — falling back to regex heuristics");
        return groupNodesIntoServices(nodes);
    }
}

/**
 * Groups CortexNodes into logical service boundaries (regex/heuristic fallback).
 *
 * Routing order:
 *   1. File-extension routing.
 *   2. Well-known directory patterns (handlers, services, functions, etc.).
 *   3. Top-level directory fallback.
 *   4. Root-level files → "Core Library".
 */
function groupNodesIntoServices(nodes: CortexNode[]): ServiceGroup[] {
    const groups = new Map<string, ServiceGroup>();

    // ─────────────────────────────────────────────────────────────────────────
    // Pass 0: detect a single generic root (e.g. src/) so we can unwrap it
    // ─────────────────────────────────────────────────────────────────────────
    const topDirCounts = new Map<string, number>();
    for (const node of nodes) {
        if (shouldSkipFile(node.filePath)) continue;
        const segs = node.filePath.split("/");
        const first = segs[0];
        if (first && segs.length > 1) topDirCounts.set(first, (topDirCounts.get(first) ?? 0) + 1);
    }
    const topDirs = [...topDirCounts.keys()];
    const unwrapRoot =
        topDirs.length === 1 && GENERIC_ROOTS.has(topDirs[0].toLowerCase()) ? topDirs[0] : null;

    // ─────────────────────────────────────────────────────────────────────────
    // Small helpers
    // ─────────────────────────────────────────────────────────────────────────
    const put = (
        key: string,
        name: string,
        layer: ServiceGroup["layer"],
        type: ServiceGroup["type"],
        node: CortexNode
    ) => {
        const g = groups.get(key);
        if (g) { g.nodes.push(node); }
        else { groups.set(key, { name, layer, type, nodes: [node] }); }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Pass 1: classify every node
    // ─────────────────────────────────────────────────────────────────────────
    for (const node of nodes) {
        if (shouldSkipFile(node.filePath)) continue;

        const rawSegs = node.filePath.split("/");
        const segs = (unwrapRoot && rawSegs[0] === unwrapRoot) ? rawSegs.slice(1) : rawSegs;
        if (segs.length === 0) continue;

        const lowerPath = node.filePath.toLowerCase();
        const filename  = rawSegs[rawSegs.length - 1].toLowerCase();
        const ext       = filename.includes(".") ? "." + filename.split(".").pop()! : "";

        // ══ EXTENSION-FIRST ROUTING ════════════════════════════════════════

        // IaC files — always infrastructure regardless of directory name
        if ([".tf", ".tfvars", ".hcl", ".bicep"].includes(ext) ||
            lowerPath.endsWith(".asl.json")) {
            put("iac", "Infrastructure (IaC)", "data", "database", node);
            continue;
        }

        // CDK / CloudFormation TypeScript constructs
        if ((ext === ".ts" || ext === ".js") &&
            (filename.endsWith("stack.ts") || filename.endsWith("construct.ts") ||
             filename.endsWith("stack.js") || filename.endsWith("construct.js") ||
             lowerPath.includes("/cdk/") || lowerPath.includes("/cloudformation/"))) {
            put("cdk", "Cloud Infrastructure", "data", "database", node);
            continue;
        }

        // Protobuf / gRPC definitions
        if (ext === ".proto") {
            put("proto", "API Contracts (Proto)", "edge", "api", node);
            continue;
        }

        // GraphQL schema files
        if (ext === ".graphql" || ext === ".gql") {
            put("graphql-schema", "GraphQL Schema", "edge", "api", node);
            continue;
        }

        // Prisma schema
        if (ext === ".prisma") {
            put("db-schema", "Database Schema", "data", "database", node);
            continue;
        }

        // CSV / TSV / tabular data files — never infrastructure
        if (ext === ".csv" || ext === ".tsv") {
            put("data-files", "Data & Fixtures", "data", "database", node);
            continue;
        }

        // SQL files: migrations vs ad-hoc scripts
        if (ext === ".sql") {
            const isMigration = pathContainsDir(segs, ["migrations", "migration"]);
            if (isMigration) put("migrations", "Migrations", "data", "database", node);
            else             put("db-scripts", "Database Scripts", "data", "database", node);
            continue;
        }

        // Markdown / docs — bucket separately so they don’t inflate service counts
        if (ext === ".md" || ext === ".mdx" || ext === ".rst") {
            put("docs", "Documentation", "compute", "worker", node);
            continue;
        }

        // Static assets (CSS, images, fonts) — frontend edge layer
        if ([".css", ".scss", ".sass", ".less",
             ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
             ".woff", ".woff2", ".ttf", ".eot"].includes(ext)) {
            put("assets", "Static Assets", "edge", "frontend", node);
            continue;
        }

        // ══ DIRECTORY-PATTERN ROUTING ══════════════════════════════════════

        // 1. Edge / request handlers
        if (pathContainsDir(segs, ["handlers", "controllers", "controller", "routes", "route", "router", "routers", "endpoints", "endpoint"])) {
            const sub = segmentAfterDir(segs, ["handlers", "controllers", "controller", "routes", "route", "router", "routers", "endpoints", "endpoint"]);
            const isRoot = segs.length <= 2;
            put(isRoot ? "handler:_root" : `handler:${sub}`,
                isRoot ? "API Handlers" : `${capitalize(sub)} Handler`,
                "edge", "api", node);

        // 2. Services
        } else if (pathContainsDir(segs, ["services", "service"])) {
            const sub = segmentAfterDir(segs, ["services", "service"]);
            put(`service:${sub}`, `${capitalize(sub)} Service`, "compute", "worker", node);

        // 3. Functions / lambdas / workers / jobs / tasks
        } else if (pathContainsDir(segs, ["functions", "function", "lambdas", "lambda", "workers", "worker", "jobs", "job", "tasks", "task"])) {
            const sub = segmentAfterDir(segs, ["functions", "function", "lambdas", "lambda", "workers", "worker", "jobs", "job", "tasks", "task"]);
            put(`fn:${sub}`, `${capitalize(sub)} Domain`, "compute", "worker", node);

        // 4. Pure infrastructure directories (NOT generic "data" folders)
        } else if (pathContainsDir(segs, ["infrastructure", "infra"])) {
            put("infra", "Infrastructure", "data", "database", node);

        // 5. Database / persistence layer (but not generic "data" dirs — those fall through)
        } else if (pathContainsDir(segs, ["database", "databases", "db", "storage", "store",
                                           "repositories", "repository", "migrations", "migration",
                                           "seeders", "seeds", "cache", "orm"])) {
            const sub = segmentAfterDir(segs, ["database", "databases", "db", "storage", "store",
                                               "repositories", "repository", "migrations", "migration",
                                               "seeders", "seeds", "cache", "orm"]);
            // If the sub-dir itself is a table/entity name, make it a named bucket
            const isKnownRoot = ["database", "databases", "db", "storage", "store", "cache", "orm"].includes(sub.toLowerCase());
            put(isKnownRoot ? "db" : `db:${sub}`,
                isKnownRoot ? "Database Layer" : `${capitalize(sub)} Repository`,
                "data", "database", node);

        // 6. Domain models / entities
        } else if (pathContainsDir(segs, ["models", "model", "entities", "entity"])) {
            const sub = segmentAfterDir(segs, ["models", "model", "entities", "entity"]);
            const isRoot = ["models", "model", "entities", "entity"].includes(sub.toLowerCase());
            put(isRoot ? "models" : `model:${sub}`,
                isRoot ? "Data Models" : `${capitalize(sub)} Model`,
                "data", "database", node);

        // 7. Schemas (could be API or data — check for API context)
        } else if (pathContainsDir(segs, ["schemas", "schema"])) {
            const hasApiContext = pathContainsDir(segs, ["api", "graphql", "rest", "grpc", "openapi", "swagger"]);
            put("schemas", "Schemas", hasApiContext ? "edge" : "data", hasApiContext ? "api" : "database", node);

        // 8. Utilities / helpers / shared
        } else if (pathContainsDir(segs, ["utils", "util", "helpers", "helper", "lib", "libs",
                                           "shared", "common", "constants", "config", "configs",
                                           "settings", "configuration"])) {
            put("utils", "Core Utilities", "compute", "worker", node);

        // 9. Middleware
        } else if (pathContainsDir(segs, ["middlewares", "middleware"])) {
            put("middleware", "Middleware", "edge", "api", node);

        // 10. Hooks (React / Vue / framework hooks)
        } else if (pathContainsDir(segs, ["hooks", "hook", "composables", "composable"])) {
            put("hooks", "Custom Hooks", "compute", "worker", node);

        // 11. UI layer — components / pages (per top sub-dir)
        } else if (pathContainsDir(segs, ["components", "component", "pages", "page",
                                           "views", "view", "screens", "screen",
                                           "layouts", "layout", "ui", "templates", "template"])) {
            const sub = segmentAfterDir(segs, ["components", "component", "pages", "page",
                                               "views", "view", "screens", "screen",
                                               "layouts", "layout", "ui", "templates", "template"]);
            const isRoot = segs.length <= 2;
            put(isRoot ? "ui:_root" : `ui:${sub}`,
                isRoot ? "UI Layer" : `${capitalize(sub)} UI`,
                "edge", "frontend", node);

        // 12. API / REST / gRPC directories (not graphql — handled by ext)
        } else if (pathContainsDir(segs, ["api", "apis", "rest", "v1", "v2", "v3", "grpc", "openapi", "swagger"])) {
            const sub = segmentAfterDir(segs, ["api", "apis", "rest", "v1", "v2", "v3", "grpc", "openapi", "swagger"]);
            const isRoot = segs.length <= 2;
            put(isRoot ? "api:_root" : `api:${sub}`,
                isRoot ? "API" : `${capitalize(sub)} API`,
                "edge", "api", node);

        // 13. Test suite
        } else if (pathContainsDir(segs, ["tests", "test", "specs", "spec", "__tests__", "__mocks__", "mocks", "fixtures", "fixture", "stubs"])) {
            put("tests", "Test Suite", "compute", "worker", node);

        // 14. Documentation directory
        } else if (pathContainsDir(segs, ["docs", "doc", "documentation", "wiki"])) {
            put("docs", "Documentation", "compute", "worker", node);

        // 15. Data files directory (CSV/JSON fixtures/seeds in a "data" folder)
        //     This catches e.g. data/*.json, data/*.csv that weren’t caught by extension routing
        } else if (pathContainsDir(segs, ["data", "fixtures", "fixture", "seeds", "seed",
                                           "sample", "samples", "dataset", "datasets"])) {
            put("data-files", "Data & Fixtures", "data", "database", node);

        // 16. Config / environment files directory
        } else if (pathContainsDir(segs, ["config", "configs", "configuration", "settings",
                                           "env", "environments", "properties"])) {
            put("config", "Configuration", "compute", "worker", node);

        // 17. Scripts / tooling / build
        } else if (pathContainsDir(segs, ["scripts", "script", "bin", "tools", "tool",
                                           "build", "ci", "deploy", "deployment"])) {
            put("scripts", "Scripts & Tooling", "compute", "worker", node);

        // 18. Prompts / AI templates
        } else if (pathContainsDir(segs, ["prompts", "prompt", "templates", "template"])) {
            put("prompts", "Prompts & Templates", "compute", "worker", node);

        // 19. Fallback: each distinct top-level directory → own service
        } else {
            const topDir = segs.length > 1 ? segs[0] : null;
            if (topDir && !GENERIC_ROOTS.has(topDir.toLowerCase())) {
                put(`dir:${topDir}`, formatDirName(topDir), guessLayer(topDir), guessType(topDir), node);
            } else if (topDir) {
                // Generic root with no further sub-dir match — use second segment if available
                const second = segs.length > 2 ? segs[1] : null;
                if (second) {
                    put(`dir:${second}`, formatDirName(second), guessLayer(second), guessType(second), node);
                } else {
                    put("core", "Core Library", "compute", "worker", node);
                }
            } else {
                // Root-level files
                put("core", "Core Library", "compute", "worker", node);
            }
        }
    }

    return Array.from(groups.values());
}

/**
 * Converts a directory name like "user_management" or "userManagement" or
 * "user-management" into a human-readable label "User Management".
 */
function formatDirName(dir: string): string {
    return dir
        .replace(/[-_]+/g, " ")                              // underscores/hyphens → spaces
        .replace(/([a-z])([A-Z])/g, "$1 $2")                // camelCase → words
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))   // Title Case
        .join(" ");
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH STATUS — Derives service-level health from constituent file nodes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines service health based on the Fortress test statuses of its files.
 *   - If ≥3 files are failing → "critical"
 *   - If ≥1 file is failing or warning → "warning"
 *   - Otherwise → "healthy"
 */
function deriveServiceStatus(nodes: CortexNode[]): "healthy" | "warning" | "critical" {
    const failingCount = nodes.filter(n => n.status === "failing").length;
    const warningCount = nodes.filter(n => n.status === "warning").length;

    if (failingCount >= 3) return "critical";
    if (failingCount >= 1 || warningCount >= 2) return "warning";
    return "healthy";
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS CALCULATION — Real code metrics from nodes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates real metrics from the service's constituent nodes.
 * Estimates LOC based on export/import counts and complexity heuristics.
 */
function calculateServiceMetrics(nodes: CortexNode[]): {
    linesOfCode: number;
    fileCount: number;
    complexity: number;
    dependenciesIn: number;
    dependenciesOut: number;
    lastModified?: string;
} {
    const fileCount = nodes.length;

    let linesOfCode = 0;
    let totalComplexity = 0;

    for (const node of nodes) {
        // Use actual LOC from the graph node (computed from full source by countLinesOfCode)
        linesOfCode += node.linesOfCode ?? 0;

        const exportedToCount = node.dependencyCount ?? 0;
        const importedFromCount = node.importCount ?? 0;
        // Complexity based on connections (more imports/exports = more complex)
        const nodeComplexity = Math.min(100, exportedToCount * 5 + importedFromCount * 3);
        totalComplexity += nodeComplexity;
    }

    const avgComplexity = fileCount > 0 ? Math.round(totalComplexity / fileCount) : 0;

    return {
        linesOfCode,
        fileCount,
        complexity: avgComplexity,
        dependenciesIn: 0,   // populated by caller after connection map is built
        dependenciesOut: 0,  // populated by caller after connection map is built
    };
}

/**
 * Calculates health score (0-100) based on various factors.
 * Returns score and list of issues found.
 */
function calculateHealthScore(
    nodes: CortexNode[],
    dependenciesIn: number,
    dependenciesOut: number
): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];
    
    // Factor 1: Test status (-30 for failures, -15 for warnings)
    const failingCount = nodes.filter(n => n.status === "failing").length;
    const warningCount = nodes.filter(n => n.status === "warning").length;
    if (failingCount > 0) {
        score -= Math.min(30, failingCount * 10);
        issues.push(`${failingCount} file(s) with failing tests`);
    }
    if (warningCount > 0) {
        score -= Math.min(15, warningCount * 5);
        issues.push(`${warningCount} file(s) with warnings`);
    }
    
    // Factor 2: High coupling (-20 for >10 dependencies)
    if (dependenciesOut > 10) {
        score -= 20;
        issues.push(`High coupling: ${dependenciesOut} outgoing dependencies`);
    }
    
    // Factor 3: Complexity (-15 for high complexity)
    const avgComplexity = nodes.reduce((sum, n) => {
        const exportedToCount = n.dependencyCount ?? 0;
        const importedFromCount = n.importCount ?? 0;
        return sum + (exportedToCount + importedFromCount);
    }, 0) / nodes.length;
    
    if (avgComplexity > 15) {
        score -= 15;
        issues.push("High complexity detected");
    }
    
    // Factor 4: Orphaned code (no dependencies)
    if (dependenciesIn === 0 && dependenciesOut === 0 && nodes.length > 1) {
        score -= 10;
        issues.push("Isolated code - no connections to other services");
    }
    
    return { score: Math.max(0, score), issues };
}

/**
 * Detects circular dependencies in the service graph.
 * Returns list of circular dependency chains found.
 */
function detectCircularDependencies(
    serviceRows: { serviceId: number; name: string }[],
    connectionMap: Map<number, Set<number>>
): Map<number, string[]> {
    const circularIssues = new Map<number, string[]>();
    
    // Simple cycle detection: if A → B and B → A, it's circular
    for (const [serviceId, targets] of connectionMap.entries()) {
        for (const targetId of targets) {
            const reverseConnections = connectionMap.get(targetId);
            if (reverseConnections?.has(serviceId)) {
                const serviceName = serviceRows.find(s => s.serviceId === serviceId)?.name ?? "Unknown";
                const targetName = serviceRows.find(s => s.serviceId === targetId)?.name ?? "Unknown";
                const issue = `Circular dependency with ${targetName}`;
                
                const existingIssues = circularIssues.get(serviceId) ?? [];
                if (!existingIssues.includes(issue)) {
                    existingIssues.push(issue);
                    circularIssues.set(serviceId, existingIssues);
                }
            }
        }
    }
    
    return circularIssues;
}

// ─────────────────────────────────────────────────────────────────────────────
// POSITION LAYOUT — Places services on the 3D grid by layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assigns 3D positions to services based on their layer:
 *   - edge (handlers)      → z = -5.5 (top row in the canvas)
 *   - compute (services)   → z = 1    (middle row)
 *   - data (infrastructure) → z = 6.5 (bottom row)
 *
 * Services within the same layer are spread along the X axis.
 * These positions match the SwimlanePlatform positions in CortexPage.tsx.
 */
function assignServicePositions(
    groups: ServiceGroup[]
): { group: ServiceGroup; position: { x: number; y: number; z: number } }[] {
    const layerZMap: Record<string, number> = {
        edge: -5.5,
        compute: 1,
        data: 6.5,
    };

    // Group services by layer to space them along X
    const layerBuckets = new Map<string, ServiceGroup[]>();
    for (const group of groups) {
        const bucket = layerBuckets.get(group.layer) ?? [];
        bucket.push(group);
        layerBuckets.set(group.layer, bucket);
    }

    const result: { group: ServiceGroup; position: { x: number; y: number; z: number } }[] = [];

    for (const [layerName, bucket] of layerBuckets.entries()) {
        const z = layerZMap[layerName] ?? 1;
        const totalWidth = (bucket.length - 1) * 5; // 5 units spacing between services
        const startX = -totalWidth / 2;

        for (let i = 0; i < bucket.length; i++) {
            result.push({
                group: bucket[i],
                position: {
                    x: startX + i * 5,
                    y: 0,
                    z,
                },
            });
        }
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION BUILDER — Derives inter-service connections from import edges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses the CortexGraph edge list to figure out which services depend on
 * which other services. If any file in Service A imports a file in Service B,
 * we draw a connection from A → B.
 */
function buildServiceConnections(
    serviceRows: { serviceId: number; nodeIds: Set<string> }[],
    edges: CortexEdge[]
): Map<number, Set<number>> {
    // Build a reverse map: nodeId → serviceId
    const nodeToService = new Map<string, number>();
    for (const svc of serviceRows) {
        for (const nodeId of svc.nodeIds) {
            nodeToService.set(nodeId, svc.serviceId);
        }
    }

    // Walk edges and find cross-service connections
    const connections = new Map<number, Set<number>>();
    for (const edge of edges) {
        const sourceSvc = nodeToService.get(edge.source);
        const targetSvc = nodeToService.get(edge.target);

        if (sourceSvc !== undefined && targetSvc !== undefined && sourceSvc !== targetSvc) {
            const set = connections.get(sourceSvc) ?? new Set<number>();
            set.add(targetSvc);
            connections.set(sourceSvc, set);
        }
    }

    return connections;
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK DEMO SERVICES — Shown when repo has zero analysable files
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When the repository is empty or contains no recognizable source code,
 * we generate a small set of demonstration services so the Visual Cortex
 * doesn't render a completely blank grid. This gives the user something to
 * interact with immediately and shows what the page looks like with data.
 */
function buildDemoServiceRows(repoId: string, now: string): CortexServiceRow[] {
    const demos: Omit<CortexServiceRow, "id" | "repoId" | "recordType" | "updatedAt">[] = [
        {
            serviceId: 1,
            name: "API Gateway",
            status: "healthy",
            layer: "edge",
            position: { x: -3, y: 0, z: -5.5 },
            connections: [2, 3],
            p95Latency: "42ms",
            errorRatePct: 0.12,
            sparkline: generateSparkline("gateway", true),
            testsTotal: 24, testsPassing: 24, testsErrors: 0,
            lastDeployedAt: new Date(Date.now() - 3600_000).toISOString(),
            metrics: { linesOfCode: 1247, fileCount: 8, complexity: 35, dependenciesIn: 0, dependenciesOut: 2 },
            files: ["handlers/api/routes.ts", "handlers/api/middleware.ts"],
            health: { score: 95, issues: [] },
        },
        {
            serviceId: 2,
            name: "Auth Service",
            status: "healthy",
            layer: "compute",
            position: { x: -5, y: 0, z: 1 },
            connections: [4],
            p95Latency: "67ms",
            errorRatePct: 0.08,
            sparkline: generateSparkline("auth", true),
            testsTotal: 18, testsPassing: 18, testsErrors: 0,
            lastDeployedAt: new Date(Date.now() - 7200_000).toISOString(),
            metrics: { linesOfCode: 890, fileCount: 5, complexity: 28, dependenciesIn: 1, dependenciesOut: 1 },
            files: ["services/auth/authenticate.ts", "services/auth/authorize.ts"],
            health: { score: 98, issues: [] },
        },
        {
            serviceId: 3,
            name: "Business Logic",
            status: "warning",
            layer: "compute",
            position: { x: 3, y: 0, z: 1 },
            connections: [4],
            p95Latency: "289ms",
            errorRatePct: 2.1,
            sparkline: generateSparkline("business", false),
            testsTotal: 31, testsPassing: 27, testsErrors: 4,
            lastDeployedAt: new Date(Date.now() - 1800_000).toISOString(),
            metrics: { linesOfCode: 2340, fileCount: 12, complexity: 67, dependenciesIn: 1, dependenciesOut: 1 },
            files: ["services/business/processor.ts", "services/business/validator.ts"],
            health: { score: 72, issues: ["4 file(s) with failing tests", "High complexity detected"] },
        },
        {
            serviceId: 4,
            name: "PostgreSQL",
            status: "healthy",
            layer: "data",
            position: { x: 0, y: 0, z: 6.5 },
            connections: [],
            p95Latency: "12ms",
            errorRatePct: 0.02,
            sparkline: generateSparkline("postgres", true),
            testsTotal: 10, testsPassing: 10, testsErrors: 0,
            lastDeployedAt: new Date(Date.now() - 86400_000).toISOString(),
            metrics: { linesOfCode: 456, fileCount: 3, complexity: 15, dependenciesIn: 2, dependenciesOut: 0 },
            files: ["database/schema.ts", "database/migrations.ts"],
            health: { score: 100, issues: [] },
        },
    ];

    return demos.map(d => ({
        ...d,
        id: `REPO#${repoId}#SVC#${d.serviceId}`,
        repoId,
        recordType: "SERVICE" as const,
        updatedAt: now,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * syncCortexServices()
 *
 * Transforms the file-level CortexGraph into CORTEX_TABLE service rows and
 * writes a TIMELINE_TABLE event. This is the bridge between graphBuilder's
 * raw AST analysis and the frontend's 3D service map.
 *
 * @param repoId  — The repository identifier (e.g. "Test1")
 * @param graph   — The CortexGraph output from buildCortexGraph()
 */
export async function syncCortexServices(
    repoId: string,
    graph: CortexGraph
): Promise<void> {
    const now = new Date().toISOString();

    logger.info(
        { repoId, nodeCount: graph.nodeCount, edgeCount: graph.edgeCount },
        "syncCortexServices: Starting service-level aggregation"
    );

    try {
        // ── Step 1: Group file nodes into logical services using AI ────────────
        const serviceGroups = await groupNodesWithAI(graph.nodes);

        let serviceRows: CortexServiceRow[];

        if (serviceGroups.length === 0) {
            // No services found - return empty array instead of demo data
            // Demo data should only be shown for truly empty/demo repos,
            // not for repos where GitHub fetch failed or repo is misconfigured
            logger.info({ repoId, nodeCount: graph.nodes.length }, "syncCortexServices: No services generated");
            serviceRows = [];
        } else {
            // ── Step 2: Position services on the 3D grid ─────────────────────────
            const positioned = assignServicePositions(serviceGroups);

            // ── Step 3: Build connection map from edges ──────────────────────────
            const serviceIdEntries = positioned.map((p, idx) => ({
                serviceId: idx + 1,
                nodeIds: new Set(p.group.nodes.map(n => n.id)),
            }));

            const connectionMap = buildServiceConnections(serviceIdEntries, graph.edges);
            
            // Detect circular dependencies
            const circularDeps = detectCircularDependencies(
                serviceIdEntries.map((s, idx) => ({ serviceId: s.serviceId, name: positioned[idx].group.name })),
                connectionMap
            );

            // ── Step 4: Build DynamoDB rows ──────────────────────────────────────
            serviceRows = positioned.map((p, idx) => {
                const serviceId = idx + 1;
                const status = deriveServiceStatus(p.group.nodes);
                const seed = `${repoId}:${p.group.name}`;

                // Aggregate test counts from constituent file nodes
                const totalFiles = p.group.nodes.length;
                const testedFiles = p.group.nodes.filter(n => n.status !== "untested").length;
                const failingFiles = p.group.nodes.filter(n => n.status === "failing").length;
                const passingPct = totalFiles > 0 ? Math.round((testedFiles - failingFiles) / totalFiles * 100) : 0;
                
                // Calculate real metrics
                const metrics = calculateServiceMetrics(p.group.nodes);
                
                // Calculate dependency counts
                const dependenciesOut = connectionMap.get(serviceId)?.size ?? 0;
                const dependenciesIn = Array.from(connectionMap.values())
                    .filter(targets => targets.has(serviceId)).length;
                
                metrics.dependenciesIn = dependenciesIn;
                metrics.dependenciesOut = dependenciesOut;
                
                // Calculate health score with issues
                const health = calculateHealthScore(p.group.nodes, dependenciesIn, dependenciesOut);
                
                // Add circular dependency issues
                const circularIssues = circularDeps.get(serviceId) ?? [];
                health.issues.push(...circularIssues);
                if (circularIssues.length > 0) {
                    health.score = Math.max(0, health.score - 25); // Penalize circular deps
                }
                
                // Extract file paths
                const files = p.group.nodes.map(n => n.filePath);

                return {
                    id: `REPO#${repoId}#SVC#${serviceId}`,
                    repoId,
                    recordType: "SERVICE" as const,
                    serviceId,
                    name: p.group.name,
                    status,
                    layer: p.group.layer,
                    position: p.position,
                    connections: Array.from(connectionMap.get(serviceId) ?? []),
                    p95Latency: generateP95(seed, status),
                    errorRatePct: generateErrorRate(seed, status),
                    sparkline: generateSparkline(seed, status === "healthy"),
                    testsTotal: totalFiles,
                    testsPassing: passingPct,
                    testsErrors: failingFiles,
                    lastDeployedAt: now,
                    updatedAt: now,
                    metrics,
                    files,
                    health,
                };
            });
        }

        // ── Step 5: Clean up old service records ─────────────────────────────────
        // Scan all existing service records for this repo and delete them.
        // Using ScanCommand (not QueryCommand+GSI) so it works on DynamoDB Local
        // where the repoId-index GSI may not exist.
        try {
            const existingServices = await docClient.send(
                new ScanCommand({
                    TableName: CORTEX_TABLE,
                    FilterExpression: "repoId = :repoId AND recordType = :recordType",
                    ExpressionAttributeValues: {
                        ":repoId": repoId,
                        ":recordType": "SERVICE",
                    },
                })
            );

            if (existingServices.Items && existingServices.Items.length > 0) {
                logger.info(
                    { repoId, count: existingServices.Items.length },
                    "Deleting old service records"
                );
                
                // Delete in batches
                const deleteBatches = chunkArray(existingServices.Items, 25);
                for (const batch of deleteBatches) {
                    await docClient.send(
                        new BatchWriteCommand({
                            RequestItems: {
                                [CORTEX_TABLE]: batch.map(item => ({
                                    DeleteRequest: {
                                        Key: { id: item.id },
                                    },
                                })),
                            },
                        })
                    );
                }
            }
        } catch (err) {
            logger.warn({ repoId, err }, "Failed to clean up old service records - continuing anyway");
        }

        // ── Step 6: Write service rows to CORTEX_TABLE ───────────────────────────
        // DynamoDB BatchWriteItem supports up to 25 items per call
        const batches = chunkArray(serviceRows, 25);

        for (const batch of batches) {
            await docClient.send(
                new BatchWriteCommand({
                    RequestItems: {
                        [CORTEX_TABLE]: batch.map(item => ({
                            PutRequest: { Item: item },
                        })),
                    },
                })
            );
        }

        logger.info(
            { repoId, serviceCount: serviceRows.length },
            "syncCortexServices: Service rows written to CORTEX_TABLE"
        );

        // ── Step 7: Write a timeline event to TIMELINE_TABLE ─────────────────────
        const hasCritical = serviceRows.some(s => s.status === "critical");
        const hasWarning = serviceRows.some(s => s.status === "warning");
        const scanStatus = hasCritical ? "Critical" : hasWarning ? "Degraded" : "Healthy";
        const scanColor = hasCritical ? "#ef4444" : hasWarning ? "#f59e0b" : "#22c55e";

        await docClient.send(
            new PutCommand({
                TableName: TIMELINE_TABLE,
                Item: {
                    id: `scan_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
                    repoId,
                    positionPct: 100,
                    label: `System Scan: ${scanStatus}`,
                    color: scanColor,
                    environment: "production",
                    deployedAt: now,
                    createdAt: now,
                },
            })
        );

        logger.info(
            { repoId, scanStatus, serviceCount: serviceRows.length },
            "syncCortexServices: Sync sequence complete"
        );
    } catch (err) {
        logger.error({ repoId, err }, "syncCortexServices: Sync sequence failed");
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Splits an array into chunks of a given size */
function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}
