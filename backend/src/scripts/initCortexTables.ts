/**
 * initCortexTables.ts
 * Velocis — DynamoDB Table Initialization for Visual Cortex
 *
 * Creates the CORTEX_TABLE and TIMELINE_TABLE tables if they don't exist (local dev only).
 * For production, these tables are managed by CDK/CloudFormation.
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { logger } from "../utils/logger";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined,
});

const CORTEX_TABLE = process.env.CORTEX_TABLE ?? "velocis-cortex";
const TIMELINE_TABLE = process.env.TIMELINE_TABLE ?? "velocis-timeline";

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return false;
    }
    throw err;
  }
}

async function createCortexTable() {
  const exists = await tableExists(CORTEX_TABLE);
  if (exists) {
    logger.info({ tableName: CORTEX_TABLE }, "Table already exists");
    return;
  }

  logger.info({ tableName: CORTEX_TABLE }, "Creating Cortex table...");

  await dynamoClient.send(
    new CreateTableCommand({
      TableName: CORTEX_TABLE,
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
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    })
  );

  logger.info({ tableName: CORTEX_TABLE }, "Cortex table created successfully");
}

async function createTimelineTable() {
  const exists = await tableExists(TIMELINE_TABLE);
  if (exists) {
    logger.info({ tableName: TIMELINE_TABLE }, "Table already exists");
    return;
  }

  logger.info({ tableName: TIMELINE_TABLE }, "Creating Timeline table...");

  await dynamoClient.send(
    new CreateTableCommand({
      TableName: TIMELINE_TABLE,
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
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    })
  );

  logger.info({ tableName: TIMELINE_TABLE }, "Timeline table created successfully");
}

async function main() {
  try {
    await createCortexTable();
    await createTimelineTable();
    logger.info("Visual Cortex table initialization complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Failed to initialize Cortex tables");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createCortexTable, createTimelineTable };
