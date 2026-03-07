/**
 * initCortexTables.ts
 * Velocis — DynamoDB Table Initialization (ALL tables)
 *
 * Creates every DynamoDB table the app needs if they don't already exist.
 * Safe to run multiple times — skips tables that already exist.
 *
 * Usage (local dev):
 *   npm run init:tables
 *
 * For production, tables are managed by CDK/CloudFormation.
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  type CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";
import { logger } from "../utils/logger";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.NODE_ENV === "development"
    ? (process.env.DYNAMO_LOCAL_ENDPOINT ?? "http://localhost:8000")
    : undefined,
});

// ─────────────────────────────────────────────────────────────────────────────
// TABLE DEFINITIONS
// Every table the Velocis backend reads or writes to.
// ─────────────────────────────────────────────────────────────────────────────

const TABLES: CreateTableCommandInput[] = [

  // ── Users + Sessions ──────────────────────────────────────────────────────
  {
    TableName: process.env.USERS_TABLE ?? process.env.DYNAMO_USERS_TABLE ?? "velocis-users",
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Repositories (primary store) ──────────────────────────────────────────
  {
    TableName: process.env.DYNAMO_REPOSITORIES_TABLE ?? "velocis-repositories",
    KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "repoId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Repositories (legacy alias used by some handlers) ─────────────────────
  {
    TableName: process.env.REPOS_TABLE ?? "velocis-repos",
    KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "repoId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── AI Activity feed ──────────────────────────────────────────────────────
  {
    TableName: process.env.DYNAMO_AI_ACTIVITY_TABLE ?? process.env.ACTIVITY_TABLE ?? "velocis-ai-activity",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Activity feed (webhook-level events) ─────────────────────────────────
  {
    TableName: process.env.ACTIVITY_TABLE ?? "velocis-activity",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Sentinel PR reviews ───────────────────────────────────────────────────
  {
    TableName: process.env.SENTINEL_TABLE ?? "velocis-sentinel",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Sentinel manual scan jobs ─────────────────────────────────────────────
  {
    TableName: process.env.SCAN_JOBS_TABLE ?? "velocis-scan-jobs",
    KeySchema: [{ AttributeName: "jobId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "jobId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Fortress pipeline runs ────────────────────────────────────────────────
  {
    TableName: process.env.PIPELINE_TABLE ?? "velocis-pipeline-runs",
    KeySchema: [{ AttributeName: "runId", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "runId", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Cortex service map ────────────────────────────────────────────────────
  {
    TableName: process.env.CORTEX_TABLE ?? "velocis-cortex",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
      { AttributeName: "recordType", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-recordType-index",
        KeySchema: [
          { AttributeName: "repoId", KeyType: "HASH" },
          { AttributeName: "recordType", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Cortex timeline events ────────────────────────────────────────────────
  {
    TableName: process.env.TIMELINE_TABLE ?? "velocis-timeline",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Deployments ───────────────────────────────────────────────────────────
  {
    TableName: process.env.DEPLOYS_TABLE ?? "velocis-deployments",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── GitHub App installations ──────────────────────────────────────────────
  {
    TableName: process.env.INSTALL_TABLE ?? "velocis-installations",
    KeySchema: [{ AttributeName: "installationId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "installationId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── IaC / Infrastructure predictor ───────────────────────────────────────
  {
    TableName: process.env.IAC_TABLE ?? "velocis-iac",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── IaC generation jobs ───────────────────────────────────────────────────
  {
    TableName: process.env.IAC_JOBS_TABLE ?? "velocis-iac-jobs",
    KeySchema: [{ AttributeName: "jobId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "jobId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── System health snapshots ───────────────────────────────────────────────
  {
    TableName: process.env.HEALTH_TABLE ?? "velocis-system-health",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Workspace annotations ─────────────────────────────────────────────────
  {
    TableName: process.env.ANNOTATIONS_TABLE ?? "velocis-annotations",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },

  // ── Workspace chat history ────────────────────────────────────────────────
  {
    TableName: process.env.CHAT_TABLE ?? "velocis-workspace-chat",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "repoId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "repoId-index",
        KeySchema: [{ AttributeName: "repoId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return false;
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  logger.info("Velocis — initializing all DynamoDB tables...");

  let created = 0;
  let skipped = 0;

  for (const tableInput of TABLES) {
    const name = tableInput.TableName as string;
    try {
      if (await tableExists(name)) {
        logger.info({ tableName: name }, "  ✓ already exists — skipped");
        skipped++;
        continue;
      }
      await dynamoClient.send(new CreateTableCommand(tableInput));
      logger.info({ tableName: name }, "  + created");
      created++;
      // Short pause so DynamoDB Local doesn't get overwhelmed
      await new Promise((r) => setTimeout(r, 200));
    } catch (err: any) {
      logger.error({ tableName: name, error: err.message }, "  ✗ FAILED to create");
    }
  }

  logger.info(`\nDone — ${created} created, ${skipped} already existed.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, "Fatal error during table initialization");
    process.exit(1);
  });
}

// Legacy named exports kept for backward compatibility
export const createCortexTable = async () => {};
export const createTimelineTable = async () => {};
export { main as initAllTables };


