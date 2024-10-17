import { EventDynamoDBItem, IdKeyName } from "./type-utils";

export const getPK = <T>({
  modelKey,
  modelId,
  eventType,
  partitionKey,
  partitionId,
}: {
  modelKey?: IdKeyName;
  modelId?: string;
  eventType: T;
  partitionKey?: IdKeyName;
  partitionId?: string;
}) => {
  const partitionPart =
    partitionKey && partitionId
      ? `${getModelType(partitionKey)}::${partitionId}::`
      : "";
  const modelPart =
    modelKey && modelId ? `${getModelType(modelKey)}::${modelId}::` : "";

  return `${partitionPart}${modelPart}${eventType}`;
};

const rgx = /_id$/;
export const getModelType = (key: IdKeyName) => key.split(rgx)[0].toUpperCase();
const isIdKey = (key: string): key is IdKeyName => rgx.test(key);

const modelKeysFrom = <T>(
  obj: Record<string, any>,
  type: T,
  partitionKey?: IdKeyName,
): string[] => {
  const keys: string[] = [];
  for (const [modelKey, modelId] of Object.entries(obj)) {
    if (isIdKey(modelKey)) {
      keys.push(
        getPK({
          modelKey,
          modelId,
          eventType: type,
          partitionKey,
          partitionId: partitionKey ? obj[partitionKey] : undefined,
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
  const identityItem: EventDynamoDBItem<T> = {
    pk: partitionKey
      ? getPK({
          partitionKey,
          partitionId: data[partitionKey],
          eventType: data.type,
        })
      : getPK({ eventType: data.type }),
    sk: data.id,
    insertion_time,
    event: event,
  };
  const items: EventDynamoDBItem<T>[] = [identityItem];

  for (const modelKey of modelKeysFrom(data, event.type, partitionKey)) {
    const keyedEvent: EventDynamoDBItem<T> = {
      pk: modelKey,
      sk: data.id,
      insertion_time,
      event,
    };
    items.push(keyedEvent);
  }
  return items;
};
