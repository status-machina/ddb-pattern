import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { EventDynamoDBItem } from "./type-utils";

type NotUndefined<T> = T extends undefined ? never : T;

export const saveEventsTransact = async <T>(
  ddbClient: DynamoDBDocumentClient,
  {
    eventItems,
    tableName,
  }: {
    eventItems: EventDynamoDBItem<T>[];
    tableName: string;
  },
): Promise<boolean> => {
  let retries = 0;
  const maxRetries = 3;
  const initialBackoffMs = 100;

  const transactItems = eventItems.map(
    (
      Item,
    ): NotUndefined<TransactWriteCommandInput["TransactItems"]>[number] => ({
      Put: {
        TableName: tableName,
        Item,
      },
    }),
  );

  while (retries < maxRetries) {
    try {
      const transactWriteCommand = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await ddbClient.send(transactWriteCommand);
      return true; // Successfully wrote
    } catch (error) {
      console.error("Error during transaction:", error);
      retries++;
      await new Promise((resolve) =>
        setTimeout(resolve, initialBackoffMs * Math.pow(2, retries)),
      );
    }
  }

  console.error("Max retries reached for unprocessed items.");
  throw new Error(`Failed to write events:\n${JSON.stringify(transactItems)}`);
};

export const queryLatestEvent = async <T>(
  ddbClient: DynamoDBDocumentClient,
  options: {
    table_name: string;
    pk: string;
    after?: string;
  },
): Promise<T | undefined> => {
  const queryCommand = new QueryCommand({
    TableName: options.table_name,
    KeyConditionExpression: "pk = :pk and #sk > :after",
    ExpressionAttributeNames: {
      "#sk": "sortKey", // Replace 'sortKey' with your actual sort key attribute name
    },
    ExpressionAttributeValues: {
      ":pk": options.pk,
      ":after": options.after ? options.after : null,
    },
    Limit: 1,
  });

  const { Items } = await ddbClient.send(queryCommand);

  return Items?.[0] as T | undefined;
};

export const queryLatestEvents = async <T>(
  ddbClient: DynamoDBDocumentClient,
  options: {
    table_name: string;
    pk: string;
    after?: string;
  },
): Promise<T[]> => {
  const allItems: T[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const queryCommand = new QueryCommand({
      TableName: options.table_name,
      KeyConditionExpression: "pk = :pk and #sk > :after",
      ExpressionAttributeNames: {
        "#sk": "sortKey", // Replace 'sortKey' with your actual sort key attribute name
      },
      ExpressionAttributeValues: {
        ":pk": options.pk,
        ":after": options.after ? options.after : null,
      },
      Limit: 25,
      ScanIndexForward: true,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await ddbClient.send(queryCommand);
    if (response.Items) {
      allItems.push(...(response.Items as T[]));
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allItems;
};
