// src/handlers/api/deleteRepo.ts
// DELETE /api/repos/:repoId
//
// Removes a repo record from the REPOSITORIES table.
// The frontend sends `repo.id` which equals `repoSlug ?? repoId`, so we scan
// for an item matching either field, then delete it by its actual PK (repoId).

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient, DYNAMO_TABLES, getDocClient } from "../../services/database/dynamoClient.js";
import { ok, errors, preflight } from "../../utils/apiResponse.js";
import { logger } from "../../utils/logger.js";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") return preflight();

  const id = event.pathParameters?.repoId;
  if (!id) {
    return errors.badRequest("Missing repoId path parameter");
  }

  try {
    // Scan the full table — `id` may be repoSlug or repoId.
    // NOTE: Do NOT pass a Limit here. In DynamoDB, Limit caps the number of
    // *evaluated* items before the filter is applied, not the number returned.
    // A small Limit causes the filter to miss items that happen to not be in
    // the first evaluated batch.
    let items: any[] = [];
    let lastKey: Record<string, any> | undefined;

    do {
      const scan = await getDocClient().send(
        new ScanCommand({
          TableName: DYNAMO_TABLES.REPOSITORIES,
          FilterExpression: "repoId = :id OR repoSlug = :id",
          ExpressionAttributeValues: { ":id": id },
          ...(lastKey && { ExclusiveStartKey: lastKey }),
        })
      );
      items = items.concat(scan.Items ?? []);
      lastKey = scan.LastEvaluatedKey;
    } while (lastKey && items.length === 0); // stop early once found

    if (items.length === 0) {
      logger.warn({ id, msg: "deleteRepo: no matching item found in DB" });
      return errors.notFound(`Repo '${id}' not found`);
    }

    // Delete all matching items (guards against duplicates)
    await Promise.all(
      items.map((item) =>
        dynamoClient.remove({
          tableName: DYNAMO_TABLES.REPOSITORIES,
          key: { repoId: item.repoId },
        })
      )
    );

    logger.info({ id, count: items.length, msg: "deleteRepo: repo deleted" });
    return ok({ success: true });
  } catch (err: any) {
    logger.error({ id, error: String(err), msg: "deleteRepo: failed" });
    return errors.internal(err?.message ?? "Failed to delete repo");
  }
};
