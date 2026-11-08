import { describe, expect, test } from "bun:test";
import { getGoogleOperations } from "@/lib/dashboard-google-operations";
import type { AutomationHubDataResult } from "@/lib/automation-hub-data";

function result(overrides: Record<string, unknown> = {}): AutomationHubDataResult {
  return {
    state: "available", checkedAt: "2026-11-07T18:00:00.000Z",
    data: {
      contractVersion: 1, source: "Automation Hub", generatedAt: "2026-11-07T18:00:00.000Z",
      captures: { source: "captures", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
      activity: { source: "activity", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
      integrationHealth: { source: "health", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", database: "healthy", googleTasks: "healthy", errorCode: null },
      reviewQueue: { source: "review', state", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
      tasks: { source: "legacy tasks", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
      ...overrides,
    },
  } as unknown as AutomationHubDataResult;
}

describe("CC-021 Dashboard projection adapter", () => {
  test("treats an older v1 response without optional fields as unavailable, not empty", () => {
    const view = getGoogleOperations(result());
    expect(view.tasksState).toBe("unavailable");
    expect(view.calendarState).toBe("unavailable");
    expect(view.tasksDetail).toContain("not supported");
  });

  test("preserves up to 100 source tasks and maps canonical due dates without priority inference", () => {
    const items = Array.from({ length: 100 }, (_, index) => ({ id: `t-${index}`, listId: "list", title: `Task ${index}`, status: "needsAction", dueAt: "2026-11-08T00:00:00.000Z", updatedAt: "2026-11-07T17:00:00.000Z" }));
    const view = getGoogleOperations(result({
      dateContext: { timeZone: "America/Denver", today: "2026-11-07", tomorrow: "2026-11-08" },
      dashboardTasks: { source: "Dashboard tasks", state: "partial", checkedAt: "2026-11-07T18:00:00.000Z", truncated: true, errorCode: null, items },
      calendar: { source: "Calendar", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
    }));
    expect(view.actionableTasks).toHaveLength(100);
    expect(view.tasksState).toBe("partial");
    expect(view.actionableTasks[99]).toEqual({ id: "t-99", listId: "list", title: "Task 99", due: "2026-11-08" });
    expect(view).not.toHaveProperty("priority");
  });

  test("maps Denver timed and all-day calendar semantics while preserving independent source failures", () => {
    const view = getGoogleOperations(result({
      dateContext: { timeZone: "America/Denver", today: "2026-11-07", tomorrow: "2026-11-08" },
      dashboardTasks: { source: "Dashboard tasks", state: "unavailable", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: "google_tasks_unavailable", items: [] },
      calendar: { source: "Calendar", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [{ id: "all-day", summary: "Conference", date: "2026-11-07", startAt: null, allDay: true }, { id: "timed", summary: "Review", date: "2026-11-07", startAt: "2026-11-08T01:30:00.000Z", allDay: false }] },
    }));
    expect(view.tasksState).toBe("unavailable");
    expect(view.calendarState).toBe("available");
    expect(view.agenda.today).toEqual(["Conference", "6:30 PM — Review"]);
  });
});
