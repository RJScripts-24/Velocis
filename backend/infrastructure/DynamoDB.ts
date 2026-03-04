// infrastructure/DynamoDB.ts
// DynamoDB table definitions for local development bootstrapping
// Use this to create tables locally via DynamoDB Local (docker-compose)
// In production (AWS), tables are managed via CloudFormation / SAM template.yaml

import {
    DynamoDBClient,
    CreateTableCommand,
    ListTablesCommand,
    ResourceInUseException,
} from "@aws-sdk/client-dynamodb";

// ─────────────────────────────────────────────
// LOCAL CLIENT
// Points to DynamoDB Local running via docker-compose
// ─────────────────────────────────────────────

const localClient = new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "ap-south-1",
    credentials: {
        accessKeyId: "local",
        secretAccessKey: "local",
    },
});

// ─────────────────────────────────────────────
// TABLE DEFINITIONS
// ─────────────────────────────────────────────

const TABLE_DEFINITIONS = [

    // ── velocis-users ──────────────────────────────────────────────────────────
    // Primary key:  githubId (String)   — GitHub's unique numeric user ID
    // GSI:          email-index         — Look up user by email for login
    // GSI:          username-index      — Look up user by GitHub username
    //
    // Multi-tenant: each user has their own encrypted GitHub tokens stored here.
    // The app supports ANY GitHub user who installs the Velocis GitHub App.
    {
        TableName: "velocis-users",
        BillingMode: "PAY_PER_REQUEST" as const,
        AttributeDefinitions: [
            { AttributeName: "githubId", AttributeType: "S" },     // PK — e.g. "12345678"
            { AttributeName: "email", AttributeType: "S" },         // GSI — for email lookup
            { AttributeName: "username", AttributeType: "S" },      // GSI — for username lookup
        ],
        KeySchema: [
            { AttributeName: "githubId", KeyType: "HASH" },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "email-index",
                KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" },
            },
            {
                IndexName: "username-index",
                KeySchema: [{ AttributeName: "username", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" },
            },
        ],
        // Schema Reference (actual fields stored — not DynamoDB schema):
        // {
        //   githubId:             string   — GitHub user ID — PRIMARY KEY
        //   username:             string   — GitHub username (login)
        //   displayName:          string   — GitHub display name (name)
        //   email:                string   — Primary email from GitHub
        //   avatarUrl:            string   — GitHub avatar URL
        //   githubProfileUrl:     string   — https://github.com/{username}
        //   installationId:       number   — GitHub App installation ID for their account
        //   encryptedAccessToken: string   — AES-256 encrypted OAuth user access token
        //   encryptedRefreshToken?: string — AES-256 encrypted refresh token (if enabled)
        //   tokenExpiresAt?:      string   — ISO timestamp when user token expires
        //   jwtSecret:            string   — Per-user JWT signing secret for session tokens
        //   plan:                 "free" | "pro" | "team"
        //   createdAt:            string   — ISO timestamp (first login)
        //   updatedAt:            string   — ISO timestamp (last activity)
        // }
    },

    // ── velocis-repositories ───────────────────────────────────────────────────
    // Primary key: repoId (String)      — GitHub's unique repo ID as string
    // GSI:         userId-index         — List all repositories for a given user
    // GSI:         repoFullName-index   — Lookup by owner/repo string
    //
    // Multi-tenant: each repo record stores the ownerGithubId so data is
    // always scoped to the user who installed the app on that repository.
    {
        TableName: "velocis-repositories",
        BillingMode: "PAY_PER_REQUEST" as const,
        AttributeDefinitions: [
            { AttributeName: "repoId", AttributeType: "S" },         // PK — GitHub repo ID
            { AttributeName: "ownerGithubId", AttributeType: "S" },  // GSI PK — user scoping
            { AttributeName: "repoFullName", AttributeType: "S" },   // GSI PK — "owner/repo"
        ],
        KeySchema: [
            { AttributeName: "repoId", KeyType: "HASH" },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "userId-index",
                KeySchema: [{ AttributeName: "ownerGithubId", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" },
            },
            {
                IndexName: "repoFullName-index",
                KeySchema: [{ AttributeName: "repoFullName", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" },
            },
        ],
        // Schema Reference:
        // {
        //   repoId:           string   — GitHub repo ID — PRIMARY KEY
        //   ownerGithubId:    string   — Foreign key to velocis-users.githubId
        //   repoFullName:     string   — "owner/repo"
        //   repoName:         string   — Just the repo name
        //   defaultBranch:    string   — e.g. "main"
        //   isPrivate:        boolean
        //   language:         string | null
        //   status:           "healthy" | "warning" | "critical" | "processing" | "pending"
        //   installationId:   number   — GitHub App installation for this repo
        //   lastPushAt:       string   — ISO timestamp
        //   lastPushedBy:     string   — GitHub username
        //   lastCommitSha:    string
        //   sentinel:         object   — Latest Sentinel agent result
        //   fortress:         object   — Latest Fortress agent result
        //   cortex:           object   — Latest Cortex agent result
        //   lastProcessedAt:  string   — ISO timestamp
        //   createdAt:        string
        //   updatedAt:        string
        // }
    },

    // ── velocis-ai-activity ────────────────────────────────────────────────────
    // Primary key: activityId (String)        — UUID for each log entry
    // Sort key:    createdAt (String)          — ISO timestamp for time-ordering
    // GSI:         repoId-createdAt-index      — All activity for a repo, newest first
    // GSI:         userId-createdAt-index      — All activity for a user
    //
    // TTL: All records auto-expire after 90 days (to keep storage costs manageable)
    {
        TableName: "velocis-ai-activity",
        BillingMode: "PAY_PER_REQUEST" as const,
        AttributeDefinitions: [
            { AttributeName: "activityId", AttributeType: "S" },     // PK — UUID
            { AttributeName: "createdAt", AttributeType: "S" },      // SK — ISO timestamp
            { AttributeName: "repoId", AttributeType: "S" },         // GSI1 PK
            { AttributeName: "ownerGithubId", AttributeType: "S" },  // GSI2 PK
        ],
        KeySchema: [
            { AttributeName: "activityId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "repoId-createdAt-index",
                KeySchema: [
                    { AttributeName: "repoId", KeyType: "HASH" },
                    { AttributeName: "createdAt", KeyType: "RANGE" },
                ],
                Projection: { ProjectionType: "ALL" },
            },
            {
                IndexName: "userId-createdAt-index",
                KeySchema: [
                    { AttributeName: "ownerGithubId", KeyType: "HASH" },
                    { AttributeName: "createdAt", KeyType: "RANGE" },
                ],
                Projection: { ProjectionType: "ALL" },
            },
        ],
        TimeToLiveSpecification: {
            AttributeName: "ttl",
            Enabled: true,
        },
        // Schema Reference:
        // {
        //   activityId:       string   — UUID — PRIMARY KEY
        //   createdAt:        string   — ISO timestamp — SORT KEY
        //   repoId:           string   — FK to velocis-repositories
        //   repoFullName:     string   — "owner/repo" for display
        //   ownerGithubId:    string   — FK to velocis-users
        //   agent:            "sentinel" | "fortress" | "cortex"
        //   event:            string   — e.g. "push", "pr_review", "test_run"
        //   status:           "success" | "warning" | "failed" | "skipped"
        //   summary:          string   — Short human-readable description
        //   details:          object   — Full agent output (findings, tests, graph)
        //   commitSha:        string   — Commit that triggered the activity
        //   ttl:              number   — Unix timestamp — auto-expire after 90 days
        // }
    },

    // ── velocis-cortex ─────────────────────────────────────────────────────────
    // Primary key: id (String)             — "REPO#<repoId>#SVC#<serviceId>"
    // GSI:         repoId-index            — List all services for a given repo
    //
    // Stores service-level rows derived from the file-level CortexGraph.
    // Each row represents a logical microservice visible on the 3D canvas.
    // Written by: syncCortexServices.ts
    // Read by:    getCortexServices.ts (listServices, getServiceDetail)
    {
        TableName: "velocis-cortex",
        BillingMode: "PAY_PER_REQUEST" as const,
        AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" },        // PK
            { AttributeName: "repoId", AttributeType: "S" },    // GSI PK
        ],
        KeySchema: [
            { AttributeName: "id", KeyType: "HASH" },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "repoId-index",
                KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" },
            },
        ],
        // Schema Reference:
        // {
        //   id:              string   — "REPO#<repoId>#SVC#<serviceId>" — PRIMARY KEY
        //   repoId:          string   — Repository identifier
        //   recordType:      "SERVICE"
        //   serviceId:       number   — Numeric service ID
        //   name:            string   — Display name (e.g. "Auth Service")
        //   status:          "healthy" | "warning" | "critical"
        //   layer:           "edge" | "compute" | "data"
        //   position:        { x, y, z }
        //   connections:     number[] — Array of connected serviceIds
        //   p95Latency:      string   — e.g. "142ms"
        //   errorRatePct:    number
        //   sparkline:       number[] — 10-element miniature chart
        //   testsTotal:      number
        //   testsPassing:    number
        //   testsErrors:     number
        //   lastDeployedAt:  string   — ISO timestamp
        //   updatedAt:       string   — ISO timestamp
        // }
    },

    // ── velocis-timeline ───────────────────────────────────────────────────────
    // Primary key: id (String)             — "deploy_<uuid>" or "scan_<uuid>"
    // GSI:         repoId-index            — List all events for a given repo
    //
    // Stores deployment events and system scan results displayed
    // on the Cortex timeline bar in the frontend.
    // Written by: githubPush.ts (deployment events), syncCortexServices.ts (scan events)
    // Read by:    getCortexServices.ts (getCortexTimeline)
    {
        TableName: "velocis-timeline",
        BillingMode: "PAY_PER_REQUEST" as const,
        AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" },        // PK
            { AttributeName: "repoId", AttributeType: "S" },    // GSI PK
        ],
        KeySchema: [
            { AttributeName: "id", KeyType: "HASH" },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "repoId-index",
                KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
                Projection: { ProjectionType: "ALL" },
            },
        ],
        // Schema Reference:
        // {
        //   id:              string   — "deploy_<uuid>" or "scan_<uuid>" — PRIMARY KEY
        //   repoId:          string   — Repository identifier
        //   positionPct:     number   — 0–100 position on the timeline bar
        //   label:           string   — e.g. "Deploy main", "System Scan: Healthy"
        //   color:           string   — Hex color for the timeline marker
        //   environment:     string   — e.g. "production", "staging"
        //   deployedAt:      string   — ISO timestamp
        //   createdAt:       string   — ISO timestamp
        // }
    },
];

// ─────────────────────────────────────────────
// BOOTSTRAP FUNCTION
// Run this once via: npx ts-node infrastructure/DynamoDB.ts
// Creates all tables in DynamoDB Local if they don't exist
// ─────────────────────────────────────────────

async function bootstrapLocalTables(): Promise<void> {
    console.log("\n🗄️  Velocis DynamoDB Local Bootstrap\n");

    // List existing tables
    const { TableNames: existing = [] } = await localClient.send(
        new ListTablesCommand({})
    );

    console.log(`Existing tables: ${existing.length > 0 ? existing.join(", ") : "none"}\n`);

    for (const tableDef of TABLE_DEFINITIONS) {
        if (existing.includes(tableDef.TableName)) {
            console.log(`  ✓ ${tableDef.TableName} — already exists, skipping`);
            continue;
        }

        try {
            await localClient.send(new CreateTableCommand(tableDef as any));
            console.log(`  ✅ ${tableDef.TableName} — created successfully`);
        } catch (err) {
            if (err instanceof ResourceInUseException) {
                console.log(`  ✓ ${tableDef.TableName} — already exists`);
            } else {
                console.error(`  ❌ ${tableDef.TableName} — FAILED:`, err);
                throw err;
            }
        }
    }

    console.log("\n✅ All tables ready. DynamoDB Local is bootstrapped.\n");
}

// Run bootstrap when executed directly
bootstrapLocalTables().catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
});
