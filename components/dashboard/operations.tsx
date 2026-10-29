"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Activity, AlertTriangle, CircleCheck, RefreshCw, ShieldAlert } from "lucide-react";
import type { OperationsCheck, OperationsOverview } from "@/lib/operations-observability";
import type { AutomationHubHealth } from "@/lib/automation-hub-health";
import { OperationsReadiness } from "@/components/dashboard/operations-readiness";
import { AutomationHubRecords } from "@/components/dashboard/automation-hub-records";

const panel = "rounded-xl border border-border bg-card p-5";
const statusText: Record<OperationsCheck["status"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  not_configured: "Not configured",
  not_verified: "Not verified",
  unknown: "Unknown",
};
function checkStyle(status: OperationsCheck["status"]) {
  if (status === "healthy") return "border-emerald-500/25 bg-emerald-500/5";
  if (status === "degraded" || status === "not_configured") return "border-amber-500/30 bg-amber-500/5";
  return "border-border bg-background/35";
}

const hubStateLabel: Record<AutomationHubHealth["state"], string> = {
  responding: "Hub API responding",
  degraded: "Hub health check failed",
  unavailable: "Hub unavailable",
};

function AutomationHubPanel({ overview, writeEnabled }: { overview: AutomationHubHealth; writeEnabled: boolean }) {
  return <section className={`${panel} mt-6`} aria-labelledby="automation-hub-status">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs uppercase tracking-[0.16em] text-primary">Automation Hub · separate service</div><h2 id="automation-hub-status" className="mt-1 text-lg font-semibold">Voice capture controls</h2></div>
      <span className="rounded-full border border-border px-3 py-1 text-xs">{hubStateLabel[overview.state]}</span>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">Voice capture ingestion, classification, Google Tasks, CRM and audit records stay in the Hub. This page sends reviewed commands through the Hub&apos;s independent server authentication and does not require opening its owner interface. The status badge checks only the existing static health endpoint; it does not verify capture ingestion, Tasker delivery, or playback. Checked {new Date(overview.checkedAt).toLocaleString()}.</p>
    <p className="mt-3 text-xs text-muted-foreground">{writeEnabled ? "Hub write integration is configured for server-side commands." : "Hub write integration is not configured; capture controls remain disabled."} Keep the Pixel Tasker local capture fallback intact. No capture is submitted automatically.</p>
  </section>;
}

export function OperationsWorkspace({ automationHub, writeEnabled = false, shoppingEnabled = false }: { automationHub?: AutomationHubHealth; writeEnabled?: boolean; shoppingEnabled?: boolean }) {
  const router = useRouter();
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    fetch("/api/operations", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Operations status unavailable");
        if (generation.current === current) {
          setOverview(data);
          setLoading(false);
          setError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted && generation.current === current) {
          setOverview(null);
          setError(cause instanceof Error ? cause.message : "Operations status unavailable");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [refresh]);

  function reload() {
    setOverview(null);
    setError("");
    setLoading(true);
    setRefresh((value) => value + 1);
    if (automationHub) router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Command Center</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary"><Activity className="size-4" />{automationHub ? "Automations · integration health" : "CC-014 · Operations"}</div>
          <h1 className="mt-2 text-3xl font-semibold">{automationHub ? "Automations" : "Operations"}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{automationHub ? "Review voice-capture entry points, Hub route availability, and website routine monitoring in one owner-only view. Checks run when you open or refresh the page." : "Current service checks, detected issues and recovery evidence. This page is read-only and checks dependencies only when you open or refresh it."}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40" onClick={reload} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh checks
        </button>
      </div>

      {automationHub ? <AutomationHubPanel overview={automationHub} writeEnabled={writeEnabled} /> : null}
      {automationHub ? <AutomationHubRecords writeEnabled={writeEnabled} shoppingEnabled={shoppingEnabled} /> : null}

      {loading && <p role="status" className="mt-6">Checking current service health…</p>}
      {error && <p role="alert" className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm">{error}</p>}
      {overview && <>
        <section className={`${panel} mt-6`} aria-labelledby="operations-status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Activity className="size-5" /></span><div><h2 id="operations-status" className="text-lg font-semibold">System status: {overview.status === "needs_review" ? "Needs review" : overview.status}</h2><p className="text-xs text-muted-foreground">Checked {new Date(overview.checkedAt).toLocaleString()}</p></div></div>
            <span className="rounded-full border border-border px-3 py-1 text-xs">Read only · no live alert delivery</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">These checks are point-in-time observations. They do not independently page anyone when this page is closed.</p>
        </section>

        <section className="mt-7" aria-labelledby="active-incidents">
          <div className="mb-3 flex items-center gap-2"><AlertTriangle className="size-4 text-amber-400" /><h2 id="active-incidents" className="text-lg font-semibold">Current incidents</h2><span className="text-xs text-muted-foreground">{overview.incidents.length} detected</span></div>
          {overview.incidents.length ? <div className="space-y-3">{overview.incidents.map((incident) => <article key={incident.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4" role="alert"><div className="flex items-center gap-2"><ShieldAlert className="size-4 text-amber-400" /><h3 className="font-medium">{incident.title}</h3><span className="ml-auto text-xs uppercase text-amber-400">{incident.severity}</span></div><p className="mt-2 text-sm text-muted-foreground">Impact: {incident.impact}</p><p className="mt-2 text-sm">Next: {incident.ownerAction}</p></article>)}</div> : <div className={`${panel} text-sm text-muted-foreground`}><CircleCheck className="mr-2 inline size-4 text-emerald-400" />No current failures detected by the checks that ran.</div>}
        </section>

        <section className="mt-7" aria-labelledby="service-checks">
          <h2 id="service-checks" className="mb-3 text-lg font-semibold">Services and background processing</h2>
          <div className="grid gap-3 md:grid-cols-2">{overview.checks.map((check) => <article key={check.id} className={`rounded-xl border p-4 ${checkStyle(check.status)}`}><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{check.label}</h3><span className="shrink-0 text-xs">{statusText[check.status]}</span></div><p className="mt-2 text-sm text-muted-foreground">{check.summary}</p><p className="mt-3 text-xs"><span className="font-medium">Impact:</span> {check.impact}</p><p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Owner action:</span> {check.ownerAction}</p></article>)}</div>
          <div className={`${panel} mt-3`}><h3 className="font-medium">Declared scheduler intent</h3><p className="mt-1 text-sm text-muted-foreground">These expressions are checked into the repository. They do not confirm the deployed scheduler is active.</p><ul className="mt-3 space-y-2">{overview.cronSchedules.map((job) => <li key={job.id} className="grid gap-1 text-xs sm:grid-cols-[220px_1fr_160px]"><span>{job.id}</span><code className="break-all text-muted-foreground">{job.path}</code><code className="text-muted-foreground">{job.schedule}</code></li>)}</ul></div>
        </section>

        <OperationsReadiness overview={overview} />
        <p className="mt-5 text-xs text-muted-foreground">Incidents are derived from this refresh and are not retained as incident history. No email, push notification, restart, migration, restore, rollback or customer action is available from this page. The website briefing monitor and the Hub briefing/Tasker playback are separate systems; this view does not verify Tasker delivery, Bluetooth, LIFX, or TV routines.</p>
      </>}
    </main>
  );
}
