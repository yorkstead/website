import { addDaysToDateKey, dateKeyInTimeZone } from "@/lib/date-time";
import { fetchJSON, type Fetcher, upstreamFailureStatus } from "@/lib/morning-briefing/sources/http";
import type { BriefingTask, CalendarItem, GmailFollowUp, SourceResult } from "@/lib/morning-briefing/types";

type GoogleSources = {
  calendar: SourceResult<CalendarItem[]>;
  tasks: SourceResult<BriefingTask[]>;
  gmail: SourceResult<GmailFollowUp[]>;
};

type CalendarEvent = {
  id?: unknown;
  summary?: unknown;
  status?: unknown;
  start?: { date?: unknown; dateTime?: unknown };
  end?: { date?: unknown; dateTime?: unknown };
};

type TaskList = { id?: unknown; title?: unknown };
type GoogleTask = { id?: unknown; title?: unknown; due?: unknown; status?: unknown; deleted?: unknown; hidden?: unknown };
type GmailMessage = { id?: unknown; threadId?: unknown; labelIds?: unknown; internalDate?: unknown; payload?: { headers?: Array<{ name?: unknown; value?: unknown }> } };
type GmailThread = { id?: unknown; messages?: GmailMessage[] };

function googleConfiguration() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  return clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : null;
}

async function accessToken(fetcher: Fetcher) {
  const configuration = googleConfiguration();
  if (!configuration) return null;
  const body = new URLSearchParams({
    client_id: configuration.clientId,
    client_secret: configuration.clientSecret,
    refresh_token: configuration.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetchJSON<{ access_token?: unknown }>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }, fetcher);
  if (typeof response.access_token !== "string" || !response.access_token) throw new Error("Google token response was invalid");
  return response.access_token;
}

function googleHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

function dateBoundary(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  let timestamp = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
    const representedAsUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const difference = representedAsUTC - Date.UTC(year, month - 1, day);
    if (difference === 0) break;
    timestamp -= difference;
  }
  return new Date(timestamp).toISOString();
}

function calendarIds() {
  return (process.env.GOOGLE_CALENDAR_IDS || "primary").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 10);
}

export function normalizeCalendarEvents(value: unknown, timeZone: string): CalendarItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const event = candidate as CalendarEvent;
    if (!event || typeof event !== "object" || event.status === "cancelled") return [];
    const startDateTime = typeof event.start?.dateTime === "string" ? event.start.dateTime : null;
    const startDate = typeof event.start?.date === "string" ? event.start.date : null;
    const start = startDateTime || startDate;
    if (!start) return [];
    const allDay = Boolean(startDate && !startDateTime);
    const dateKey = allDay ? startDate! : dateKeyInTimeZone(new Date(start), timeZone);
    return [{
      id: typeof event.id === "string" ? event.id : `${dateKey}-${String(event.summary ?? "event")}`,
      title: typeof event.summary === "string" && event.summary.trim() ? event.summary : "Untitled event",
      start,
      end: typeof event.end?.dateTime === "string" ? event.end.dateTime : typeof event.end?.date === "string" ? event.end.date : undefined,
      allDay,
      dateKey,
    }];
  });
}

async function loadCalendar(token: string, dateKey: string, tomorrowDateKey: string, timeZone: string, fetcher: Fetcher): Promise<SourceResult<CalendarItem[]>> {
  try {
    const settled = await Promise.allSettled(calendarIds().map(async (calendarId) => {
      const query = new URLSearchParams({
        timeMin: dateBoundary(dateKey, timeZone),
        timeMax: dateBoundary(addDaysToDateKey(tomorrowDateKey, 1), timeZone),
        timeZone,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });
      const response = await fetchJSON<{ items?: unknown }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query}`, { headers: googleHeaders(token) }, fetcher);
      return normalizeCalendarEvents(response.items, timeZone);
    }));
    const events = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    const failures = settled.filter((result) => result.status === "rejected");
    if (failures.length === settled.length) return { status: upstreamFailureStatus(failures[0]?.reason), value: [] };
    const unique = [...new Map(events.map((event) => [event.id, event])).values()].sort((left, right) => left.start.localeCompare(right.start));
    return { status: failures.length ? "partial" : "ok", value: unique };
  } catch (error) {
    return { status: upstreamFailureStatus(error), value: [] };
  }
}

export function normalizeTasks(value: unknown, list: TaskList, dateKey: string, tomorrowDateKey: string): BriefingTask[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const task = candidate as GoogleTask;
    const dueDate = typeof task.due === "string" ? task.due.slice(0, 10) : "";
    if (!task || typeof task !== "object" || task.status === "completed" || task.deleted || task.hidden || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate > tomorrowDateKey) return [];
    return [{
      id: typeof task.id === "string" ? task.id : `${String(list.id)}-${dueDate}-${String(task.title)}`,
      title: typeof task.title === "string" && task.title.trim() ? task.title : "Untitled task",
      list: typeof list.title === "string" && list.title.trim() ? list.title : "Tasks",
      dueDate: dueDate || dateKey,
    }];
  });
}

async function loadTasks(token: string, dateKey: string, tomorrowDateKey: string, fetcher: Fetcher): Promise<SourceResult<BriefingTask[]>> {
  try {
    const lists = await fetchJSON<{ items?: unknown }>("https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100", { headers: googleHeaders(token) }, fetcher);
    const taskLists = Array.isArray(lists.items) ? lists.items.filter((item): item is TaskList => Boolean(item && typeof item === "object" && typeof (item as TaskList).id === "string")) : [];
    const settled = await Promise.allSettled(taskLists.map(async (list) => {
      const query = new URLSearchParams({ showCompleted: "false", showDeleted: "false", showHidden: "false", maxResults: "100" });
      const response = await fetchJSON<{ items?: unknown }>(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(String(list.id))}/tasks?${query}`, { headers: googleHeaders(token) }, fetcher);
      return normalizeTasks(response.items, list, dateKey, tomorrowDateKey);
    }));
    const failures = settled.filter((result) => result.status === "rejected");
    if (taskLists.length && failures.length === taskLists.length) return { status: upstreamFailureStatus(failures[0]?.reason), value: [] };
    const tasks = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    return { status: failures.length ? "partial" : "ok", value: tasks };
  } catch (error) {
    return { status: upstreamFailureStatus(error), value: [] };
  }
}

function header(message: GmailMessage, name: string) {
  const match = message.payload?.headers?.find((candidate) => String(candidate.name).toLowerCase() === name.toLowerCase());
  return typeof match?.value === "string" ? match.value : "";
}

export function followUpFromThread(thread: GmailThread, now = new Date()): GmailFollowUp | null {
  if (!Array.isArray(thread.messages) || !thread.messages.length || typeof thread.id !== "string") return null;
  const messages = [...thread.messages].sort((left, right) => Number(left.internalDate ?? 0) - Number(right.internalDate ?? 0));
  const last = messages.at(-1)!;
  const sentAt = Number(last.internalDate);
  if (!Number.isFinite(sentAt) || !Array.isArray(last.labelIds) || !last.labelIds.includes("SENT")) return null;
  const waitingDays = Math.floor((now.getTime() - sentAt) / 86_400_000);
  if (waitingDays < 2 || waitingDays > 30) return null;
  const subject = header(last, "subject").replace(/^\s*(re|fwd?):\s*/i, "").trim() || "Untitled email thread";
  return { threadId: thread.id, subject, waitingDays };
}

async function loadGmail(token: string, now: Date, fetcher: Fetcher): Promise<SourceResult<GmailFollowUp[]>> {
  try {
    const profile = await fetchJSON<{ emailAddress?: unknown }>("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: googleHeaders(token) }, fetcher);
    if (typeof profile.emailAddress !== "string" || !profile.emailAddress) throw new Error("Gmail profile did not identify the authorized account");
    const query = new URLSearchParams({ labelIds: "SENT", maxResults: "100" });
    const result = await fetchJSON<{ messages?: GmailMessage[] }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${query}`, { headers: googleHeaders(token) }, fetcher);
    const threadIds = [...new Set((result.messages ?? []).flatMap((message) => typeof message.threadId === "string" ? [message.threadId] : []))].slice(0, 30);
    const settled = await Promise.allSettled(threadIds.map(async (threadId) => {
      const metadata = new URLSearchParams({ format: "metadata" });
      metadata.append("metadataHeaders", "Subject");
      return fetchJSON<GmailThread>(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?${metadata}`, { headers: googleHeaders(token) }, fetcher);
    }));
    const failures = settled.filter((item) => item.status === "rejected");
    if (threadIds.length && failures.length === threadIds.length) return { status: upstreamFailureStatus(failures[0]?.reason), value: [] };
    const followUps = settled.flatMap((item) => item.status === "fulfilled" ? [followUpFromThread(item.value, now)].filter((value): value is GmailFollowUp => Boolean(value)) : [])
      .sort((left, right) => right.waitingDays - left.waitingDays);
    return { status: failures.length ? "partial" : "ok", value: followUps };
  } catch (error) {
    return { status: upstreamFailureStatus(error), value: [] };
  }
}

export async function loadGoogleSources(dateKey: string, tomorrowDateKey: string, timeZone: string, now = new Date(), fetcher: Fetcher = fetch): Promise<GoogleSources> {
  if (!googleConfiguration()) {
    const missing = { status: "not_configured" as const, value: [] };
    return { calendar: missing, tasks: missing, gmail: missing };
  }
  let token: string;
  try {
    token = await accessToken(fetcher) as string;
  } catch (error) {
    const status = upstreamFailureStatus(error);
    return { calendar: { status, value: [] }, tasks: { status, value: [] }, gmail: { status, value: [] } };
  }
  const [calendar, tasks, gmail] = await Promise.all([
    loadCalendar(token, dateKey, tomorrowDateKey, timeZone, fetcher),
    loadTasks(token, dateKey, tomorrowDateKey, fetcher),
    loadGmail(token, now, fetcher),
  ]);
  return { calendar, tasks, gmail };
}
