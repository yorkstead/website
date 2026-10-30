import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Circle,
  Clock3,
  FileCheck2,
  FileText,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PortalNavigation } from "@/components/customer-portal/portal-navigation";
import {
  normalizePortalProgress,
  type CustomerPortalView,
  type PortalReviewState,
} from "@/lib/customer-portal-view";

const projectStatus = {
  on_track: { label: "On track", className: "border-success/30 bg-success/10 text-success" },
  attention: { label: "Needs attention", className: "border-warning/30 bg-warning/10 text-warning" },
  complete: { label: "Complete", className: "border-primary/30 bg-primary/10 text-primary" },
  paused: { label: "Paused", className: "border-border bg-secondary text-muted-foreground" },
} as const;

const milestoneStatus = {
  complete: { label: "Completed", icon: Check, className: "border-success/40 bg-success/10 text-success" },
  active: { label: "In progress", icon: Clock3, className: "border-primary/40 bg-primary/10 text-primary" },
  blocked: { label: "Blocked", icon: AlertTriangle, className: "border-warning/40 bg-warning/10 text-warning" },
  upcoming: { label: "Upcoming", icon: Circle, className: "border-border bg-secondary text-muted-foreground" },
} as const;

const deliverableStatus = {
  planned: "Planned",
  in_progress: "In progress",
  complete: "Complete",
  removed: "Removed",
} as const;

const reviewState: Record<PortalReviewState, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border-border bg-secondary text-muted-foreground" },
  internal_review: { label: "Internal review", className: "border-warning/30 bg-warning/10 text-warning" },
  approved: { label: "Approved", className: "border-success/30 bg-success/10 text-success" },
};

function formatDate(value?: string, includeYear = false) {
  if (!value) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(parsed);
}

function SectionHeading({
  eyebrow,
  title,
  description,
  titleId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  titleId: string;
}) {
  return (
    <header className="max-w-2xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="border-dashed bg-card/50">
      <CardContent className="flex min-h-36 flex-col items-center justify-center text-center">
        <Circle className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export { PortalNavigation };

export function PortalOverview({ portal }: { portal: CustomerPortalView }) {
  const progress = normalizePortalProgress(portal.project.progress);
  const status = projectStatus[portal.project.status];
  const deadline = formatDate(portal.project.upcomingDeadline, true);

  return (
    <section id="overview" aria-labelledby="portal-title" className="scroll-mt-24 border-b border-border/70">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:py-16">
        <div className="flex flex-wrap items-center gap-2">
          {portal.fixtureLabel ? (
            <Badge className="border-warning/30 bg-warning/10 text-warning">{portal.fixtureLabel}</Badge>
          ) : null}
          <Badge className={status.className}>{status.label}</Badge>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.7fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-sm font-semibold text-primary" aria-hidden="true">
                {portal.company.monogram}
              </span>
              <div>
                <p className="text-sm font-medium">{portal.company.name}</p>
                {portal.company.descriptor ? <p className="text-xs text-muted-foreground">{portal.company.descriptor}</p> : null}
              </div>
            </div>
            <p className="mt-9 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{portal.project.phase}</p>
            <h1 id="portal-title" className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              {portal.project.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{portal.project.summary}</p>
          </div>

          <Card className="bg-surface/70">
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Overall progress</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{progress}%</p>
                </div>
                <span className="text-xs text-muted-foreground">{status.label}</span>
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label="Project progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <Card className="bg-card/70">
            <CardContent>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Next action</p>
              <p className="mt-3 text-sm font-medium">{portal.project.nextAction ?? "No action is waiting right now."}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Upcoming deadline</p>
              <p className="mt-3 text-sm font-medium">{deadline ?? "No target date is set."}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Yorkstead contact</p>
              <p className="mt-3 text-sm font-medium">{portal.contact.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{portal.contact.role}</p>
              <a className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline" href={`mailto:${portal.contact.email}`}>
                <Mail className="size-3.5" aria-hidden="true" /> {portal.contact.email}
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function PortalTimeline({ milestones }: Pick<CustomerPortalView, "milestones">) {
  return (
    <section id="timeline" aria-labelledby="timeline-title" className="scroll-mt-20 border-b border-border/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <SectionHeading eyebrow="Project timeline" title="A clear path through delivery" titleId="timeline-title" description="Milestones show what is complete, what is active now, and what comes next." />
        {milestones.length === 0 ? (
          <div className="mt-8"><EmptyState title="Timeline is being prepared" detail="Milestones will appear here after the delivery sequence is confirmed." /></div>
        ) : (
          <ol className="relative mt-9 space-y-4 before:absolute before:bottom-6 before:left-[1.15rem] before:top-6 before:w-px before:bg-border sm:before:left-[1.4rem]">
            {milestones.map((milestone) => {
              const state = milestoneStatus[milestone.status];
              const Icon = state.icon;
              const date = formatDate(milestone.targetDate, true);
              return (
                <li key={milestone.id} className="relative grid grid-cols-[2.35rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.8rem_minmax(0,1fr)] sm:gap-5">
                  <span className={cn("z-10 grid size-9 place-items-center rounded-full border bg-background sm:size-11", state.className)} aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <Card className={cn("bg-card/70", milestone.status === "active" && "border-primary/40 bg-primary/5")}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{milestone.title}</p>
                          {milestone.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{milestone.description}</p> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={state.className}>{state.label}</Badge>
                          <span className="text-xs text-muted-foreground">{date ?? "Date to be confirmed"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export function PortalDeliverables({ deliverables }: Pick<CustomerPortalView, "deliverables">) {
  return (
    <section id="deliverables" aria-labelledby="deliverables-title" className="scroll-mt-20 border-b border-border/70">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <SectionHeading eyebrow="Deliverables" title="The work taking shape" titleId="deliverables-title" description="Status and review metadata are visible here. Files and downloads remain intentionally unavailable." />
        {deliverables.length === 0 ? (
          <div className="mt-8"><EmptyState title="No deliverables yet" detail="Scoped deliverables will appear here once the project plan is ready." /></div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {deliverables.map((deliverable) => {
              const review = reviewState[deliverable.reviewState];
              const updated = formatDate(deliverable.updatedAt, true);
              return (
                <Card key={deliverable.id} className="bg-card/70">
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        {deliverable.reviewState === "approved" ? <FileCheck2 className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
                      </span>
                      <Badge className={review.className}>{review.label}</Badge>
                    </div>
                    <h3 className="mt-5 text-base font-semibold">{deliverable.title}</h3>
                    {deliverable.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{deliverable.description}</p> : null}
                    <dl className="mt-auto grid grid-cols-2 gap-4 pt-6 text-xs">
                      <div><dt className="text-muted-foreground">Delivery status</dt><dd className="mt-1 font-medium">{deliverableStatus[deliverable.status]}</dd></div>
                      <div><dt className="text-muted-foreground">Version / date</dt><dd className="mt-1 font-medium">{[deliverable.version, updated].filter(Boolean).join(" · ") || "Not available"}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          Document sharing is disabled. This preview exposes no file locations or download controls.
        </p>
      </div>
    </section>
  );
}

export function PortalActivity({ activity }: Pick<CustomerPortalView, "activity">) {
  return (
    <section id="updates" aria-labelledby="updates-title" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
        <SectionHeading eyebrow="Project activity" title="Progress with context" titleId="updates-title" description="Updates, decisions, and reviews remain distinct, with approval state visible at a glance." />
        {activity.length === 0 ? (
          <div className="mt-8"><EmptyState title="No project updates yet" detail="Meaningful progress, decisions, and review changes will appear here in chronological order." /></div>
        ) : (
          <ol className="mt-8 divide-y divide-border/70 rounded-xl border border-border bg-card/60">
            {activity.map((item) => {
              const review = reviewState[item.reviewState];
              const kind = item.kind === "decision" ? "Decision" : item.kind === "review" ? "Review" : "Progress update";
              return (
                <li key={item.id} className="grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-6">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground" aria-hidden="true">
                    {item.kind === "decision" ? <ShieldCheck className="size-4" /> : <MessageSquareText className="size-4" />}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">{kind}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <Badge className={review.className}>{review.label}</Badge>
                    <time dateTime={item.createdAt} className="text-xs text-muted-foreground">{formatDate(item.createdAt, true) ?? "Date unavailable"}</time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export function CustomerPortal({ portal }: { portal: CustomerPortalView }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <PortalNavigation companyName={portal.company.name} />
      <main id="portal-content">
        <PortalOverview portal={portal} />
        <PortalTimeline milestones={portal.milestones} />
        <PortalDeliverables deliverables={portal.deliverables} />
        <PortalActivity activity={portal.activity} />
      </main>
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Yorkstead Systems · focused software for the way your operation works.</p>
          <a href="#overview" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Back to overview <ArrowUpRight className="size-3" aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  );
}
