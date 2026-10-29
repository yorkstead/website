"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, BriefcaseBusiness, Check, CircleAlert, ListChecks, Plus, Target } from "lucide-react";
import { CompleteLeadFollowUp, RescheduleLeadFollowUp } from "@/components/dashboard/lead-workflow-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { openLeadStageCounts, selectCommandCenterActions, type GoogleCommandTask } from "@/lib/command-center";
import type { CommandCenterCrmSnapshot } from "@/lib/contact-inquiries";
import type { Project } from "@/lib/projects";
import type { ActivityItem, Task } from "@/lib/workspace";

export function CommandCenterOverview({
  crm, crmUnavailable, projects, tasks, googleTasks, activity, today, staleProjectDays, ready,
  onCompleteTask, onOpenTask, onCompleteGoogleTask, onCreateTask,
}: {
  crm: CommandCenterCrmSnapshot | null;
  crmUnavailable: boolean;
  projects: Project[];
  tasks: Task[];
  googleTasks: GoogleCommandTask[];
  activity: ActivityItem[];
  today: string;
  staleProjectDays: number;
  ready: boolean;
  onCompleteTask: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onCompleteGoogleTask: (task: GoogleCommandTask) => void;
  onCreateTask: () => void;
}) {
  const actions = selectCommandCenterActions({
    leads: crm?.dueFollowUps.concat(crm.stalledOpportunities.filter((lead) => !crm.dueFollowUps.some((due) => due.id === lead.id))) ?? [],
    projects, tasks, googleTasks, today, staleProjectDays, limit: 10,
  });
  const stageCounts = openLeadStageCounts(crm?.stageCounts ?? {});
  const recent = activity.filter((item) => Number.isFinite(Date.parse(item.createdAt))).slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);

  return <div className="space-y-4">
    <section id="focus" aria-labelledby="command-center-actions-heading" className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card className="min-w-0 overflow-hidden"><CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><div><div className="mb-1 flex items-center gap-2"><Target className="size-4 text-primary" /><h2 id="command-center-actions-heading" className="text-sm font-semibold">Today’s actions</h2></div><p className="text-xs text-muted-foreground">Sorted by due date, stalled work, and priority · Denver time</p></div><Badge className="shrink-0 border-primary/20 bg-primary/10 text-primary">{ready ? actions.length : "…"} shown</Badge></div>
        {!ready ? <div className="space-y-2" aria-label="Loading workspace actions"><div className="h-11 animate-pulse rounded-lg bg-secondary/60" /><div className="h-11 animate-pulse rounded-lg bg-secondary/60" /></div>
          : actions.length ? <div className="divide-y divide-border/60">
            {actions.map((action) => <article key={`${action.kind}:${action.id}`} className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5"><span className="mt-0.5 shrink-0 text-muted-foreground">{action.priority <= 1 ? <CircleAlert className="size-4 text-amber-500" /> : action.kind === "project" ? <BriefcaseBusiness className="size-4 text-primary" /> : <ListChecks className="size-4" />}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{action.title}</div><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{action.detail}</p></div></div>
              <div className="flex flex-wrap items-center gap-2 pl-6 sm:shrink-0 sm:pl-0">
                {action.kind === "follow-up" && <><Link className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-accent" href={action.href}>Open lead <ArrowUpRight className="size-3.5" /></Link><CompleteLeadFollowUp leadId={action.id} /><RescheduleLeadFollowUp leadId={action.id} /></>}
                {action.kind === "stalled-lead" && <Link className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-accent" href={action.href}>Open lead <ArrowUpRight className="size-3.5" /></Link>}
                {action.kind === "project" && <Link className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-accent" href={action.href}>Open project <ArrowUpRight className="size-3.5" /></Link>}
                {action.kind === "task" && <><Button size="sm" variant="outline" onClick={() => onCompleteTask(action.id)}><Check className="size-3.5" />Complete</Button><Button size="sm" variant="ghost" onClick={() => onOpenTask(action.task)}>Open task</Button></>}
                {action.kind === "google-task" && <><Badge className="border-border bg-secondary text-muted-foreground">Google</Badge><Button size="sm" variant="outline" onClick={() => onCompleteGoogleTask(action.task)}><Check className="size-3.5" />Complete</Button></>}
              </div>
            </article>)}
          </div> : <div className="grid min-h-28 place-items-center text-center"><div><Check className="mx-auto mb-2 size-5 text-emerald-500" /><p className="text-sm font-medium">You’re clear for now</p><p className="mt-1 text-xs text-muted-foreground">No overdue follow-ups, stalled work, or open tasks.</p></div></div>}
        {ready && !crm && crmUnavailable && <p role="status" className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-600">CRM actions are unavailable. Workspace tasks and projects are still shown.</p>}
        {ready && !tasks.length && !googleTasks.length && <Button className="mt-3" size="sm" variant="outline" onClick={onCreateTask}><Plus className="size-3.5" />Create a task</Button>}
      </CardContent></Card>

      <Card className="min-w-0 overflow-hidden"><CardContent className="p-4 sm:p-5">
        <div className="mb-4"><div className="mb-1 flex items-center gap-2"><BriefcaseBusiness className="size-4 text-primary" /><h2 className="text-sm font-semibold">Pipeline</h2></div><p className="text-xs text-muted-foreground">Open website inquiries by stage</p></div>
        {crmUnavailable ? <div role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600">Pipeline data is unavailable right now.</div> : <>
          <div className="grid grid-cols-2 gap-2">{stageCounts.map(({ stage, count }) => <Link key={stage} href={`/dashboard/leads?status=${stage}`} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/50 px-3 py-2.5 text-xs hover:bg-accent"><span className="capitalize text-muted-foreground">{stage}</span><span className="font-mono font-semibold text-foreground">{count}</span></Link>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Link href="/dashboard/leads?status=proposal" className="rounded-lg bg-primary/5 p-3 hover:bg-primary/10"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Pending proposals</div><div className="mt-1 text-xl font-semibold">{crm?.stageCounts.proposal ?? 0}</div></Link><div className="rounded-lg bg-background/60 p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Potential revenue</div><div className="mt-1 text-sm font-medium">Not tracked</div></div></div>
          {!crm?.dueFollowUps.length && !Object.values(crm?.stageCounts ?? {}).some(Boolean) ? <p className="mt-3 text-xs text-muted-foreground">No open inquiries in the pipeline.</p> : null}
        </>}
        <div className="mt-4 border-t border-border/70 pt-3"><div className="mb-2 flex items-center gap-2"><Activity className="size-3.5 text-muted-foreground" /><h3 className="text-xs font-semibold">Recent activity</h3></div>{!ready ? <p className="text-xs text-muted-foreground">Loading workspace history…</p> : recent.length ? <div className="space-y-1.5">{recent.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 text-xs"><span className="size-1.5 shrink-0 rounded-full bg-primary/70" /><span className="min-w-0 flex-1 truncate">{item.message}</span><time className="shrink-0 text-[10px] text-muted-foreground" dateTime={item.createdAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" }).format(new Date(item.createdAt))}</time></div>)}</div> : <p className="text-xs text-muted-foreground">No saved activity yet.</p>}</div>
      </CardContent></Card>
    </section>
  </div>;
}
