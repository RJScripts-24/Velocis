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
  /** Functions defined in this file */
  functions?: string[];
  /** Map of function name to array of functions it calls */
  functionCalls?: Record<string, string[]>;
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
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  ".env",
  "yarn.lock",
  "package-lock.json",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "__pycache__",
  ".pyc",
  ".pyo",
  ".pyd",
  ".class",
  ".o",
  ".so",
  ".dll",
  ".dylib",
  ".exe",
  ".bin",
];

/** Binary / media file extensions that produce no architectural value as nodes */
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tiff",
  ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".mov", ".avi",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
]);

/** Maps directory segments to layer numbers for 3D Z-axis grouping */
const LAYER_MAP: Record<string, number> = {
  // Layer 0 — data / infrastructure
  infrastructure: 0, infra: 0,
  database: 0, databases: 0, db: 0,
  migrations: 0, migration: 0, seeds: 0, seeders: 0,
  storage: 0, store: 0, cache: 0,
  repositories: 0, repository: 0, repo: 0,
  mocks: 0, fixtures: 0, stubs: 0,
  // Layer 1 — core services / domain
  services: 1, service: 1,
  utils: 1, util: 1, helpers: 1, helper: 1,
  models: 1, model: 1, entities: 1, entity: 1,
  schemas: 1, schema: 1,
  lib: 1, libs: 1, shared: 1, common: 1,
  config: 1, configs: 1, settings: 1, configuration: 1, constants: 1,
  prompts: 1, templates: 1,
  // Layer 2 — compute / workers
  functions: 2, function: 2,
  lambdas: 2, lambda: 2,
  workers: 2, worker: 2,
  jobs: 2, job: 2,
  tasks: 2, task: 2,
  tests: 2, test: 2, specs: 2, spec: 2,
  middlewares: 2, middleware: 2,
  hooks: 2, hook: 2,
  // Layer 3 — edge / API / UI
  handlers: 3, handler: 3,
  controllers: 3, controller: 3,
  routes: 3, route: 3, router: 3, routers: 3,
  endpoints: 3, endpoint: 3,
  api: 3, apis: 3,
  graphql: 3, rest: 3, grpc: 3,
  components: 3, component: 3,
  pages: 3, page: 3,
  views: 3, view: 3,
  screens: 3, screen: 3,
  layouts: 3, layout: 3,
  ui: 3,
};

/** Maps file extensions to language labels */
const LANGUAGE_MAP: Record<string, string> = {
  // Web / Node
  ".ts": "typescript",  ".tsx": "typescript",
  ".js": "javascript",  ".jsx": "javascript",  ".mjs": "javascript",  ".cjs": "javascript",
  // Python
  ".py": "python",  ".pyi": "python",
  // Go
  ".go": "go",
  // Ruby
  ".rb": "ruby",  ".rake": "ruby",  ".gemspec": "ruby",
  // Rust
  ".rs": "rust",
  // Java / JVM
  ".java": "java",  ".kt": "kotlin",  ".kts": "kotlin",
  ".scala": "scala",  ".groovy": "groovy",
  // C-family
  ".cs": "csharp",  ".cpp": "cpp",  ".cc": "cpp",  ".cxx": "cpp",
  ".c": "c",  ".h": "c",  ".hpp": "cpp",
  // PHP
  ".php": "php",
  // Swift / Dart
  ".swift": "swift",  ".dart": "dart",
  // Mobile
  ".m": "objc",  ".mm": "objc",
  // Styles
  ".css": "css",  ".scss": "scss",  ".sass": "sass",  ".less": "less",
  // Markup / Templates
  ".html": "html",  ".htm": "html",
  ".vue": "vue",  ".svelte": "svelte",  ".astro": "astro",
  ".erb": "erb",  ".haml": "haml",  ".jinja": "jinja",  ".jinja2": "jinja",
  // Data / Config
  ".json": "json",  ".jsonc": "json",
  ".yaml": "yaml",  ".yml": "yaml",
  ".toml": "toml",  ".ini": "ini",  ".cfg": "ini",
  ".csv": "csv",  ".tsv": "csv",
  ".xml": "xml",  ".xsd": "xml",
  ".env": "env",
  // Database
  ".sql": "sql",  ".prisma": "prisma",
  // API / Infra
  ".graphql": "graphql",  ".gql": "graphql",
  ".proto": "protobuf",
  ".tf": "terraform",  ".tfvars": "terraform",  ".hcl": "hcl",
  ".bicep": "bicep",
  ".asl.json": "step-functions",
  // Shell
  ".sh": "shell",  ".bash": "shell",  ".zsh": "shell",  ".fish": "shell",
  ".ps1": "powershell",  ".psm1": "powershell",
  // Docs
  ".md": "markdown",  ".mdx": "markdown",
  ".rst": "rst",  ".txt": "plaintext",
  // Docker / CI
  ".dockerfile": "dockerfile",
  ".Dockerfile": "dockerfile",
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
 * Determines if a file should be ignored based on IGNORED_PATTERNS or binary extension.
 */
function shouldIgnore(filePath: string): boolean {
  if (IGNORED_PATTERNS.some((pattern) => filePath.includes(pattern))) return true;
  // Skip binary / media assets — they carry no architectural signal
  const rawExt = "." + (filePath.split(".").pop() ?? "").toLowerCase();
  return BINARY_EXTENSIONS.has(rawExt);
}

/**
 * Infers the NodeType from the file path.
 * Extended to handle all major framework conventions.
 */
function inferNodeType(filePath: string): NodeType {
  const lower = filePath.toLowerCase();
  // Tests first
  if (lower.includes("/tests/") || lower.includes("/__tests__/") || lower.includes("/specs/") ||
      lower.includes(".test.") || lower.includes(".spec.")) return "test";
  // IaC / infra
  if (lower.includes("/infrastructure/") || lower.includes("/infra/") ||
      lower.endsWith(".tf") || lower.endsWith(".tfvars") || lower.endsWith(".hcl") ||
      lower.endsWith(".bicep") || lower.endsWith(".asl.json")) return "infrastructure";
  // Data layer
  if (lower.includes("/database/") || lower.includes("/databases/") || lower.includes("/db/") ||
      lower.includes("/migrations/") || lower.includes("/migration/") ||
      lower.includes("/repositories/") || lower.includes("/repository/") ||
      lower.includes("/seeders/") || lower.includes("/seeds/") ||
      lower.endsWith(".sql") || lower.endsWith(".prisma")) return "infrastructure";
  // Edge / request handlers (service type)
  if (lower.includes("/handlers/") || lower.includes("/controllers/") ||
      lower.includes("/routes/") || lower.includes("/router/") ||
      lower.includes("/endpoints/") || lower.includes("/api/") ||
      lower.includes("/graphql/") || lower.includes("/grpc/") || lower.includes("/rest/")) return "service";
  // Business services
  if (lower.includes("/services/") || lower.includes("/service/")) return "service";
  // Compute functions / workers
  if (lower.includes("/functions/") || lower.includes("/lambdas/") ||
      lower.includes("/workers/") || lower.includes("/jobs/") || lower.includes("/tasks/")) return "module";
  // Utilities
  if (lower.includes("/utils/") || lower.includes("/util/") || lower.includes("/helpers/") ||
      lower.includes("/lib/") || lower.includes("/shared/") || lower.includes("/common/")) return "util";
  // Domain models
  if (lower.includes("/models/") || lower.includes("/entities/") ||
      lower.includes("/schemas/")) return "config";
  // Config / constants
  if (lower.includes("/config/") || lower.includes("/configs/") ||
      lower.includes("/settings/") || lower.includes("/constants/") ||
      lower.includes("/prompts/")) return "config";
  // UI layer
  if (lower.includes("/components/") || lower.includes("/pages/") ||
      lower.includes("/views/") || lower.includes("/ui/") ||
      lower.includes("/screens/") || lower.includes("/layouts/")) return "module";
  // Middleware / hooks
  if (lower.includes("/middlewares/") || lower.includes("/middleware/") ||
      lower.includes("/hooks/") || lower.includes("/hook/")) return "module";
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
  // Dockerfile has no extension
  const basename = filePath.split("/").pop() ?? "";
  if (basename === "Dockerfile" || basename.toLowerCase() === "dockerfile" || /^dockerfile\./i.test(basename)) return "dockerfile";
  // Extension lookup — try lowercase first for cross-platform consistency
  const ext = path.extname(filePath);
  return LANGUAGE_MAP[ext.toLowerCase()] ?? LANGUAGE_MAP[ext] ?? "plaintext";
}

/**
 * Parses static import statements from source code.
 * Returns a list of resolved paths that this file imports.
 * This is intentionally static (no AST) to stay Lambda-lightweight.
 */
function extractImports(sourceCode: string, currentFilePath: string): string[] {
  const fwdFilePath = currentFilePath.replace(/\\/g, "/");
  const dir = fwdFilePath.includes("/") ? fwdFilePath.substring(0, fwdFilePath.lastIndexOf("/")) : "";
  const ext = (fwdFilePath.split(".").pop() ?? "").toLowerCase();

  /**
   * Stack-based path normalizer — correctly resolves ANY number of `..` levels.
   * Single-pass regex can only resolve one level at a time, causing edges to
   * point at wrong paths (e.g. `src/handlers/utils/x` instead of `src/utils/x`).
   */
  const norm = (raw: string): string => {
    const parts = raw.replace(/\\/g, "/").split("/");
    const stack: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        if (stack.length > 0) stack.pop();
      } else if (part !== "" && part !== ".") {
        stack.push(part);
      }
    }
    return stack.join("/");
  };

  const seen = new Set<string>();
  const results: string[] = [];
  const push = (resolved: string) => {
    const r = norm(resolved);
    if (r && !seen.has(r)) { seen.add(r); results.push(r); }
  };

  // ── Python ────────────────────────────────────────────────────────────────
  if (ext === "py" || ext === "pyi") {
    let m: RegExpExecArray | null;
    // Relative: from . import x, from .utils import y, from ..config import z
    const relRe = /from\s+(\.+)([a-zA-Z0-9_.]*)[\s,]+import/g;
    while ((m = relRe.exec(sourceCode)) !== null) {
      const dots = m[1]; const mod = m[2];
      let base = dir;
      for (let i = 1; i < dots.length; i++) {
        const sl = base.lastIndexOf("/");
        base = sl > 0 ? base.substring(0, sl) : "";
      }
      if (mod) push((base ? base + "/" : "") + mod.replace(/\./g, "/") + ".py");
    }
    // Absolute: import foo, from foo.bar import baz
    const absRe = /^(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/gm;
    while ((m = absRe.exec(sourceCode)) !== null) {
      push((dir ? dir + "/" : "") + m[1].replace(/\./g, "/") + ".py");
    }

  // ── Go ────────────────────────────────────────────────────────────────────
  } else if (ext === "go") {
    const sections: string[] = [];
    let block: RegExpExecArray | null;
    const blockRe = /import\s*\(([^)]+)\)/gs;
    while ((block = blockRe.exec(sourceCode)) !== null) sections.push(block[1]);
    const singleRe = /^import\s+"([^"]+)"/gm;
    let single: RegExpExecArray | null;
    while ((single = singleRe.exec(sourceCode)) !== null) sections.push(`"${single[1]}"`);
    const pathRe = /"([^"]+)"/g;
    for (const section of sections) {
      let m: RegExpExecArray | null;
      while ((m = pathRe.exec(section)) !== null) {
        const pkg = m[1];
        const first = pkg.split("/")[0];
        if (pkg.includes("/") && first.includes(".")) {
          push(pkg.split("/").pop()! + "/" + pkg.split("/").pop()! + ".go");
        } else if (!pkg.includes(".") && pkg.includes("/")) {
          push((dir ? dir + "/" : "") + (pkg.split("/").pop() ?? pkg) + ".go");
        }
      }
    }

  // ── Ruby ─────────────────────────────────────────────────────────────────
  } else if (ext === "rb" || ext === "rake") {
    let m: RegExpExecArray | null;
    const relRe = /require_relative\s+['"]([^'"]+)['"]/g;
    while ((m = relRe.exec(sourceCode)) !== null) {
      let p = norm((dir ? dir + "/" : "") + m[1]);
      if (!p.endsWith(".rb")) p += ".rb";
      push(p);
    }
    const reqRe = /require\s+['"](\.[^'"]+)['"]/g;
    while ((m = reqRe.exec(sourceCode)) !== null) {
      let p = norm((dir ? dir + "/" : "") + m[1]);
      if (!p.endsWith(".rb")) p += ".rb";
      push(p);
    }

  // ── Rust ─────────────────────────────────────────────────────────────────
  } else if (ext === "rs") {
    let m: RegExpExecArray | null;
    const modRe = /^(?:pub\s+)?mod\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/gm;
    while ((m = modRe.exec(sourceCode)) !== null) {
      push((dir ? dir + "/" : "") + m[1] + ".rs");
    }
    const useRe = /use\s+(?:crate|self|super)::([a-zA-Z0-9_:]+)/g;
    while ((m = useRe.exec(sourceCode)) !== null) {
      const parts = m[1].split("::");
      const srcIdx = dir.indexOf("/src/");
      const base = srcIdx !== -1 ? dir.substring(0, srcIdx + 4) : dir;
      push((base ? base + "/" : "") + parts.join("/") + ".rs");
    }

  // ── PHP ───────────────────────────────────────────────────────────────────
  } else if (ext === "php") {
    let m: RegExpExecArray | null;
    const reqRe = /(?:require|include)(?:_once)?\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
    while ((m = reqRe.exec(sourceCode)) !== null) {
      if (m[1].startsWith(".")) push(norm((dir ? dir + "/" : "") + m[1]));
    }
    const dirConstRe = /(?:require|include)(?:_once)?\s*\(\s*__DIR__\s*\.\s*['"]([^'"]+)['"]/g;
    while ((m = dirConstRe.exec(sourceCode)) !== null) {
      push(norm(dir + m[1]));
    }

  // ── Java / Kotlin ─────────────────────────────────────────────────────────
  } else if (ext === "java" || ext === "kt" || ext === "kts") {
    let m: RegExpExecArray | null;
    const fileExt = (ext === "kt" || ext === "kts") ? ".kt" : ".java";
    const importRe = /^import\s+(?:static\s+)?([a-zA-Z][a-zA-Z0-9_.]+);?$/gm;
    while ((m = importRe.exec(sourceCode)) !== null) {
      const parts = m[1].split(".");
      if (parts.length >= 3 && !parts[0].match(/^(java|javax|kotlin|android|com\.google|org\.springframework)$/)) {
        push(parts.join("/") + fileExt);
      }
    }

  // ── C# ────────────────────────────────────────────────────────────────────
  } else if (ext === "cs") {
    let m: RegExpExecArray | null;
    const usingRe = /^using\s+(?:static\s+)?([a-zA-Z][a-zA-Z0-9_.]+)\s*;/gm;
    while ((m = usingRe.exec(sourceCode)) !== null) {
      const parts = m[1].split(".");
      if (parts.length >= 2) push(parts.join("/") + ".cs");
    }

  // ── Swift ─────────────────────────────────────────────────────────────────
  } else if (ext === "swift") {
    let m: RegExpExecArray | null;
    const importRe = /^import\s+([a-zA-Z_][a-zA-Z0-9_.]+)/gm;
    while ((m = importRe.exec(sourceCode)) !== null) {
      if (!m[1].match(/^(Foundation|UIKit|SwiftUI|AppKit|Combine|CoreData|XCTest)$/)) {
        push((dir ? dir + "/" : "") + m[1] + ".swift");
      }
    }

  // ── JavaScript / TypeScript (default) ────────────────────────────────────
  } else {
    let m: RegExpExecArray | null;

    // Static imports: import X from './y', import { X } from '../y', import './y'
    const staticRe = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    while ((m = staticRe.exec(sourceCode)) !== null) {
      const importPath = m[1];
      if (importPath.startsWith(".")) {
        let resolved = norm((dir ? dir + "/" : "") + importPath);
        if (!path.extname(resolved)) {
          resolved += (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") ? ".js" : ".ts";
        }
        push(resolved);
      }
    }

    // require('./path')
    const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = requireRe.exec(sourceCode)) !== null) {
      const importPath = m[1];
      if (importPath.startsWith(".")) {
        let resolved = norm((dir ? dir + "/" : "") + importPath);
        if (!path.extname(resolved)) resolved += ".js";
        push(resolved);
      }
    }

    // Dynamic: import('./path')
    const dynRe = /import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    while ((m = dynRe.exec(sourceCode)) !== null) {
      let resolved = norm((dir ? dir + "/" : "") + m[1]);
      if (!path.extname(resolved)) resolved += ".ts";
      push(resolved);
    }
  }

  return results;
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

/**
 * Extracts function/method names from source code.
 * Supports: TypeScript, JavaScript, Python, Go, Ruby, Rust, Java, Kotlin, C#, PHP.
 */
function extractFunctions(sourceCode: string, language: string): string[] {
  const functions: string[] = [];
  const push = (name: string) => { if (name && !functions.includes(name)) functions.push(name); };
  try {
    if (language === "typescript" || language === "javascript") {
      [
        /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
        /(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\(/g,
        /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*:\s*[^{]+\s*{/g,
      ].forEach(p => { let m; while ((m = p.exec(sourceCode)) !== null) push(m[1]); });
    } else if (language === "python") {
      let m; const p = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      while ((m = p.exec(sourceCode)) !== null) push(m[1]);
    } else if (language === "go") {
      let m; const p = /func\s+(?:\([^)]+\)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      while ((m = p.exec(sourceCode)) !== null) push(m[1]);
    } else if (language === "ruby") {
      let m; const p = /def\s+(?:self\.)?([a-zA-Z_][a-zA-Z0-9_?!]*)/g;
      while ((m = p.exec(sourceCode)) !== null) push(m[1]);
    } else if (language === "rust") {
      let m; const p = /(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[<(]/g;
      while ((m = p.exec(sourceCode)) !== null) push(m[1]);
    } else if (language === "java" || language === "kotlin" || language === "scala") {
      let m; const p = /(?:fun|void|public|private|protected|override|suspend)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      const SKIP = new Set(["if","for","while","switch","catch","class","interface","object","fun"]);
      while ((m = p.exec(sourceCode)) !== null) if (!SKIP.has(m[1])) push(m[1]);
    } else if (language === "csharp") {
      let m; const p = /(?:public|private|protected|internal|static|override|virtual|async)\s+(?:[\w<>[\],.\s]+\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      const SKIP = new Set(["if","for","while","switch","catch","class","interface","return","new","void"]);
      while ((m = p.exec(sourceCode)) !== null) if (!SKIP.has(m[1])) push(m[1]);
    } else if (language === "php") {
      let m; const p = /(?:public|private|protected|static)?\s*function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      while ((m = p.exec(sourceCode)) !== null) push(m[1]);
    } else if (language === "swift") {
      let m; const p = /func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(<]/g;
      while ((m = p.exec(sourceCode)) !== null) push(m[1]);
    }
  } catch (err) { /* ignore */ }
  return functions.slice(0, 20);
}

/**
 * Extracts function call relationships from source code.
 * Returns map of function name to array of functions it calls.
 */
function extractFunctionCalls(sourceCode: string, language: string, availableFunctions: string[]): Map<string, string[]> {
  const calls = new Map<string, string[]>();
  
  try {
    if (language === "typescript" || language === "javascript") {
      // For each function, find calls to other known functions
      availableFunctions.forEach(funcName => {
        const funcPattern = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*{([^}]*(?:{[^}]*}[^}]*)*)`, 'g');
        const constPattern = new RegExp(`const\\s+${funcName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*{([^}]*(?:{[^}]*}[^}]*)*)`, 'g');
        
        let match;
        const body: string[] = [];
        
        while ((match = funcPattern.exec(sourceCode)) !== null) {
          if (match[1]) body.push(match[1]);
        }
        while ((match = constPattern.exec(sourceCode)) !== null) {
          if (match[1]) body.push(match[1]);
        }
        
        if (body.length > 0) {
          const calledFunctions: string[] = [];
          const combinedBody = body.join('\n');
          
          availableFunctions.forEach(targetFunc => {
            if (targetFunc !== funcName) {
              const callPattern = new RegExp(`\\b${targetFunc}\\s*\\(`, 'g');
              if (callPattern.test(combinedBody)) {
                calledFunctions.push(targetFunc);
              }
            }
          });
          
          if (calledFunctions.length > 0) {
            calls.set(funcName, calledFunctions);
          }
        }
      });
    }
  } catch (err) {
    // Ignore extraction errors
  }
  
  return calls;
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

  const importMap = new Map<string, string[]>(); // nodeId → [importedNodeIds]
  const nodes: CortexNode[] = [];

  // Fetch the repo file tree — handle empty repos gracefully
  let tree: Awaited<ReturnType<typeof fetchRepoTree>>;
  try {
    tree = await fetchRepoTree({ repoFullName: `${repoOwner}/${repoName}`, token: accessToken, recursive: true });
  } catch (err: any) {
    // GitHub returns 409 "Git Repository is empty" or 404 "Not Found" for repos with no commits
    if (
      err?.cause?.status === 409 || err?.status === 409 ||
      err?.cause?.status === 404 || err?.status === 404
    ) {
      logger.warn({ repoId }, "Cortex: Repository is empty or not found — returning empty graph");
      return { nodes: [], importMap: new Map() };
    }
    throw err;
  }

  // ── Import resolution map ────────────────────────────────────────────────
  // GitHub gives us the exact file paths (e.g. src/utils/config.ts, src/components/Button.tsx,
  // src/utils/index.ts).  extractImports returns *normalised* paths but can't know whether
  // the import target is a .ts or .tsx file, or whether it resolves to a directory index.
  // We pre-build a lookup table keyed by every *stripped* variant of each real file path so
  // that we can map `src/utils/config` → `src/utils/config.ts` and
  // `src/utils` → `src/utils/index.ts` before hashing.
  const stripExt = (p: string): string => p.replace(/\.[^./\\]+$/, "");

  /** real file paths that exist in the repo */
  const filePathSet = new Set<string>(
    tree.filter((f) => f.type === "blob").map((f) => f.path)
  );

  /**
   * Map: normalised-key  →  canonical file path in repo.
   * Keys added (first match wins):
   *   1. exact path with extension          → src/utils/config.ts
   *   2. path without extension             → src/utils/config
   *   3. parent directory of an index file  → src/utils  (from src/utils/index.ts)
   */
  const importResolutionMap = new Map<string, string>();
  for (const fp of filePathSet) {
    if (!importResolutionMap.has(fp))            importResolutionMap.set(fp, fp);
    const noExt = stripExt(fp);
    if (!importResolutionMap.has(noExt))         importResolutionMap.set(noExt, fp);
    if (path.basename(noExt) === "index") {
      const dir = path.dirname(fp).replace(/\\/g, "/");
      if (!importResolutionMap.has(dir))         importResolutionMap.set(dir, fp);
      const dirNoExt = stripExt(dir);
      if (!importResolutionMap.has(dirNoExt))    importResolutionMap.set(dirNoExt, fp);
    }
  }

  /**
   * Resolve a normalised import path to the node-ID of the target, taking into
   * account missing extensions and directory-index fallbacks.
   */
  const resolveImportToNodeId = (importPath: string): string => {
    if (importResolutionMap.has(importPath))       return hashPath(importResolutionMap.get(importPath)!);
    const noExt = stripExt(importPath);
    if (importResolutionMap.has(noExt))            return hashPath(importResolutionMap.get(noExt)!);
    return hashPath(importPath); // unknown external — will be discarded by buildEdges
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Determine which files get AI summaries (only key architectural files)
  const AI_SUMMARY_ELIGIBLE_PATHS = [
    "/handlers/", "/controllers/",
    "/functions/", "/lambdas/",
    "/services/", "/service/",
    "/workers/", "/jobs/",
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
    let functions: string[] = [];
    let functionCalls: Map<string, string[]> = new Map();

    // Fetch source only for code files (skip binary/large files)
    const isCodeFile = [
      "typescript", "javascript", "python",
      "go", "ruby", "rust",
      "java", "kotlin", "scala", "groovy",
      "csharp", "cpp", "c",
      "php", "swift", "dart",
    ].includes(language);

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
        
        // Extract functions defined in this file
        functions = extractFunctions(source, language);
        
        // Extract function call relationships
        if (functions.length > 0) {
          functionCalls = extractFunctionCalls(source, language, functions);
        }

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
      functions: functions.length > 0 ? functions : undefined,
      functionCalls: functionCalls.size > 0 ? Object.fromEntries(functionCalls) : undefined,
    };

    nodes.push(node);
    importMap.set(
      nodeId,
      imports.map((importPath) => resolveImportToNodeId(importPath))
    );
  }

  const totalImports = Array.from(importMap.values()).reduce((sum, arr) => sum + arr.length, 0);
  logger.info({ repoId, nodeCount: nodes.length, totalImports, sampleImports: Array.from(importMap.entries()).slice(0, 2) }, "Cortex: Nodes built");
  return { nodes, importMap };
}

/**
 * STEP 2 — Build edges from the import map and calculate dependency counts.
 */
function buildEdges(
  nodes: CortexNode[],
  importMap: Map<string, string[]>
): CortexEdge[] {
  const nodeIdSet  = new Set(nodes.map((n) => n.id));
  // O(1) node lookup — replaces repeated nodes.find() inside the hot loop
  const nodeById   = new Map<string, CortexNode>(nodes.map((n) => [n.id, n]));
  // O(1) duplicate detection — replaces edges.some() inside the hot loop
  const seenEdges  = new Set<string>();
  const dependencyCounter = new Map<string, number>();
  const edges: CortexEdge[] = [];

  let totalAttempts = 0;
  let skippedNotInGraph = 0;
  let skippedSelfLoop = 0;
  let skippedDuplicate = 0;
  let created = 0;

  for (const [sourceId, targetIds] of importMap.entries()) {
    for (const targetId of targetIds) {
      totalAttempts++;

      // Only create edges between nodes that exist in our graph
      if (!nodeIdSet.has(targetId)) {
        skippedNotInGraph++;
        continue;
      }
      if (sourceId === targetId) {
        skippedSelfLoop++;
        continue;
      }

      const edgeId = `${sourceId}→${targetId}`;

      // Avoid duplicate edges
      if (seenEdges.has(edgeId)) {
        skippedDuplicate++;
        continue;
      }
      seenEdges.add(edgeId);

      // Determine edge type based on layer relationship
      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);

      let edgeType: CortexEdge["type"] = "import";
      if (sourceNode?.type === "service" && targetNode?.type === "module") {
        edgeType = "calls";
      } else if (sourceNode?.type === "infrastructure" && targetNode?.type === "service") {
        edgeType = "orchestrates";
      }

      // Strength: higher if target is a shared utility (many things depend on it)
      const existingDeps = dependencyCounter.get(targetId) ?? 0;
      const strength = Math.min(10, existingDeps + 1);
      dependencyCounter.set(targetId, existingDeps + 1);

      edges.push({ id: edgeId, source: sourceId, target: targetId, type: edgeType, strength });
      created++;
    }
  }

  // Back-fill dependencyCount on each node
  for (const node of nodes) {
    node.dependencyCount = dependencyCounter.get(node.id) ?? 0;
  }

  logger.info({
    totalAttempts,
    created,
    skippedNotInGraph,
    skippedSelfLoop,
    skippedDuplicate,
    edgeCount: edges.length,
  }, "Cortex: Edges built");

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
        TableName: config.DYNAMO_REPOSITORIES_TABLE,
        Key: { repoId: `${repoId}#CORTEX_GRAPH` }, // Use composite repoId to retrieve graph
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
          repoId: `${repoId}#CORTEX_GRAPH`, // Use composite repoId to store graph separately
          recordType: "CORTEX_GRAPH_CACHE",
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