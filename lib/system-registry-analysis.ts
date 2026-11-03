import { systemEntityClasses, type SystemEntityClass } from "@/lib/system-registry";

export const operationalRelationshipKinds = ["depends_on", "runs_on", "uses", "integrates_with"] as const;
export type OperationalRelationshipKind = (typeof operationalRelationshipKinds)[number];
export type AnalysisRelationshipKind = OperationalRelationshipKind | "owns" | "billed_through";

export type RegistryAnalysisNode = {
  id: string;
  name: string;
  entityClass: SystemEntityClass;
  revision: number;
  responsibleRolePresent: boolean;
  recoveryRolePresent: boolean;
  verificationState: "unknown" | "candidate" | "owner_reviewed";
  verificationStatus: "verified" | "unverified" | "stale" | "unknown" | "unavailable";
  verificationReviewDue: string | null;
  monitoringConfiguration: "configured" | "unmonitored" | "unknown";
  monitoringOutcome: "healthy" | "degraded" | "down" | "unknown" | "stale" | "unavailable";
  monitoringReviewDue: string | null;
  billingReady: boolean | null;
};

export type RegistryAnalysisEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: AnalysisRelationshipKind;
  verificationState: "unknown" | "candidate" | "owner_reviewed";
  provenanceKind: string;
  endpointsPresent: boolean;
};

export type RegistryAnalysisInput = {
  nodes: RegistryAnalysisNode[];
  edges: RegistryAnalysisEdge[];
  truncated: { entries: boolean; relationships: boolean };
};

export type TraversalResult = {
  records: Array<{ id: string; depth: number; verifiedPath: boolean; path: string[] }>;
  truncated: boolean;
};

export type RegistryCycle = { recordIds: string[]; relationshipIds: string[]; verified: boolean };

export type ReadinessIssue = {
  code: string;
  severity: "critical" | "informational";
  recordId: string | null;
  message: string;
};

const operationalKinds = new Set<string>(operationalRelationshipKinds);
const ordered = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));

function walk(
  startId: string,
  direction: "upstream" | "downstream",
  nodes: RegistryAnalysisNode[],
  edges: RegistryAnalysisEdge[],
  maxDepth = 8,
  maxNodes = 100,
): TraversalResult {
  if (!nodes.some((node) => node.id === startId)) return { records: [], truncated: false };
  const adjacency = new Map<string, RegistryAnalysisEdge[]>();
  for (const edge of ordered(edges.filter((item) => operationalKinds.has(item.kind)))) {
    const from = direction === "upstream" ? edge.sourceId : edge.targetId;
    const to = direction === "upstream" ? edge.targetId : edge.sourceId;
    adjacency.set(from, [...(adjacency.get(from) ?? []), { ...edge, targetId: to }]);
  }

  type QueueItem = { id: string; depth: number; verified: boolean; path: string[] };
  const queue: QueueItem[] = [{ id: startId, depth: 0, verified: true, path: [] }];
  const visitedStates = new Set([`${startId}:true`]);
  const found = new Map<string, { id: string; depth: number; verifiedPath: boolean; path: string[] }>();
  let truncated = false;

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    const outgoing = adjacency.get(current.id) ?? [];
    if (current.depth >= maxDepth && outgoing.some((edge) => !visitedStates.has(`${edge.targetId}:${current.verified && edge.verificationState === "owner_reviewed"}`))) {
      truncated = true;
      continue;
    }
    for (const edge of outgoing) {
      const nextVerified = current.verified && edge.verificationState === "owner_reviewed";
      const stateKey = `${edge.targetId}:${nextVerified}`;
      if (visitedStates.has(stateKey)) continue;
      if (edge.targetId !== startId && !found.has(edge.targetId) && found.size >= maxNodes) {
        truncated = true;
        continue;
      }
      visitedStates.add(stateKey);
      const item = { id: edge.targetId, depth: current.depth + 1, verified: nextVerified, path: [...current.path, edge.id] };
      queue.push(item);
      const previous = found.get(item.id);
      if (!previous || (item.verified && !previous.verifiedPath) || (item.verified === previous.verifiedPath && item.depth < previous.depth)) {
        found.set(item.id, { id: item.id, depth: item.depth, verifiedPath: item.verified, path: item.path });
      }
    }
  }
  return { records: [...found.values()].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id)), truncated };
}

function findCycles(nodes: RegistryAnalysisNode[], edges: RegistryAnalysisEdge[], maxCycles = 30): RegistryCycle[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, RegistryAnalysisEdge[]>();
  for (const edge of ordered(edges.filter((item) => operationalKinds.has(item.kind) && nodeIds.has(item.sourceId) && nodeIds.has(item.targetId)))) {
    adjacency.set(edge.sourceId, [...(adjacency.get(edge.sourceId) ?? []), edge]);
  }
  const color = new Map<string, 0 | 1 | 2>();
  const nodePath: string[] = [];
  const edgePath: RegistryAnalysisEdge[] = [];
  const cycles = new Map<string, RegistryCycle>();
  let overflow = false;

  const visit = (id: string) => {
    color.set(id, 1);
    nodePath.push(id);
    for (const edge of adjacency.get(id) ?? []) {
      if (cycles.size >= maxCycles) { overflow = true; return; }
      const targetColor = color.get(edge.targetId) ?? 0;
      if (targetColor === 0) {
        edgePath.push(edge);
        visit(edge.targetId);
        edgePath.pop();
      } else if (targetColor === 1) {
        const index = nodePath.lastIndexOf(edge.targetId);
        const cycleNodes = [...nodePath.slice(index), edge.targetId];
        const cycleEdges = [...edgePath.slice(index), edge];
        const canonical = cycleEdges.map((item) => item.id).sort().join("|");
        cycles.set(canonical, { recordIds: cycleNodes, relationshipIds: cycleEdges.map((item) => item.id), verified: cycleEdges.every((item) => item.verificationState === "owner_reviewed") });
      }
    }
    nodePath.pop();
    color.set(id, 2);
  };
  for (const node of ordered(nodes)) {
    if ((color.get(node.id) ?? 0) === 0 && cycles.size < maxCycles) visit(node.id);
  }
  return [...cycles.values()].sort((a, b) => a.relationshipIds.join().localeCompare(b.relationshipIds.join())).concat(overflow ? [{ recordIds: [], relationshipIds: [], verified: false }] : []);
}

export function analyzeRegistry(input: RegistryAnalysisInput, selectedId?: string) {
  const nodes = ordered(input.nodes);
  const nodesById = new Set(nodes.map((node) => node.id));
  const edges = ordered(input.edges.filter((edge) => edge.endpointsPresent && nodesById.has(edge.sourceId) && nodesById.has(edge.targetId)));
  const incompleteEdges = input.edges.filter((edge) => !edge.endpointsPresent || !nodesById.has(edge.sourceId) || !nodesById.has(edge.targetId));
  const cycles = findCycles(nodes, edges);
  const upstream = selectedId ? walk(selectedId, "upstream", nodes, edges) : null;
  const downstream = selectedId ? walk(selectedId, "downstream", nodes, edges) : null;
  const operationalEdges = edges.filter((edge) => operationalKinds.has(edge.kind));
  const connectedIds = new Set(operationalEdges.flatMap((edge) => [edge.sourceId, edge.targetId]));
  const issues: ReadinessIssue[] = [];
  const add = (code: string, severity: ReadinessIssue["severity"], recordId: string | null, message: string) => issues.push({ code, severity, recordId, message });

  if (nodes.length === 0) add("empty_inventory", "critical", null, "No active Registry records are available for readiness assessment.");
  if (input.truncated.entries || input.truncated.relationships) add("snapshot_truncated", "critical", null, "The inventory snapshot exceeded its analysis limit; readiness is incomplete.");
  for (const edge of incompleteEdges) add("relationship_incomplete", "critical", null, `Recorded ${edge.kind.replaceAll("_", " ")} relationship ${edge.endpointsPresent ? "points to an archived or omitted entry" : "has a missing endpoint"}.`);

  for (const node of nodes) {
    if (!node.responsibleRolePresent) add("missing_owner", "critical", node.id, "Responsible role is not recorded.");
    if (!node.recoveryRolePresent) add("missing_recovery", "critical", node.id, "Recovery role is not recorded.");
    if (node.verificationState !== "owner_reviewed" || node.verificationStatus !== "verified") {
      add("verification_incomplete", "critical", node.id, `Verification is ${node.verificationStatus}; current owner-reviewed evidence is required.`);
    }
    if (node.entityClass === "subscription" && !node.billingReady) add("billing_unknown", "critical", node.id, "No current verified actual or estimated billing evidence is recorded for this subscription.");
    if (!connectedIds.has(node.id)) add("dependency_coverage_unknown", "informational", node.id, "No operational dependency is recorded; dependency completeness has not been confirmed.");
    if (connectedIds.has(node.id) && (node.monitoringConfiguration !== "configured" || node.monitoringOutcome !== "healthy")) {
      add("dependency_monitoring_gap", "critical", node.id, `Recorded dependency monitoring is ${node.monitoringConfiguration} with outcome ${node.monitoringOutcome}; current healthy evidence is not established.`);
    } else if (!connectedIds.has(node.id) && (node.monitoringConfiguration !== "configured" || node.monitoringOutcome !== "healthy")) {
      add("monitoring_gap", "informational", node.id, `Monitoring is ${node.monitoringConfiguration}; outcome is ${node.monitoringOutcome}.`);
    }
  }
  for (const edge of operationalEdges) {
    if (edge.verificationState !== "owner_reviewed") add("dependency_unverified", "critical", edge.sourceId, `A recorded ${edge.kind.replaceAll("_", " ")} relationship is ${edge.verificationState}.`);
  }
  for (const cycle of cycles.filter((item) => item.relationshipIds.length)) {
    add("dependency_cycle", "critical", cycle.recordIds[0] ?? null, `${cycle.verified ? "Owner-reviewed" : "Recorded, not fully verified"} dependency cycle contains ${cycle.relationshipIds.length} relationships.`);
  }
  if (cycles.some((item) => item.relationshipIds.length === 0)) add("cycle_report_truncated", "critical", null, "Cycle reporting reached its display limit.");

  const byClass = Object.fromEntries(systemEntityClasses.map((entityClass) => [entityClass, nodes.filter((node) => node.entityClass === entityClass).length])) as Record<SystemEntityClass, number>;
  return {
    nodes,
    edges,
    incompleteRelationshipCount: incompleteEdges.length,
    byClass,
    cycles,
    selected: selectedId && nodes.some((node) => node.id === selectedId) ? selectedId : null,
    upstream,
    downstream,
    issues: issues.sort((a, b) => a.severity.localeCompare(b.severity) || (a.recordId ?? "").localeCompare(b.recordId ?? "") || a.code.localeCompare(b.code)),
    readiness: { criticalCount: issues.filter((issue) => issue.severity === "critical").length, informationalCount: issues.filter((issue) => issue.severity === "informational").length, ready: issues.every((issue) => issue.severity !== "critical") },
    limits: { truncated: input.truncated.entries || input.truncated.relationships, entries: input.truncated.entries, relationships: input.truncated.relationships, maxDepth: 8, maxNodesPerDirection: 100 },
  };
}
