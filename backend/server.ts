/**
 * server.ts
 * Local Express dev server — wraps every Lambda handler so they can be called
 * from http://localhost:3001 without AWS SAM or any cloud resources.
 *
 * The adapter converts an Express Request → APIGatewayProxyEvent and maps
 * the APIGatewayProxyResult back to an Express Response, so every handler
 * runs 100% unmodified.
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import serverless from "serverless-http";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { randomUUID } from "crypto";

// ── Handler imports ──────────────────────────────────────────────────────────
import * as auth from "./src/handlers/api/auth";
import * as authGithub from "./src/handlers/api/authGithub";
import * as authGithubCallback from "./src/handlers/api/authGithubCallback";
import * as getMe from "./src/handlers/api/getMe";
import * as getGithubRepos from "./src/handlers/api/getGithubRepos";
import * as installRepo from "./src/handlers/api/installRepo";
import * as getDashboard from "./src/handlers/api/getDashboard";
import * as getRepoOverview from "./src/handlers/api/getRepoOverview";
import * as getSentinelData from "./src/handlers/api/getSentinelData";
import * as getPipelineData from "./src/handlers/api/getPipelineData";
import * as getCortexServices from "./src/handlers/api/getCortexServices";
import * as getCortexData from "./src/handlers/api/getCortexData";
import * as getWorkspaceData from "./src/handlers/api/getWorkspaceData";
import * as getInfrastructure from "./src/handlers/api/getInfrastructureData";
import * as getCostForecast from "./src/handlers/api/getCostForecast";
import * as getActivity from "./src/handlers/api/getActivity";
import * as getSystemHealth from "./src/handlers/api/getSystemHealth";
import * as postChatMessage from "./src/handlers/api/postChatMessage";
import * as getRepos from "./src/handlers/api/getRepos";
import * as githubPush from "./src/handlers/webhooks/githubPush";
import * as predictInfrastructure from "./src/handlers/api/predictInfrastructure";
import * as rebuildCortex from "./src/handlers/api/rebuildCortex";
import * as getCortexServiceFiles from "./src/handlers/api/getCortexServiceFiles";
import * as deleteRepo from "./src/handlers/api/deleteRepo";
import * as getAutomationReport from "./src/handlers/api/getAutomationReport";
import * as updateRepoSettings from "./src/handlers/api/updateRepoSettings";
import * as getRepoSettings from "./src/handlers/api/getRepoSettings";
import * as triggerAutomation from "./src/handlers/api/triggerAutomation";

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT ?? 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS — explicitly allow the Amplify frontend with credentials
app.use(
  cors({
    origin: 'https://main.d32db3pq6wbaq4.amplifyapp.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Lambda adapter ───────────────────────────────────────────────────────────

// ... existing ...
function toEvent(req: Request, pathParams: Record<string, string> = {}): APIGatewayProxyEvent {
  const qs: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") {
      qs[k] = v;
    } else if (Array.isArray(v)) {
      qs[k] = String(v[0]);
    }
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") {
      headers[k] = v;
    } else if (Array.isArray(v)) {
      headers[k] = String(v[0]);
    }
  }

  const multiValueHeaders: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) {
      multiValueHeaders[k] = v.map(String);
    } else if (typeof v === "string") {
      multiValueHeaders[k] = [v];
    }
  }

  return {
    httpMethod: req.method,
    path: req.path,
    pathParameters: Object.keys(pathParams).length ? pathParams : null,
    queryStringParameters: Object.keys(qs).length ? qs : null,
    multiValueQueryStringParameters: null,
    headers,
    multiValueHeaders: {},
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    stageVariables: null,
    resource: req.path,
    requestContext: {
      requestId: randomUUID(),
      stage: "local",
      resourcePath: req.path,
      httpMethod: req.method,
      path: req.path,
      resourceId: "",
      apiId: "local",
      accountId: "000000000000",
      protocol: "HTTP/1.1",
      identity: {} as any,
      requestTime: new Date().toUTCString(),
      requestTimeEpoch: Date.now(),
      authorizer: null as any,
    },
  };
}

/** Minimal Lambda Context for local use */
const fakeContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "local",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:local:000000000000:function:local",
  memoryLimitInMB: "256",
  awsRequestId: randomUUID(),
  logGroupName: "/aws/lambda/local",
  logStreamName: "local",
  getRemainingTimeInMillis: () => 30000,
  done: () => { },
  fail: () => { },
  succeed: () => { },
};

type LambdaHandler = (event: APIGatewayProxyEvent, ctx: Context) => Promise<APIGatewayProxyResult>;

/** Wrap a Lambda handler into an Express route handler */
function wrap(handler: LambdaHandler, paramMap?: Record<string, string>) {
  return async (req: Request, res: Response) => {
    // Build path param mapping from Express :params → API GW format
    const params: Record<string, string> = {};
    if (paramMap) {
      for (const [expressKey, agwKey] of Object.entries(paramMap)) {
        if (req.params[expressKey]) {
          params[agwKey] = String(req.params[expressKey]);
        }
      }
    } else {
      // Auto-map: Express param name == AGW param name
      for (const [k, v] of Object.entries(req.params)) {
        params[k] = String(v);
      }
    }

    try {
      const event = toEvent(req, params);
      const result = await handler(event, fakeContext);

      // Forward all Lambda headers
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) {
          // Skip CORS headers — already set by our middleware
          if (k.toLowerCase().startsWith("access-control-")) continue;

          if (Array.isArray(v)) {
            res.setHeader(k, (v as unknown as any[]).map(String));
          } else {
            res.setHeader(k, String(v));
          }
        }
      }

      // Forward multi-value headers (used for multiple Set-Cookie headers)
      // Each cookie must be appended individually — res.setHeader would overwrite
      if (result.multiValueHeaders) {
        for (const [k, values] of Object.entries(result.multiValueHeaders)) {
          if (k.toLowerCase().startsWith("access-control-")) continue;
          if (Array.isArray(values)) {
            for (const v of values) {
              res.append(k, String(v));
            }
          }
        }
      }

      res.status(result.statusCode);

      // If body looks like JSON, parse it so clients get a proper JSON response
      const body = result.body ?? "";
      const ct = (result.headers?.["Content-Type"] ?? result.headers?.["content-type"] ?? "").toString();
      if (ct.includes("application/json") || (body.startsWith("{") || body.startsWith("["))) {
        try {
          res.json(JSON.parse(body));
        } catch {
          res.send(body);
        }
      } else {
        res.send(body);
      }
    } catch (err: any) {
      console.error("[server] Handler threw:", err?.message ?? err);
      res.status(500).json({ message: "Internal server error", error: err?.message });
    }
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

// § 1 — Authentication (session-cookie based OAuth)
app.get("/api/auth/github", wrap(authGithub.handler as LambdaHandler));
app.get("/api/auth/github/callback", wrap(authGithubCallback.handler as LambdaHandler));
app.post("/api/auth/logout", wrap(auth.logout as LambdaHandler));

// § 2 — User
app.get("/api/me", wrap(getMe.handler as LambdaHandler));

// § 3 — GitHub repositories
// /api/repos  — session-cookie auth (new OAuth flow)
// /api/github/repos — JWT Bearer auth (legacy, kept for backward compat)
app.get("/api/repos", wrap(getRepos.handler as LambdaHandler));
app.get("/api/github/repos", wrap(getGithubRepos.handler as LambdaHandler));

// § 4 — Onboarding / Installation
app.post("/api/repos/:repoId/install", wrap(installRepo.installRepo as LambdaHandler));
app.get("/api/repos/:repoId/install/status", wrap(installRepo.getInstallStatus as LambdaHandler));

// § 5 — Dashboard
app.get("/api/dashboard", wrap(getDashboard.handler as LambdaHandler));

// § 6 — Repository overview
app.get("/api/repos/:repoId", wrap(getRepoOverview.handler as LambdaHandler));
// § 6b — Delete repo
app.delete("/api/repos/:repoId", wrap(deleteRepo.handler as LambdaHandler));
// § 6c — Automation settings
app.get("/api/repos/:repoId/settings", wrap(getRepoSettings.handler as LambdaHandler));
app.post("/api/repos/:repoId/settings", wrap(updateRepoSettings.handler as LambdaHandler));
// § 6d — Automation Report
app.get("/api/repos/:repoId/automation-report", wrap(getAutomationReport.handler as LambdaHandler));
app.post("/api/repos/:repoId/trigger-automation", wrap(triggerAutomation.handler as LambdaHandler));


// § 7 — Sentinel agent
app.get("/api/repos/:repoId/sentinel/prs", wrap(getSentinelData.listPrs as LambdaHandler));
app.get("/api/repos/:repoId/sentinel/prs/:prNumber", wrap(getSentinelData.getPrDetail as LambdaHandler));
app.post("/api/repos/:repoId/sentinel/scan", wrap(getSentinelData.triggerScan as LambdaHandler));
app.get("/api/repos/:repoId/sentinel/activity", wrap(getSentinelData.getSentinelActivity as LambdaHandler));

// § 8 — Fortress / Pipeline
app.get("/api/repos/:repoId/pipeline", wrap(getPipelineData.getPipeline as LambdaHandler));
app.get("/api/repos/:repoId/pipeline/runs", wrap(getPipelineData.getPipelineRuns as LambdaHandler));
app.post("/api/repos/:repoId/pipeline/trigger", wrap(getPipelineData.triggerPipeline as LambdaHandler));
app.get("/api/repos/:repoId/pipeline/runs/:runId", wrap(getPipelineData.getPipelineRunDetail as LambdaHandler));

// § 8a — Fortress QA Strategist
app.post("/api/fortress/qa-plan", wrap(getPipelineData.postQAPlan as LambdaHandler));

// § 8b — Fortress API Documenter
app.post("/api/fortress/api-docs", wrap(getPipelineData.postApiDocs as LambdaHandler));

// § 9-debug — Cortex graph inspection (dev only)
app.get("/debug/cortex/:repoId/graph", async (req: Request, res: Response) => {
  try {
    const { getDocClient } = await import("./src/services/database/dynamoClient.js");
    const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
    const { config } = await import("./src/utils/config.js");
    const dc = getDocClient();
    const result = await dc.send(new GetCommand({
      TableName: config.DYNAMO_REPOSITORIES_TABLE,
      Key: { repoId: `${req.params.repoId}#CORTEX_GRAPH` },
    }));
    if (!result.Item) { res.json({ found: false }); return; }
    const nodes = result.Item.graph?.nodes ?? [];
    res.json({
      found: true,
      nodeCount: nodes.length,
      edgeCount: result.Item.graph?.edges?.length ?? 0,
      cachedAt: result.Item.cachedAt,
      sampleNodes: nodes.slice(0, 5).map((n: any) => ({
        filePath: n.filePath,
        functions: n.functions,
        importsFrom: n.importsFrom,
        importedBy: n.importedBy,
        linesOfCode: n.linesOfCode,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// § 9 — Cortex agent (service map)
app.get("/api/repos/:repoId/cortex/services", wrap(getCortexServices.listServices as LambdaHandler));
app.get("/api/repos/:repoId/cortex/services/:serviceId", wrap(getCortexServices.getServiceDetail as LambdaHandler));
app.get("/api/repos/:repoId/cortex/timeline", wrap(getCortexServices.getCortexTimeline as LambdaHandler));
app.get("/api/repos/:repoId/cortex/services/:serviceId/files", wrap(getCortexServiceFiles.handler as LambdaHandler));
app.post("/api/repos/:repoId/cortex/rebuild", wrap(rebuildCortex.handler as LambdaHandler));
app.get("/api/repos/:repoId/cortex", wrap(getCortexData.handler as LambdaHandler));

// § 10 — Workspace
app.get("/api/repos/:repoId/workspace/branches", wrap(getWorkspaceData.listBranches as LambdaHandler));
app.get("/api/repos/:repoId/workspace/files", wrap(getWorkspaceData.listFiles as LambdaHandler));
app.get("/api/repos/:repoId/workspace/files/content", wrap(getWorkspaceData.getFileContent as LambdaHandler));
app.get("/api/repos/:repoId/workspace/annotations", wrap(getWorkspaceData.getAnnotations as LambdaHandler));
app.post("/api/repos/:repoId/workspace/chat", wrap(getWorkspaceData.sendChatMessage as LambdaHandler));
app.post("/api/repos/:repoId/workspace/push", wrap(getWorkspaceData.pushWorkspaceFile as LambdaHandler));
app.post("/api/repos/:repoId/workspace/review", wrap(getWorkspaceData.reviewCodebase as LambdaHandler));
app.get("/api/repos/:repoId/workspace/chat/history", wrap(getWorkspaceData.getChatHistory as LambdaHandler));

// § 11 — Infrastructure / IaC
app.get("/api/repos/:repoId/infrastructure", wrap(getInfrastructure.getInfrastructure as LambdaHandler));
app.get("/api/repos/:repoId/infrastructure/terraform", wrap(getInfrastructure.getTerraform as LambdaHandler));
app.post("/api/repos/:repoId/infrastructure/generate", wrap(getInfrastructure.generateInfrastructure as LambdaHandler));
app.get("/api/repos/:repoId/infrastructure/forecast", wrap(getCostForecast.handler as LambdaHandler));
app.post("/api/infrastructure/predict", wrap(predictInfrastructure.handler as LambdaHandler));

// § 12 — Activity feed
app.get("/api/activity", wrap(getActivity.handler as LambdaHandler));

// § 13 — System health
app.get("/api/system/health", wrap(getSystemHealth.handler as LambdaHandler));

// Sentinel mentor chat
app.post("/api/chat", wrap(postChatMessage.handler as LambdaHandler));

// § 16 — GitHub webhook
app.post("/api/webhooks/github", wrap(githubPush.handler as LambdaHandler));

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// § 17 — API health check (Lambda deployment verification)
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "Velocis API is alive and kicking on AWS!",
    timestamp: new Date().toISOString(),
  });
});

// ── Lambda handler export ────────────────────────────────────────────────────
export const handler = serverless(app);

// ── Start (local only) ───────────────────────────────────────────────────────
if (!process.env.LAMBDA_TASK_ROOT) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀  Velocis backend running at http://localhost:${PORT}`);
    console.log(`    CORS allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
    console.log(`    NODE_ENV: ${process.env.NODE_ENV ?? "development"}\n`);
  });

  server.on("error", (err: any) => {
    console.error(`\n❌  Failed to start backend on port ${PORT}:`, err.message);
    if (err.code === "EADDRINUSE") {
      console.error(`    Port ${PORT} is already in use. Please kill the process using it.`);
    }
    process.exit(1);
  });
}

export default app;
