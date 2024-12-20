import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { StartedTestContainer } from "testcontainers";

declare global {
  var __DYNAMODB_CLIENT__: DynamoDBClient;
  var __DYNAMODB_DOCUMENT_CLIENT__: DynamoDBDocumentClient;
  var __DYNAMODB_CONTAINER__: StartedTestContainer;
} 