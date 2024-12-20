import { describe, expect, it } from "vitest";
import { reduceTodo } from "./todo-reducer";
import { TodoEventTypes, TodoEvents } from "./event-types";

describe("Todo Reducer", () => {
  it("should create a todo from a creation event", () => {
    const events: TodoEvents[] = [{
      id: "test-id",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_CREATED",
      sk: "test-sk",
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        title: "Test Todo",
      },
    }];

    const expected = {
      id: "todo1",
      listId: "list1",
      status: "incomplete",
    };

    expect(reduceTodo(events)).toEqual(expected);
  });

  it("should handle assignment", () => {
    const events: TodoEvents[] = [{
      id: "test-id-1",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_CREATED",
      sk: "test-sk-1",
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        title: "Test Todo",
      },
    }, {
      id: "test-id-2",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_ASSIGNED",
      sk: "test-sk-2",
      type: TodoEventTypes.TODO_ASSIGNED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        user_id: "user1",
      },
    }];

    const expected = {
      id: "todo1",
      listId: "list1",
      status: "incomplete",
      assignedTo: "user1",
    };

    expect(reduceTodo(events)).toEqual(expected);
  });

  it("should handle completion", () => {
    const events: TodoEvents[] = [{
      id: "test-id-1",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_CREATED",
      sk: "test-sk-1",
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        title: "Test Todo",
      },
    }, {
      id: "test-id-2",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_MARKED_COMPLETED",
      sk: "test-sk-2",
      type: TodoEventTypes.TODO_MARKED_COMPLETED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        completed_by_user_id: "user1",
      },
    }];

    const expected = {
      id: "todo1",
      listId: "list1",
      status: "complete",
    };

    expect(reduceTodo(events)).toEqual(expected);
  });

  it("should return null for deleted todos", () => {
    const events: TodoEvents[] = [{
      id: "test-id-1",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_CREATED",
      sk: "test-sk-1",
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        title: "Test Todo",
      },
    }, {
      id: "test-id-2",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_DELETED",
      sk: "test-sk-2",
      type: TodoEventTypes.TODO_DELETED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        deleted_by_user_id: "user1",
      },
    }];

    expect(reduceTodo(events)).toBeNull();
  });

  it("should handle archival", () => {
    const events: TodoEvents[] = [{
      id: "test-id-1",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_CREATED",
      sk: "test-sk-1",
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        title: "Test Todo",
      },
    }, {
      id: "test-id-2",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_ARCHIVED",
      sk: "test-sk-2",
      type: TodoEventTypes.TODO_ARCHIVED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        archived_by_user_id: "user1",
      },
    }];

    const expected = {
      id: "todo1",
      listId: "list1",
      status: "archived",
    };

    expect(reduceTodo(events)).toEqual(expected);
  });

  it("should handle completion cycle", () => {
    const events: TodoEvents[] = [{
      id: "test-id-1",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_CREATED",
      sk: "test-sk-1",
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        title: "Test Todo",
      },
    }, {
      id: "test-id-2",
      timestamp: "2024-01-01T00:00:00Z",
      pk: "LIST::list1::TODO_MARKED_COMPLETED",
      sk: "test-sk-2",
      type: TodoEventTypes.TODO_MARKED_COMPLETED,
      data: {
        todo_id: "todo1",
        list_id: "list1",
        completed_by_user_id: "user1",
      },
    }];

    const expected = {
      id: "todo1",
      listId: "list1",
      status: "complete",
    };

    expect(reduceTodo(events)).toEqual(expected);
  });
}); 