"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, ListChecks } from "lucide-react";
import type { CommandCenterCrmSnapshot } from "@/lib/contact-inquiries";
import type { Project } from "@/lib/projects";
import type { Task } from "@/lib/workspace";
import type { ProjectIntelligenceEntry } from "@/lib/project-intelligence-client";
import type { AutomationHubDataResult } from "@/lib/automation-hub-data";
import { dateKeyInTimeZone } from "@/lib/date-time";

type ResearchAction = { id: string; business_name: string; industry: string; next_action: string; next_action_at: string; research_status: string };
type ResearchSource = { items: ResearchAction[]; unavailable: boolean; truncated: boolean; readAt: string | null };
type Row = { key: string; title: string; source: string; context: string; status?: string; due?: string | null; href: string; stale?: string; external: boolean };
type SourceState = { name: string; text: string; detail?: string; href?: string; tone: "available" | "unavailable" | "partial" | "stale" | "loading" };

function safeGitHubUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

export function describeHubSectionStates(result: AutomationHubDataResult | null, error: boolean) {
  if (error) return { text: "Unavailable · read failed", tone: "unavailable" as const, detail: "Hub records did not load; this is not an empty queue." };
  if (!result) return { text: "Checking source…", tone: "loading" as const, detail: "Read-only Hub source; no task is changed here." };
  if (result.state === "not_configured") return { text: "Unavailable · not configured", tone: "unavailable" as const, detail: "The Hub read contract is not configured." };
  if (result.state === "degraded") return { text: "Unavailable · invalid source response", tone: "unavailable" as const, detail: "The Hub returned an unsupported response." };
  if (result.state === "unavailable") return { text: "Unavailable · source did not respond", tone: "unavailable" as const, detail: "The Hub could not be reached." };
  if (result.state !== "available") return { text: "Unavailable", tone: "unavailable" as const, detail: "The Hub source is unavailable." };
  const sections = [result.data.tasks, result.data.reviewQueue, result.data.captures];
  const unavailable = sections.filter((section) => section.state === "unavailable").length;
  const truncated = sections.some((section) => section.truncated);
  const describe = (section: { state: "available" | "unavailable"; items: unknown[] }) => section.state === "unavailable" ? "unavailable" : section.items.length ? `${section.items.length} available` : "available, empty";
  const text = unavailable === sections.length ? "Unavailable" : unavailable ? "Partial" : truncated ? "At query limit" : "Available";
  return {
    text,
    tone: unavailable === sections.length ? "unavailable" as const : unavailable || truncated ? "partial" as const : "available" as const,
    detail: `Google Tasks: ${describe(result.data.tasks)}; review: ${describe(result.data.reviewQueue)}; captures: ${describe(result.data.captures)}. Checked ${result.checkedAt}.${unavailable ? ` ${unavailable} section(s) unavailable.` : ""}${truncated ? " Some results may be incomplete." : ""}`,
  };
}

function dateLabel(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.valueOf()) ? null : dateKeyInTimeZone(timestamp, "America/Denver");
}

function interleaveBySource(rows: Row[], limit: number) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) groups.set(row.source, [...(groups.get(row.source) ?? []), row]);
  const queues = [...groups.values()];
  const selected: Row[] = [];
  while (selected.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (queue.length && selected.length < limit) selected.push(queue.shift()!);
    }
  }
  return selected;
}

function SourceStateList({ states }: { states: SourceState[] }) {
  return <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
    {states.map((source) => <li key={source.name} className="min-w-0 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2"><span className="text-xs font-medium">{source.name}</span><span className={`shrink-0 text-[10px] ${source.tone === "unavailable" ? "text-amber-600" : source.tone === "partial" || source.tone === "stale" ? "text-amber-500" : "text-muted-foreground"}`}>{source.text}</span></div>
      {source.detail ? <p className="mt-1 text-[10px] text-muted-foreground">{source.detail}</p> : null}
      {source.href ? <Link className="mt-1 inline-flex min-h-7 items-center gap-1 text-[10px] text-primary underline-offset-4 hover:underline focus-visible:underline" href={source.href}>Open source <ArrowUpRight className="size-3" /></Link> : null}
    </li>)}
  </ul>;
}

function AttentionRows({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p className="py-4 text-xs text-muted-foreground">No attention items were returned by available sources.</p>;
  return <ul className="divide-y divide-border/60" aria-label="Items requiring attention">
    {rows.slice(0, 12).map((row) => <li key={row.key} className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="break-words text-sm font-medium">{row.title}</span><span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{row.source}</span></div>
        <p className="mt-1 break-words text-xs text-muted-foreground">{row.context}{row.status ? ` · ${row.status}` : ""}{row.due ? ` · Due ${row.due}` : ""}{row.stale ? ` · ${row.stale}` : ""}</p>
      </div>
      <Link href={row.href} prefetch={false} className="inline-flex min-h-9 shrink-0 items-center gap-1 self-start rounded-md border border-border px-2.5 text-xs hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:self-auto" aria-label={`Open ${row.source} record: ${row.title}`}>
        {row.external ? "Open source" : "Open in Command Center"} <ArrowUpRight className="size-3.5" />
      </Link>
    </li>)}
  </ul>;
}

export function UnifiedAttentionView({ automationHub: hub, crm, crmUnavailable, crmReadAt, research, projects, tasks, intelligence, ready }: {
  automationHub: AutomationHubDataResult;
  crm: CommandCenterCrmSnapshot | null;
  crmUnavailable: boolean;
  crmReadAt: string | null;
  research: ResearchSource;
  projects: Project[];
  tasks: Task[];
  intelligence: Record<string, ProjectIntelligenceEntry>;
  ready: boolean;
}) {
  const hubError = false;

  const rows: Row[] = [];
  if (ready) {
    for (const task of tasks.filter((item) => !item.done)) rows.push({ key: `workspace:${task.id}`, title: task.title, source: "Command Center task", context: task.projectId ? projects.find((project) => project.id === task.projectId)?.name ?? "Project task" : "General task", status: "Open", due: dateLabel(task.dueDate), href: "#tasks", external: false });
    for (const project of projects.filter((item) => item.status === "Active" && item.note.trim() && item.note.trim() !== "Define the next useful action.")) rows.push({ key: `project:${project.id}`, title: project.note, source: "Command Center project", context: project.name, status: project.status, href: `/dashboard?project=${encodeURIComponent(project.id)}`, external: false });
  }
  if (crm) {
    for (const lead of crm.dueFollowUps) rows.push({ key: `crm-follow:${lead.id}`, title: lead.nextStep || `Follow up with ${lead.company || lead.name}`, source: "Website CRM", context: lead.company || lead.name, status: lead.status, due: dateLabel(lead.followUpAt), href: `/dashboard/leads?lead=${lead.id}`, external: true });
    for (const lead of crm.stalledOpportunities) rows.push({ key: `crm-stalled:${lead.id}`, title: lead.nextStep || `Review ${lead.company || lead.name}`, source: "Website CRM", context: lead.company || lead.name, status: lead.status, due: dateLabel(lead.followUpAt), href: `/dashboard/leads?lead=${lead.id}`, external: true });
    for (const proposal of crm.proposalNextActions) rows.push({ key: `crm-proposal:${proposal.leadId}:${proposal.state}`, title: proposal.nextAction, source: "Website CRM proposal", context: proposal.company || proposal.name, status: proposal.state, due: dateLabel(proposal.nextActionAt), href: `/dashboard/leads?lead=${proposal.leadId}`, external: true });
  }
  for (const item of research.items) rows.push({ key: `research:${item.id}`, title: item.next_action, source: "Opportunity Discovery", context: `${item.business_name} · ${item.industry}`, status: item.research_status, due: dateLabel(item.next_action_at), href: `/dashboard/opportunities?id=${encodeURIComponent(item.id)}`, external: true });

  const linkedProjects = projects.filter((project) => Boolean(project.repo));
  const githubEntries = linkedProjects.map((project) => ({ project, entry: intelligence[project.id] }));
  const githubUnavailableCount = githubEntries.filter(({ entry }) => entry?.status === "error" || Boolean(entry?.data && (!entry.data.github || !entry.data.github.available || entry.data.integrations.github.status !== "ok"))).length;
  const githubStaleCount = githubEntries.filter(({ entry }) => Boolean(entry?.data && entry.status === "stale")).length;
  const githubKnownCount = githubEntries.filter(({ entry }) => Boolean(entry?.data?.github?.available)).length;
  const githubLimitedCount = githubEntries.filter(({ entry }) => (entry?.data?.github?.issues?.length ?? 0) >= 5 || (entry?.data?.github?.pullRequests?.length ?? 0) >= 5).length;
  const githubItemCount = githubEntries.reduce((count, { entry }) => count + (entry?.data?.github?.issues?.length ?? 0) + (entry?.data?.github?.pullRequests?.length ?? 0), 0);
  const githubCheckedAt = githubEntries.map(({ entry }) => entry?.data?.fetchedAt).filter((value): value is string => Boolean(value)).sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  const hubSource = describeHubSectionStates(hub, hubError);
  const sourceStates: SourceState[] = [
    { name: "Command Center", text: ready ? "Available" : "Loading", detail: ready ? `${tasks.filter((item) => !item.done).length} open Workspace tasks${tasks.filter((item) => !item.done).length ? "" : " · available, empty"}` : "Workspace data is loading", href: "#tasks", tone: ready ? "available" : "loading" },
    { name: "Website CRM", text: crmUnavailable || !crm ? "Unavailable" : crm.dueFollowUps.length >= 8 || crm.stalledOpportunities.length >= 5 || crm.proposalNextActions.length >= 5 ? "At query limit" : "Available", detail: crmUnavailable ? "CRM summary did not load; this is not an empty queue." : crm ? `${crm.dueFollowUps.length + crm.stalledOpportunities.length + crm.proposalNextActions.length} action records reported${crm.dueFollowUps.length + crm.stalledOpportunities.length + crm.proposalNextActions.length ? "" : " · available, empty"}${crmReadAt ? `. Read at ${crmReadAt} (dashboard source read time).` : ". Read time unavailable."}${crm.dueFollowUps.length >= 8 || crm.stalledOpportunities.length >= 5 || crm.proposalNextActions.length >= 5 ? " Results may be incomplete." : ""}` : "No CRM data returned.", href: "/dashboard/leads", tone: crmUnavailable || !crm ? "unavailable" : crm.dueFollowUps.length >= 8 || crm.stalledOpportunities.length >= 5 || crm.proposalNextActions.length >= 5 ? "partial" : "available" },
    { name: "Opportunity Discovery", text: research.unavailable ? "Unavailable" : research.truncated ? "At query limit" : "Available", detail: research.unavailable ? "Research follow-ups did not load; this is not an empty queue." : `${research.items.length} research actions due today or overdue reported${research.items.length ? "" : " · available, empty"}${research.readAt ? `. Read at ${research.readAt} (dashboard source read time).` : ". Read time unavailable."}${research.truncated ? " The result may be incomplete." : ""}`, href: "/dashboard/opportunities", tone: research.unavailable ? "unavailable" : research.truncated ? "partial" : "available" },
    { name: "Automation Hub review and captures", ...hubSource, href: "https://cal.yorkstead.com/command" },
    { name: "Google Tasks", text: hub.state === "available" && hub.data.dashboardTasks && hub.data.dateContext ? hub.data.dashboardTasks.state === "unavailable" ? "Unavailable" : hub.data.dashboardTasks.truncated ? "Partial · query bound reached" : hub.data.dashboardTasks.items.length ? "Available" : "Available, empty" : "Unavailable · unsupported response", detail: hub.state === "available" && hub.data.dashboardTasks && hub.data.dateContext ? `${hub.data.dashboardTasks.items.length} due open tasks returned${hub.data.dashboardTasks.errorCode ? ` · ${hub.data.dashboardTasks.errorCode}` : ""}${hub.data.dashboardTasks.truncated ? "; provider scan was truncated" : ""}. Checked ${hub.data.dashboardTasks.checkedAt}.` : "This Hub v1 response does not include the Dashboard task projection; no empty queue is inferred.", href: "https://tasks.google.com/", tone: hub.state !== "available" || !hub.data.dashboardTasks || !hub.data.dateContext || hub.data.dashboardTasks.state === "unavailable" ? "unavailable" : hub.data.dashboardTasks.truncated ? "partial" : "available" },
    { name: "GitHub", text: !linkedProjects.length ? "Not configured" : githubUnavailableCount === linkedProjects.length ? "Unavailable" : githubStaleCount ? "Last known data" : githubLimitedCount ? "At query limit" : githubKnownCount ? "Available" : "Checking source", detail: !linkedProjects.length ? "No project repositories are linked." : `${githubKnownCount} of ${linkedProjects.length} repositories returned GitHub data${githubKnownCount === linkedProjects.length && githubUnavailableCount === 0 && githubItemCount === 0 ? " · available, empty" : ""}${githubStaleCount ? `; ${githubStaleCount} use last-known data` : ""}${githubLimitedCount ? `; ${githubLimitedCount} at the displayed issue/PR limit` : ""}${githubCheckedAt ? `; last checked ${githubCheckedAt}` : ""}.`, href: "#development", tone: !linkedProjects.length ? "available" : githubEntries.every(({ entry }) => !entry) ? "loading" : githubUnavailableCount === linkedProjects.length ? "unavailable" : githubUnavailableCount || githubLimitedCount ? "partial" : githubStaleCount ? "stale" : "available" },
    { name: "Google Calendar", text: hub.state === "available" && hub.data.calendar && hub.data.dateContext ? hub.data.calendar.state === "unavailable" ? "Unavailable" : hub.data.calendar.truncated ? "Partial · query bound reached" : hub.data.calendar.items.length ? "Available" : "Available, empty" : "Unavailable · unsupported response", detail: hub.state === "available" && hub.data.calendar && hub.data.dateContext ? `${hub.data.calendar.items.filter((event) => event.date === hub.data.dateContext?.today).length} today · ${hub.data.calendar.items.filter((event) => event.date === hub.data.dateContext?.tomorrow).length} tomorrow${hub.data.calendar.errorCode ? ` · ${hub.data.calendar.errorCode}` : ""}${hub.data.calendar.truncated ? "; provider scan was truncated" : ""}. Checked ${hub.data.calendar.checkedAt}.` : "This Hub v1 response does not include the Calendar projection; no empty agenda is inferred.", href: "#calendar", tone: hub.state !== "available" || !hub.data.calendar || !hub.data.dateContext || hub.data.calendar.state === "unavailable" ? "unavailable" : hub.data.calendar.truncated ? "partial" : "available" },
  ];

  for (const project of linkedProjects) {
    const entry = intelligence[project.id];
    const github = entry?.data?.github;
    if (!github?.available) continue;
    for (const issue of github.issues ?? []) {
      const href = safeGitHubUrl(issue.url);
      if (href) rows.push({ key: `github-issue:${project.id}:${issue.number}`, title: issue.title, source: "GitHub issue", context: project.name, status: "Open", due: null, href, external: true, stale: entry.status === "stale" ? `Last checked ${entry.data?.fetchedAt}` : undefined });
    }
    for (const pull of github.pullRequests ?? []) {
      const href = safeGitHubUrl(pull.url);
      if (href) rows.push({ key: `github-pr:${project.id}:${pull.number}`, title: pull.title, source: "GitHub pull request", context: project.name, status: pull.draft ? "Open · draft" : "Open", href, external: true, stale: entry.status === "stale" ? `Last checked ${entry.data?.fetchedAt}` : undefined });
    }
  }
  if (hub?.state === "available") {
    const sections = hub.data;
    // Dashboard rows come from the bounded optional projection; legacy v1 responses remain explicitly unsupported.
    for (const task of sections.dashboardTasks?.items ?? []) rows.push({ key: `google:${task.listId}:${task.id}`, title: task.title, source: "Google Tasks", context: "Personal action", status: task.status, due: dateLabel(task.dueAt), href: "https://tasks.google.com/", external: true });
    for (const item of sections.reviewQueue.items) rows.push({ key: `hub-review:${item.id}`, title: item.title, source: "Automation Hub review", context: item.summary || item.kind, status: item.status, due: null, href: "https://cal.yorkstead.com/command", external: true });
    for (const item of sections.captures.items.filter((capture) => capture.classification.requiresConfirmation)) rows.push({ key: `hub-capture:${item.id}`, title: item.classification.title, source: "Automation Hub capture", context: item.classification.summary || "Confirmation requested", status: item.status, due: dateLabel(item.classification.dueDate), href: "https://cal.yorkstead.com/command", external: true });
  }
  const hasUnavailable = sourceStates.some((source) => source.tone === "unavailable");
  const hasPartial = sourceStates.some((source) => source.tone === "partial");
  const shownRows = interleaveBySource(rows, 12);

  return <section className="mb-4 min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="unified-attention-heading">
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-1 flex items-center gap-2"><Eye className="size-4 text-primary" /><h2 id="unified-attention-heading" className="text-sm font-semibold">Unified attention</h2></div><p className="text-xs text-muted-foreground">Read-only view of source records. Open each item in its owning workflow.</p></div><span className="inline-flex items-center gap-1 self-start rounded border border-border px-2 py-1 text-[10px] text-muted-foreground"><ListChecks className="size-3" /> {shownRows.length}{rows.length > shownRows.length ? ` of at least ${rows.length}` : ""} shown</span></div>
    <SourceStateList states={sourceStates} />
    {hasUnavailable ? <p className="mt-3 text-xs text-amber-600" role="status">One or more sources are unavailable. Their records are not represented as empty queues.</p> : null}
    {hasPartial ? <p className="mt-2 text-xs text-amber-600" role="status">Some source results are bounded or truncated. Use the source link to review its complete queue.</p> : null}
    <div className="mt-4 border-t border-border/70 pt-4"><AttentionRows rows={shownRows} />{rows.length > shownRows.length ? <p className="mt-3 text-xs text-muted-foreground">Additional records are available from their source links.</p> : null}</div>
  </section>;
}

export { safeGitHubUrl };
