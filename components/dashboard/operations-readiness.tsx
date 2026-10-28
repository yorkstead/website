import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";
import type { OperationsCheck, OperationsOverview } from "@/lib/operations-observability";

const panel = "rounded-xl border border-border bg-card p-5";
const statusText: Record<OperationsCheck["status"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  not_configured: "Not configured",
  not_verified: "Not verified",
  unknown: "Unknown",
};
const recoveryStatusText: Record<OperationsOverview["recoveryControls"][number]["status"], string> = {
  verified: "Verified",
  stale: "Stale",
  not_verified: "Not verified",
  unknown: "Unknown",
};

function checkStyle(status: OperationsCheck["status"]) {
  if (status === "healthy") return "border-emerald-500/25 bg-emerald-500/5";
  if (status === "degraded" || status === "not_configured") return "border-amber-500/30 bg-amber-500/5";
  return "border-border bg-background/35";
}

export function OperationsReadiness({ overview }: { overview: OperationsOverview }) {
  return <>
    <section className="mt-7" aria-labelledby="production-readiness">
      <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 id="production-readiness" className="text-lg font-semibold">Production readiness evidence</h2></div>
      <div className={`${panel} space-y-4`}>
        <p className="text-sm text-muted-foreground">These checks show observed configuration facts, not a release approval. A working database connection does not identify its Neon project.</p>
        <div className="grid gap-3 sm:grid-cols-3">{overview.readinessChecks.map((check) => <article key={check.id} className={`rounded-lg border p-4 ${checkStyle(check.status)}`}><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{check.label}</h3><span className="shrink-0 text-xs">{statusText[check.status]}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{check.summary}</p><p className="mt-2 text-xs text-muted-foreground">Source: {check.source}</p><p className="mt-2 text-xs"><span className="font-medium">Impact:</span> {check.impact}</p><p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Owner action:</span> {check.ownerAction}</p></article>)}</div>
        <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Documented production provider</dt><dd className="mt-1">Neon</dd></div><div><dt className="text-xs text-muted-foreground">Organization ID</dt><dd className="mt-1 font-mono text-xs">{overview.deploymentContext.neonOrganizationId}</dd></div><div><dt className="text-xs text-muted-foreground">Project ID</dt><dd className="mt-1 font-mono text-xs">{overview.deploymentContext.neonProjectId}</dd></div></dl>
        <p className="text-xs text-amber-400">Target identity status: {statusText[overview.deploymentContext.neonIdentityStatus]}. These documented identifiers do not verify the connected database or deployed provider configuration.</p>
      </div>
    </section>

    <section className="mt-7" aria-labelledby="recovery-controls">
      <div className="mb-3 flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h2 id="recovery-controls" className="text-lg font-semibold">Recovery controls</h2></div>
      <div className={`${panel} space-y-4`}><p className="text-sm text-muted-foreground">No production recovery actions are available here. Backup availability and restore verification are independent controls; evidence for one never qualifies the other.</p>{overview.recoveryControls.map((control) => <div key={control.id} className="grid gap-1 border-t border-border pt-3 sm:grid-cols-[230px_130px_1fr]"><h3 className="text-sm font-medium">{control.label}</h3><span className="text-xs text-amber-400">{recoveryStatusText[control.status]}</span><div><p className="text-sm text-muted-foreground">Evidence needed: {control.evidenceNeeded}</p>{control.lastVerifiedAt && <p className="mt-1 text-xs text-muted-foreground">Evidence source: {control.evidenceSource}; observed {new Date(control.lastVerifiedAt).toLocaleString()}</p>}</div></div>)}<div className="border-t border-border pt-3"><h3 className="text-sm font-medium">Recovery sequence</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-muted-foreground"><li>Assign the incident owner and confirm escalation; preserve incident evidence.</li><li>Review independent provider evidence for an available recovery point and its retention window.</li><li>Restore to an isolated, non-production target and record scope, integrity checks and measured recovery time.</li><li>Compare application schema and critical read paths in isolation; obtain separate cutover authorization.</li><li>Use the reviewed release rollback trigger if validation fails; never overwrite the source as a rehearsal.</li><li>After any separately authorized recovery, verify service and tenant-scoped access, record results and retain the evidence.</li></ol></div><div className="border-t border-border pt-3 text-xs text-muted-foreground">Review related controls in <Link className="text-primary underline" href="/dashboard/portal-readiness">Portal Readiness</Link> and <Link className="text-primary underline" href="/dashboard/customer-communications">Customer Communications</Link>.</div></div>
    </section>
  </>;
}
