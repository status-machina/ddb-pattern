import { monotonicFactory, ulid } from "ulidx";
import {
  DdbInputOf,
  EventBase,
  IdKeyName,
  IdKeyOf,
  InputOf,
} from "./type-utils";

export const withTimeAndId = <
  K extends string,
  T extends Record<K, any> & { timestamp: string; id: string },
>(
  event: InputOf<T>,
  date = new Date(),
  stamp = ulid,
): DdbInputOf<T> => {
  return {
    ...event,
    timestamp: date.toISOString(),
    id: stamp(date.valueOf()),
  } as T;
};

export const sequentialStampAndId = <
  K extends string,
  T extends Record<K, any> & { timestamp: string; id: string },
>(
  events: InputOf<T>[],
): DdbInputOf<T>[] => {
  const date = new Date();
  const stamp = monotonicFactory();
  return events.map((event) => withTimeAndId(event, date, stamp));
};

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
  S,
  K extends EventBase<S>,
  T extends DdbInputOf<K>,
  P extends IdKeyOf<T>,
>(
  event: T,
  partitionKey?: P,
): EventBase<K["type"]>[] => {
  const data = event.data;
  const timestamp = new Date().toISOString();
  const identityItem: EventBase<K["type"]> = {
    pk: partitionKey
      ? getPK({
          partitionKey,
          partitionId: data[partitionKey],
          eventType: data.type,
        })
      : getPK({ eventType: data.type }),
    sk: event.id,
    id: event.id,
    timestamp,
    type: event.type,
    data: event.data,
  };
  const items: EventBase<K["type"]>[] = [identityItem];

  for (const modelKey of modelKeysFrom(data, event.data.type, partitionKey)) {
    const keyedEvent: EventBase<K["type"]> = {
      pk: modelKey,
      sk: event.id,
      id: event.id,
      timestamp,
      type: event.type,
      data: event.data,
    };
    items.push(keyedEvent);
  }
  return items;
};
