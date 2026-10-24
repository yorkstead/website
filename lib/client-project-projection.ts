import { z } from "zod";
import { isValidDateKey } from "@/lib/date-time";
import { brand } from "@/lib/brand";
import type { CustomerPortalView } from "@/lib/customer-portal-view";
import type { Workspace } from "@/lib/workspace";

const text = z.string().trim().min(1).max(5000);
const title = z.string().trim().min(1).max(300);
export const publicationKind = z.enum(["project", "milestone", "deliverable", "date", "update"]);
export type PublicationKind = z.infer<typeof publicationKind>;
export const safePublication = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("project"), title, summary: z.string().max(4000), status: z.enum(["on_track", "attention", "complete", "paused"]), progress: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal("milestone"), title, status: z.enum(["complete", "active", "blocked", "upcoming"]) }).strict(),
  z.object({ kind: z.literal("deliverable"), title, description: text.optional(), status: z.enum(["planned", "in_progress", "complete"]) }).strict(),
  z.object({ kind: z.literal("date"), targetDate: z.string().refine(isValidDateKey) }).strict(),
  z.object({ kind: z.literal("update"), detail: text, createdAt: z.string().datetime({ offset: true }) }).strict(),
]);
export type SafePublication = z.infer<typeof safePublication>;
export type ClientProjectProjection = Readonly<{
  version: 1;
  projectId: string;
  overview: Extract<SafePublication, { kind: "project" }>;
  milestones: ReadonlyArray<{ id: string; content: Extract<SafePublication, { kind: "milestone" }>; targetDate?: string }>;
  deliverables: ReadonlyArray<{ id: string; content: Extract<SafePublication, { kind: "deliverable" }> }>;
  updates: ReadonlyArray<{ id: string; content: Extract<SafePublication, { kind: "update" }> }>;
}>;

// Called only on the server's persisted source, never an untrusted posted workspace.
export function prepareSourceContent(workspace: Workspace, projectId: string, kind: PublicationKind, sourceId: string, includeDescription = false): SafePublication | null {
  const project = workspace.projects.find(p => p.id === projectId);
  if (!project) return null;
  if (kind === "project") {
    if (sourceId !== projectId) return null;
    return safePublication.parse({ kind, title: project.name, summary: includeDescription ? project.description : "", status: project.status === "Shipped" ? "complete" : project.status === "Paused" ? "paused" : "on_track", progress: project.progress });
  }
  if (kind === "milestone" || kind === "date") {
    const source = project.delivery?.milestones.find(m => m.id === sourceId);
    if (!source) return null;
    if (kind === "date") return source.targetDate ? safePublication.parse({ kind, targetDate: source.targetDate }) : null;
    const statuses = { planned: "upcoming", in_progress: "active", blocked: "blocked", complete: "complete" } as const;
    return safePublication.parse({ kind, title: source.title, status: statuses[source.status] });
  }
  if (kind === "deliverable") {
    const source = project.delivery?.deliverables.find(d => d.id === sourceId);
    if (!source || source.status === "removed") return null;
    return safePublication.parse({ kind, title: source.title, status: source.status, ...(includeDescription && source.description ? { description: source.description } : {}) });
  }
  const source = workspace.notes?.find(n => n.projectId === projectId && n.id === sourceId && n.type === "Update");
  return source ? safePublication.parse({ kind, detail: source.content, createdAt: source.createdAt }) : null;
}

export type VisiblePublication = { source_id: string; kind: PublicationKind; payload: unknown };
export function assembleClientProjectProjection(projectId: string, rows: VisiblePublication[]): ClientProjectProjection | null {
  const parsed = rows.map(row => ({ row, parsed: safePublication.safeParse(row.payload) }));
  if (parsed.some(r => !r.parsed.success)) return null;
  const records = parsed.map(({ row, parsed: result }) => ({ id: row.source_id, content: result.data!, kind: row.kind }));
  if (records.some(r => r.content.kind !== r.kind)) return null;
  const overview = records.find(r => r.id === projectId && r.content.kind === "project")?.content;
  if (!overview || overview.kind !== "project") return null;
  const dates = new Map(records.flatMap(r => r.content.kind === "date" ? [[r.id, r.content.targetDate] as const] : []));
  return {
    version: 1, projectId, overview,
    milestones: records.flatMap(r => r.content.kind === "milestone" ? [{ id: r.id, content: r.content, targetDate: dates.get(r.id) }] : []),
    deliverables: records.flatMap(r => r.content.kind === "deliverable" ? [{ id: r.id, content: r.content }] : []),
    updates: records.flatMap(r => r.content.kind === "update" ? [{ id: r.id, content: r.content }] : [])
      .sort((a, b) => Date.parse(a.content.createdAt) - Date.parse(b.content.createdAt)
        || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

export function toCustomerPortalView(projection: ClientProjectProjection): CustomerPortalView {
  return {
    company: { name: "Client project", monogram: "YS" },
    project: { title: projection.overview.title, summary: projection.overview.summary, phase: "Project overview", status: projection.overview.status, progress: projection.overview.progress },
    contact: { name: brand.name, role: "Project team", email: brand.email },
    milestones: projection.milestones.map(m => ({ id: m.id, title: m.content.title, status: m.content.status, ...(m.targetDate ? { targetDate: m.targetDate } : {}) })),
    deliverables: projection.deliverables.map(d => ({ id: d.id, title: d.content.title, description: d.content.description, status: d.content.status, reviewState: "approved" })),
    activity: projection.updates.map(u => ({ id: u.id, title: "Project update", detail: u.content.detail, kind: "update", reviewState: "approved", createdAt: u.content.createdAt })),
  };
}
