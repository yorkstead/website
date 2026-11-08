import type { AutomationHubDataResult } from "@/lib/automation-hub-data";

export type GoogleActionTask = { id: string; listId: string; title: string; due: string };
export type GoogleOperations = {
  actionableTasks: GoogleActionTask[];
  agenda: { today: string[]; tomorrow: string[] };
  tasksState: "available" | "unavailable" | "partial";
  tasksDetail: string;
  calendarState: "available" | "unavailable" | "partial";
  calendarDetail: string;
};

function unavailable(detail: string): GoogleOperations {
  return { actionableTasks: [], agenda: { today: [], tomorrow: [] }, tasksState: "unavailable", tasksDetail: detail, calendarState: "unavailable", calendarDetail: detail };
}

function eventLabel(event: { summary: string; startAt: string | null; allDay: boolean }) {
  if (event.allDay || !event.startAt) return event.summary;
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" }).format(new Date(event.startAt));
  return `${time} — ${event.summary}`;
}

/** Pure view adapter: it does not perform I/O or infer fields absent from the CC-021 projection. */
export function getGoogleOperations(result: AutomationHubDataResult): GoogleOperations {
  if (result.state !== "available") return unavailable(`Automation Hub source is ${result.state}.`);
  const { dashboardTasks, calendar, dateContext } = result.data;
  const taskProjection = dashboardTasks && dateContext ? dashboardTasks : null;
  const calendarProjection = calendar && dateContext ? calendar : null;
  const todayEvents = calendarProjection?.items.filter((event) => event.date === dateContext?.today) ?? [];
  const tomorrowEvents = calendarProjection?.items.filter((event) => event.date === dateContext?.tomorrow) ?? [];
  const tasksState = taskProjection?.state ?? "unavailable";
  const calendarState = calendarProjection?.state ?? "unavailable";
  const actionableTasks = taskProjection && taskProjection.state !== "unavailable"
    ? taskProjection.items.flatMap((task) => task.dueAt ? [{ id: task.id, listId: task.listId, title: task.title, due: task.dueAt.slice(0, 10) }] : [])
    : [];
  return {
    actionableTasks,
    agenda: calendarProjection && calendarProjection.state !== "unavailable"
      ? { today: todayEvents.map(eventLabel), tomorrow: tomorrowEvents.map(eventLabel) }
      : { today: [], tomorrow: [] },
    tasksState,
    tasksDetail: !taskProjection ? "Dashboard task projection is not supported by this Hub response." : taskProjection.errorCode || `${taskProjection.items.length} open tasks${taskProjection.truncated ? " · results may be incomplete" : ""}`,
    calendarState,
    calendarDetail: !calendarProjection ? "Calendar projection is not supported by this Hub response." : calendarProjection.errorCode || `${todayEvents.length} today · ${tomorrowEvents.length} tomorrow${calendarProjection.truncated ? " · results may be incomplete" : ""}`,
  };
}
