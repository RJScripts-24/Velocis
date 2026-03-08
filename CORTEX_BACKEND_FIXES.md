# Visual Cortex Backend Fixes

This document contains only the backend server fixes needed to make Visual Cortex work properly in production.

---

## 🔧 Issues to Fix

### Issue 1: CORS Error with Credentials
**Error Message**:
```
Access to fetch at 'http://localhost:3001/api/me' from origin 'http://localhost:5174' 
has been blocked by CORS policy: Response to preflight request doesn't pass access 
control check: The value of the 'Access-Control-Allow-Origin' header in the response 
must not be the wildcard '*' when the request's credentials mode is 'include'.
```

**Root Cause**: Frontend sends requests with `credentials: 'include'`, but server uses wildcard `*` for CORS.

**Solution**: Configure CORS to allow specific origins with credentials enabled.

### Issue 2: File Drill-Down Not Working
**Error**: Clicking service nodes doesn't show file-level view

**Root Cause**: Missing API endpoint for service files

**Solution**: Implement the `/api/repos/:repoId/cortex/services/:serviceId/files` endpoint

---

## 🔨 Fix 1: CORS Configuration

### Location
Your Express server configuration file (e.g., `backend/server.ts` or main app file)

### Current Code (Wrong)
```javascript
const app = express();
app.use(cors()); // ❌ Uses wildcard '*' which doesn't work with credentials
app.use(express.json());
```

### Fixed Code
```javascript
const app = express();

// CORS configuration to allow credentials
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://your-production-domain.com' // Add your production domain
  ],
  credentials: true // Allow credentials (cookies, authorization headers)
}));

app.use(express.json());
```

### Why This Fixes It
- When `credentials: 'include'` is used in fetch requests, CORS cannot use wildcard `*`
- You must specify exact allowed origins
- `credentials: true` tells the browser it's safe to send cookies/auth headers

---

## 🔨 Fix 2: Add File Drill-Down Endpoint

### Endpoint
```
GET /api/repos/:repoId/cortex/services/:serviceId/files
```

### Required Response Structure
```typescript
interface CortexServiceFilesResponse {
  service: {
    id: number;
    name: string;
    layer: 'edge' | 'compute' | 'data';
    status: 'healthy' | 'warning' | 'critical';
  };
  files: CortexFileNode[];
  imports: CortexFileImport[];
  stats: {
    totalFiles: number;
    totalLOC: number;
    avgComplexity: number;
    mostComplex?: string;
    entryPoint?: string;
  };
}

interface CortexFileNode {
  id: string;                              // Unique file ID
  name: string;                            // File name (e.g., "App.tsx")
  path: string;                            // Full path (e.g., "src/App.tsx")
  type: 'module' | 'util' | 'config' | 'test' | 'component';
  language: string;                        // e.g., "typescript", "javascript"
  linesOfCode: number;                     // Number of lines
  complexity: number;                      // Cyclomatic complexity
  functions: string[];                     // Function names in this file
  functionCalls?: Record<string, string[]>; // Which functions call which
  importsFrom: string[];                   // Files this file imports
  importedBy: string[];                    // Files that import this file
  lastModified: string;                    // e.g., "2 hours ago"
}

interface CortexFileImport {
  from: string;      // Source file ID
  to: string;        // Target file ID
  count: number;     // Number of imports
  functions: string[]; // Which functions are imported
}
```

### Implementation Example

**File**: `backend/src/handlers/api/getCortexServiceFiles.ts`

```typescript
import { Request, Response } from 'express';

export async function getCortexServiceFiles(req: Request, res: Response) {
  const { repoId, serviceId } = req.params;
  
  try {
    // 1. Get service from database
    const service = await getServiceFromDB(repoId, parseInt(serviceId));
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // 2. Get all files for this service from your cortex data
    const serviceFiles = await getFilesForService(repoId, parseInt(serviceId));
    
    // 3. Build file nodes
    const fileNodes: CortexFileNode[] = serviceFiles.map(file => ({
      id: file.id || `${serviceId}-${file.path}`,
      name: file.name || file.path.split('/').pop()!,
      path: file.path,
      type: determineFileType(file.path),
      language: file.language || detectLanguage(file.path),
      linesOfCode: file.linesOfCode || 0,
      complexity: file.complexity || calculateComplexity(file.content),
      functions: file.functions || extractFunctions(file.content),
      functionCalls: file.functionCalls || {},
      importsFrom: file.imports || [],
      importedBy: file.importedBy || [],
      lastModified: file.lastModified || 'Unknown'
    }));

    // 4. Build import relationships between files
    const imports: CortexFileImport[] = [];
    
    for (const file of fileNodes) {
      for (const importPath of file.importsFrom) {
        const targetFile = fileNodes.find(f => f.path === importPath);
        if (targetFile) {
          imports.push({
            from: file.id,
            to: targetFile.id,
            count: 1,
            functions: file.functions.slice(0, 3) // Sample functions
          });
        }
      }
    }

    // 5. Calculate stats
    const stats = {
      totalFiles: fileNodes.length,
      totalLOC: fileNodes.reduce((sum, f) => sum + f.linesOfCode, 0),
      avgComplexity: fileNodes.length > 0 
        ? fileNodes.reduce((sum, f) => sum + f.complexity, 0) / fileNodes.length 
        : 0,
      mostComplex: fileNodes.sort((a, b) => b.complexity - a.complexity)[0]?.name,
      entryPoint: findEntryPoint(fileNodes)
    };

    // 6. Return response
    res.json({
      service: {
        id: service.id,
        name: service.name,
        layer: service.layer,
        status: service.status
      },
      files: fileNodes,
      imports: imports,
      stats: stats
    });
    
  } catch (error) {
    console.error('Error getting service files:', error);
    res.status(500).json({ error: 'Failed to get service files' });
  }
}

// Helper function: Determine file type
function determineFileType(filePath: string): 'module' | 'util' | 'config' | 'test' | 'component' {
  const lower = filePath.toLowerCase();
  if (lower.includes('test') || lower.includes('spec')) return 'test';
  if (lower.includes('util') || lower.includes('helper')) return 'util';
  if (lower.includes('config') || lower.endsWith('.json')) return 'config';
  if (lower.includes('component')) return 'component';
  return 'module';
}

// Helper function: Detect language from file extension
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
    'css': 'css',
    'html': 'html',
    'json': 'json'
  };
  return langMap[ext || ''] || 'unknown';
}

// Helper function: Find entry point
function findEntryPoint(files: CortexFileNode[]): string | undefined {
  const entryPatterns = ['index', 'main', 'app'];
  for (const pattern of entryPatterns) {
    const entry = files.find(f => 
      f.name.toLowerCase().includes(pattern)
    );
    if (entry) return entry.name;
  }
  return files[0]?.name;
}

// Helper function: Calculate cyclomatic complexity (simplified)
function calculateComplexity(content: string): number {
  if (!content) return 1;
  
  let complexity = 1; // Base complexity
  
  // Count decision points
  const patterns = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /for\s*\(/g,
    /while\s*\(/g,
    /case\s+/g,
    /catch\s*\(/g,
    /\?\s*.*\s*:/g, // ternary
    /&&/g,
    /\|\|/g
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) complexity += matches.length;
  }
  
  return complexity;
}

// Helper function: Extract function names (simplified)
function extractFunctions(content: string): string[] {
  if (!content) return [];
  
  const functions: string[] = [];
  
  // Match function declarations
  const patterns = [
    /function\s+(\w+)/g,           // function name()
    /const\s+(\w+)\s*=\s*\(/g,     // const name = ()
    /(\w+)\s*:\s*\([^)]*\)\s*=>/g, // name: () =>
    /(\w+)\s*\([^)]*\)\s*{/g       // name() {
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
  }
  
  return [...new Set(functions)]; // Remove duplicates
}
```

### Register the Route

**File**: `backend/server.ts` or your routes file

```typescript
import { getCortexServiceFiles } from './handlers/api/getCortexServiceFiles';

// Add this route
app.get('/api/repos/:repoId/cortex/services/:serviceId/files', getCortexServiceFiles);
```

---

## 📊 Data Requirements

### What You Need in Your Database

For the file drill-down to work, your cortex data should include file-level information:

```typescript
// Service structure in database
{
  id: 1,
  repoId: "repo-123",
  name: "Frontend App",
  layer: "edge",
  status: "healthy",
  files: [
    {
      id: "file-1",
      path: "src/App.tsx",
      name: "App.tsx",
      language: "typescript",
      linesOfCode: 500,
      complexity: 21,
      functions: ["App", "Header", "Footer"],
      functionCalls: {
        "App": ["Header", "Footer"]
      },
      imports: ["src/components/Header.tsx", "src/components/Footer.tsx"],
      importedBy: ["src/main.tsx"],
      lastModified: "2024-03-08T10:30:00Z"
    }
    // ... more files
  ]
}
```

### How to Generate This Data

You need to parse your repository files and extract:

1. **File metadata**: path, name, language, LOC
2. **Complexity**: Calculate cyclomatic complexity
3. **Functions**: Parse and extract function/method names
4. **Imports**: Parse import statements to build dependency graph
5. **Function calls**: Analyze which functions call which

This is typically done during the cortex build/sync process.

---

## 🧪 Testing the Fixes

### Test CORS Fix
```bash
# From your frontend, this should now work:
curl -X OPTIONS http://localhost:3001/api/me \
  -H "Origin: http://localhost:5174" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Look for:
# Access-Control-Allow-Origin: http://localhost:5174
# Access-Control-Allow-Credentials: true
```

### Test File Drill-Down Endpoint
```bash
# Should return file nodes and imports
curl http://localhost:3001/api/repos/your-repo-id/cortex/services/1/files

# Expected response structure:
{
  "service": { "id": 1, "name": "...", "layer": "...", "status": "..." },
  "files": [ { "id": "...", "name": "...", "path": "...", ... } ],
  "imports": [ { "from": "...", "to": "...", "count": 1, ... } ],
  "stats": { "totalFiles": 5, "totalLOC": 2500, ... }
}
```

---

## ✅ Implementation Checklist

### Backend Changes
- [ ] Update CORS configuration with specific origins and `credentials: true`
- [ ] Create `getCortexServiceFiles` handler
- [ ] Implement helper functions (determineFileType, calculateComplexity, etc.)
- [ ] Register the route: `GET /api/repos/:repoId/cortex/services/:serviceId/files`
- [ ] Ensure your cortex data includes file-level information
- [ ] Test CORS with credentials from frontend
- [ ] Test file drill-down endpoint returns correct structure

### Data Requirements
- [ ] Store file paths for each service
- [ ] Store file metadata (LOC, complexity, language)
- [ ] Store function names extracted from files
- [ ] Store import relationships between files
- [ ] Calculate and store complexity metrics

---

## 🐛 Common Issues

### Issue: Still Getting CORS Error
**Check**:
1. Did you restart the server after changing CORS config?
2. Is the frontend origin exactly matching (including port)?
3. Are you using `credentials: true` in both server and client?

### Issue: File Drill-Down Returns Empty Array
**Check**:
1. Does your service data include file information?
2. Is the serviceId valid and exists in database?
3. Are you returning the correct response structure?

### Issue: Files Show But No Connections
**Check**:
1. Are you building the `imports` array correctly?
2. Do file IDs match between `files` and `imports` arrays?
3. Are import paths being resolved correctly?

### Issue: "Blast Radius Detected" Warning Shows Incorrectly
**Problem**: Warning shows "X connections affected by critical failures" but no services are critical

**Root Cause**: `blast_radius_pairs` array has entries but no services have `status: 'critical'`

**Solution**: Only include blast radius pairs when there are actual critical services:
```javascript
{
  "blast_radius_pairs": [], // Empty if no critical services
  "critical_service_id": null // null if no critical services
}

// OR if you have a critical service:
{
  "services": [
    { "id": 4, "status": "critical", ... }
  ],
  "blast_radius_pairs": [
    { "source_id": 1, "target_id": 4 }, // Services affected by critical service
    { "source_id": 4, "target_id": 5 }
  ],
  "critical_service_id": 4 // ID of the critical service
}
```

**Rule**: Blast radius pairs should only exist when `critical_service_id` is not null and points to a service with `status: 'critical'`

---

## 🎨 Smart Edges Feature

### What Are Smart Edges?

Smart edges are the connection lines between services in the Visual Cortex graph. They automatically route around obstacles and use different colors/styles based on the relationship type.

### Edge Types & Colors

The frontend uses these edge classifications:

```typescript
// Edge colors (defined in CortexPage.tsx)
const EDGE_COLOR_FORWARD = '#6366f1';   // Blue - normal forward flow
const EDGE_COLOR_REVERSE = '#8b5cf6';   // Purple - reverse/upward flow
const EDGE_COLOR_BLAST = '#f59e0b';     // Orange - affected by blast radius
const EDGE_COLOR_CRITICAL = '#ef4444';  // Red - critical service connection
```

### Backend Data Structure

Your API should return connections with these flags:

```typescript
interface ServiceConnection {
  source: string;      // Source service ID
  target: string;      // Target service ID
  isCritical: boolean; // Is this a critical connection?
  isBlast: boolean;    // Is this affected by blast radius?
}
```

### How to Build Connection Data

**In your `GET /api/repos/:repoId/cortex/services` endpoint:**

```typescript
// Example implementation
export async function getCortexServices(req: Request, res: Response) {
  const { repoId } = req.params;
  
  // 1. Get services from database
  const services = await getServicesFromDB(repoId);
  
  // 2. Find critical services
  const criticalServices = services.filter(s => s.status === 'critical');
  const criticalServiceId = criticalServices[0]?.id || null;
  
  // 3. Build blast radius pairs (services affected by critical services)
  const blastRadiusPairs: Array<{ source_id: number; target_id: number }> = [];
  
  if (criticalServiceId) {
    // Find all services that depend on the critical service
    const affectedServices = findAffectedServices(services, criticalServiceId);
    
    for (const affected of affectedServices) {
      blastRadiusPairs.push({
        source_id: affected.id,
        target_id: criticalServiceId
      });
    }
  }
  
  // 4. Return response
  res.json({
    repo_id: repoId,
    last_updated_ago: calculateTimeAgo(new Date()),
    last_updated_at: new Date().toISOString(),
    services: services,
    blast_radius_pairs: blastRadiusPairs,
    critical_service_id: criticalServiceId
  });
}

// Helper: Find all services affected by a critical service
function findAffectedServices(
  services: Service[], 
  criticalId: number
): Service[] {
  const affected = new Set<number>();
  const visited = new Set<number>();
  
  // Recursive function to find all upstream dependencies
  function findUpstream(serviceId: number) {
    if (visited.has(serviceId)) return;
    visited.add(serviceId);
    
    // Find services that depend on this service
    for (const service of services) {
      if (service.connections.includes(serviceId)) {
        affected.add(service.id);
        findUpstream(service.id);
      }
    }
  }
  
  findUpstream(criticalId);
  return services.filter(s => affected.has(s.id));
}
```

### Edge Routing Logic

The frontend automatically handles edge routing based on service positions:

1. **Downward Flow** (source below target):
   - Routes from bottom of source to top of target
   - Uses blue color for normal flow
   - Avoids obstacles in between

2. **Upward Flow** (source above target):
   - Routes from top of source to bottom of target
   - Uses purple color to indicate reverse flow

3. **Same Layer** (source and target at same Y position):
   - Routes from top of source to top of target
   - Creates an arc above the services
   - Prevents crossing other service nodes

4. **Critical Connections**:
   - Uses red color
   - Animated stroke
   - Thicker line (2.5px vs 1.5px)

5. **Blast Radius Connections**:
   - Uses orange color
   - Shows which services are affected by critical failures

### Service Connection Data

Each service should include a `connections` array with IDs of services it depends on:

```typescript
{
  "id": 1,
  "name": "Frontend App",
  "connections": [2, 3], // This service depends on services 2 and 3
  // ... other fields
}
```

### Complete Example

```typescript
// Service with connections
{
  "services": [
    {
      "id": 1,
      "name": "Frontend App",
      "status": "healthy",
      "layer": "edge",
      "connections": [2, 3], // Depends on State Management (2) and UI Components (3)
      // ...
    },
    {
      "id": 2,
      "name": "State Management",
      "status": "healthy",
      "layer": "compute",
      "connections": [4], // Depends on API Layer (4)
      // ...
    },
    {
      "id": 3,
      "name": "UI Components",
      "status": "healthy",
      "layer": "edge",
      "connections": [2], // Depends on State Management (2)
      // ...
    },
    {
      "id": 4,
      "name": "API Layer",
      "status": "critical", // ⚠️ Critical service
      "layer": "data",
      "connections": [5], // Depends on Database (5)
      // ...
    },
    {
      "id": 5,
      "name": "Database",
      "status": "healthy",
      "layer": "data",
      "connections": [], // No dependencies
      // ...
    }
  ],
  "blast_radius_pairs": [
    { "source_id": 1, "target_id": 4 }, // Frontend affected by critical API
    { "source_id": 2, "target_id": 4 }, // State Management affected by critical API
    { "source_id": 4, "target_id": 5 }  // API depends on Database
  ],
  "critical_service_id": 4 // API Layer is critical
}
```

### Visual Result

With the above data, the graph will show:
- **Blue edges**: 1→2, 1→3, 2→4, 3→2, 5 (normal dependencies)
- **Red animated edges**: 4→5 (critical service connection)
- **Orange edges**: 1→4, 2→4 (blast radius - affected by critical service)

### Edge Styling Reference

```typescript
// Normal forward flow
{
  color: '#6366f1',      // Blue
  strokeWidth: 1.5,
  animated: false
}

// Reverse/upward flow
{
  color: '#8b5cf6',      // Purple
  strokeWidth: 1.5,
  animated: false
}

// Blast radius affected
{
  color: '#f59e0b',      // Orange
  strokeWidth: 1.5,
  animated: false
}

// Critical connection
{
  color: '#ef4444',      // Red
  strokeWidth: 2.5,      // Thicker
  animated: true         // Animated stroke
}
```

### Testing Smart Edges

1. **Test Normal Connections**:
   - Create services with `connections` array
   - Verify blue edges appear between services

2. **Test Critical Connections**:
   - Set one service to `status: 'critical'`
   - Set `critical_service_id` to that service's ID
   - Verify red animated edges from critical service

3. **Test Blast Radius**:
   - Add entries to `blast_radius_pairs`
   - Verify orange edges for affected connections

4. **Test Edge Routing**:
   - Services in same layer should have arcing edges
   - Services in different layers should have straight paths
   - Edges should avoid crossing service nodes

---

## 🎯 Summary

### Two Critical Fixes

1. **CORS Configuration**
   ```javascript
   app.use(cors({
     origin: ['http://localhost:5173', 'http://localhost:5174'],
     credentials: true
   }));
   ```

2. **File Drill-Down Endpoint**
   ```
   GET /api/repos/:repoId/cortex/services/:serviceId/files
   ```
   Returns: service info, file nodes, imports, stats

Apply these fixes to your production backend and Visual Cortex will work correctly! 🚀
