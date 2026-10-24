// Publication reads must not inherit workspace repair defaults for source dates.
import { parseWorkspace } from "@/lib/workspace-validation";
import { isValidDateValue } from "@/lib/semantic-validation";
import type { Workspace } from "@/lib/workspace";

export type ExcludedSourceUpdate = { projectId: string; sourceId: string; reason: string };
const text = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function parsePublicationWorkspace(value: unknown): { workspace: Workspace | null; excludedUpdates: ExcludedSourceUpdate[] } {
  const workspace = parseWorkspace(value);
  if (!workspace) return { workspace: null, excludedUpdates: [] };
  const source = record(value);
  const rawNotes = Array.isArray(source?.notes) ? source.notes.slice(0, 5000) : [];
  const projectIds = new Set(workspace.projects.map(p => p.id));
  const timestamps = new Map<string, string | null>();
  // Match the workspace parser's structural eligibility and first-ID-wins rule.
  // Never let a later duplicate bless an earlier note's invalid source timestamp.
  for (const raw of rawNotes) {
    const note = record(raw);
    if (!note) continue;
    const id = text(note.id, 80), projectId = text(note.projectId, 80);
    if (!id || !projectIds.has(projectId) || !text(note.content, 5000) || timestamps.has(id)) continue;
    const timestamp = text(note.createdAt, 40);
    timestamps.set(id, isValidDateValue(timestamp) ? timestamp : null);
  }
  const excludedUpdates: ExcludedSourceUpdate[] = [];
  const notes = (workspace.notes ?? []).flatMap(note => {
    if (note.type !== "Update") return [note];
    const createdAt = timestamps.get(note.id);
    if (createdAt) return [{ ...note, createdAt }];
    excludedUpdates.push({ projectId: note.projectId, sourceId: note.id, reason: "Update timestamp is missing or incompatible. Correct and save it in the workspace." });
    return [];
  });
  return { workspace: { ...workspace, notes }, excludedUpdates };
}
