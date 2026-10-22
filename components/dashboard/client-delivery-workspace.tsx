"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  clientDeliverySchema,
  clientDecisionStatuses,
  deliverableStatuses,
  deliveryMilestoneStatuses,
  documentLinkKinds,
  emptyClientDelivery,
  paymentStatuses,
  type ClientDelivery,
} from "@/lib/client-delivery";
import type { CrmLinkageStatus, CrmOpportunityLink, WebsiteInquiryLink } from "@/lib/client-linkage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type LinkagePayload = {
  websiteInquiry: WebsiteInquiryLink | null;
  crmOpportunity: CrmOpportunityLink | null;
  crmStatus: CrmLinkageStatus;
};

const inputClass = "h-9 w-full rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary/50";
const textareaClass = "min-h-16 w-full resize-y rounded-md border border-border bg-background p-3 text-xs outline-none focus:border-primary/50";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function copyDelivery(delivery: ClientDelivery | undefined): ClientDelivery {
  return structuredClone(delivery ?? emptyClientDelivery);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function LinkagePanel({ projectId }: { projectId: string }) {
  const [linkageResult, setLinkageResult] = useState<{ projectId: string; value: LinkagePayload } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const linkage = linkageResult?.projectId === projectId ? linkageResult.value : null;
  const failed = failedProjectId === projectId;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/project-linkage?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Linkage unavailable");
        return response.json() as Promise<LinkagePayload>;
      })
      .then((value) => {
        if (!cancelled) setLinkageResult({ projectId, value });
      })
      .catch(() => {
        if (!cancelled) setFailedProjectId(projectId);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  return <Card className="bg-background/35"><CardContent className="p-4">
    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Source records · read only</div>
    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Website and CRM records stay in their original systems. Nothing here edits or duplicates CRM data.</p>
    {failed ? <p className="mt-3 text-xs text-amber-500">Source linkage is temporarily unavailable. Existing records are unchanged.</p> :
      !linkage ? <p className="mt-3 text-xs text-muted-foreground">Checking source linkage…</p> :
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-border/60 p-3">
          <div className="text-[10px] text-muted-foreground">Website inquiry</div>
          {linkage.websiteInquiry ? <><a className="mt-1 block text-sm font-medium text-primary" href={linkage.websiteInquiry.href}>{linkage.websiteInquiry.label}</a><Badge className="mt-2 border-border bg-secondary text-muted-foreground">{linkage.websiteInquiry.status}</Badge></> : <p className="mt-1 text-xs text-muted-foreground">No converted inquiry links to this project.</p>}
        </div>
        <div className="rounded-md border border-border/60 p-3">
          <div className="text-[10px] text-muted-foreground">CRM opportunity</div>
          {linkage.crmOpportunity ? <><a className="mt-1 block text-sm font-medium text-primary" href={linkage.crmOpportunity.href} target="_blank" rel="noreferrer">{linkage.crmOpportunity.title}</a><Badge className="mt-2 border-border bg-secondary text-muted-foreground">{linkage.crmOpportunity.stage}</Badge></> :
            <p className="mt-1 text-xs text-muted-foreground">{linkage.crmStatus === "ambiguous" ? "Multiple exact CRM matches; review CRM directly." : linkage.crmStatus === "unavailable" ? "CRM linkage is unavailable." : linkage.crmStatus === "not_linked" ? "Link a website inquiry before CRM matching." : "No exact CRM company match."}</p>}
        </div>
      </div>}
  </CardContent></Card>;
}

export function ClientDeliveryWorkspace({ projectId, delivery, onSave }: { projectId: string; delivery?: ClientDelivery; onSave: (delivery: ClientDelivery) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClientDelivery>(() => copyDelivery(delivery));
  const [error, setError] = useState("");

  const current = delivery ?? emptyClientDelivery;

  function beginEditing() {
    setDraft(copyDelivery(delivery));
    setError("");
    setEditing(true);
  }

  function cancel() {
    setDraft(copyDelivery(delivery));
    setError("");
    setEditing(false);
  }

  function save() {
    const changed = JSON.stringify(draft) !== JSON.stringify(current);
    const candidate = changed ? {
      ...draft,
      activity: [{
        id: createId("delivery-activity"),
        message: "Client delivery workspace updated",
        createdAt: new Date().toISOString(),
      }, ...draft.activity].slice(0, 500),
    } : draft;
    const result = clientDeliverySchema.safeParse(candidate);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Review the delivery fields before saving.");
      return;
    }
    onSave(result.data);
    setDraft(copyDelivery(result.data));
    setError("");
    setEditing(false);
  }

  return <div className="mt-6 space-y-4">
    <LinkagePanel projectId={projectId} />
    <Card className="bg-background/35"><CardContent className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><div className="font-mono text-[9px] uppercase tracking-wider text-primary">Client delivery</div><h3 className="mt-1 text-sm font-semibold">Scope, approvals, documents and payment state</h3><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Payment stores a status and external reference only. Do not enter card, bank, secret, or credential data.</p></div>
        {editing ? <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={cancel}><X />Cancel</Button><Button size="sm" onClick={save}><Save />Save delivery</Button></div> : <Button size="sm" variant="outline" onClick={beginEditing}><Pencil />Edit delivery</Button>}
      </div>
      {error && <p role="alert" className="mb-4 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">{error}</p>}

      {!editing ? <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border/60 p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold">Scoped deliverables</h4><Badge className="border-border bg-secondary text-muted-foreground">{current.deliverables.length}</Badge></div>{current.deliverables.length ? <div className="mt-3 space-y-2">{current.deliverables.slice(0, 6).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 text-xs"><div><div className="font-medium">{item.title}</div>{item.description && <p className="mt-1 text-muted-foreground">{item.description}</p>}</div><span className="shrink-0 text-[10px] text-muted-foreground">{statusLabel(item.status)}</span></div>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No delivery scope recorded.</p>}</section>
        <section className="rounded-lg border border-border/60 p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold">Milestones</h4><Badge className="border-border bg-secondary text-muted-foreground">{current.milestones.length}</Badge></div>{current.milestones.length ? <div className="mt-3 space-y-2">{current.milestones.slice(0, 6).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 text-xs"><div><div className="font-medium">{item.title}</div><p className="mt-1 text-muted-foreground">{item.targetDate || "No target date"}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">{statusLabel(item.status)}</span></div>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No milestones recorded.</p>}</section>
        <section className="rounded-lg border border-border/60 p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold">Client decisions</h4><Badge className="border-border bg-secondary text-muted-foreground">{current.decisions.length}</Badge></div>{current.decisions.length ? <div className="mt-3 space-y-2">{current.decisions.slice(0, 6).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 text-xs"><div><div className="font-medium">{item.title}</div>{item.notes && <p className="mt-1 text-muted-foreground">{item.notes}</p>}</div><span className="shrink-0 text-[10px] text-muted-foreground">{statusLabel(item.status)}</span></div>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No client decisions recorded.</p>}</section>
        <section className="rounded-lg border border-border/60 p-4"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold">External documents</h4><Badge className="border-border bg-secondary text-muted-foreground">{current.links.length}</Badge></div>{current.links.length ? <div className="mt-3 space-y-2">{current.links.slice(0, 6).map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-primary"><Link2 className="size-3.5" />{item.title}<span className="ml-auto text-[10px] text-muted-foreground">{item.kind}</span></a>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No external documents linked.</p>}</section>
        <section className="rounded-lg border border-border/60 p-4"><h4 className="text-xs font-semibold">Payment record</h4>{current.payment ? <div className="mt-3"><Badge className="border-border bg-secondary text-muted-foreground">{statusLabel(current.payment.status)}</Badge>{current.payment.reference && <p className="mt-2 text-xs">Reference: {current.payment.reference}</p>}<p className="mt-1 text-[10px] text-muted-foreground">Updated {new Date(current.payment.updatedAt).toLocaleString()}</p></div> : <p className="mt-3 text-xs text-muted-foreground">No payment status recorded.</p>}</section>
        <section className="rounded-lg border border-border/60 p-4"><h4 className="text-xs font-semibold">Delivery activity</h4>{current.activity.length ? <div className="mt-3 space-y-2">{current.activity.slice(0, 5).map((item) => <div key={item.id} className="text-xs"><div>{item.message}</div><div className="mt-1 text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div></div>)}</div> : <p className="mt-3 text-xs text-muted-foreground">No delivery updates recorded.</p>}</section>
      </div> : <div className="space-y-5">
        <section><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold">Scoped deliverables</h4><Button size="sm" variant="ghost" onClick={() => setDraft((value) => ({ ...value, deliverables: [...value.deliverables, { id: createId("deliverable"), title: "", status: "planned" }] }))}><Plus />Add</Button></div><div className="space-y-2">{draft.deliverables.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_150px_auto]"><input aria-label="Deliverable title" value={item.title} onChange={(event) => setDraft((value) => ({ ...value, deliverables: value.deliverables.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry) }))} className={inputClass} placeholder="Deliverable title" /><select aria-label="Deliverable status" value={item.status} onChange={(event) => setDraft((value) => ({ ...value, deliverables: value.deliverables.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value as typeof entry.status } : entry) }))} className={inputClass}>{deliverableStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><Button size="icon" variant="ghost" aria-label="Remove deliverable" onClick={() => setDraft((value) => ({ ...value, deliverables: value.deliverables.filter((entry) => entry.id !== item.id) }))}><Trash2 /></Button><textarea aria-label="Deliverable description" value={item.description ?? ""} onChange={(event) => setDraft((value) => ({ ...value, deliverables: value.deliverables.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value || undefined } : entry) }))} className={`${textareaClass} sm:col-span-3`} placeholder="Description or acceptance boundary" /></div>)}</div></section>

        <section><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold">Milestones</h4><Button size="sm" variant="ghost" onClick={() => setDraft((value) => ({ ...value, milestones: [...value.milestones, { id: createId("milestone"), title: "", status: "planned" }] }))}><Plus />Add</Button></div><div className="space-y-2">{draft.milestones.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_150px_150px_auto]"><input aria-label="Milestone title" value={item.title} onChange={(event) => setDraft((value) => ({ ...value, milestones: value.milestones.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry) }))} className={inputClass} placeholder="Milestone title" /><input aria-label="Milestone target date" type="date" value={item.targetDate ?? ""} onChange={(event) => setDraft((value) => ({ ...value, milestones: value.milestones.map((entry) => entry.id === item.id ? { ...entry, targetDate: event.target.value || undefined } : entry) }))} className={inputClass} /><select aria-label="Milestone status" value={item.status} onChange={(event) => setDraft((value) => ({ ...value, milestones: value.milestones.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value as typeof entry.status } : entry) }))} className={inputClass}>{deliveryMilestoneStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><Button size="icon" variant="ghost" aria-label="Remove milestone" onClick={() => setDraft((value) => ({ ...value, milestones: value.milestones.filter((entry) => entry.id !== item.id) }))}><Trash2 /></Button><textarea aria-label="Milestone acceptance criteria" value={item.acceptanceCriteria ?? ""} onChange={(event) => setDraft((value) => ({ ...value, milestones: value.milestones.map((entry) => entry.id === item.id ? { ...entry, acceptanceCriteria: event.target.value || undefined } : entry) }))} className={`${textareaClass} sm:col-span-4`} placeholder="Acceptance criteria" /></div>)}</div></section>

        <section><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold">Client decisions</h4><Button size="sm" variant="ghost" onClick={() => setDraft((value) => ({ ...value, decisions: [...value.decisions, { id: createId("decision"), title: "", status: "pending" }] }))}><Plus />Add</Button></div><div className="space-y-2">{draft.decisions.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_150px_auto]"><input aria-label="Decision title" value={item.title} onChange={(event) => setDraft((value) => ({ ...value, decisions: value.decisions.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry) }))} className={inputClass} placeholder="Decision requested" /><select aria-label="Decision status" value={item.status} onChange={(event) => { const status = event.target.value as typeof item.status; setDraft((value) => ({ ...value, decisions: value.decisions.map((entry) => entry.id === item.id ? { ...entry, status, decidedAt: status === "pending" ? undefined : new Date().toISOString() } : entry) })); }} className={inputClass}>{clientDecisionStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><Button size="icon" variant="ghost" aria-label="Remove decision" onClick={() => setDraft((value) => ({ ...value, decisions: value.decisions.filter((entry) => entry.id !== item.id) }))}><Trash2 /></Button><textarea aria-label="Decision notes" value={item.notes ?? ""} onChange={(event) => setDraft((value) => ({ ...value, decisions: value.decisions.map((entry) => entry.id === item.id ? { ...entry, notes: event.target.value || undefined } : entry) }))} className={`${textareaClass} sm:col-span-3`} placeholder="Client response or context" /></div>)}</div></section>

        <section><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold">External document links</h4><Button size="sm" variant="ghost" onClick={() => setDraft((value) => ({ ...value, links: [...value.links, { id: createId("link"), title: "", kind: "document", url: "" }] }))}><Plus />Add</Button></div><div className="space-y-2">{draft.links.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_150px_1.4fr_auto]"><input aria-label="Document title" value={item.title} onChange={(event) => setDraft((value) => ({ ...value, links: value.links.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry) }))} className={inputClass} placeholder="Document title" /><select aria-label="Document kind" value={item.kind} onChange={(event) => setDraft((value) => ({ ...value, links: value.links.map((entry) => entry.id === item.id ? { ...entry, kind: event.target.value as typeof entry.kind } : entry) }))} className={inputClass}>{documentLinkKinds.map((kind) => <option key={kind}>{kind}</option>)}</select><input aria-label="Document HTTPS URL" type="url" value={item.url} onChange={(event) => setDraft((value) => ({ ...value, links: value.links.map((entry) => entry.id === item.id ? { ...entry, url: event.target.value } : entry) }))} className={inputClass} placeholder="https://…" /><Button size="icon" variant="ghost" aria-label="Remove document link" onClick={() => setDraft((value) => ({ ...value, links: value.links.filter((entry) => entry.id !== item.id) }))}><Trash2 /></Button></div>)}</div></section>

        <section className="rounded-lg border border-border/60 p-3"><h4 className="mb-2 text-xs font-semibold">Payment status and external reference</h4><div className="grid gap-2 sm:grid-cols-2"><select aria-label="Payment status" value={draft.payment?.status ?? ""} onChange={(event) => { const status = event.target.value; setDraft((value) => ({ ...value, payment: status ? { status: status as NonNullable<ClientDelivery["payment"]>["status"], reference: value.payment?.reference, updatedAt: new Date().toISOString() } : undefined })); }} className={inputClass}><option value="">No status recorded</option>{paymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><input aria-label="Payment reference" value={draft.payment?.reference ?? ""} disabled={!draft.payment} onChange={(event) => setDraft((value) => ({ ...value, payment: value.payment ? { ...value.payment, reference: event.target.value || undefined, updatedAt: new Date().toISOString() } : undefined }))} className={inputClass} placeholder="Invoice or processor reference only" /></div></section>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancel}><X />Cancel</Button><Button onClick={save}><CheckCircle2 />Save delivery</Button></div>
      </div>}
    </CardContent></Card>
  </div>;
}
