/**
 * getCortexServiceFiles.ts
 * Velocis — API Handler for Service File-Level Drill-Down
 *
 * Responsibility:
 *   Provides detailed file-level graph data for a specific service.
 *   Used when user clicks a service node to drill down and see the
 *   internal architecture (files, imports, function calls).
 *
 * Route:
 *   GET /repos/:repoId/cortex/services/:serviceId/files
 *
 * Response:
 *   {
 *     service: { name, id, ... }
 *     files: [{ id, name, path, type, linesOfCode, ... }]
 *     imports: [{ from, to, count, functions: [...] }]
 *     stats: { totalFiles, totalLOC, avgComplexity, ... }
 *   }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient } from "../../services/database/dynamoClient";
import { logger } from "../../utils/logger";
import { ok, errors } from "../../utils/apiResponse";
import { config } from "../../utils/config";

const docClient = getDocClient();
const CORTEX_TABLE = process.env.CORTEX_TABLE ?? "velocis-cortex";
const REPOSITORIES_TABLE = config.DYNAMO_REPOSITORIES_TABLE;

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "module" | "util" | "config" | "test" | "component";
  language: string;
  linesOfCode: number;
  complexity: number;
  functions: string[];
  functionCalls?: Record<string, string[]>; // function name -> array of functions it calls
  importsFrom: string[];  // Array of file paths this imports
  importedBy: string[];   // Array of file paths that import this
  lastModified: string;
}

interface FileImport {
  from: string;     // Source file path
  to: string;       // Target file path
  count: number;    // Number of imports
  functions: string[];  // Specific functions/symbols imported
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { repoId, serviceId } = event.pathParameters || {};
    
    if (!repoId || !serviceId) {
      return errors.badRequest("Missing repoId or serviceId");
    }

    logger.info(`Fetching file-level data for repo ${repoId}, service ${serviceId}`);

    // 1. Get the service record to find its files
    const serviceKey = `REPO#${repoId}#SVC#${serviceId}`;
    const serviceResult = await docClient.send(
      new GetCommand({
        TableName: CORTEX_TABLE,
        Key: { id: serviceKey },
      })
    );

    if (!serviceResult.Item) {
      return errors.notFound("Service not found");
    }

    const service = serviceResult.Item;
    const filePaths: string[] = service.files || [];

    if (filePaths.length === 0) {
      return ok({
        service: {
          id: service.serviceId,
          name: service.name,
          layer: service.layer,
        },
        files: [],
        imports: [],
        stats: {
          totalFiles: 0,
          totalLOC: 0,
          avgComplexity: 0,
        },
      });
    }

    // 2. Get the complete file-level graph for this repo
    const graphKey = `${repoId}#CORTEX_GRAPH`;
    logger.info(`Looking for graph with key: ${graphKey} in table: ${REPOSITORIES_TABLE}`);
    
    const graphResult = await docClient.send(
      new GetCommand({
        TableName: REPOSITORIES_TABLE,
        Key: { repoId: graphKey },
      })
    );

    if (!graphResult.Item || !graphResult.Item.graph) {
      logger.warn(`No graph data found for repo ${repoId}. Item exists: ${!!graphResult.Item}, has graph: ${!!graphResult.Item?.graph}`);
      return ok({
        service: {
          id: service.serviceId,
          name: service.name,
          layer: service.layer,
        },
        files: [],
        imports: [],
        stats: { totalFiles: 0, totalLOC: 0, avgComplexity: 0 },
      });
    }

    const graph = graphResult.Item.graph;
    const allNodes = graph.nodes || [];
    const allEdges = graph.edges || [];
    
    logger.info(`Found graph with ${allNodes.length} nodes and ${allEdges.length} edges`);

    // 3. Build a map from node.id to node for quick lookups
    const nodeById = new Map<string, any>();
    allNodes.forEach((node: any) => {
      nodeById.set(node.id, node);
    });

    // 4. Filter nodes to only this service's files
    const serviceNodes = allNodes.filter((node: any) => 
      filePaths.includes(node.filePath)
    );
    
    logger.info(`Service has ${filePaths.length} file paths, found ${serviceNodes.length} matching nodes`);

    if (serviceNodes.length === 0) {
      return ok({
        service: {
          id: service.serviceId,
          name: service.name,
          layer: service.layer,
        },
        files: [],
        imports: [],
        stats: { totalFiles: 0, totalLOC: 0, avgComplexity: 0 },
      });
    }

    // 5. Build file nodes — importsFrom / importedBy / functions are stored directly on each
    //    CortexNode since the graphBuilder back-fills them at build time.
    const filePathToFileId = new Map<string, string>();
    const fileNodes: FileNode[] = serviceNodes.map((node: any, index: number) => {
      const fileId = (index + 1).toString();
      filePathToFileId.set(node.filePath, fileId);

      return {
        id: fileId,
        name: node.label || node.filePath.split("/").pop() || "unknown",
        path: node.filePath,
        type: node.type || "module",
        language: node.language || "unknown",
        linesOfCode: node.linesOfCode || 0,
        complexity: calculateComplexity(node),
        functions: Array.isArray(node.functions) ? node.functions : [],
        functionCalls: node.functionCalls || {},
        importsFrom: Array.isArray(node.importsFrom) ? node.importsFrom : [],
        importedBy: Array.isArray(node.importedBy) ? node.importedBy : [],
        lastModified: node.lastModified || new Date().toISOString(),
      };
    });

    // 6. Build intra-service ReactFlow edges from importsFrom relationships
    const imports: FileImport[] = [];
    const intraServiceImportMap = new Map<string, FileImport>();
    const serviceFilePaths = new Set(serviceNodes.map((n: any) => n.filePath as string));

    logger.info(`Building ${serviceNodes.length} file nodes; deriving edges from stored importsFrom`);

    for (const fileNode of fileNodes) {
      const rawNode = serviceNodes.find((n: any) => n.filePath === fileNode.path);
      if (!rawNode) continue;

      for (const importedPath of (rawNode.importsFrom ?? [])) {
        // Only draw ReactFlow edges for intra-service imports
        if (!serviceFilePaths.has(importedPath)) continue;
        const targetFileId = filePathToFileId.get(importedPath);
        if (!targetFileId || targetFileId === fileNode.id) continue;

        const key = `${fileNode.id}→${targetFileId}`;
        const existing = intraServiceImportMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          intraServiceImportMap.set(key, { from: fileNode.id, to: targetFileId, count: 1, functions: [] });
        }
      }
    }

    // Fallback: also process raw edges for any older graphs without stored importsFrom
    if (intraServiceImportMap.size === 0 && allEdges.length > 0) {
      const nodeIdToFileId = new Map<string, string>();
      serviceNodes.forEach((n: any, idx: number) => nodeIdToFileId.set(n.id, (idx + 1).toString()));
      const serviceNodeIds = new Set(serviceNodes.map((n: any) => n.id as string));

      allEdges.forEach((edge: any) => {
        const srcId = nodeIdToFileId.get(edge.source);
        const tgtId = nodeIdToFileId.get(edge.target);
        if (!srcId || !tgtId || !serviceNodeIds.has(edge.source) || !serviceNodeIds.has(edge.target)) return;
        const key = `${srcId}→${tgtId}`;
        const existing = intraServiceImportMap.get(key);
        if (existing) { existing.count += 1; }
        else { intraServiceImportMap.set(key, { from: srcId, to: tgtId, count: 1, functions: [] }); }
      });
    }

    imports.push(...Array.from(intraServiceImportMap.values()));

    logger.info(`Edge processing complete: ${imports.length} intra-service edges, importsFrom/importedBy populated from all touching edges`);

    // 7. Calculate stats
    const totalLOC = fileNodes.reduce((sum, f) => sum + f.linesOfCode, 0);
    const avgComplexity = fileNodes.length > 0
      ? fileNodes.reduce((sum, f) => sum + f.complexity, 0) / fileNodes.length
      : 0;

    // 8. Return response
    logger.info(`Returning response for service ${service.name}: ${fileNodes.length} files, ${imports.length} imports`);
    if (imports.length > 0) {
      logger.info(`Sample imports: ${JSON.stringify(imports.slice(0, 3))}`);
    }
    
    return ok({
      service: {
        id: service.serviceId,
        name: service.name,
        layer: service.layer,
        status: service.status,
      },
      files: fileNodes,
      imports,
      stats: {
        totalFiles: fileNodes.length,
        totalLOC,
        avgComplexity: Math.round(avgComplexity),
        mostComplex: fileNodes.sort((a, b) => b.complexity - a.complexity)[0]?.name,
        entryPoint: findEntryPoint(fileNodes),
      },
    });

  } catch (error) {
    logger.error(`Failed to fetch service files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return ok({
      error: "Failed to fetch service files",
      message: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
}

// Helper functions
function calculateComplexity(node: any): number {
  // Simple heuristic: based on LOC and imports
  const locFactor = Math.min(100, (node.linesOfCode || 0) / 10);
  const importFactor = Math.min(100, (node.importCount || 0) * 5);
  return Math.round((locFactor + importFactor) / 2);
}

function extractFunctions(node: any): string[] {
  // Would ideally parse from AST, for now return empty
  // This could be enhanced to extract actual function names
  return [];
}

function findEntryPoint(files: FileNode[]): string | undefined {
  // Look for common entry point patterns
  const entryPatterns = ['index', 'main', 'app', 'server', 'handler'];
  const entryFile = files.find(f => 
    entryPatterns.some(pattern => 
      f.name.toLowerCase().includes(pattern)
    )
  );
  return entryFile?.name;
}
