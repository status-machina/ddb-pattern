export type IdKeyName = `${string}_id`;
export type InputOf<T> = Omit<T, "id" | "timestamp">;
export type EventDynamoDBItem<T> = {
  event: T;
  pk: string;
  sk: string;
  insertion_time: string;
};
