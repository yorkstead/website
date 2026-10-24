import type { CustomerPortalView } from "@/lib/customer-portal-view";

export const customerPortalDemo = Object.freeze({
  fixtureLabel: "Fictional demo · no production client data",
  company: Object.freeze({
    name: "Northline Workshop",
    descriptor: "Fictional field-service manufacturer",
    monogram: "NW",
  }),
  project: Object.freeze({
    title: "Service operations command center",
    summary: "A focused operating workspace for scheduling crews, tracking work orders, and keeping field updates connected to the office.",
    phase: "Build and validation",
    status: "on_track",
    progress: 62,
    nextAction: "Review the field dispatch prototype",
    upcomingDeadline: "2026-11-06",
  }),
  contact: Object.freeze({
    name: "Brandon York",
    role: "Principal · Yorkstead Systems",
    email: "hello@yorkstead.com",
  }),
  milestones: Object.freeze([
    Object.freeze({ id: "demo-discovery", title: "Workflow discovery", description: "Current-state interviews and dispatch mapping completed.", targetDate: "2026-10-09", status: "complete" }),
    Object.freeze({ id: "demo-foundation", title: "Operations foundation", description: "Core work-order and scheduling flows are in internal validation.", targetDate: "2026-11-06", status: "active" }),
    Object.freeze({ id: "demo-pilot", title: "Team pilot", description: "A bounded field-team pilot follows acceptance of the foundation.", status: "upcoming" }),
    Object.freeze({ id: "demo-handoff", title: "Operational handoff", description: "Documentation, training, and ownership transfer.", targetDate: "2026-12-04", status: "upcoming" }),
  ]),
  deliverables: Object.freeze([
    Object.freeze({ id: "demo-workflow-map", title: "Current-state workflow map", description: "Approved map of dispatch, field, and office handoffs.", status: "complete", reviewState: "approved", version: "v1.0", updatedAt: "2026-10-09T18:00:00.000Z" }),
    Object.freeze({ id: "demo-dispatch", title: "Dispatch workspace", description: "Responsive scheduling and assignment interface.", status: "in_progress", reviewState: "internal_review", version: "v0.7", updatedAt: "2026-10-22T16:30:00.000Z" }),
    Object.freeze({ id: "demo-field", title: "Field work-order view", description: "Mobile-first job context and completion flow.", status: "in_progress", reviewState: "draft", version: "v0.4", updatedAt: "2026-10-21T20:15:00.000Z" }),
    Object.freeze({ id: "demo-handoff-package", title: "Ownership handoff package", status: "planned", reviewState: "draft" }),
  ]),
  activity: Object.freeze([
    Object.freeze({ id: "demo-activity-3", title: "Dispatch prototype entered review", detail: "The latest scheduling flow is ready for Yorkstead internal review.", kind: "review", reviewState: "internal_review", createdAt: "2026-10-22T16:30:00.000Z" }),
    Object.freeze({ id: "demo-activity-2", title: "Mobile priority confirmed", detail: "The fictional project team approved mobile work-order access as the pilot priority.", kind: "decision", reviewState: "approved", createdAt: "2026-10-17T19:00:00.000Z" }),
    Object.freeze({ id: "demo-activity-1", title: "Foundation build started", detail: "Work began on scheduling, assignment, and operational status flows.", kind: "update", reviewState: "approved", createdAt: "2026-10-12T15:45:00.000Z" }),
  ]),
} as const satisfies CustomerPortalView);
