# @status-machina/ddb-pattern

**Warning:** This package is unstable and experimental. Use it at your own risk.

## Overview

The `@status-machina/ddb-pattern` package provides utility functions and types for working with events and DynamoDB in a structured manner. It enables the creation, saving, and querying of events while leveraging ULID for unique identifiers and timestamping.

### Event Structure and Expectations

Events should adhere to a specific shape, encapsulated in the `EventBase` interface, which includes at least the following properties:
- `id`: A unique identifier for the event, typically generated using ULID.
- `type`: The type of the event, which helps classify events in your system.
- `timestamp`: The time when the event was created, formatted as an ISO string.
- `data`: A record containing relevant event data.

It’s important to note that if any keys in the `data` property end with `_id`, the events will be replicated and saved with different partition keys. This ensures that events are organized and can be efficiently queried based on these identifiers.

## Installation

You can install this package using npm:

```bash
npm install @status-machina/ddb-pattern
```

## Usage

1. Import the necessary functions and types from the package.

```typescript
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EventBase, withTimeAndId } from "@status-machina/ddb-pattern";
import { IdKeyName, InputOf } from "@status-machina/ddb-pattern";
import {
  queryLatestEvent,
  queryLatestEvents,
  saveEventsTransact,
} from "@status-machina/ddb-pattern";
import { ddbItemsFrom, getPK } from "@status-machina/ddb-pattern"; // Import key-utils
```

2. Define your event types.

```typescript
export enum StoreEventTypes {
  PRICE_LOWERED = "PRICE_LOWERED",
  PRICE_RAISED = "PRICE_RAISED",
}

export type StoreEventBase = EventBase<StoreEventTypes>;

export interface PriceLowered extends StoreEventBase {
  type: StoreEventTypes.PRICE_LOWERED;
  data: {
    store_id: string;
    product_id: string;
    price: number;
  };
}

export interface PriceRaised extends StoreEventBase {
  type: StoreEventTypes.PRICE_RAISED;
  data: {
    store_id: string;
    product_id: string;
    price: number;
  };
}

export type StoreEvents = PriceLowered | PriceRaised;
```

3. Create utility functions for saving and querying events.

```typescript
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { saveEventsTransact, ddbItemsFrom, withTimeAndId } from "@status-machina/ddb-pattern";
import { InputOf } from "@status-machina/ddb-pattern";

const EVENTS_TABLE_NAME = process.env.EVENTS_TABLE_NAME;

if (!EVENTS_TABLE_NAME) {
  throw new Error(
    "Environment variable EVENTS_TABLE_NAME is required but not defined."
  );
}

export const savePriceEvent = async <T extends StoreEvents>({
  ddbClient,
  eventInput,
}: {
  ddbClient: DynamoDBDocumentClient;
  eventInput: InputOf<T>;
}) => {
  await saveEventsTransact(ddbClient, {
    eventItems: ddbItemsFrom(withTimeAndId(eventInput), "store_id"),
    tableName: EVENTS_TABLE_NAME,
  });
};

/**
    Gets the latest StoreEvent of the specified type,
    based on the storeId and and a specified model
*/
export const getLatestStoreEvent = async <
  K extends StoreEventTypes,
  T extends StoreEvents & { type: K },
  M extends keyof T & IdKeyName,
>(
  ddbClient: DynamoDBDocumentClient,
  options: {
    eventType: K;
    modelKey?: M;
    modelId?: string;
    storeId: string;
    after?: string;
  },
) => {
  // In this example, events are partitioned by store_id, so store_id is required for lookup
  const pk = getPK<K>({
    eventType: options.eventType,
    modelKey: options.modelKey,
    modelId: options.modelId,
    partitionId: options.storeId,
    partitionKey: "store_id",
  });
  return await queryLatestEvent<T>(ddbClient, {
    table_name: EVENTS_TABLE_NAME,
    pk,
    after: options.after,
  });
};

/**
    Gets the latest StoreEvents of the specified type,
    based on the storeId and and a specified model
*/
export const getLatestStoreEvents = async <
  K extends StoreEventTypes,
  T extends StoreEvents & { type: K },
  M extends keyof T & IdKeyName,
>(
  ddbClient: DynamoDBDocumentClient,
  options: {
    eventType: K;
    modelKey?: M;
    modelId?: string;
    storeId: string;
    after?: string;
  },
) => {
  // In this example, events are partitioned by store_id, so store_id is required for lookup
  const pk = getPK<K>({
    eventType: options.eventType,
    modelKey: options.modelKey,
    modelId: options.modelId,
    partitionId: options.storeId,
    partitionKey: "store_id",
  });
  return await queryLatestEvents<T>(ddbClient, {
    table_name: EVENTS_TABLE_NAME,
    pk,
    after: options.after,
  });
};

/**
    Resolves to a sorted array with all of the events of a given type,
    with the specified storeId and model type/id (if provided).
*/
export const getPriceEventStream = async <K extends StoreEventTypes>(
  ddbClient: DynamoDBDocumentClient,
  options: {
    eventTypes: K[];
    storeId: string;
    modelId?: string;
    modelKey?: keyof K;
    after?: string;
  },
) => {
  const allEvents = await Promise.all(
    options.eventTypes.map((eventType) =>
      getLatestStoreEvents(ddbClient, {
        eventType,
        storeId: options.storeId,
        modelId: options.modelId,
        after: options.after,
      }),
    ),
  );
  return allEvents.flat().sort((a, b) => (a.id < b.id ? 1 : -1));
};
```

For detailed usage, please refer to the source code or the examples provided within.

## License

This package is licensed under the MIT License.
