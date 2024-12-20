import { beforeAll, describe, expect, it } from "vitest";
import { createEventFunctions } from "../src/event-functions-factory";
import { EventBase } from "../src/type-utils";
import { createTestTable, getTestClient, setupTest } from "./setup";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

enum TodoEventTypes {
  TODO_CREATED = "TODO_CREATED",
  TODO_MARKED_COMPLETED = "TODO_MARKED_COMPLETED",
  TODO_MARKED_UNCOMPLETED = "TODO_MARKED_UNCOMPLETED",
  TODO_ARCHIVED = "TODO_ARCHIVED",
  TODO_DELETED = "TODO_DELETED",
  TODO_ASSIGNED = "TODO_ASSIGNED",
  TODO_UNASSIGNED = "TODO_UNASSIGNED",
}

interface TodoEventBase extends EventBase<TodoEventTypes> {
  data: {
    todo_id: string;
    list_id: string;
  };
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

interface TodoArchived extends TodoEventBase {
  type: TodoEventTypes.TODO_ARCHIVED;
  data: {
    todo_id: string;
    list_id: string;
    archived_by_user_id: string;
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

interface TodoAssigned extends TodoEventBase {
  type: TodoEventTypes.TODO_ASSIGNED;
  data: {
    todo_id: string;
    list_id: string;
    assigned_to_user_id: string;
    assigned_by_user_id: string;
  };
}

interface TodoUnassigned extends TodoEventBase {
  type: TodoEventTypes.TODO_UNASSIGNED;
  data: {
    todo_id: string;
    list_id: string;
    unassigned_by_user_id: string;
    previously_assigned_to_user_id: string;
  };
}

type TodoEvents =
  | TodoCreated
  | TodoMarkedCompleted
  | TodoMarkedUncompleted
  | TodoArchived
  | TodoDeleted
  | TodoAssigned
  | TodoUnassigned;

describe("Event Functions", () => {
  let eventClient: ReturnType<typeof createEventFunctions<TodoEventTypes, TodoEvents>>;
  const tableName = `event-functions-test-${Date.now()}`;

  beforeAll(async () => {
    await setupTest();
    const client = getTestClient();
    eventClient = createEventFunctions<TodoEventTypes, TodoEvents>(
      client,
      tableName,
      "list_id"
    );
    await createTestTable(client, tableName);
  });

  it("should save and retrieve a single event", async () => {
    const testEvent = {
      type: TodoEventTypes.TODO_CREATED,
      data: {
        todo_id: "todo123",
        list_id: "list123",
        title: "Buy groceries",
        description: "Get milk and eggs",
      },
    };

    await eventClient.saveEvent(testEvent);

    const retrieved = await eventClient.getLatestEvent({
      eventType: TodoEventTypes.TODO_CREATED,
      partitionId: "list123",
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.data).toEqual(testEvent.data);
  });

  it("should retrieve events by todo_id", async () => {
    const todoId = "todo456";
    const listId = "list456";

    const events = [
      {
        type: TodoEventTypes.TODO_CREATED,
        data: {
          todo_id: todoId,
          list_id: listId,
          title: "Write tests",
        },
      },
      {
        type: TodoEventTypes.TODO_ASSIGNED,
        data: {
          todo_id: todoId,
          list_id: listId,
          assigned_to_user_id: "user123",
          assigned_by_user_id: "user456",
        },
      },
      {
        type: TodoEventTypes.TODO_MARKED_COMPLETED,
        data: {
          todo_id: todoId,
          list_id: listId,
          completed_by_user_id: "user123",
        },
      },
    ];

    for (const event of events) {
      await eventClient.saveEvent(event);
    }

    const retrieved = await eventClient.getLatestEvents({
      eventType: TodoEventTypes.TODO_MARKED_COMPLETED,
      modelKey: "todo_id",
      modelId: todoId,
    });

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].data.todo_id).toBe(todoId);
  });

  it("should retrieve an event stream in chronological order", async () => {
    const todoId = "todo789";
    const listId = "list789";

    const events = [
      {
        type: TodoEventTypes.TODO_CREATED,
        data: {
          todo_id: todoId,
          list_id: listId,
          title: "Review PR",
        },
      },
      {
        type: TodoEventTypes.TODO_ASSIGNED,
        data: {
          todo_id: todoId,
          list_id: listId,
          assigned_to_user_id: "user123",
          assigned_by_user_id: "user456",
        },
      },
      {
        type: TodoEventTypes.TODO_MARKED_COMPLETED,
        data: {
          todo_id: todoId,
          list_id: listId,
          completed_by_user_id: "user123",
        },
      },
      {
        type: TodoEventTypes.TODO_MARKED_UNCOMPLETED,
        data: {
          todo_id: todoId,
          list_id: listId,
          uncompleted_by_user_id: "user789",
        },
      },
    ];

    for (const event of events) {
      await eventClient.saveEvent(event);
    }

    const stream = await eventClient.getEventStream({
      eventTypes: [
        TodoEventTypes.TODO_CREATED,
        TodoEventTypes.TODO_ASSIGNED,
        TodoEventTypes.TODO_MARKED_COMPLETED,
        TodoEventTypes.TODO_MARKED_UNCOMPLETED,
      ],
      modelKey: "todo_id",
      modelId: todoId,
    });

    expect(stream).toHaveLength(4);
    expect(stream[0].type).toBe(TodoEventTypes.TODO_CREATED);
    expect(stream[3].type).toBe(TodoEventTypes.TODO_MARKED_UNCOMPLETED);
  });

  it("should handle multiple todos in a list", async () => {
    const listId = "list999";
    const todo1Id = "todo111";
    const todo2Id = "todo222";

    const events = [
      {
        type: TodoEventTypes.TODO_CREATED,
        data: {
          todo_id: todo1Id,
          list_id: listId,
          title: "First todo",
        },
      },
      {
        type: TodoEventTypes.TODO_CREATED,
        data: {
          todo_id: todo2Id,
          list_id: listId,
          title: "Second todo",
        },
      },
      {
        type: TodoEventTypes.TODO_MARKED_COMPLETED,
        data: {
          todo_id: todo1Id,
          list_id: listId,
          completed_by_user_id: "user123",
        },
      },
    ];

    for (const event of events) {
      await eventClient.saveEvent(event);
    }

    const stream = await eventClient.getEventStream({
      eventTypes: [TodoEventTypes.TODO_CREATED],
      partitionId: listId,
    });

    expect(stream).toHaveLength(2);
    expect(stream.map(e => e.data.todo_id)).toContain(todo1Id);
    expect(stream.map(e => e.data.todo_id)).toContain(todo2Id);
  });
}); 