export type PortalStatus = "on_track" | "attention" | "complete" | "paused";
export type PortalMilestoneStatus = "complete" | "active" | "blocked" | "upcoming";
export type PortalReviewState = "draft" | "internal_review" | "approved";
export type PortalActivityKind = "update" | "decision" | "review";

export type CustomerPortalView = Readonly<{
  fixtureLabel?: string;
  company: Readonly<{
    name: string;
    descriptor?: string;
    monogram: string;
  }>;
  project: Readonly<{
    title: string;
    summary: string;
    phase: string;
    status: PortalStatus;
    progress: number;
    nextAction?: string;
    upcomingDeadline?: string;
  }>;
  contact: Readonly<{
    name: string;
    role: string;
    email: string;
  }>;
  milestones: ReadonlyArray<Readonly<{
    id: string;
    title: string;
    description?: string;
    targetDate?: string;
    status: PortalMilestoneStatus;
  }>>;
  deliverables: ReadonlyArray<Readonly<{
    id: string;
    title: string;
    description?: string;
    status: "planned" | "in_progress" | "complete" | "removed";
    reviewState: PortalReviewState;
    version?: string;
    updatedAt?: string;
  }>>;
  activity: ReadonlyArray<Readonly<{
    id: string;
    title: string;
    detail: string;
    kind: PortalActivityKind;
    reviewState: PortalReviewState;
    createdAt: string;
  }>>;
}>;

export function normalizePortalProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}
