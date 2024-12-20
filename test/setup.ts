import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { StartedTestContainer } from "testcontainers";
import { beforeAll } from "vitest";

declare module "vitest" {
  interface TestContext {
    container: StartedTestContainer;
    client: DynamoDBClient;
    documentClient: DynamoDBDocumentClient;
  }
}

let documentClient: DynamoDBDocumentClient | undefined;

export const getTestClient = () => {
  if (!documentClient) {
    throw new Error("Document client not initialized. Make sure to call setupTest first.");
  }
  return documentClient;
};

export const setupTest = async () => {
  if (documentClient) return documentClient;

  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_ENDPOINT,
    region: "local",
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  });

  documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });

  return documentClient;
};

export const createTestTable = async (
  _client: DynamoDBDocumentClient,
  tableName: string,
) => {
  console.log(`Creating test table: ${tableName}`);
  const client = new DynamoDBClient({
    endpoint: process.env.DYNAMODB_ENDPOINT,
    region: "local",
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  });

  try {
    await client.send(new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    }));

    console.log(`Table ${tableName} created successfully`);
    // Wait for table to be active
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    if ((error as any)?.name !== 'ResourceInUseException') {
      console.error(`Failed to create table ${tableName}:`, error);
      throw error;
    }
    console.log(`Table ${tableName} already exists`);
  }
}; 