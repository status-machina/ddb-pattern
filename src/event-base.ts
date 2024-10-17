import { monotonicFactory, ulid } from "ulidx";
import { InputOf } from "./type-utils";

export interface EventBase<T> {
  /** ULID, used for ordering */
  id: string;
  type: T;
  /** DB insertion time */
  timestamp: string;
  data: Record<string, any>;
}

export const withTimeAndId = <
  K extends string,
  T extends Record<K, any> & { timestamp: string; id: string },
>(
  event: InputOf<T>,
  date = new Date(),
  stamp = ulid,
): T => {
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
): T[] => {
  const date = new Date();
  const stamp = monotonicFactory();
  return events.map((event) => withTimeAndId(event, date, stamp));
};
