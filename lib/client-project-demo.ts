import { assembleClientProjectProjection, prepareSourceContent, type PublicationKind } from "@/lib/client-project-projection";
import type { Workspace } from "@/lib/workspace";

// Isolated synthetic source; never reads workspace storage, a DB or route selectors.
const fictional: Workspace = {
  projects: [{ id: "cc008-fictional", name: "Fictional delivery integration", eyebrow: "Synthetic", description: "A reviewed project overview prepared from fictional source records.", status: "Active", kind: "Software", stack: [], updatedAt: "2026-10-01T12:00:00Z", updatedLabel: "Synthetic", note: "PRIVATE SENTINEL", progress: 40, accent: "cyan", delivery: {
    deliverables: [{ id: "scope", title: "Fictional workflow", status: "in_progress" }],
    milestones: [{ id: "review", title: "Fictional delivery review", status: "in_progress", targetDate: "2026-11-15", acceptanceCriteria: "PRIVATE SENTINEL" }],
    activity: [], decisions: [], links: [],
  } }], tasks: [], activity: [], notes: [{ id: "update", projectId: "cc008-fictional", type: "Update", content: "The fictional workflow is ready for the next delivery milestone.", createdAt: "2026-10-01T12:00:00Z" }],
};
const decisions: [PublicationKind, string][] = [["project", "cc008-fictional"], ["milestone", "review"], ["date", "review"], ["deliverable", "scope"], ["update", "update"]];
export const clientProjectDemo = assembleClientProjectProjection("cc008-fictional", decisions.map(([kind, source_id]) => ({ kind, source_id, payload: prepareSourceContent(fictional, "cc008-fictional", kind, source_id, true) })))!;
