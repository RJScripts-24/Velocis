// src/services/database/dynamoClient.ts
// DynamoDB CRUD wrappers for all Velocis data operations
// Three tables: Repositories, Users, AI_Activity
// All operations are strongly typed — no raw AttributeValue anywhere

import {
  DynamoDBClient,
  DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  BatchGetCommand,
  TransactWriteCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  BatchWriteCommandInput,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "../../utils/logger";
import { config } from "../../utils/config";

// ─────────────────────────────────────────────
// TABLE NAMES
// Single source of truth — never hardcode table names elsewhere
// ─────────────────────────────────────────────

export const DYNAMO_TABLES = {
  REPOSITORIES: config.DYNAMO_REPOSITORIES_TABLE,
  USERS: config.DYNAMO_USERS_TABLE,
  AI_ACTIVITY: config.DYNAMO_AI_ACTIVITY_TABLE,
} as const;

export type DynamoTableName =
  (typeof DYNAMO_TABLES)[keyof typeof DYNAMO_TABLES];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DynamoGetParams {
  tableName: DynamoTableName;
  key: Record<string, unknown>;
  consistentRead?: boolean;
}

export interface DynamoUpsertParams {
  tableName: DynamoTableName;
  item: Record<string, unknown>;
  key: string;                      // Primary key field name e.g. "repoId"
  sortKey?: string;                 // Optional sort key field name
  conditionExpression?: string;     // Optional condition to guard the write
}

export interface DynamoUpdateParams {
  tableName: DynamoTableName;
  key: Record<string, unknown>;
  updates: Record<string, unknown>; // Fields to update
  conditionExpression?: string;
  returnValues?: "ALL_NEW" | "ALL_OLD" | "UPDATED_NEW" | "UPDATED_OLD" | "NONE";
}

export interface DynamoDeleteParams {
  tableName: DynamoTableName;
  key: Record<string, unknown>;
  conditionExpression?: string;
}

export interface DynamoQueryParams {
  tableName: DynamoTableName;
  keyConditionExpression: string;
  expressionAttributeValues: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
  filterExpression?: string;
  indexName?: string;               // GSI/LSI name
  limit?: number;
  scanIndexForward?: boolean;       // true = ascending, false = descending
  exclusiveStartKey?: Record<string, unknown>; // For pagination
}

export interface DynamoQueryResult<T> {
  items: T[];
  count: number;
  lastEvaluatedKey?: Record<string, unknown>; // Pagination cursor
  scannedCount: number;
}

export interface DynamoBatchWriteParams {
  tableName: DynamoTableName;
  items: Record<string, unknown>[];
  chunkSize?: number;               // DynamoDB max 25 items per batch
}

export interface DynamoTransactParams {
  operations: DynamoTransactOperation[];
}

export type DynamoTransactOperation =
  | { type: "Put"; tableName: DynamoTableName; item: Record<string, unknown> }
  | { type: "Update"; tableName: DynamoTableName; key: Record<string, unknown>; updates: Record<string, unknown> }
  | { type: "Delete"; tableName: DynamoTableName; key: Record<string, unknown> }
  | { type: "ConditionCheck"; tableName: DynamoTableName; key: Record<string, unknown>; conditionExpression: string };

// ─────────────────────────────────────────────
// CLIENT SINGLETON
// DynamoDBDocumentClient handles JS type marshalling automatically
// No manual AttributeValue { S: "..." } boilerplate needed
// ─────────────────────────────────────────────

let _docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const clientConfig: DynamoDBClientConfig = {
      region: config.AWS_REGION,
      ...(config.IS_LOCAL && {
        // Point to DynamoDB Local (docker-compose.yml)
        endpoint: config.DYNAMO_LOCAL_ENDPOINT ?? "http://localhost:8000",
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      }),
      ...(!config.IS_LOCAL && config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY && {
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        },
      }),
    };

    const rawClient = new DynamoDBClient(clientConfig);

    _docClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: {
        // Automatically remove undefined values — prevents DynamoDB errors
        removeUndefinedValues: true,
        // Convert empty strings to null rather than erroring
        convertEmptyValues: false,
      },
      unmarshallOptions: {
        // Return numbers as JS numbers, not BigInt
        wrapNumbers: false,
      },
    });

    logger.info({
      msg: "DynamoDBDocumentClient initialized",
      region: config.AWS_REGION,
      isLocal: config.IS_LOCAL,
    });
  }
  return _docClient;
}

// ─────────────────────────────────────────────
// GET — Fetch a single item by primary key
// ─────────────────────────────────────────────

/**
 * Fetches a single item by its primary key.
 * Returns null if the item does not exist.
 *
 * @example
 * const repo = await dynamoClient.get<Repository>({
 *   tableName: DYNAMO_TABLES.REPOSITORIES,
 *   key: { repoId: "123456" },
 * });
 */
async function get<T = Record<string, unknown>>(
  params: DynamoGetParams
): Promise<T | null> {
  const { tableName, key, consistentRead = false } = params;

  const input: GetCommandInput = {
    TableName: tableName,
    Key: key,
    ConsistentRead: consistentRead,
  };

  try {
    logger.info({ msg: "dynamoClient.get", tableName, key });
    const response = await getDocClient().send(new GetCommand(input));

    if (!response.Item) {
      logger.info({ msg: "dynamoClient.get: item not found", tableName, key });
      return null;
    }

    return response.Item as T;
  } catch (err) {
    logger.error({ msg: "dynamoClient.get: failed", tableName, key, error: String(err) });
    throw new DynamoOperationError("get", tableName, err);
  }
}

// ─────────────────────────────────────────────
// UPSERT — Create or fully replace an item
// Used in githubPush.ts for repo status updates
// ─────────────────────────────────────────────

/**
 * Creates or fully replaces an item (PutItem).
 * Sets createdAt on first write, always updates updatedAt.
 * Use this when you want to replace the full item.
 * Use `update` when you want to patch specific fields only.
 *
 * @example
 * await dynamoClient.upsert({
 *   tableName: DYNAMO_TABLES.REPOSITORIES,
 *   item: { repoId: "123", status: "processing", ... },
 *   key: "repoId",
 * });
 */
async function upsert(params: DynamoUpsertParams): Promise<void> {
  const { tableName, item, conditionExpression } = params;

  const now = new Date().toISOString();

  const enrichedItem = {
    ...item,
    updatedAt: now,
    // Only set createdAt if it's not already in the item
    ...(item.createdAt === undefined && { createdAt: now }),
    // TTL for AI_Activity records — auto-expire after 90 days
    ...(tableName === DYNAMO_TABLES.AI_ACTIVITY && {
      ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
    }),
  };

  const input: PutCommandInput = {
    TableName: tableName,
    Item: enrichedItem,
    ...(conditionExpression && { ConditionExpression: conditionExpression }),
  };

  try {
    logger.info({
      msg: "dynamoClient.upsert",
      tableName,
      keyValue: item[params.key],
    });
    await getDocClient().send(new PutCommand(input));
  } catch (err) {
    // ConditionalCheckFailedException is expected when using condition guards
    if (isConditionalCheckFailed(err)) {
      logger.warn({
        msg: "dynamoClient.upsert: condition check failed",
        tableName,
        keyValue: item[params.key],
      });
      throw new DynamoConditionError("upsert", tableName, err);
    }
    logger.error({ msg: "dynamoClient.upsert: failed", tableName, error: String(err) });
    throw new DynamoOperationError("upsert", tableName, err);
  }
}

// ─────────────────────────────────────────────
// UPDATE — Patch specific fields on an existing item
// More efficient than upsert when updating partial data
// ─────────────────────────────────────────────

/**
 * Updates specific fields on an existing item without replacing it.
 * Automatically builds the UpdateExpression from the updates object.
 * Returns the updated item if returnValues is set.
 *
 * @example
 * await dynamoClient.update({
 *   tableName: DYNAMO_TABLES.REPOSITORIES,
 *   key: { repoId: "123" },
 *   updates: { status: "healthy", lastProcessedAt: new Date().toISOString() },
 *   returnValues: "ALL_NEW",
 * });
 */
async function update<T = Record<string, unknown>>(
  params: DynamoUpdateParams
): Promise<T | null> {
  const {
    tableName,
    key,
    updates,
    conditionExpression,
    returnValues = "NONE",
  } = params;

  // Always stamp updatedAt
  const enrichedUpdates = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Build UpdateExpression dynamically from the updates object
  // e.g. { status: "ok", count: 5 } → "SET #status = :status, #count = :count"
  const { updateExpression, expressionAttributeNames, expressionAttributeValues } =
    buildUpdateExpression(enrichedUpdates);

  const input: UpdateCommandInput = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: returnValues,
    ...(conditionExpression && { ConditionExpression: conditionExpression }),
  };

  try {
    logger.info({ msg: "dynamoClient.update", tableName, key, fieldCount: Object.keys(updates).length });
    const response = await getDocClient().send(new UpdateCommand(input));
    return (response.Attributes as T) ?? null;
  } catch (err) {
    if (isConditionalCheckFailed(err)) {
      logger.warn({ msg: "dynamoClient.update: condition check failed", tableName, key });
      throw new DynamoConditionError("update", tableName, err);
    }
    logger.error({ msg: "dynamoClient.update: failed", tableName, key, error: String(err) });
    throw new DynamoOperationError("update", tableName, err);
  }
}

// ─────────────────────────────────────────────
// DELETE — Remove an item
// ─────────────────────────────────────────────

/**
 * Deletes an item by primary key.
 * Optionally guards the delete with a condition expression.
 *
 * @example
 * await dynamoClient.remove({
 *   tableName: DYNAMO_TABLES.REPOSITORIES,
 *   key: { repoId: "123" },
 * });
 */
async function remove(params: DynamoDeleteParams): Promise<void> {
  const { tableName, key, conditionExpression } = params;

  const input: DeleteCommandInput = {
    TableName: tableName,
    Key: key,
    ...(conditionExpression && { ConditionExpression: conditionExpression }),
  };

  try {
    logger.info({ msg: "dynamoClient.remove", tableName, key });
    await getDocClient().send(new DeleteCommand(input));
  } catch (err) {
    if (isConditionalCheckFailed(err)) {
      logger.warn({ msg: "dynamoClient.remove: condition check failed", tableName, key });
      throw new DynamoConditionError("remove", tableName, err);
    }
    logger.error({ msg: "dynamoClient.remove: failed", tableName, key, error: String(err) });
    throw new DynamoOperationError("remove", tableName, err);
  }
}

// ─────────────────────────────────────────────
// QUERY — Fetch multiple items by key condition
// Supports GSI, pagination, filtering
// ─────────────────────────────────────────────

/**
 * Queries items using a key condition expression.
 * Supports GSIs (Global Secondary Indexes), pagination, and filtering.
 *
 * @example
 * // Get all repos for a user
 * const result = await dynamoClient.query<Repository>({
 *   tableName: DYNAMO_TABLES.REPOSITORIES,
 *   keyConditionExpression: "userId = :userId",
 *   expressionAttributeValues: { ":userId": "user_abc" },
 *   indexName: "userId-index",
 *   scanIndexForward: false, // newest first
 * });
 */
async function query<T = Record<string, unknown>>(
  params: DynamoQueryParams
): Promise<DynamoQueryResult<T>> {
  const {
    tableName,
    keyConditionExpression,
    expressionAttributeValues,
    expressionAttributeNames,
    filterExpression,
    indexName,
    limit,
    scanIndexForward = true,
    exclusiveStartKey,
  } = params;

  const input: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(expressionAttributeNames && { ExpressionAttributeNames: expressionAttributeNames }),
    ...(filterExpression && { FilterExpression: filterExpression }),
    ...(indexName && { IndexName: indexName }),
    ...(limit && { Limit: limit }),
    ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    ScanIndexForward: scanIndexForward,
  };

  try {
    logger.info({ msg: "dynamoClient.query", tableName, indexName, limit });
    const response = await getDocClient().send(new QueryCommand(input));

    return {
      items: (response.Items ?? []) as T[],
      count: response.Count ?? 0,
      scannedCount: response.ScannedCount ?? 0,
      lastEvaluatedKey: response.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined,
    };
  } catch (err) {
    logger.error({ msg: "dynamoClient.query: failed", tableName, error: String(err) });
    throw new DynamoOperationError("query", tableName, err);
  }
}

// ─────────────────────────────────────────────
// QUERY ALL — Auto-paginate through all results
// Handles DynamoDB's 1MB page limit automatically
// ─────────────────────────────────────────────

/**
 * Queries ALL items matching a condition, auto-paginating through
 * DynamoDB's 1MB page limit. Use with caution on large datasets.
 *
 * @example
 * // Get ALL activity logs for a repo (may be many pages)
 * const allLogs = await dynamoClient.queryAll<AIActivity>({
 *   tableName: DYNAMO_TABLES.AI_ACTIVITY,
 *   keyConditionExpression: "repoId = :repoId",
 *   expressionAttributeValues: { ":repoId": repoId },
 * });
 */
async function queryAll<T = Record<string, unknown>>(
  params: DynamoQueryParams
): Promise<T[]> {
  const allItems: T[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await query<T>({ ...params, exclusiveStartKey: lastEvaluatedKey });
    allItems.push(...result.items);
    lastEvaluatedKey = result.lastEvaluatedKey;
  } while (lastEvaluatedKey);

  logger.info({
    msg: "dynamoClient.queryAll: complete",
    tableName: params.tableName,
    totalItems: allItems.length,
  });

  return allItems;
}

// ─────────────────────────────────────────────
// BATCH WRITE — Bulk insert/delete up to 25 items
// Used for bulk AI_Activity logging after agent runs
// ─────────────────────────────────────────────

/**
 * Writes multiple items in bulk using DynamoDB BatchWrite.
 * Automatically chunks into groups of 25 (DynamoDB's hard limit).
 * Retries unprocessed items once.
 *
 * @example
 * await dynamoClient.batchWrite({
 *   tableName: DYNAMO_TABLES.AI_ACTIVITY,
 *   items: activityLogs,
 * });
 */
async function batchWrite(params: DynamoBatchWriteParams): Promise<void> {
  const { tableName, items, chunkSize = 25 } = params;

  if (items.length === 0) return;

  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

  // Enrich all items with timestamps
  const enrichedItems = items.map((item) => ({
    ...item,
    createdAt: item.createdAt ?? now,
    updatedAt: now,
    ...(tableName === DYNAMO_TABLES.AI_ACTIVITY && { ttl }),
  }));

  // Chunk into groups of 25
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < enrichedItems.length; i += chunkSize) {
    chunks.push(enrichedItems.slice(i, i + chunkSize));
  }

  logger.info({
    msg: "dynamoClient.batchWrite: starting",
    tableName,
    totalItems: items.length,
    chunks: chunks.length,
  });

  for (const chunk of chunks) {
    const input: BatchWriteCommandInput = {
      RequestItems: {
        [tableName]: chunk.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    };

    try {
      const response = await getDocClient().send(new BatchWriteCommand(input));

      // Retry unprocessed items once
      const unprocessed =
        response.UnprocessedItems?.[tableName];
      if (unprocessed && unprocessed.length > 0) {
        logger.warn({
          msg: "dynamoClient.batchWrite: retrying unprocessed items",
          count: unprocessed.length,
        });

        await getDocClient().send(
          new BatchWriteCommand({
            RequestItems: { [tableName]: unprocessed },
          })
        );
      }
    } catch (err) {
      logger.error({ msg: "dynamoClient.batchWrite: chunk failed", tableName, error: String(err) });
      throw new DynamoOperationError("batchWrite", tableName, err);
    }
  }

  logger.info({
    msg: "dynamoClient.batchWrite: complete",
    tableName,
    totalItems: items.length,
  });
}

// ─────────────────────────────────────────────
// BATCH GET — Fetch multiple items by key in one call
// ─────────────────────────────────────────────

/**
 * Fetches multiple items by their keys in a single BatchGet call.
 * Automatically handles unprocessed keys with one retry.
 *
 * @example
 * const repos = await dynamoClient.batchGet<Repository>({
 *   tableName: DYNAMO_TABLES.REPOSITORIES,
 *   keys: [{ repoId: "123" }, { repoId: "456" }],
 * });
 */
async function batchGet<T = Record<string, unknown>>(params: {
  tableName: DynamoTableName;
  keys: Record<string, unknown>[];
}): Promise<T[]> {
  const { tableName, keys } = params;

  if (keys.length === 0) return [];

  // DynamoDB BatchGet limit is 100 items
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < keys.length; i += 100) {
    chunks.push(keys.slice(i, i + 100));
  }

  const allItems: T[] = [];

  for (const chunk of chunks) {
    try {
      const response = await getDocClient().send(
        new BatchGetCommand({
          RequestItems: {
            [tableName]: { Keys: chunk },
          },
        })
      );

      const items = (response.Responses?.[tableName] ?? []) as T[];
      allItems.push(...items);
    } catch (err) {
      logger.error({ msg: "dynamoClient.batchGet: failed", tableName, error: String(err) });
      throw new DynamoOperationError("batchGet", tableName, err);
    }
  }

  return allItems;
}

// ─────────────────────────────────────────────
// TRANSACT WRITE — Atomic multi-table operations
// Used when multiple tables must update together or not at all
// e.g. Creating a User + creating their first Repository atomically
// ─────────────────────────────────────────────

/**
 * Executes multiple write operations atomically.
 * All operations succeed or all fail — no partial writes.
 * Max 100 operations per transaction.
 *
 * @example
 * await dynamoClient.transactWrite({
 *   operations: [
 *     { type: "Put", tableName: DYNAMO_TABLES.USERS, item: newUser },
 *     { type: "Put", tableName: DYNAMO_TABLES.REPOSITORIES, item: firstRepo },
 *   ],
 * });
 */
async function transactWrite(params: DynamoTransactParams): Promise<void> {
  const { operations } = params;
  const now = new Date().toISOString();

  const transactItems: TransactWriteCommandInput["TransactItems"] =
    operations.map((op) => {
      switch (op.type) {
        case "Put":
          return {
            Put: {
              TableName: op.tableName,
              Item: { ...op.item, updatedAt: now, createdAt: op.item.createdAt ?? now },
            },
          };
        case "Update": {
          const { updateExpression, expressionAttributeNames, expressionAttributeValues } =
            buildUpdateExpression({ ...op.updates, updatedAt: now });
          return {
            Update: {
              TableName: op.tableName,
              Key: op.key,
              UpdateExpression: updateExpression,
              ExpressionAttributeNames: expressionAttributeNames,
              ExpressionAttributeValues: expressionAttributeValues,
            },
          };
        }
        case "Delete":
          return {
            Delete: {
              TableName: op.tableName,
              Key: op.key,
            },
          };
        case "ConditionCheck":
          return {
            ConditionCheck: {
              TableName: op.tableName,
              Key: op.key,
              ConditionExpression: op.conditionExpression,
            },
          };
      }
    });

  try {
    logger.info({
      msg: "dynamoClient.transactWrite",
      operationCount: operations.length,
    });
    await getDocClient().send(
      new TransactWriteCommand({ TransactItems: transactItems })
    );
  } catch (err) {
    logger.error({ msg: "dynamoClient.transactWrite: failed", error: String(err) });
    throw new DynamoOperationError("transactWrite", "multiple", err);
  }
}

// ─────────────────────────────────────────────
// EXPORTED CLIENT OBJECT
// Single import: `import { dynamoClient } from "..."`
// ─────────────────────────────────────────────

export const dynamoClient = {
  get,
  upsert,
  update,
  remove,
  query,
  queryAll,
  batchWrite,
  batchGet,
  transactWrite,
};

// ─────────────────────────────────────────────
// NAMED OPERATION ALIASES
// Allow named function imports instead of going through the
// dynamoClient object. Useful for fine-grained mocking in tests.
// ─────────────────────────────────────────────

/** Named alias for dynamoClient.upsert — write or create a DynamoDB item */
export async function putItem(params: DynamoUpsertParams): Promise<void> {
  return upsert(params);
}

/** Named alias for dynamoClient.get — fetch a DynamoDB item by primary key */
export async function getItem<T>(params: DynamoGetParams): Promise<T | null> {
  return get<T>(params);
}

/** Named alias for dynamoClient.update — partially update an existing DynamoDB item */
export async function updateItem(
  params: DynamoUpdateParams
): Promise<Record<string, unknown> | undefined> {
  return (await update(params)) ?? undefined;
}

// ─────────────────────────────────────────────
// INTERNAL UTILITY: Build UpdateExpression
// Converts a plain object into DynamoDB expression syntax
// ─────────────────────────────────────────────

function buildUpdateExpression(updates: Record<string, unknown>): {
  updateExpression: string;
  expressionAttributeNames: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
} {
  const setParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(updates)) {
    const nameKey = `#${field}`;
    const valueKey = `:${field}`;
    setParts.push(`${nameKey} = ${valueKey}`);
    expressionAttributeNames[nameKey] = field;
    expressionAttributeValues[valueKey] = value;
  }

  return {
    updateExpression: `SET ${setParts.join(", ")}`,
    expressionAttributeNames,
    expressionAttributeValues,
  };
}

// ─────────────────────────────────────────────
// INTERNAL UTILITY: Detect conditional check errors
// ─────────────────────────────────────────────

function isConditionalCheckFailed(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "ConditionalCheckFailedException" ||
      err.message.includes("ConditionalCheckFailedException"))
  );
}

// ─────────────────────────────────────────────
// CUSTOM ERRORS
// ─────────────────────────────────────────────

export class DynamoOperationError extends Error {
  constructor(operation: string, tableName: string, cause: unknown) {
    const message =
      cause instanceof Error ? cause.message : String(cause);
    super(`DynamoDB ${operation} on '${tableName}' failed: ${message}`);
    this.name = "DynamoOperationError";
    this.cause = cause;
  }
}

export class DynamoConditionError extends Error {
  constructor(operation: string, tableName: string, cause: unknown) {
    super(`DynamoDB ${operation} on '${tableName}' failed condition check`);
    this.name = "DynamoConditionError";
    this.cause = cause;
  }
}