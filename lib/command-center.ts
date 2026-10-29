import type { CommandCenterLead } from "@/lib/contact-inquiries";
import type { Project } from "@/lib/projects";
import type { Task } from "@/lib/workspace";
import { dateKeyInTimeZone } from "@/lib/date-time";

export type GoogleCommandTask = { id: string; listId: string; title: string; due: string };

export type CommandCenterAction =
  | { kind: "follow-up"; id: number; title: string; detail: string; priority: number; date: string; href: string; lead: CommandCenterLead }
  | { kind: "stalled-lead"; id: number; title: string; detail: string; priority: number; date: string; href: string; lead: CommandCenterLead }
  | { kind: "project"; id: string; title: string; detail: string; priority: number; date: string; href: string; project: Project }
  | { kind: "task"; id: string; title: string; detail: string; priority: number; date: string; task: Task }
  | { kind: "google-task"; id: string; title: string; detail: string; priority: number; date: string; task: GoogleCommandTask };

export function selectCommandCenterActions(input: {
  leads: CommandCenterLead[];
  projects: Project[];
  tasks: Task[];
  googleTasks?: GoogleCommandTask[];
  today: string;
  staleProjectDays: number;
  staleOpportunityDays?: number;
  limit?: number;
}): CommandCenterAction[] {
  const actions: CommandCenterAction[] = [];
  const seenLeadIds = new Set<number>();
  for (const lead of input.leads) {
    const date = lead.followUpAt ? dateKeyInTimeZone(new Date(lead.followUpAt), "America/Denver") : undefined;
    if (!date || date > input.today || ["won", "lost", "archived"].includes(lead.status)) continue;
    seenLeadIds.add(lead.id);
    actions.push({
      kind: "follow-up", id: lead.id, title: lead.company || lead.name,
      detail: `${date < input.today ? "Overdue" : "Due today"} · ${lead.status}`,
      priority: date < input.today ? 0 : 1, date, href: `/dashboard/leads?lead=${lead.id}`, lead,
    });
  }
  for (const lead of input.leads) {
    if (seenLeadIds.has(lead.id) || !["qualified", "proposal"].includes(lead.status)) continue;
    if (lead.followUpAt && dateKeyInTimeZone(new Date(lead.followUpAt), "America/Denver") > input.today) continue;
    const updated = Date.parse(lead.updatedAt);
    const ageDays = dayDifference(input.today, dateKeyInTimeZone(new Date(updated), "America/Denver"));
    if (!Number.isFinite(updated) || ageDays < (input.staleOpportunityDays ?? 14)) continue;
    actions.push({
      kind: "stalled-lead", id: lead.id, title: lead.company || lead.name,
      detail: `Stalled ${lead.status} · no update for ${ageDays} days`, priority: 2,
      date: lead.updatedAt, href: `/dashboard/leads?lead=${lead.id}`, lead,
    });
  }
  for (const project of input.projects) {
    if (project.status !== "Active" || !project.note.trim() || project.note.trim() === "Define the next useful action.") continue;
    const ageDays = Math.floor((Date.parse(`${input.today}T12:00:00Z`) - Date.parse(project.updatedAt)) / 86_400_000);
    const stalled = Number.isFinite(ageDays) && ageDays >= input.staleProjectDays;
    actions.push({
      kind: "project", id: project.id, title: project.name,
      detail: stalled ? `Stalled project · ${project.note}` : project.note,
      priority: stalled ? 3 : 4, date: project.updatedAt,
      href: `/dashboard?project=${encodeURIComponent(project.id)}`, project,
    });
  }
  for (const task of input.tasks) {
    if (task.done) continue;
    const date = task.dueDate ?? "9999-12-31";
    const overdue = date < input.today;
    const dueToday = date === input.today;
    actions.push({
      kind: "task", id: task.id, title: task.title,
      detail: task.dueDate ? `${overdue ? "Overdue" : dueToday ? "Due today" : "Due"} · ${date}` : "No due date",
      priority: overdue ? 5 : dueToday ? 6 : task.priority === "High" ? 7 : 8,
      date, task,
    });
  }
  for (const task of input.googleTasks ?? []) {
    const overdue = task.due < input.today;
    const dueToday = task.due === input.today;
    actions.push({
      kind: "google-task", id: `${task.listId}:${task.id}`, title: task.title,
      detail: `${overdue ? "Overdue" : dueToday ? "Due today" : "Google task"} · ${task.due}`,
      priority: overdue ? 5 : dueToday ? 6 : 8, date: task.due, task,
    });
  }
  return actions.sort((left, right) => left.priority - right.priority || left.date.localeCompare(right.date) || left.title.localeCompare(right.title)).slice(0, input.limit ?? 12);
}

function dayDifference(later: string, earlier: string) {
  const laterTime = Date.parse(`${later}T12:00:00Z`);
  const earlierTime = Date.parse(`${earlier}T12:00:00Z`);
  return Math.floor((laterTime - earlierTime) / 86_400_000);
}

export function openLeadStageCounts(counts: Record<string, number>) {
  return ["new", "contacted", "qualified", "proposal"].map((stage) => ({ stage, count: counts[stage] ?? 0 }));
}
