"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { entityClassLabels, systemEntityClasses } from "@/lib/system-registry";
import { analyzeRegistry, type RegistryAnalysisInput } from "@/lib/system-registry-analysis";

const panel = "rounded-xl border border-border bg-card p-4";
const issueLabel: Record<string, string> = {
  empty_inventory: "Empty inventory", snapshot_truncated: "Incomplete analysis", relationship_incomplete: "Incomplete relationship",
  missing_owner: "Missing responsible role", missing_recovery: "Missing recovery role", verification_incomplete: "Verification evidence gap",
  billing_unknown: "Billing evidence gap", dependency_coverage_unknown: "Dependency coverage not recorded", dependency_monitoring_gap: "Dependency monitoring gap",
  monitoring_gap: "Monitoring information gap", dependency_unverified: "Unverified dependency", dependency_cycle: "Recorded cycle", cycle_report_truncated: "Cycle report limit",
};
const href = (id: string | null) => id ? `/dashboard/systems/registry#${encodeURIComponent(id)}` : "/dashboard/systems/registry";

export function SystemsRegistryReadiness() {
  const [snapshot, setSnapshot] = useState<RegistryAnalysisInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/systems-registry/analysis", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Readiness summary is unavailable");
      if (active) { const value = body.analysis as ReturnType<typeof analyzeRegistry>; setSnapshot({ nodes: value.nodes, edges: value.edges, truncated: { entries: value.limits.entries, relationships: value.limits.relationships } }); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Readiness summary is unavailable"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const result = useMemo(() => snapshot ? analyzeRegistry(snapshot) : null, [snapshot]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof result extends null ? never : NonNullable<typeof result>["issues"]>();
    for (const issue of result?.issues ?? []) map.set(issue.code, [...(map.get(issue.code) ?? []), issue]);
    return [...map.entries()];
  }, [result]);

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
    <header><p className="text-xs uppercase tracking-[.18em] text-primary">Owner operations</p><h1 className="mt-2 text-3xl font-semibold">Activation readiness</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">A review summary of recorded evidence and responsibilities. This is not a health check or release approval; it does not probe providers or infer missing facts.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/40 p-4 text-sm">{error}</p>}
    {loading && <p role="status" className="mt-5 text-sm text-muted-foreground">Loading readiness summary…</p>}
    {!loading && !error && result && <>
      <section aria-label="Registry readiness summary" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className={panel}><p className="text-xs text-muted-foreground">Assessment</p><p className={`mt-2 text-xl font-semibold ${result.readiness.ready?"text-emerald-700":"text-destructive"}`}>{result.readiness.ready?"Evidence complete":"Blocked"}</p><p className="mt-1 text-xs text-muted-foreground">{result.readiness.criticalCount} critical blockers</p></article>
        <article className={panel}><p className="text-xs text-muted-foreground">Evidence</p><p className="mt-2 text-xl font-semibold">{result.nodes.filter((node)=>node.verificationState==="owner_reviewed"&&node.verificationStatus==="verified").length} / {result.nodes.length}</p><p className="mt-1 text-xs text-muted-foreground">owner-reviewed with current verification</p></article>
        <article className={panel}><p className="text-xs text-muted-foreground">Missing responsibilities</p><p className="mt-2 text-xl font-semibold">{result.nodes.filter((node)=>!node.responsibleRolePresent||!node.recoveryRolePresent).length}</p><p className="mt-1 text-xs text-muted-foreground">records missing owner or recovery role</p></article>
        <article className={panel}><p className="text-xs text-muted-foreground">Dependency cycles</p><p className="mt-2 text-xl font-semibold">{result.cycles.filter((cycle)=>cycle.relationshipIds.length>0).length}</p><p className="mt-1 text-xs text-muted-foreground">within recorded operational links</p></article>
      </section>
      <section aria-label="Inventory by classification" className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">{systemEntityClasses.map((entityClass)=><article className={`${panel} p-3`} key={entityClass}><p className="text-xs leading-5 text-muted-foreground">{entityClassLabels[entityClass]}</p><p className="mt-1 text-2xl font-semibold">{result.byClass[entityClass]}</p></article>)}</section>
      {result.limits.truncated&&<p role="alert" className="mt-5 rounded-xl border border-amber-500/50 bg-amber-500/5 p-4 text-sm">The inventory or relationship snapshot was truncated. Counts and readiness are incomplete.</p>}
      {grouped.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{grouped.map(([code,issues])=>{const severity=issues[0]?.severity??"informational";return <section key={code} className={`${panel} ${severity==="critical"?"border-destructive/40":""}`}><div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{issueLabel[code]??code}</h2><span className={`rounded-full px-2 py-1 text-xs ${severity==="critical"?"bg-destructive/10 text-destructive":"bg-muted text-muted-foreground"}`}>{severity} · {issues.length}</span></div><ul className="mt-3 space-y-2">{issues.slice(0,30).map((issue,index)=><li key={`${issue.recordId??"inventory"}-${index}`} className="text-sm"><Link href={href(issue.recordId)} className="text-primary underline-offset-4 hover:underline">{issue.recordId?result.nodes.find(node=>node.id===issue.recordId)?.name??"Open Registry record":"Open Registry inventory"}</Link><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{issue.message}</p></li>)}</ul>{issues.length>30&&<p className="mt-3 text-xs text-muted-foreground">Showing 30 of {issues.length} matching gaps. Use the Registry filters to review the full inventory.</p>}</section>;})}</div> : <section className={`${panel} mt-5`}><h2 className="font-semibold">No current evidence gaps detected</h2><p className="mt-2 text-sm text-muted-foreground">This view summarizes recorded evidence only. Production migration and activation still require separate explicit approval.</p></section>}
      <aside className={`${panel} mt-5 border-primary/30`}><h2 className="font-semibold">Audit and Production release gates</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Registry writes remain revision-checked and append-only audited through the existing services. This read-only assessment does not independently recalculate historical audit integrity or predict future revision conflicts. It cannot authorize Production access or activate the Registry. Before a controlled rollout, verify the retained Production identity and migration ledger, confirm the additive prerequisites and a prospective preservation baseline, retrieve and verify an approved encrypted recovery artifact, complete disposable migration and restore checks, then obtain separate approval for migrations 0023/0024 and a later feature-flag activation.</p><p className="mt-2 text-xs text-muted-foreground">The historical seven-entry / eleven-audit baseline is not a current requirement. Preserve whatever records and audit history are present.</p></aside>
      <p className="mt-4 text-xs text-muted-foreground">Informational gaps: {result.readiness.informationalCount}. Status is owner-entered and may not reflect live provider health.</p>
    </>}
  </main>;
}
