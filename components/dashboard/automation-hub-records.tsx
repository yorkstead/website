"use client";

import { useCallback, useEffect, useState } from "react";
import type { AutomationHubDataResult, AutomationHubSnapshot } from "@/lib/automation-hub-data";

const card = "rounded-xl border border-border bg-card p-4 sm:p-5";

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function RecordMeta({ source, id, timestamp }: { source: string; id: string; timestamp: string }) {
  return <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-[1fr_auto]">
    <span>Source: {source}</span>
    <time dateTime={timestamp}>{formatTimestamp(timestamp)}</time>
    <code className="break-all sm:col-span-2">ID: {id}</code>
  </div>;
}

function SectionFrame({ title, source, state, checkedAt, truncated, errorCode, count, children }: {
  title: string;
  source: string;
  state: "available" | "unavailable";
  checkedAt: string;
  truncated?: boolean;
  errorCode?: string | null;
  count?: number;
  children: React.ReactNode;
}) {
  return <section className={card} aria-label={title}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">Source: {source}</p></div>
      <span className="rounded-full border border-border px-2.5 py-1 text-xs">{state === "available" ? `${count ?? 0} records` : "Unavailable"}</span>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Checked <time dateTime={checkedAt}>{formatTimestamp(checkedAt)}</time></p>
    {state === "unavailable" ? <p role="alert" className="mt-3 text-sm text-amber-300">This source did not return data{errorCode ? ` (${errorCode})` : ""}. An unavailable source is not an empty queue.</p> : children}
    {state === "available" && truncated ? <p className="mt-3 text-xs text-muted-foreground">Showing the most recent bounded results; more records exist at the source.</p> : null}
  </section>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm text-muted-foreground">{children}</p>;
}

function HubSnapshotView({ data }: { data: AutomationHubSnapshot }) {
  return <div className="mt-5 grid gap-4 lg:grid-cols-2">
    <SectionFrame title="Recent voice captures" {...data.captures} count={data.captures.items.length}>
      {data.captures.items.length ? <ul className="mt-4 space-y-4">{data.captures.items.map((item) => <li key={item.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.classification.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{item.classification.kind}</span><span className="text-xs text-muted-foreground">{item.status}</span></div>
        {item.classification.summary ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.classification.summary}</p> : null}
        <p className="mt-2 text-xs">Due: {item.classification.dueDate || "Not set"} · Confirmation: {item.classification.requiresConfirmation ? "Required" : "Not required"}</p>
        <RecordMeta source={data.captures.source} id={item.id} timestamp={item.createdAt} />
      </li>)}</ul> : <Empty>No captures are available in this recent window.</Empty>}
    </SectionFrame>

    <SectionFrame title="Activity history" {...data.activity} count={data.activity.items.length}>
      {data.activity.items.length ? <ul className="mt-4 space-y-4">{data.activity.items.map((item) => <li key={item.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.automation}</h3><span className="text-xs">{item.level} · {item.outcome}</span></div>
        <p className="mt-1 text-sm text-muted-foreground">{item.stage}{item.durationMs === null ? "" : ` · ${item.durationMs} ms`}{item.errorCode ? ` · ${item.errorCode}` : ""}</p>
        <RecordMeta source={data.activity.source} id={item.id} timestamp={item.createdAt} />
      </li>)}</ul> : <Empty>No activity records were returned.</Empty>}
    </SectionFrame>

    <SectionFrame title="Integration health" source={data.integrationHealth.source} state={data.integrationHealth.state} checkedAt={data.integrationHealth.checkedAt} errorCode={data.integrationHealth.errorCode}>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Hub database</dt><dd>{data.integrationHealth.database}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Google Tasks read</dt><dd>{data.integrationHealth.googleTasks.replaceAll("_", " ")}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Google Tasks status reflects a read-only check by the Hub. This view does not check Calendar, Google writes, Tasker, playback, LIFX, or TV.</p>
    </SectionFrame>

    <SectionFrame title="Review queue" {...data.reviewQueue} count={data.reviewQueue.items.length}>
      {data.reviewQueue.items.length ? <ul className="mt-4 space-y-4">{data.reviewQueue.items.map((item) => <li key={item.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.title}</h3><span className="text-xs text-muted-foreground">{item.kind} · {item.status}</span></div>
        {item.summary ? <p className="mt-2 break-words text-sm text-muted-foreground">{item.summary}</p> : null}
        <RecordMeta source={data.reviewQueue.source} id={item.id} timestamp={item.createdAt} />
      </li>)}</ul> : <Empty>No captures currently need review.</Empty>}
    </SectionFrame>

    <SectionFrame title="Google Tasks" {...data.tasks} count={data.tasks.items.length}>
      {data.tasks.items.length ? <ul className="mt-4 space-y-4">{data.tasks.items.map((item) => <li key={`${item.listId}:${item.id}`} className="border-t border-border pt-3 first:border-0 first:pt-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.title}</h3><span className="text-xs text-muted-foreground">{item.status}</span></div>
        <p className="mt-2 text-sm text-muted-foreground">Due: {item.dueAt ? item.dueAt.slice(0, 10) : "Not set"}</p>
        <RecordMeta source={data.tasks.source} id={item.id} timestamp={item.updatedAt} />
        <p className="mt-1 break-all text-xs text-muted-foreground">List ID: {item.listId}</p>
      </li>)}</ul> : <Empty>No open Google Tasks were returned.</Empty>}
    </SectionFrame>
  </div>;
}

function unavailableMessage(state: Exclude<AutomationHubDataResult["state"], "available">) {
  if (state === "not_configured") return "The dedicated read-only Hub credential is not configured. Hub records remain available in the Hub owner interface.";
  if (state === "degraded") return "The Hub returned an unsupported or invalid data contract. Existing Hub records were not changed.";
  return "The Hub data service did not respond. Existing Hub records were not changed.";
}

export function AutomationHubRecords() {
  const [result, setResult] = useState<AutomationHubDataResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestData = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/dashboard/automation-hub", { cache: "no-store", signal });
    const body = await response.json() as AutomationHubDataResult;
    if (!response.ok || !body || typeof body.state !== "string") throw new Error("Automation Hub data unavailable");
    return body;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestData(controller.signal)
      .then(setResult)
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError("Automation Hub records could not be loaded. Retry the read-only request.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestData]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setResult(await requestData());
    } catch {
      setResult(null);
      setError("Automation Hub records could not be loaded. Retry the read-only request.");
    } finally {
      setLoading(false);
    }
  }

  return <section className={`${card} mt-6`} aria-labelledby="automation-hub-records">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs uppercase tracking-[0.16em] text-primary">Hub-owned records · read only</div><h2 id="automation-hub-records" className="mt-1 text-lg font-semibold">Automation Hub activity</h2></div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm hover:bg-accent disabled:opacity-50">{loading ? "Loading…" : "Refresh Hub records"}</button>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">Data is fetched from the Hub when this owner-only page opens or is refreshed. Records remain in their original system; this page does not submit or approve captures, edit tasks, or send messages.</p>
    {loading && !result ? <p role="status" className="mt-4 text-sm">Loading Hub records…</p> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p> : null}
    {result && result.state !== "available" ? <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm" role="status"><p>{unavailableMessage(result.state)}</p><p className="mt-2 text-xs text-muted-foreground">Checked <time dateTime={result.checkedAt}>{formatTimestamp(result.checkedAt)}</time></p></div> : null}
    {result?.state === "available" ? <HubSnapshotView data={result.data} /> : null}
  </section>;
}
