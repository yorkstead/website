import { describe, expect, test } from "bun:test";
import { selectCommandCenterActions } from "@/lib/command-center";
import type { CommandCenterLead } from "@/lib/contact-inquiries";
import type { Project } from "@/lib/projects";
import type { Task } from "@/lib/workspace";

const lead = (id: number, status: CommandCenterLead["status"], followUpAt: string | null, updatedAt = "2026-10-01T12:00:00.000Z"): CommandCenterLead => ({ id, name: `Lead ${id}`, company: null, projectType: null, status, followUpAt, updatedAt, nextStep: "" });
const project = (id: string, updatedAt = "2026-10-28T12:00:00.000Z"): Project => ({ id, name: id, eyebrow: "Software", description: "", status: "Active", kind: "Software", stack: [], updatedAt, updatedLabel: "", note: "Review next milestone", progress: 20, accent: "cyan" });
const task = (id: string, dueDate?: string, priority: Task["priority"] = "Medium"): Task => ({ id, title: id, dueDate, priority, done: false, createdAt: "2026-10-01T12:00:00.000Z" });

describe("Command Center prioritization", () => {
  test("orders overdue and due-today follow-ups before stalled leads, project next steps, and tasks", () => {
    const actions = selectCommandCenterActions({
      leads: [lead(1, "qualified", "2026-10-28T18:00:00.000Z"), lead(2, "proposal", null), lead(3, "new", "2026-10-29T18:00:00.000Z")],
      projects: [project("active")], tasks: [task("later", "2026-11-01"), task("today", "2026-10-29")],
      today: "2026-10-29", staleProjectDays: 14,
    });
    expect(actions.map((item) => item.kind === "follow-up" ? `lead-${item.id}` : `${item.kind}-${item.id}`)).toEqual(["lead-1", "lead-3", "stalled-lead-2", "project-active", "task-today", "task-later"]);
  });

  test("excludes closed leads, completed tasks, and active projects without a next step", () => {
    const actions = selectCommandCenterActions({
      leads: [lead(1, "won", "2026-10-28T12:00:00Z"), lead(2, "archived", null)],
      projects: [{ ...project("blank"), note: "  " }], tasks: [{ ...task("done"), done: true }],
      today: "2026-10-29", staleProjectDays: 14,
    });
    expect(actions).toEqual([]);
  });

  test("uses the Denver date key supplied by the caller and keeps links exact", () => {
    const actions = selectCommandCenterActions({ leads: [lead(42, "contacted", "2026-10-29T06:30:00.000Z")], projects: [], tasks: [], today: "2026-10-29", staleProjectDays: 14 });
    expect(actions[0]?.detail).toContain("Due today");
    expect(actions[0]?.kind === "follow-up" ? actions[0].href : null).toBe("/dashboard/leads?lead=42");
  });
});
