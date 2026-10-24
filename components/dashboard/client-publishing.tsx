"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { OwnerPublication, OwnerPublishingView } from "@/lib/owner-publishing-view";
import { toCustomerPortalView, type SafePublication, type ClientProjectProjection } from "@/lib/client-project-projection";
import { PortalOverview, PortalTimeline, PortalDeliverables, PortalActivity } from "@/components/customer-portal/customer-portal";

function ApprovedPreview({ projection }: { projection: ClientProjectProjection }) {
  const portal = toCustomerPortalView(projection);
  return <div className="mt-4 max-h-[48rem] overflow-auto rounded-lg bg-card" aria-label="Approved project output"><PortalOverview portal={portal} /><PortalTimeline milestones={portal.milestones} /><PortalDeliverables deliverables={portal.deliverables} /><PortalActivity activity={portal.activity} /></div>;
}

export function PublicationContent({ content }: { content: SafePublication }) {
  if (content.kind === "date") return <p>Target date: <time dateTime={content.targetDate}>{content.targetDate}</time></p>;
  if (content.kind === "update") return <div><p className="whitespace-pre-wrap break-words">{content.detail}</p><p className="mt-2 text-xs text-muted-foreground">Update date: <time dateTime={content.createdAt}>{content.createdAt}</time></p></div>;
  return <div><p className="font-medium">{content.title}</p><p className="mt-1 text-xs text-muted-foreground">Status: {content.status}{content.kind === "project" ? ` · Progress: ${content.progress}%` : ""}</p>
    {content.kind === "project" && content.summary ? <p className="mt-2 whitespace-pre-wrap break-words">{content.summary}</p> : null}
    {content.kind === "deliverable" && content.description ? <p className="mt-2 whitespace-pre-wrap break-words">{content.description}</p> : null}</div>;
}

type Mutation = { action: "prepare"; kind: string; sourceId: string; includeDescription: boolean; expectedRevision: number } | { action: "approve" | "withdraw"; publicationId: string; expectedRevision: number };
function Candidate({ candidate, record, disabled, act }: { candidate: NonNullable<OwnerPublishingView["selected"]>["candidates"][number]; record?: OwnerPublication; disabled: boolean; act: (value: Mutation) => void }) {
  const [description, setDescription] = useState(false);
  let content = candidate.content;
  if (!description && content.kind === "project") content = { ...content, summary: "" };
  if (!description && content.kind === "deliverable") { const { description: _, ...rest } = content; void _; content = rest; }
  return <li className="grid min-w-0 gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto]">
    <div className="min-w-0 text-sm"><p className="mb-2 break-all font-mono text-xs text-primary">{candidate.kind} · {candidate.sourceId}</p><p className="mb-2 text-xs text-muted-foreground">{record ? `${record.invalidated ? "Invalidated" : record.state} · Revision ${record.revision}` : "Private · not prepared"}</p><PublicationContent content={content} />
      {candidate.descriptionAvailable ? <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={description} disabled={disabled} onChange={e => setDescription(e.target.checked)} />Include source description in this draft</label> : null}
    </div>
    <div>{record?.state === "approved" ? <p className="mb-2 max-w-xs text-xs text-warning">Preparing again replaces the current approval with a private draft.</p> : null}<Button variant="secondary" disabled={disabled} onClick={() => act({ action: "prepare", kind: candidate.kind, sourceId: candidate.sourceId, includeDescription: description, expectedRevision: record?.revision ?? 0 })}>{record ? "Prepare fresh draft" : "Prepare draft"}</Button></div>
  </li>;
}
function ReviewRecord({ record, disabled, canPublish, act }: { record: OwnerPublication; disabled: boolean; canPublish: boolean; act: (value: Mutation) => void }) {
  const [reviewed, setReviewed] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  return <li className="min-w-0 py-5 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id={`publication-${record.id}`} className="break-all font-medium">{record.kind} · {record.sourceId}</h3><span className="rounded-md bg-secondary px-2 py-1 text-xs">{record.invalidated ? `${record.state} · Invalidated · fresh preparation required` : record.state} · Revision {record.revision}</span></div>
    <div className="mt-3 rounded-lg bg-secondary/40 p-4"><PublicationContent content={record.content} /></div>
    <p className="mt-2 break-words text-xs text-muted-foreground">{record.actor ? `Decision by ${record.actor} · ${record.decidedAt}` : "No current approval decision"}</p>
    {record.state === "draft" && !record.invalidated ? <div className="mt-4 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-describedby={`publication-${record.id}`} checked={reviewed} disabled={disabled || !canPublish} onChange={e => setReviewed(e.target.checked)} />I reviewed this exact draft revision</label><Button disabled={disabled || !canPublish || !reviewed} onClick={() => act({ action: "approve", publicationId: record.id, expectedRevision: record.revision })}>{record.kind === "project" ? "Publish project overview" : "Approve reviewed draft"}</Button></div> : null}
    {record.state !== "withdrawn" ? <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="ghost" disabled={disabled} onClick={() => setWithdraw(v => !v)}>{record.kind === "project" ? "Withdraw whole-project visibility" : "Withdraw record"}</Button>{withdraw ? <><p className="text-xs text-warning">{record.kind === "project" ? "This hides the entire customer projection." : "This hides only this record."}</p><Button variant="secondary" disabled={disabled} onClick={() => act({ action: "withdraw", publicationId: record.id, expectedRevision: record.revision })}>Confirm withdrawal</Button></> : null}</div> : null}
  </li>;
}

export function ClientPublishing() {
  const [projectId, setProjectId] = useState("");
  const [view, setView] = useState<OwnerPublishingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recordFilter, setRecordFilter] = useState("all");
  const [refresh, setRefresh] = useState(0);
  const mutationBusy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/owner-publishing${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Publishing is unavailable"); return body as OwnerPublishingView; })
      .then(data => { if (!controller.signal.aborted) { setView(data); setStale(false); } })
      .catch(reason => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Publishing is unavailable"); setStale(true); setSuccess(""); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, refresh]);
  async function act(value: Mutation) {
    if (mutationBusy.current || !projectId) return;
    mutationBusy.current = true; setPending(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/owner-publishing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...value, projectId }), cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Publishing is unavailable");
      setView(null); setLoading(true); setSuccess(value.action === "prepare" ? "Draft prepared. Review its exact content before approval." : value.action === "approve" ? "Reviewed revision approved." : "Publication withdrawn."); setRefresh(v => v+1);
    } catch (reason) { setStale(true); setError(reason instanceof Error ? reason.message : "Publishing is unavailable. Refresh before retrying."); }
    finally { mutationBusy.current = false; setPending(false); }
  }
  const selected = view?.selected;
  const disabled = pending || loading || stale;
  const visibleRecords = selected?.records.filter(r => recordFilter === "all" || (recordFilter === "invalidated" ? r.invalidated : r.state === recordFilter && (recordFilter !== "draft" || !r.invalidated))) ?? [];
  return <main className="dark min-h-screen min-w-0 bg-background px-4 py-6 text-foreground sm:px-8"><div className="mx-auto max-w-7xl">
    <header className="mb-7"><Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Command Center</Link><p className="mt-5 font-mono text-xs uppercase tracking-widest text-primary">Client visibility management</p><h1 className="mt-2 text-3xl font-semibold">Client Publishing</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Prepare and review customer-safe content from saved projects. Customer access remains disabled in production.</p></header>
    <div className="flex flex-wrap items-end gap-3"><label className="grid min-w-0 flex-1 gap-2 text-sm">Existing project<select className="h-10 w-full rounded-md border border-border bg-card px-3" value={projectId} disabled={pending || loading} onChange={e => { setView(null); setLoading(true); setError(""); setSuccess(""); setProjectId(e.target.value); }}><option value="">Select a persisted project</option>{view?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Button variant="secondary" disabled={pending || loading} onClick={() => { setView(null); setLoading(true); setError(""); setSuccess(""); setRefresh(v => v+1); }}>Refresh review queue</Button></div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">Save edits in the workspace first, then refresh here. Any saved workspace change invalidates publication across all projects, including unrelated edits. Refresh before acting on content that may have changed.</p>
    {loading ? <p role="status" aria-busy="true" className="mt-6">Loading persisted publishing state…</p> : null}
    {pending ? <p role="status" className="mt-4">Applying publication decision…</p> : null}
    {error ? <p role="alert" aria-label="Publishing error" className="mt-5 rounded-lg bg-warning/10 p-4 text-sm text-warning">{error}{stale ? " Refresh the review queue before making another decision. The previous preview is hidden." : ""}</p> : null}
    {success ? <p role="status" className="mt-5 text-sm text-success">{success}</p> : null}
    {view && !view.projects.length ? <p className="mt-8 text-sm text-muted-foreground">No persisted projects yet. Create and save a project in the existing workspace.</p> : view && !selected ? <p className="mt-8 text-sm text-muted-foreground">Select a project to review publication candidates, drafts and history.</p> : null}
    {selected ? <>
      <section aria-labelledby="publication-summary" className="mt-8"><h2 id="publication-summary" className="text-xl font-semibold">Publication status</h2><p className="mt-2 text-sm">{stale ? "Refresh required · previous preview hidden" : selected.preview ? "Project overview approved · independently approved records are eligible for disclosure" : "No active approved project overview · entire customer projection is hidden"}</p><p className="mt-2 text-sm text-muted-foreground">{selected.records.filter(r => r.state==='draft' && !r.invalidated).length} drafts · {selected.records.filter(r => r.state==='approved' && !r.invalidated).length} approved · {selected.records.filter(r => r.invalidated).length} invalidated · {selected.records.filter(r => r.state==='withdrawn').length} withdrawn</p>{selected.reason ? <p className="mt-3 text-sm text-warning">{selected.reason}</p> : null}</section>
      <section aria-labelledby="publication-candidates" className="mt-9"><h2 id="publication-candidates" className="text-xl font-semibold">Source candidates</h2><p className="mt-2 text-xs text-muted-foreground">Preparation creates a private draft. Dates and descriptions are never included automatically in another record’s approval.</p><div className="mt-3 space-y-2">{selected.excludedCandidates.map(candidate => <p key={candidate.sourceId} className="break-words text-xs text-warning">Excluded update {candidate.sourceId}: {candidate.reason}</p>)}</div><ul className="mt-3 divide-y divide-border/60">{selected.candidates.map(candidate => <Candidate key={`${selected.id}-${candidate.kind}-${candidate.sourceId}`} candidate={candidate} record={selected.records.find(r => r.kind===candidate.kind && r.sourceId===candidate.sourceId)} disabled={disabled || !selected.canPublish} act={value => void act(value)} />)}</ul>{!selected.candidates.length ? <p className="mt-4 text-sm text-muted-foreground">No eligible source content remains.</p> : null}</section>
      <section aria-labelledby="publication-review" className="mt-9"><h2 id="publication-review" className="text-xl font-semibold">Draft review and publication records</h2><p className="mt-2 text-xs text-muted-foreground">Each card shows its exact stored snapshot. Invalidated and withdrawn material below is never included in the approved preview.</p><label className="mt-4 grid max-w-xs gap-2 text-sm">Publication records filter<select className="h-10 rounded-md border border-border bg-card px-3" value={recordFilter} onChange={e => setRecordFilter(e.target.value)}><option value="all">All records</option><option value="draft">Draft review queue</option><option value="approved">Approved</option><option value="withdrawn">Withdrawn</option><option value="invalidated">Invalidated</option></select></label><ul className="mt-3 divide-y divide-border/60">{visibleRecords.map(record => <ReviewRecord key={`${record.id}-${record.revision}`} record={record} disabled={disabled} canPublish={selected.canPublish} act={value => void act(value)} />)}</ul>{!selected.records.length ? <p className="mt-4 text-sm text-muted-foreground">No prepared records. Prepare a source candidate to start review.</p> : !visibleRecords.length ? <p role="status" className="mt-4 text-sm text-muted-foreground">No records match this view.</p> : null}</section>
      <section aria-labelledby="approved-preview" className="mt-9"><h2 id="approved-preview" className="text-xl font-semibold">Approved customer-view preview</h2><p className="mt-2 text-xs text-muted-foreground">Owner-only view of approved content. This does not activate customer access.</p>{selected.preview && !stale ? <><Link href={`/dashboard/client-publishing/preview?projectId=${encodeURIComponent(selected.id)}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary underline">Open full approved preview</Link><ApprovedPreview projection={selected.preview} /></> : <p className="mt-4 rounded-lg bg-secondary/40 p-5 text-sm">Preview unavailable: an active, current approved overview is required. Drafts and withdrawn records are hidden.</p>}</section>
      <section aria-labelledby="publication-history" className="mt-9"><h2 id="publication-history" className="text-xl font-semibold">Publication audit timeline</h2><p className="mt-2 text-xs text-muted-foreground">Most recent 200 decisions and source invalidations, newest first.</p><ol className="mt-4 space-y-3">{selected.audit.map(event => <li key={event.id} className="break-words rounded-lg bg-card p-4 text-xs"><p className="font-medium">{event.event} · revision {event.revision} · {event.from ?? "private"} → {event.to}</p><p className="mt-2 text-muted-foreground">{event.actor} ({event.role}) · <time dateTime={event.at}>{event.at}</time> · record {event.publicationId}</p></li>)}</ol>{!selected.audit.length ? <p className="mt-4 text-sm text-muted-foreground">No publication history yet.</p> : null}</section>
    </> : null}
  </div></main>;
}
