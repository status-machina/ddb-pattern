import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

let container: StartedTestContainer;

export async function setup() {
  try {
    console.log("Global setup: Starting DynamoDB container...");
    container = await new GenericContainer("amazon/dynamodb-local")
      .withExposedPorts(8000)
      .withName("status-machina-ddb-test")
      .withReuse()
      .withCommand(["-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory"])
      .withWaitStrategy(Wait.forLogMessage("CorsParams:", 1))
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const endpoint = `http://${container.getHost()}:${container.getMappedPort(8000)}`;
    console.log("Container started at:", endpoint);
    process.env.DYNAMODB_ENDPOINT = endpoint;

    return {
      container,
      endpoint,
    };
  } catch (error) {
    console.error("Failed to initialize test container:", error);
    throw error;
  }
}

export async function teardown() {
  console.log("Global teardown: Stopping DynamoDB container...");
  if (container) {
    await container.stop();
  }
  console.log("Global teardown: DynamoDB container stopped");
} 