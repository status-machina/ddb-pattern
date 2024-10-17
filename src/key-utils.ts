import { EventDynamoDBItem, IdKeyName } from "./type-utils";

/**
    Builds the primary key. Useful for lookups.
*/
export const primaryKeyBuilder = <T>({
  modelType,
  modelId,
  eventType,
}: {
  modelType: string;
  modelId: string;
  eventType: T;
}): string => {
  return `${eventType}::${modelType}::${modelId}`;
};

const rgx = /_id$/;
export const getModelType = (key: IdKeyName) => key.split(rgx)[0].toUpperCase();
const isIdKey = (key: string): key is IdKeyName => rgx.test(key);

const modelKeysFrom = <T>(obj: Record<string, any>, type: T): string[] => {
  const keys: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (isIdKey(key)) {
      keys.push(
        primaryKeyBuilder({
          modelType: getModelType(key),
          modelId: val,
          eventType: type,
        }),
      );
    }
  }
  return keys;
};

export const ddbItemsFrom = <
  K,
  T extends {
    type: K;
    id: string;
    data: Record<string, any> & {
      [idKey: IdKeyName]: string | undefined;
    };
  },
  P extends keyof T["data"] & IdKeyName,
>(
  event: T,
  partitionKey?: P,
): EventDynamoDBItem<T>[] => {
  const data = event.data;
  const insertion_time = new Date().toISOString();
  const partitionPrefix = partitionKey
    ? `${getModelType(partitionKey)}::${data[partitionKey]}::`
    : "";
  const identityItem: EventDynamoDBItem<T> = {
    pk: `${partitionPrefix}${data.type}`,
    sk: data.id,
    insertion_time,
    event: event,
  };
  const items: EventDynamoDBItem<T>[] = [identityItem];

  for (const modelKey of modelKeysFrom(data, event.type)) {
    const keyedEvent: EventDynamoDBItem<T> = {
      pk: `${partitionPrefix}${modelKey}`,
      sk: data.id,
      insertion_time,
      event,
    };
    items.push(keyedEvent);
  }
  return items;
};
