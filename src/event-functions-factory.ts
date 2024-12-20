import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EventBase, IdKeyName, IdKeyOf, InputOf } from "./type-utils";
import { ddbItemsFrom, getPK, withTimeAndId } from "./key-utils";
import {
  queryLatestEvent,
  queryLatestEvents,
  saveEventsTransact,
} from "./ddb-utils";

export const createEventFunctions = <T extends string, K extends EventBase<T>>(
  ddbClient: DynamoDBDocumentClient,
  tableName: string,
  partitionKey: IdKeyName,
) => {
  const saveEvent = async (eventInput: InputOf<K>) => {
    const eventWithId = withTimeAndId(eventInput);
    const items = ddbItemsFrom(eventWithId);
    await saveEventsTransact(ddbClient, {
      eventItems: items,
      tableName,
    });
  };

  const getLatestEvent = async <
    J extends T,
    E extends K & { type: J },
    M extends IdKeyOf<E>,
  >({
    eventType,
    modelKey,
    modelId,
    partitionId,
    after,
  }: {
    eventType: J;
    modelKey?: M;
    modelId?: string;
    partitionId?: string;
    after?: string;
  }) => {
    const pk = getPK({
      eventType,
      modelKey,
      modelId,
      partitionId,
      partitionKey,
    });
    return await queryLatestEvent<E>(ddbClient, {
      table_name: tableName,
      pk,
      after,
    });
  };

  const getLatestEvents = async <
    J extends T,
    E extends K & { type: J },
    M extends IdKeyOf<E>,
  >({
    eventType,
    modelKey,
    modelId,
    partitionId,
    after,
  }: {
    eventType: J;
    modelKey?: M;
    modelId?: string;
    partitionId?: string;
    after?: string;
  }) => {
    const pk = getPK({
      eventType,
      modelKey,
      modelId,
      partitionId,
      partitionKey,
    });
    return await queryLatestEvents<E>(ddbClient, {
      table_name: tableName,
      pk,
      after,
    });
  };

  const getEventStream = async <
    J extends T,
    E extends K & { type: J },
    M extends IdKeyOf<E>,
  >({
    eventTypes,
    modelId,
    modelKey,
    partitionId,
    after,
  }: {
    eventTypes: J[];
    modelId?: string;
    modelKey?: M;
    partitionId?: string;
    after?: string;
  }) => {
    const allEvents = await Promise.all(
      eventTypes.map(async (eventType) =>
        getLatestEvents({
          eventType,
          modelKey,
          modelId,
          partitionId,
          after,
        }),
      ),
    );
    return allEvents
      .flat()
      .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1)) as E[];
  };
  return {
    saveEvent,
    getLatestEvent,
    getLatestEvents,
    getEventStream,
  };
};
