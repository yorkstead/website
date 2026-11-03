"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { entityClassLabels, systemEntityClasses } from "@/lib/system-registry";
import { analyzeRegistry, operationalRelationshipKinds, type RegistryAnalysisInput, type RegistryAnalysisNode } from "@/lib/system-registry-analysis";

const panel = "rounded-xl border border-border bg-card p-4";
const classColor: Record<RegistryAnalysisNode["entityClass"], string> = {
  provider_service: "#2563eb", provider_account: "#0f766e", subscription: "#b45309",
  application_workload: "#7c3aed", infrastructure_asset: "#be123c", stack_component: "#475569",
};
const relationStyle: Record<string, { stroke: string; dash: string }> = {
  depends_on: { stroke: "#2563eb", dash: "0" }, runs_on: { stroke: "#be123c", dash: "0" }, uses: { stroke: "#7c3aed", dash: "0" },
  integrates_with: { stroke: "#0f766e", dash: "5 4" }, owns: { stroke: "#64748b", dash: "2 4" }, billed_through: { stroke: "#b45309", dash: "2 4" },
};
const relationshipLabel: Record<string, string> = { depends_on: "Dependency", runs_on: "Hosting", uses: "Uses", integrates_with: "Integration", owns: "Ownership", billed_through: "Billing" };
const accessLink = (id: string) => `/dashboard/systems/registry#${encodeURIComponent(id)}`;

export function SystemsRegistryImpact() {
  const [snapshot, setSnapshot] = useState<RegistryAnalysisInput | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/systems-registry/analysis", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Dependency analysis is unavailable");
      if (!active) return;
      const value = body.analysis as ReturnType<typeof analyzeRegistry>;
      const next = { nodes: value.nodes, edges: value.edges, truncated: { entries: value.limits.entries, relationships: value.limits.relationships } };
      setSnapshot(next);
      setSelectedId(value.nodes[0]?.id ?? "");
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Dependency analysis is unavailable"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => (snapshot?.nodes ?? []).filter((node) => (!classFilter || node.entityClass === classFilter) && (!search.trim() || node.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))), [snapshot, classFilter, search]);
  const selected = filtered.some((node) => node.id === selectedId) ? selectedId : filtered[0]?.id ?? "";
  const result = useMemo(() => snapshot ? analyzeRegistry(snapshot, selected || undefined) : null, [snapshot, selected]);
  const byId = useMemo(() => new Map((snapshot?.nodes ?? []).map((node) => [node.id, node])), [snapshot]);
  const selectedNode = selected ? byId.get(selected) : null;
  const directEdges = useMemo(() => result?.edges.filter((edge) => edge.sourceId === selected || edge.targetId === selected) ?? [], [result, selected]);
  const graphNodes = useMemo(() => {
    if (!selectedNode) return [];
    const unique = (ids: string[]) => [...new Set(ids)].map((id) => byId.get(id)).filter((node): node is RegistryAnalysisNode => Boolean(node));
    const downstreamDirect = directEdges.filter((edge) => edge.targetId === selected && operationalRelationshipKinds.includes(edge.kind as typeof operationalRelationshipKinds[number])).map((edge) => edge.sourceId);
    const upstreamDirect = directEdges.filter((edge) => edge.sourceId === selected && operationalRelationshipKinds.includes(edge.kind as typeof operationalRelationshipKinds[number])).map((edge) => edge.targetId);
    return [
      ...unique(downstreamDirect).slice(0, 7).map((node, i) => ({ node, x: 12, y: 40 + i * 62 })),
      { node: selectedNode, x: 350, y: 220 },
      ...unique(upstreamDirect).slice(0, 7).map((node, i) => ({ node, x: 698, y: 40 + i * 62 })),
    ];
  }, [selectedNode, selected, byId, directEdges]);
  const positions = new Map(graphNodes.map((item) => [item.node.id, { x: item.x, y: item.y }]));
  const nameFor = (id: string) => byId.get(id)?.name ?? "Unavailable record";

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
    <header><p className="text-xs uppercase tracking-[.18em] text-primary">Owner operations</p><h1 className="mt-2 text-3xl font-semibold">Dependency impact</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Trace only recorded relationships. Arrows show source to target; only owner-reviewed paths are called verified. Ownership and billing links are context, not outage propagation.</p></header>
    <section className={`${panel} mt-6`} aria-label="Dependency graph filters"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-muted-foreground">Search records<input className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name" /></label><label className="grid gap-1 text-xs font-medium text-muted-foreground">Classification<select className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="">All six classifications</option>{systemEntityClasses.map((value) => <option key={value} value={value}>{entityClassLabels[value]}</option>)}</select></label></div>
      <label className="mt-4 grid gap-1 text-xs font-medium text-muted-foreground">Inspect a system<select aria-label="Inspect a system" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground" value={selected} onChange={(event) => setSelectedId(event.target.value)}><option value="">No active records</option>{filtered.map((node) => <option key={node.id} value={node.id}>{node.name} — {entityClassLabels[node.entityClass]}</option>)}</select></label>
    </section>
    {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/40 p-4 text-sm">{error}</p>}
    {loading && <p role="status" className="mt-5 text-sm text-muted-foreground">Loading dependency analysis…</p>}
    {!loading && !error && result && <>
      {result.limits.truncated && <p role="alert" className="mt-5 rounded-xl border border-amber-500/50 bg-amber-500/5 p-4 text-sm">Analysis is truncated at the configured inventory or traversal limit. Displayed results are incomplete and cannot establish full impact.</p>}
      {!result.nodes.length && <section className={`${panel} mt-5`}><h2 className="text-lg font-semibold">No active Registry records</h2><p className="mt-2 text-sm text-muted-foreground">The inventory is empty. No dependencies or health have been inferred.</p></section>}
      {selectedNode && <>
        <div className="mt-5 grid gap-3 md:grid-cols-3"><div className={panel}><p className="text-xs text-muted-foreground">Selected system</p><h2 className="mt-1 font-semibold">{selectedNode.name}</h2><p className="mt-1 text-xs text-muted-foreground">{entityClassLabels[selectedNode.entityClass]}</p><Link className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline" href={accessLink(selectedNode.id)}>Open Registry record</Link></div><div className={panel}><p className="text-xs text-muted-foreground">Upstream dependencies</p><p className="mt-2 text-2xl font-semibold">{result.upstream?.records.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Recorded outbound dependency paths</p></div><div className={panel}><p className="text-xs text-muted-foreground">Downstream affected systems</p><p className="mt-2 text-2xl font-semibold">{result.downstream?.records.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Recorded inbound dependency paths</p></div></div>
        <section className={`${panel} mt-5`}><h2 className="text-lg font-semibold">Recorded relationship graph</h2><p className="mt-1 text-xs text-muted-foreground">Immediate links for the selected system. The full text relationship list follows for assistive technology and small screens.</p>
          {directEdges.length ? <div className="mt-4 overflow-x-auto"><svg viewBox="0 0 900 520" role="img" aria-labelledby="dependency-graph-title dependency-graph-desc" className="min-w-[700px] w-full rounded-lg bg-muted/20"><title id="dependency-graph-title">Immediate relationships for {selectedNode.name}</title><desc id="dependency-graph-desc">The selected system is centered. Downstream affected records appear on the left and upstream dependencies on the right. Arrows follow stored source-to-target direction. Line colors distinguish relationship kinds; line labels show the kind and verification state.</desc><defs><marker id="dependency-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" /></marker></defs>
            {directEdges.map((edge) => { const source = positions.get(edge.sourceId); const target = positions.get(edge.targetId); if (!source || !target) return null; const style = relationStyle[edge.kind]; const x1 = source.x < target.x ? source.x + 190 : source.x; const x2 = source.x < target.x ? target.x : target.x + 190; const y1 = source.y + 22; const y2 = target.y + 22; return <g key={edge.id}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={style.stroke} strokeDasharray={style.dash} strokeWidth="2" markerEnd="url(#dependency-arrow)"/><text x={(x1+x2)/2} y={(y1+y2)/2-5} textAnchor="middle" className="fill-foreground" fontSize="11">{relationshipLabel[edge.kind]} · {edge.verificationState.replaceAll("_"," ")}</text></g>; })}
            {graphNodes.map(({ node, x, y }) => <g key={node.id}><rect x={x} y={y} width="190" height="44" rx="10" fill="var(--card)" stroke={classColor[node.entityClass]} strokeWidth={node.id === selected ? "3" : "2"}/><text x={x+10} y={y+18} className="fill-foreground" fontSize="12" fontWeight="600">{node.name.length > 24 ? `${node.name.slice(0,21)}…` : node.name}</text><text x={x+10} y={y+34} className="fill-muted-foreground" fontSize="10">{entityClassLabels[node.entityClass]}</text></g>)}
            <text x="104" y="510" textAnchor="middle" className="fill-muted-foreground" fontSize="12">Downstream impact</text><text x="450" y="510" textAnchor="middle" className="fill-muted-foreground" fontSize="12">Selected system</text><text x="796" y="510" textAnchor="middle" className="fill-muted-foreground" fontSize="12">Upstream dependency</text>
          </svg></div> : <p className="mt-4 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">No recorded direct relationships for this system. This does not establish independence or complete dependency coverage.</p>}
          <div aria-label="Relationship type legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">{Object.entries(relationStyle).map(([kind,style])=><span key={kind} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-5" style={{backgroundColor:style.stroke,borderTop:style.dash==="0"?undefined:`1px dashed ${style.stroke}`}}/>{relationshipLabel[kind]}</span>)}</div>
          <ul aria-label="Immediate relationship records" className="mt-4 divide-y divide-border">{directEdges.map((edge) => <li key={edge.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><Link href={accessLink(edge.sourceId)} className="text-primary underline-offset-4 hover:underline">{nameFor(edge.sourceId)}</Link><span className="mx-2 text-muted-foreground">{relationshipLabel[edge.kind]} →</span><Link href={accessLink(edge.targetId)} className="text-primary underline-offset-4 hover:underline">{nameFor(edge.targetId)}</Link></span><span className="text-xs text-muted-foreground">{edge.verificationState.replaceAll("_"," ")} · {edge.provenanceKind.replaceAll("_"," ")}</span></li>)}</ul>
        </section>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{([ ["Upstream dependencies",result.upstream], ["Downstream impact",result.downstream] ] as const).map(([title, traversal]) => <section className={panel} key={title}><h2 className="font-semibold">{title}</h2>{traversal?.truncated&&<p role="alert" className="mt-2 text-xs text-amber-700">Traversal reached a configured limit. This list is incomplete.</p>}{traversal?.records.length?<ul className="mt-3 divide-y divide-border">{traversal.records.map((record) => <li key={record.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span><Link href={accessLink(record.id)} className="font-medium text-primary underline-offset-4 hover:underline">{nameFor(record.id)}</Link><span className="ml-2 text-xs text-muted-foreground">{entityClassLabels[byId.get(record.id)!.entityClass]} · {record.depth} {record.depth===1?"hop":"hops"}</span></span><span className={`text-right text-xs ${record.verifiedPath?"text-emerald-700":"text-amber-700"}`}>{record.verifiedPath?"Owner-reviewed path":"Unverified path"}</span></li>)}</ul>:<p className="mt-3 text-sm text-muted-foreground">No recorded {title.toLowerCase()}.</p>}</section>)}</div>
      </>}
      <section className={`${panel} mt-5`}><h2 className="font-semibold">Recorded dependency cycles</h2>{result.cycles.length?<ul className="mt-2 space-y-2">{result.cycles.map((cycle,index)=><li key={`${cycle.relationshipIds.join("-")}-${index}`} className="text-sm"><span className={cycle.verified?"text-destructive":"text-amber-700"}>{cycle.verified?"Owner-reviewed cycle":"Cycle includes unverified relationships"}</span>{cycle.recordIds.length>0&&<span className="ml-2 text-muted-foreground">{cycle.recordIds.map(nameFor).join(" → ")}</span>}</li>)}</ul>:<p className="mt-2 text-sm text-muted-foreground">No cycle found in the bounded recorded dependency graph.</p>}</section>
    </>}
  </main>;
}
