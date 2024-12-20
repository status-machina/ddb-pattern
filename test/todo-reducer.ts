import { TodoEventTypes, TodoEvents } from "./event-types";

export interface Todo {
  id: string;
  listId: string;
  status: "incomplete" | "complete" | "archived";
  assignedTo?: string;
}

export function reduceTodo(events: TodoEvents[]): Todo | null {
  return events.reduce<Todo | null>((todo, event) => {
    switch (event.type) {
      case TodoEventTypes.TODO_CREATED: {
        return {
          id: event.data.todo_id,
          listId: event.data.list_id,
          status: "incomplete",
        };
      }
      case TodoEventTypes.TODO_ASSIGNED: {
        if (!todo) return null;
        return {
          ...todo,
          assignedTo: event.data.user_id,
        };
      }
      case TodoEventTypes.TODO_MARKED_COMPLETED: {
        if (!todo) return null;
        return {
          ...todo,
          status: "complete",
        };
      }
      case TodoEventTypes.TODO_MARKED_UNCOMPLETED: {
        if (!todo) return null;
        return {
          ...todo,
          status: "incomplete",
        };
      }
      case TodoEventTypes.TODO_ARCHIVED: {
        if (!todo) return null;
        return {
          ...todo,
          status: "archived",
        };
      }
      case TodoEventTypes.TODO_DELETED: {
        return null;
      }
      default:
        return todo;
    }
  }, null);
} 