import { beforeAll, describe, expect, it } from "vitest";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createEventFunctions } from "../src/event-functions-factory";
import { TodoEventTypes, TodoEvents } from "./event-types";
import {
  createTestTable,
  getTestClient,
  setupTest,
} from "./setup";
import { reduceTodo, Todo } from "./todo-reducer";

const log = {
  info: (message: string) => console.log(`INFO: ${message}`),
};

describe("Todo Story", () => {
  let eventClient: ReturnType<typeof createEventFunctions<TodoEventTypes, TodoEvents>>;
  const tableName = `todo-story-test-${Date.now()}`;
  const listId = "shared-list";
  const ada = "ada.test";
  const lise = "lise.test";
  const todoIds = ["todo1", "todo2", "todo3", "todo4"];

  beforeAll(async () => {
    log.info("Setting up test container...");
    await setupTest();
    const client = getTestClient();
    eventClient = createEventFunctions<TodoEventTypes, TodoEvents>(
      client,
      tableName,
      "list_id"
    );
    log.info("Creating test table...");
    await createTestTable(client, tableName);
    log.info("Test setup complete");
  });

  it("Ada can create todos", async () => {
    for (const todoId of todoIds) {
      const event = {
        type: TodoEventTypes.TODO_CREATED,
        data: {
          todo_id: todoId,
          list_id: listId,
          title: `Todo ${todoId}`,
        },
      };
      await eventClient.saveEvent(event);
    }

    const events = await eventClient.getEventStream({
      eventTypes: [TodoEventTypes.TODO_CREATED],
      partitionId: listId,
    });

    expect(events).toHaveLength(4);
    expect(events.every(e => e.type === TodoEventTypes.TODO_CREATED)).toBe(true);
    expect(new Set(events.map(e => e.data.todo_id))).toEqual(new Set(todoIds));
  });

  it("Ada can assign todos", async () => {
    for (const [index, todoId] of todoIds.entries()) {
      const assignee = index < 2 ? ada : lise;
      const event = {
        type: TodoEventTypes.TODO_ASSIGNED,
        data: {
          todo_id: todoId,
          list_id: listId,
          user_id: assignee,
        },
      };
      await eventClient.saveEvent(event);
    }

    const events = await eventClient.getEventStream({
      eventTypes: [TodoEventTypes.TODO_ASSIGNED],
      partitionId: listId,
    });

    expect(events).toHaveLength(4);
    expect(events.every(e => e.type === TodoEventTypes.TODO_ASSIGNED)).toBe(true);
    expect(events.slice(0, 2).every(e => e.data.user_id === ada)).toBe(true);
    expect(events.slice(2).every(e => e.data.user_id === lise)).toBe(true);
  });

  it("Ada can see her assigned todos", async () => {
    // Create todos first
    for (const todoId of todoIds) {
      const event = {
        type: TodoEventTypes.TODO_CREATED,
        data: {
          todo_id: todoId,
          list_id: listId,
          title: `Todo ${todoId}`,
        },
      };
      await eventClient.saveEvent(event);
    }

    // Assign todos
    for (const [index, todoId] of todoIds.entries()) {
      const assignee = index < 2 ? ada : lise;
      const event = {
        type: TodoEventTypes.TODO_ASSIGNED,
        data: {
          todo_id: todoId,
          list_id: listId,
          user_id: assignee,
        },
      };
      await eventClient.saveEvent(event);
    }

    // Check Ada's view
    const adaEvents = await eventClient.getEventStream({
      eventTypes: [
        TodoEventTypes.TODO_CREATED,
        TodoEventTypes.TODO_ASSIGNED,
      ],
      partitionId: listId,
    });

    const adaTodos = todoIds
      .map((id) => {
        const todoEvents = adaEvents.filter((e) => e.data.todo_id === id);
        return todoEvents.length > 0 ? reduceTodo(todoEvents) : null;
      })
      .filter((todo): todo is Todo => todo !== null && todo.assignedTo === ada);

    expect(adaTodos).toHaveLength(2);
    expect(adaTodos.every((todo) => todo.status === "incomplete")).toBe(true);
  });

  it("Lise can see her assigned todos", async () => {
    const liseEvents = await eventClient.getEventStream({
      eventTypes: [
        TodoEventTypes.TODO_CREATED,
        TodoEventTypes.TODO_ASSIGNED,
      ],
      partitionId: listId,
    });

    const liseTodos = todoIds
      .map((id) => {
        const todoEvents = liseEvents.filter((e) => e.data.todo_id === id);
        return todoEvents.length > 0 ? reduceTodo(todoEvents) : null;
      })
      .filter((todo): todo is Todo => todo !== null && todo.assignedTo === lise);

    expect(liseTodos).toHaveLength(2);
    expect(liseTodos.every((todo) => todo.status === "incomplete")).toBe(true);
  });

  it("Ada can delete and complete todos", async () => {
    await eventClient.saveEvent({
      type: TodoEventTypes.TODO_DELETED,
      data: {
        todo_id: todoIds[0],
        list_id: listId,
        deleted_by_user_id: ada,
      },
    });

    await eventClient.saveEvent({
      type: TodoEventTypes.TODO_MARKED_COMPLETED,
      data: {
        todo_id: todoIds[1],
        list_id: listId,
        completed_by_user_id: ada,
      },
    });

    const events = await eventClient.getEventStream({
      eventTypes: [
        TodoEventTypes.TODO_CREATED,
        TodoEventTypes.TODO_ASSIGNED,
        TodoEventTypes.TODO_DELETED,
        TodoEventTypes.TODO_MARKED_COMPLETED,
      ],
      partitionId: listId,
    });

    const todo1Events = events.filter(e => e.data.todo_id === todoIds[0]);
    const todo2Events = events.filter(e => e.data.todo_id === todoIds[1]);

    const todo1 = reduceTodo(todo1Events);
    const todo2 = reduceTodo(todo2Events);

    expect(todo1).toBeNull();
    expect(todo2).toEqual({
      id: todoIds[1],
      listId,
      status: "complete",
      assignedTo: ada,
    });
  });

  it("Lise can complete and uncomplete todos", async () => {
    await eventClient.saveEvent({
      type: TodoEventTypes.TODO_MARKED_COMPLETED,
      data: {
        todo_id: todoIds[2],
        list_id: listId,
        completed_by_user_id: lise,
      },
    });

    await eventClient.saveEvent({
      type: TodoEventTypes.TODO_MARKED_COMPLETED,
      data: {
        todo_id: todoIds[3],
        list_id: listId,
        completed_by_user_id: lise,
      },
    });

    await eventClient.saveEvent({
      type: TodoEventTypes.TODO_MARKED_UNCOMPLETED,
      data: {
        todo_id: todoIds[2],
        list_id: listId,
        uncompleted_by_user_id: lise,
      },
    });

    const events = await eventClient.getEventStream({
      eventTypes: [
        TodoEventTypes.TODO_CREATED,
        TodoEventTypes.TODO_ASSIGNED,
        TodoEventTypes.TODO_MARKED_COMPLETED,
        TodoEventTypes.TODO_MARKED_UNCOMPLETED,
      ],
      partitionId: listId,
    });

    const todo3Events = events.filter(e => e.data.todo_id === todoIds[2]);
    const todo4Events = events.filter(e => e.data.todo_id === todoIds[3]);

    const todo3 = reduceTodo(todo3Events);
    const todo4 = reduceTodo(todo4Events);

    expect(todo3).toEqual({
      id: todoIds[2],
      listId,
      status: "incomplete",
      assignedTo: lise,
    });
    expect(todo4).toEqual({
      id: todoIds[3],
      listId,
      status: "complete",
      assignedTo: lise,
    });
  });
}); 