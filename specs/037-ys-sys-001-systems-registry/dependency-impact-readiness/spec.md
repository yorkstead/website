# YS-SYS-001 continuation — dependency impact and activation readiness

## User value

The owner can inspect explicit system relationships, trace upstream dependencies and downstream outage impact, identify cycles and see whether the current inventory has the evidence, ownership, billing and monitoring needed for a deliberate activation decision.

## Authority and boundaries

- CC-023 `system_directory_entries` remains the only inventory identity. Use the active relationship, verification, billing and monitoring records already introduced by migrations 0023 and 0024.
- This slice is read-only and adds no migration or relation. It does not alter the existing Systems Directory route, DTO or workflow.
- Every analysis page and API request requires the existing owner session and `YS_SYS_001_ENABLED === "true"`; default remains off.
- No Production query, migration, data/configuration change, deployment, external probe, monitoring automation, inferred relationship, or Opportunity Discovery change.
- The currently retained Production/Preview databases are the intended environments. Empty, partial and populated inventories are valid. Historical seven-entry/eleven-audit parity is not a gate.

## Relationship semantics

An edge is displayed exactly as stored: source → target, with its stored type, verification state, and provenance class. It is never promoted from unknown/candidate to verified by traversal.

| Relationship kind | Display class | Traversal meaning |
| --- | --- | --- |
| `depends_on` | Dependency | Source depends on target |
| `runs_on` | Hosting | Source runs on target |
| `uses` | Uses | Source uses target |
| `integrates_with` | Integration | Source integrates with target |
| `owns` | Ownership | Context only; excluded from outage traversal |
| `billed_through` | Billing | Context only; excluded from outage traversal |

Upstream means records reached from the selected record by following its operational edges. Downstream impact means reverse traversal from the selected record: records with a recorded operational path to it. A path is called verified only when every edge on that path is `owner_reviewed`; all other paths are labeled unverified. No claim of health or actual outage is made. Cycles are surfaced as recorded cycles, including their evidence state.

## Bounds and incomplete data

- Analysis reads at most 501 active entries and 3001 active relationships, returning at most 500 entries and 3000 edges and an explicit truncation flag if either limit is exceeded.
- Traversal is limited to 8 hops and 100 distinct nodes per direction. Exceeding a bound is reported and blocks readiness; no silent partial result is described as complete.
- Orphan/missing endpoints should be prevented by existing foreign keys. Any detected incomplete edge is reported as a critical integrity gap and excluded from traversal.
- No recorded relationship is not proof of independence. Display “dependency coverage not recorded” as an informational gap.
- Archived entries and archived relationships are omitted from the live dependency view.

## Readiness semantics

Readiness is an evidence summary, not a certification, health check, or automatic release authorization. It counts all six classes and lists record-level gaps with navigation back to the canonical Registry record.

Critical blockers:

1. No active entries, or the analysis result is truncated.
2. A current record is not owner-reviewed with current verified evidence, or its verification evidence is stale, unavailable, or unknown.
3. Missing responsible or recovery role on an active record.
4. A subscription lacks current verified actual/estimated billing evidence (unknown amount remains unknown and blocks billing readiness).
5. A system participating in a recorded operational dependency lacks configured monitoring and a current healthy owner-recorded observation.
6. A dependency edge is not owner-reviewed, has a missing endpoint, or a recorded dependency cycle exists.

Informational gaps:

- No dependency relationship is recorded for a record; completeness has not been attested.
- Monitoring is configured but there is no current successful owner-recorded observation, where that does not meet the critical dependency rule above.
- The graph uses owner-entered evidence and does not perform an independent check.

Critical and informational counts are distinct. Unknown is never treated as zero, healthy, monitored, independent, or verified. Separately approved Production migration and activation remain an external release gate and cannot be granted by this dashboard.

## Acceptance criteria

1. The Registry includes accessible Impact and Readiness navigation while preserving its existing page/API/DTO.
2. The owner can search/filter six classifications and choose a record; the impact view exposes explicit relationship type/provenance state, immediate and transitive upstream and downstream paths, affected records, cycles, and truncation.
3. A clear SVG graph is paired with a fully keyboard-accessible semantic relationship list/table and links to each canonical Registry record.
4. Empty, partial, disconnected and complex graphs render with truthful empty/incomplete states; no missing edge is inferred.
5. The readiness view reports class coverage, critical blockers and informational gaps for verification, roles, billing, monitoring, relationships, cycles and bounds.
6. Snapshot API is owner-only, exact-flag gated, private/no-store, read-only and consistent within one read-only repeatable-read transaction. It emits no notes, account labels, billing values, or evidence contents.
7. Traversal is deterministic and bounded; paths containing any edge not owner-reviewed are explicitly unverified; ownership and billing edges never create outage impact.
8. Synthetic unit/controller/PostgreSQL/browser tests exercise each acceptance rule and retain legacy API compatibility.
9. No production state changes or migrations are included. The rollout procedure keeps migrations 0023 and 0024, the flag, and Production deployment as separately approved steps.

## Non-goals

- Automated dependency inference, provider probes, alerting, polling, monitoring setup, incident declaration, automatic service health, or remediation.
- Editing Registry or billing records from the impact/readiness views.
- Changing relationship types or schema, creating a second inventory, or touching Opportunity Discovery.
