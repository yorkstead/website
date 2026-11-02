# YS-SYS-001 implementation plan

## PR 0 — discovery and architecture (current)

1. Verify current default branch, clean isolated base, implementation owner, current production source deployment and available issue/handoff context.
2. Inspect CC-023 routes, schema, audit triggers, validation/security patterns and ordered migration convention read-only.
3. Record the production DB binding and seven-record/audit baseline only from approved read-only evidence. Current discovery has not verified these; record the exact gap and do not infer values.
4. Ratify the single-registry/additive compatibility decision, detailed specification, PR sequence, roadmap and handoff.
5. Open PR 0 for review. No code, migration, production data/configuration, merge or deployment.

## PR 1 — preservation foundation

1. Obtain and independently review the redacted production baseline bundle described in `discovery.md`.
2. Implement a default-off server-side flag and additive schema/DTO compatibility needed for typed records, provenance and owner/recovery roles; choose migration number only after checking the current main manifest and production ledger.
3. Add disposable PostgreSQL migration-upgrade tests that start from the exact legacy seven-row/audit fixture and prove every ID/value/history survives unchanged. Test immutable audit and rollback behavior; never test against production.
4. Update operations/runbook and acceptance mappings. Do not activate or deploy production.

## PR 2 — candidate inventory and ownership

1. Add typed provider/service, account, application/workload, infrastructure/asset and stack-component staging using existing owner scope.
2. Import no candidate automatically. Add provenance, owner/recovery roles, duplicate review and unverified state.
3. Keep legacy entries available through existing APIs and UI; test preservation and owner-only behavior.

## PR 3 — subscriptions and cost evidence

1. Add evidence-backed subscription records, periods, entitlement-sharing and reconciliation states.
2. Distinguish actual, estimated and unknown; prove shared entitlements are counted once and unknown is not zero.
3. Preserve legacy billing values without treating the historical subtotal as current truth.

## PR 4 — workload and asset links

1. Link applications/workloads to provider accounts, infrastructure/assets and stack components.
2. Add scoped search and source/provenance rendering; leave external provider refresh out of scope.

## PR 5 — dependencies and impact

1. Add typed dependency edges with evidence/provenance and bounded graph traversal.
2. Provide accessible table-first impact inspection; show direct/transitive scope, cycle/truncation and unknown state.
3. Do not infer health from graph connectivity.

## PR 6 — monitoring evidence

1. Represent monitor configuration and owner-approved observations, preserving `unknown`, `not_monitored`, stale and unavailable.
2. Reuse only existing read-only trusted checks; no arbitrary URL probes, polling, alerts, or credentials.

## PR 7 — activation readiness and rehearsal

1. Review the seven-record/audit reconciliation and compatibility endpoints against the final schema and DTOs.
2. Rehearse restoration/rollback against disposable data and document migration forward-fix limits.
3. Keep activation default-off until separate written authorization covers the exact release/migration scope; this plan does not authorize merge, deployment or production change.

## Cross-workstream sequencing

- Automation Hub shopping-capture recovery is independently owned and remains a release coordination item. Do not combine its recovery/deployment or database changes with this registry.
- CC-026 Opportunity Discovery is present in current source and production deployment source revision; its production DB binding/migration ledger remains unverified here. Confirm its activation/migration evidence separately before selecting any shared release window.
- MKT-QR-001 (#85) remains a distinct print-critical project before sticker printing; it is not a dependency for YS-SYS-001.
