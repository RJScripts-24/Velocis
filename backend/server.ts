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
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { randomUUID } from "crypto";

// ── Handler imports ──────────────────────────────────────────────────────────
import * as auth              from "./src/handlers/api/auth";
import * as getMe             from "./src/handlers/api/getMe";
import * as getGithubRepos    from "./src/handlers/api/getGithubRepos";
import * as installRepo       from "./src/handlers/api/installRepo";
import * as getDashboard      from "./src/handlers/api/getDashboard";
import * as getRepoOverview   from "./src/handlers/api/getRepoOverview";
import * as getSentinelData   from "./src/handlers/api/getSentinelData";
import * as getPipelineData   from "./src/handlers/api/getPipelineData";
import * as getCortexServices from "./src/handlers/api/getCortexServices";
import * as getCortexData     from "./src/handlers/api/getCortexData";
import * as getWorkspaceData  from "./src/handlers/api/getWorkspaceData";
import * as getInfrastructure from "./src/handlers/api/getInfrastructureData";
import * as getCostForecast   from "./src/handlers/api/getCostForecast";
import * as getActivity       from "./src/handlers/api/getActivity";
import * as getSystemHealth   from "./src/handlers/api/getSystemHealth";
import * as postChatMessage   from "./src/handlers/api/postChatMessage";
import * as githubPush        from "./src/handlers/webhooks/githubPush";

// ── App setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT ?? 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow all configured frontend origins
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,x-repo-owner,x-repo-name,x-hub-signature-256,x-github-event,Cookie,X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ── Lambda adapter ───────────────────────────────────────────────────────────

/** Convert an Express request + resolved path params to an APIGatewayProxyEvent */
function toEvent(req: Request, pathParams: Record<string, string> = {}): APIGatewayProxyEvent {
  const qs: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") qs[k] = v;
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
  }

  return {
    httpMethod:                    req.method,
    path:                          req.path,
    pathParameters:                Object.keys(pathParams).length ? pathParams : null,
    queryStringParameters:         Object.keys(qs).length ? qs : null,
    multiValueQueryStringParameters: null,
    headers,
    multiValueHeaders:             {},
    body:                          req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded:               false,
    stageVariables:                null,
    resource:                      req.path,
    requestContext: {
      requestId:       randomUUID(),
      stage:           "local",
      resourcePath:    req.path,
      httpMethod:      req.method,
      path:            req.path,
      resourceId:      "",
      apiId:           "local",
      accountId:       "000000000000",
      protocol:        "HTTP/1.1",
      identity:        {} as any,
      requestTime:     new Date().toUTCString(),
      requestTimeEpoch: Date.now(),
      authorizer:      null as any,
    },
  };
}

/** Minimal Lambda Context for local use */
const fakeContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName:    "local",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:local:000000000000:function:local",
  memoryLimitInMB: "256",
  awsRequestId:    randomUUID(),
  logGroupName:    "/aws/lambda/local",
  logStreamName:   "local",
  getRemainingTimeInMillis: () => 30000,
  done:    () => {},
  fail:    () => {},
  succeed: () => {},
};

type LambdaHandler = (event: APIGatewayProxyEvent, ctx: Context) => Promise<APIGatewayProxyResult>;

/** Wrap a Lambda handler into an Express route handler */
function wrap(handler: LambdaHandler, paramMap?: Record<string, string>) {
  return async (req: Request, res: Response) => {
    // Build path param mapping from Express :params → API GW format
    const params: Record<string, string> = {};
    if (paramMap) {
      for (const [expressKey, agwKey] of Object.entries(paramMap)) {
        if (req.params[expressKey]) params[agwKey] = req.params[expressKey];
      }
    } else {
      // Auto-map: Express param name == AGW param name
      for (const [k, v] of Object.entries(req.params)) {
        params[k] = v;
      }
    }

    try {
      const event  = toEvent(req, params);
      const result = await handler(event, fakeContext);

      // Forward all Lambda headers
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) {
          // Skip CORS headers — already set by our middleware
          if (k.toLowerCase().startsWith("access-control-")) continue;
          res.setHeader(k, String(v));
        }
      }

      res.status(result.statusCode);

      // If body looks like JSON, parse it so clients get a proper JSON response
      const body = result.body ?? "";
      const ct   = (result.headers?.["Content-Type"] ?? result.headers?.["content-type"] ?? "").toString();
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

// § 1 — Authentication
app.get ("/api/auth/github",          wrap(auth.initiateGithubOAuth as LambdaHandler));
app.get ("/api/auth/github/callback", wrap(auth.handleGithubCallback as LambdaHandler));
app.post("/api/auth/logout",          wrap(auth.logout as LambdaHandler));

// § 2 — User
app.get("/api/me", wrap(getMe.handler as LambdaHandler));

// § 3 — GitHub repositories
app.get("/api/github/repos", wrap(getGithubRepos.handler as LambdaHandler));

// § 4 — Onboarding / Installation
app.post("/api/repos/:repoId/install",        wrap(installRepo.installRepo as LambdaHandler));
app.get ("/api/repos/:repoId/install/status", wrap(installRepo.getInstallStatus as LambdaHandler));

// § 5 — Dashboard
app.get("/api/dashboard", wrap(getDashboard.handler as LambdaHandler));

// § 6 — Repository overview
app.get("/api/repos/:repoId", wrap(getRepoOverview.handler as LambdaHandler));

// § 7 — Sentinel agent
app.get ("/api/repos/:repoId/sentinel/prs",            wrap(getSentinelData.listPrs as LambdaHandler));
app.get ("/api/repos/:repoId/sentinel/prs/:prNumber",  wrap(getSentinelData.getPrDetail as LambdaHandler));
app.post("/api/repos/:repoId/sentinel/scan",           wrap(getSentinelData.triggerScan as LambdaHandler));
app.get ("/api/repos/:repoId/sentinel/activity",       wrap(getSentinelData.getSentinelActivity as LambdaHandler));

// § 8 — Fortress / Pipeline
app.get ("/api/repos/:repoId/pipeline",               wrap(getPipelineData.getPipeline as LambdaHandler));
app.get ("/api/repos/:repoId/pipeline/runs",           wrap(getPipelineData.getPipelineRuns as LambdaHandler));
app.post("/api/repos/:repoId/pipeline/trigger",        wrap(getPipelineData.triggerPipeline as LambdaHandler));
app.get ("/api/repos/:repoId/pipeline/runs/:runId",    wrap(getPipelineData.getPipelineRunDetail as LambdaHandler));

// § 9 — Cortex agent (service map)
app.get("/api/repos/:repoId/cortex/services",              wrap(getCortexServices.listServices as LambdaHandler));
app.get("/api/repos/:repoId/cortex/services/:serviceId",   wrap(getCortexServices.getServiceDetail as LambdaHandler));
app.get("/api/repos/:repoId/cortex/timeline",              wrap(getCortexServices.getCortexTimeline as LambdaHandler));
app.get("/api/repos/:repoId/cortex",                       wrap(getCortexData.handler as LambdaHandler));

// § 10 — Workspace
app.get ("/api/repos/:repoId/workspace/files",          wrap(getWorkspaceData.listFiles as LambdaHandler));
app.get ("/api/repos/:repoId/workspace/files/content",  wrap(getWorkspaceData.getFileContent as LambdaHandler));
app.get ("/api/repos/:repoId/workspace/annotations",    wrap(getWorkspaceData.getAnnotations as LambdaHandler));
app.post("/api/repos/:repoId/workspace/chat",           wrap(getWorkspaceData.sendChatMessage as LambdaHandler));
app.get ("/api/repos/:repoId/workspace/chat/history",   wrap(getWorkspaceData.getChatHistory as LambdaHandler));

// § 11 — Infrastructure / IaC
app.get ("/api/repos/:repoId/infrastructure",           wrap(getInfrastructure.getInfrastructure as LambdaHandler));
app.get ("/api/repos/:repoId/infrastructure/terraform", wrap(getInfrastructure.getTerraform as LambdaHandler));
app.post("/api/repos/:repoId/infrastructure/generate",  wrap(getInfrastructure.generateInfrastructure as LambdaHandler));
app.get ("/api/repos/:repoId/infrastructure/forecast",  wrap(getCostForecast.handler as LambdaHandler));

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

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Velocis backend running at http://localhost:${PORT}`);
  console.log(`    CORS allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`    NODE_ENV: ${process.env.NODE_ENV ?? "development"}\n`);
});

export default app;
