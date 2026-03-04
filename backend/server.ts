// server.ts
// Local dev server for testing Velocis Lambda handlers WITHOUT deploying to AWS.
// Wraps each Lambda handler in Express routes, simulating API Gateway behavior.
// Run with: npm run dev

import express, { Request, Response, NextFunction } from "express";
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
import * as getCortexServiceFiles from "./src/handlers/api/getCortexServiceFiles";
import * as rebuildCortex from "./src/handlers/api/rebuildCortex";
import * as getCortexData from "./src/handlers/api/getCortexData";
import * as getWorkspaceData from "./src/handlers/api/getWorkspaceData";
import * as getInfrastructure from "./src/handlers/api/getInfrastructureData";
import * as getCostForecast from "./src/handlers/api/getCostForecast";
import * as getActivity from "./src/handlers/api/getActivity";
import * as getSystemHealth from "./src/handlers/api/getSystemHealth";
import * as postChatMessage from "./src/handlers/api/postChatMessage";
import * as getRepos from "./src/handlers/api/getRepos";
import * as githubPush from "./src/handlers/webhooks/githubPush";

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow frontend dev server
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin ?? "";
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,Cookie,X-Requested-With"
    );
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});

// ─────────────────────────────────────────────
// LAMBDA ADAPTER
// Converts Express req → APIGatewayProxyEvent, runs the handler,
// then converts APIGatewayProxyResult → Express res.
// ─────────────────────────────────────────────

function buildEvent(req: Request): APIGatewayProxyEvent {
    const pathParameters: Record<string, string> = {};
    // Extract any :param segments from the matched route
    if (req.params) {
        for (const [k, v] of Object.entries(req.params)) {
            pathParameters[k] = v as string;
        }
    }

    return {
        httpMethod: req.method,
        path: req.path,
        pathParameters: Object.keys(pathParameters).length ? pathParameters : null,
        queryStringParameters:
            Object.keys(req.query).length
                ? (req.query as Record<string, string>)
                : null,
        multiValueQueryStringParameters: null,
        headers: req.headers as Record<string, string>,
        multiValueHeaders: {},
        body: req.body ? JSON.stringify(req.body) : null,
        isBase64Encoded: false,
        stageVariables: null,
        resource: req.path,
        requestContext: {
            requestId: `local-${Date.now()}`,
            accountId: "local",
            apiId: "local",
            httpMethod: req.method,
            identity: {
                sourceIp: req.ip ?? "127.0.0.1",
                userAgent: req.headers["user-agent"] ?? "",
                accessKey: null,
                accountId: null,
                apiKey: null,
                apiKeyId: null,
                caller: null,
                clientCert: null,
                cognitoAuthenticationProvider: null,
                cognitoAuthenticationType: null,
                cognitoIdentityId: null,
                cognitoIdentityPoolId: null,
                principalOrgId: null,
                user: null,
                userArn: null,
            },
            path: req.path,
            protocol: "HTTP/1.1",
            resourceId: "local",
            resourcePath: req.path,
            stage: "local",
            requestTimeEpoch: Date.now(),
            requestTime: new Date().toISOString(),
            authorizer: null,
            extendedRequestId: undefined,
        },
    };
}

function sendResult(res: Response, result: APIGatewayProxyResult): void {
    // Handle multiple Set-Cookie headers via multiValueHeaders
    const multiCookies: string[] =
        (result as any).multiValueHeaders?.["Set-Cookie"] ?? [];
    const singleCookie = result.headers?.["Set-Cookie"];

    const allCookies = [
        ...multiCookies,
        ...(singleCookie ? [singleCookie] : []),
    ] as string[];

    // Forward all response headers
    if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
            if (key === "Set-Cookie") continue; // Handled below
            res.setHeader(key, String(value));
        }
    }

    // Set cookies individually
    for (const cookie of allCookies) {
        res.append("Set-Cookie", cookie);
    }

    res.status(result.statusCode);

    if (!result.body) {
        res.end();
        return;
    }

    const contentType = result.headers?.["Content-Type"] ?? "application/json";
    res.setHeader("Content-Type", String(contentType));
    res.send(result.body);
}

type LambdaHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

function wrap(handler: LambdaHandler) {
    return async (req: Request, res: Response) => {
        try {
            const event = buildEvent(req);
            const result = await handler(event);
            sendResult(res, result);
        } catch (err) {
            console.error("Handler error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    };
}

// ─────────────────────────────────────────────
// ROUTES
// Import handlers lazily so dotenv loads first
// ─────────────────────────────────────────────

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

// § 9 — Cortex agent (service map)
app.get("/api/repos/:repoId/cortex/services", wrap(getCortexServices.listServices as LambdaHandler));
app.get("/api/repos/:repoId/cortex/services/:serviceId", wrap(getCortexServices.getServiceDetail as LambdaHandler));
app.get("/api/repos/:repoId/cortex/services/:serviceId/files", wrap(getCortexServiceFiles.handler as LambdaHandler));
app.post("/api/repos/:repoId/cortex/rebuild", wrap(rebuildCortex.handler as LambdaHandler));
app.get("/api/repos/:repoId/cortex/timeline", wrap(getCortexServices.getCortexTimeline as LambdaHandler));
app.get("/api/repos/:repoId/cortex", wrap(getCortexData.handler as LambdaHandler));

// § 10 — Workspace
app.get("/api/repos/:repoId/workspace/files", wrap(getWorkspaceData.listFiles as LambdaHandler));
app.get("/api/repos/:repoId/workspace/files/content", wrap(getWorkspaceData.getFileContent as LambdaHandler));
app.get("/api/repos/:repoId/workspace/annotations", wrap(getWorkspaceData.getAnnotations as LambdaHandler));
app.post("/api/repos/:repoId/workspace/chat", wrap(getWorkspaceData.sendChatMessage as LambdaHandler));
app.get("/api/repos/:repoId/workspace/chat/history", wrap(getWorkspaceData.getChatHistory as LambdaHandler));

// § 11 — Infrastructure / IaC
app.get("/api/repos/:repoId/infrastructure", wrap(getInfrastructure.getInfrastructure as LambdaHandler));
app.get("/api/repos/:repoId/infrastructure/terraform", wrap(getInfrastructure.getTerraform as LambdaHandler));
app.post("/api/repos/:repoId/infrastructure/generate", wrap(getInfrastructure.generateInfrastructure as LambdaHandler));
app.get("/api/repos/:repoId/infrastructure/forecast", wrap(getCostForecast.handler as LambdaHandler));

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

// Start listening immediately so the server is available
app.listen(PORT, async () => {
    console.log(`\n🚀 Velocis backend running at http://localhost:${PORT}`);

    // Register handlers after the server is already up
    await registerRoutes();

    console.log(`\n   GitHub OAuth:   http://localhost:${PORT}/api/auth/github`);
    console.log(`   Callback:       http://localhost:${PORT}/api/auth/github/callback`);
    console.log(`   Webhook:        http://localhost:${PORT}/webhooks/github/push`);
    console.log(`   Health:         http://localhost:${PORT}/health\n`);
});
