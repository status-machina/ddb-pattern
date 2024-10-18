export type IdKeyName = `${string}_id`;
export type IdKeyOf<T extends { data: any }> = keyof T["data"] & IdKeyName;
export type InputOf<T> = Omit<T, "id" | "timestamp" | "pk" | "sk">;
export type DdbInputOf<T> = Omit<T, "pk" | "sk">;
export type NotUndefined<T> = T extends undefined ? never : T;
export interface EventBase<T> {
  /** ULID, used for ordering */
  id: string;
  type: T;
  /** DB insertion time */
  timestamp: string;
  pk: string;
  sk: string;
  data: Record<string, any>;
}
