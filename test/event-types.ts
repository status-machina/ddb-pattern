import { EventBase } from "../src/type-utils";

export enum TodoEventTypes {
  TODO_CREATED = "TODO_CREATED",
  TODO_DELETED = "TODO_DELETED",
  TODO_ARCHIVED = "TODO_ARCHIVED",
  TODO_MARKED_COMPLETED = "TODO_MARKED_COMPLETED",
  TODO_MARKED_UNCOMPLETED = "TODO_MARKED_UNCOMPLETED",
  TODO_ASSIGNED = "TODO_ASSIGNED",
}

interface TodoEventBase {
  id: string;
  timestamp: string;
  pk: string;
  sk: string;
}

interface TodoCreated extends TodoEventBase {
  type: TodoEventTypes.TODO_CREATED;
  data: {
    todo_id: string;
    list_id: string;
    title: string;
    description?: string;
  };
}

interface TodoDeleted extends TodoEventBase {
  type: TodoEventTypes.TODO_DELETED;
  data: {
    todo_id: string;
    list_id: string;
    deleted_by_user_id: string;
  };
}

interface TodoArchived extends TodoEventBase {
  type: TodoEventTypes.TODO_ARCHIVED;
  data: {
    todo_id: string;
    list_id: string;
    archived_by_user_id: string;
  };
}

interface TodoMarkedCompleted extends TodoEventBase {
  type: TodoEventTypes.TODO_MARKED_COMPLETED;
  data: {
    todo_id: string;
    list_id: string;
    completed_by_user_id: string;
  };
}

interface TodoMarkedUncompleted extends TodoEventBase {
  type: TodoEventTypes.TODO_MARKED_UNCOMPLETED;
  data: {
    todo_id: string;
    list_id: string;
    uncompleted_by_user_id: string;
  };
}

interface TodoAssigned extends TodoEventBase {
  type: TodoEventTypes.TODO_ASSIGNED;
  data: {
    todo_id: string;
    list_id: string;
    user_id: string;
  };
}

export type TodoEvents =
  | TodoCreated
  | TodoDeleted
  | TodoArchived
  | TodoMarkedCompleted
  | TodoMarkedUncompleted
  | TodoAssigned; 