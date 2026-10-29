"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AutomationHubCommandInput, AutomationHubCommandResult } from "@/lib/automation-hub-actions";
import type { AutomationHubSnapshot } from "@/lib/automation-hub-data";
import { DialogBoundary } from "@/components/ui/dialog-boundary";

type Action = AutomationHubCommandInput["action"];
type Capture = AutomationHubSnapshot["captures"]["items"][number];
type PendingAction = { action: Action; capture: Capture; targetKind?: string };
type StoredResult = { text: string; retrySafe: boolean; checkable: boolean; blocksNewAction: boolean; request: AutomationHubCommandInput; capture: Capture; commandId?: string };
const storageKey = "yorkstead-automation-capture-commands-v1";
const kinds = ["task", "follow_up", "calendar_request", "lead", "development_issue", "idea", "note"] as const;
const labels: Record<Action, string> = { approve_task: "Approve task", reject: "Reject", dismiss: "Dismiss", reclassify: "Reclassify", stage_lead: "Stage for Hub CRM review" };
const destinations: Record<Action, string> = { approve_task: "Google Tasks through Automation Hub", reject: "Automation Hub capture inbox", dismiss: "Automation Hub capture inbox", reclassify: "Automation Hub capture inbox", stage_lead: "Automation Hub CRM review queue" };

function readable(value: string) { return value.replaceAll("_", " "); }
function actionRequest(action: Action, capture: PendingAction["capture"], targetKind?: string): AutomationHubCommandInput {
  const base = { contractVersion: 1 as const, captureId: capture.id, idempotencyKey: crypto.randomUUID(), expectedStatus: capture.status as "pending" | "needs_review", expectedKind: capture.classification.kind as typeof kinds[number] };
  if (action === "reclassify") {
    if (!targetKind || !kinds.includes(targetKind as typeof kinds[number])) throw new Error("A displayed reclassification target is required");
    return { ...base, action, targetKind: targetKind as typeof kinds[number] };
  }
  return { ...base, action };
}

export function AutomationCaptureActions({ data, onRefresh, enabled }: { data: AutomationHubSnapshot; onRefresh: () => void; enabled: boolean }) {
  const [selected, setSelected] = useState<PendingAction | null>(null);
  const [busyId, setBusyId] = useState("");
  const [results, setResults] = useState<Record<string, StoredResult>>({});
  const resultsRef = useRef<Record<string, StoredResult>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const restored = JSON.parse(stored) as Record<string, StoredResult>;
        queueMicrotask(() => { resultsRef.current = restored; setResults(restored); });
      }
    } catch { /* Keep controls usable if session storage is unavailable. */ }
  }, []);

  function remember(captureId: string, result: StoredResult) {
    const next = { ...resultsRef.current, [captureId]: result };
    resultsRef.current = next;
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* In-memory recovery remains available. */ }
    setResults(next);
  }

  const audit = useMemo(() => data.captureActions?.state === "available" ? data.captureActions.items : [], [data.captureActions]);
  async function send(request: AutomationHubCommandInput, captureId: string) {
    const capture = results[captureId]?.capture || data.captures.items.find((item) => item.id === captureId);
    if (!capture) { setError("The capture is no longer available. Refresh the Hub record before taking another action."); return; }
    remember(captureId, { text: "Sending the confirmed command to Automation Hub…", retrySafe: false, checkable: true, blocksNewAction: true, request, capture, commandId: resultsRef.current[captureId]?.commandId });
    setBusyId(captureId); setError("");
    try {
      const response = await fetch("/api/dashboard/automation-hub/actions", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
      const result = await response.json() as AutomationHubCommandResult;
      if (!response.ok && !result.resultCode && !result.error) throw new Error("unavailable");
      const retrySafe = result.retrySafe === true;
      const uncertain = result.status === "processing" || result.status === "ambiguous" || result.status === "needs_review" || (!result.error && !result.resultCode);
      const outcome = result.error === "integration_unconfigured" ? "Hub write credential is not configured. Controls are unavailable." : result.error ? "The command could not be completed. Refresh the Hub record and audit history before taking another action." : result.status === "processing" ? "The command is still processing. Refresh its status before retrying." : result.resultCode === "stale_capture" || result.resultCode === "capture_not_pending" ? "This capture changed before the command ran. Review its current state and confirm again." : result.resultCode === "hub_crm_draft_required" ? "The lead remains in the Hub. Its CRM draft must be prepared in the Hub review workflow." : result.resultCode === "task_created" ? "Google Task created through Automation Hub." : result.resultCode === "task_already_created" ? "This capture already has a Google Task." : result.resultCode === "lead_staged_for_hub_review" ? "Lead remains staged in the Hub CRM review queue." : result.resultCode === "classification_updated" ? "Classification updated in Automation Hub." : result.resultCode === "capture_dismissed" ? "Capture dismissed in Automation Hub." : result.resultCode === "capture_rejected" ? "Capture rejected in Automation Hub." : result.resultCode === "provider_timeout" || result.status === "needs_review" ? "Google may have received the request. The Hub marked this capture for manual review; automatic retry is disabled." : `${labels[request.action]} result: ${readable(result.resultCode || result.status || "unknown")}.`;
      remember(captureId, { text: outcome, retrySafe, checkable: uncertain || retrySafe, blocksNewAction: uncertain || retrySafe, request, capture, commandId: result.commandId || resultsRef.current[captureId]?.commandId });
      setSelected(null);
      onRefresh();
    } catch {
      setSelected(null);
      remember(captureId, { text: "The command response was not received. Check the same Hub command key before starting another action; the Hub will not repeat an ambiguous provider write.", retrySafe: false, checkable: true, blocksNewAction: true, request, capture, commandId: resultsRef.current[captureId]?.commandId });
      setError("The command response was not received. Refresh the capture and audit history before retrying; the Hub may have accepted it.");
    } finally { setBusyId(""); }
  }

  function confirm(action: Action, capture: PendingAction["capture"]) {
    const firstAlternative = kinds.find((kind) => kind !== capture.classification.kind);
    setSelected({ action, capture, targetKind: action === "reclassify" ? firstAlternative : undefined });
  }

  const captures = [...data.captures.items];
  for (const result of Object.values(results)) if (!captures.some((item) => item.id === result.capture.id)) captures.unshift(result.capture);

  return <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="capture-inbox-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-primary">Owner reviewed · Hub is the source of truth</p><h2 id="capture-inbox-title" className="mt-1 text-lg font-semibold">Capture inbox</h2></div><span className="text-xs text-muted-foreground">Source: Automation Hub · {data.captures.items.length} recent</span></div>
    {!enabled ? <p role="status" className="mt-3 rounded-lg border border-amber-500/30 p-3 text-sm">Capture commands are disabled until the separate Hub write credential is configured. Read-only records remain available.</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p> : null}
    {data.captures.state === "unavailable" ? <p role="alert" className="mt-4 text-sm">Capture source unavailable. This is not an empty inbox.</p> : captures.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No captures in the current recent window.</p> : <ul className="mt-4 space-y-4">{captures.map((capture) => {
      const lastResult = results[capture.id];
      const actionable = enabled && !lastResult?.blocksNewAction && ["pending", "needs_review"].includes(capture.status);
      return <li key={capture.id} className="rounded-lg border border-border p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-medium">{capture.classification.title}</h3><p className="mt-1 text-sm text-muted-foreground">{capture.classification.summary || "No classification summary"}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize">{readable(capture.status)}</span></div>
        <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-muted-foreground">Classification</dt><dd className="mt-0.5">{readable(capture.classification.kind)}</dd></div><div><dt className="text-muted-foreground">Source</dt><dd className="mt-0.5">{data.captures.source}</dd></div><div><dt className="text-muted-foreground">Captured</dt><dd className="mt-0.5"><time dateTime={capture.createdAt}>{new Date(capture.createdAt).toLocaleString()}</time></dd></div><div><dt className="text-muted-foreground">Confirmation</dt><dd className="mt-0.5">{capture.classification.requiresConfirmation ? "Required" : "Not required"}</dd></div><div><dt className="text-muted-foreground">Due date</dt><dd className="mt-0.5">{capture.classification.dueDate || "Not set"}</dd></div><div className="sm:col-span-2 lg:col-span-3"><dt className="text-muted-foreground">Hub capture ID</dt><dd className="mt-0.5 break-all font-mono">{capture.id}</dd></div></dl>
        {actionable ? <div className="mt-4 flex flex-wrap gap-2">
          {capture.status === "pending" && ["task", "follow_up"].includes(capture.classification.kind) ? <button disabled={busyId === capture.id} type="button" onClick={() => confirm("approve_task", capture)} className="min-h-10 rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">Approve task</button> : null}
          {capture.classification.kind === "lead" ? <button disabled={busyId === capture.id} type="button" onClick={() => confirm("stage_lead", capture)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">Stage for Hub CRM review</button> : null}
          <button disabled={busyId === capture.id} type="button" onClick={() => confirm("reject", capture)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">Reject</button>
          <button disabled={busyId === capture.id} type="button" onClick={() => confirm("dismiss", capture)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">Dismiss</button>
          <button disabled={busyId === capture.id} type="button" onClick={() => confirm("reclassify", capture)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">Reclassify</button>
        </div> : null}
        {busyId === capture.id ? <p role="status" className="mt-3 text-sm">Sending confirmed command to Automation Hub…</p> : null}
        {lastResult ? <div className="mt-3 rounded-md bg-muted p-3 text-sm" role="status"><p>{lastResult.text}</p>{lastResult.commandId ? <p className="mt-1 break-all font-mono text-xs">Hub command: {lastResult.commandId}</p> : null}<p className="mt-1 break-all font-mono text-xs">Idempotency key: {lastResult.request.idempotencyKey}</p>{lastResult.retrySafe ? <button type="button" onClick={() => void send(lastResult.request, capture.id)} className="mt-2 min-h-10 rounded-lg border border-border px-3 text-sm">Retry safe command</button> : lastResult.checkable ? <button type="button" onClick={() => void send(lastResult.request, capture.id)} className="mt-2 min-h-10 rounded-lg border border-border px-3 text-sm">Check Hub command status</button> : null}</div> : null}
      </li>;
    })}</ul>}
    {data.captures.state === "available" && data.captures.truncated ? <p className="mt-3 text-xs text-muted-foreground">Recent capture list is capped; older records remain in the Hub source.</p> : null}

    <div className="mt-6 border-t border-border pt-4"><h3 className="font-semibold">Capture action history</h3><p className="mt-1 text-xs text-muted-foreground">Hub-owned audit events; transcript and provider data are excluded.</p>
      {data.captureActions?.state === "unavailable" ? <p role="status" className="mt-3 text-sm">Action audit is unavailable. The existing CC-021 read contract remains available.</p> : audit.length ? <ul className="mt-3 space-y-2">{audit.map((entry) => <li key={entry.id} className="rounded-md border border-border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{readable(entry.action)} · {readable(entry.event)}</strong><time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></div><p className="mt-1 text-xs text-muted-foreground">Destination: {entry.destination ? readable(entry.destination) : "Hub capture inbox"} · Result: {entry.resultCode ? readable(entry.resultCode) : "recorded"}{entry.resultingStatus ? ` · Status: ${readable(entry.resultingStatus)}` : ""}</p><p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">Capture: {entry.captureId} · Audit: {entry.id}</p></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No capture actions are recorded in the current window.</p>}
    </div>

    {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><DialogBoundary label={`Confirm ${labels[selected.action].toLowerCase()}`} onClose={() => { if (!busyId) setSelected(null); }}><section className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-xl">
      <h3 id="capture-confirm-title" className="text-lg font-semibold">Confirm {labels[selected.action].toLowerCase()}</h3><p className="mt-3 text-sm">Capture: <strong>{selected.capture.classification.title}</strong></p><p className="mt-2 text-sm">Destination: <strong>{destinations[selected.action]}</strong></p>
      <p className="mt-2 text-sm text-muted-foreground">{selected.action === "approve_task" ? "This creates one Google Task through the Hub. An uncertain provider result will be held for review and will not be retried automatically." : selected.action === "stage_lead" ? "This keeps the lead in the Hub for CRM review. It does not create a Website CRM record or approve a Hub company." : selected.action === "reclassify" ? "The Hub updates the capture classification and keeps confirmation required." : "This changes the capture's Hub review state."}</p>
      {selected.action === "reclassify" ? <label className="mt-4 block text-sm">New classification<select value={selected.targetKind} onChange={(event) => setSelected((old) => old ? { ...old, targetKind: event.target.value } : old)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3">{kinds.filter((kind) => kind !== selected.capture.classification.kind).map((kind) => <option key={kind} value={kind}>{readable(kind)}</option>)}</select></label> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busyId === selected.capture.id} onClick={() => setSelected(null)} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50">Cancel</button><button type="button" disabled={busyId === selected.capture.id || (selected.action === "reclassify" && !selected.targetKind)} onClick={() => void send(actionRequest(selected.action, selected.capture, selected.targetKind), selected.capture.id)} className="min-h-10 rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">{busyId === selected.capture.id ? "Sending…" : `Confirm ${labels[selected.action].toLowerCase()}`}</button></div>
    </section></DialogBoundary></div> : null}
  </section>;
}
