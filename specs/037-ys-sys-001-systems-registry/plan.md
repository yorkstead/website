# YS-SYS-001 implementation plan

## PR 0 — discovery and architecture (merged as PR #87)

1. Verify current default branch, clean isolated base, implementation owner, current production source deployment and available issue/handoff context.
2. Inspect CC-023 routes, schema, audit triggers, validation/security patterns and ordered migration convention read-only.
3. Record the production DB binding and seven-record/audit baseline only from approved read-only evidence. Current discovery has not verified these; record the exact gap and do not infer values.
4. Ratify the single-registry/additive compatibility decision, detailed specification, PR sequence, roadmap and handoff.
5. Open PR 0 for review. No code, migration, production data/configuration, merge or deployment.

## PR 0 follow-up — read-only production identity diagnostic (merged as PR #89)

The temporary mode reused the existing owner-only leads diagnostic route, returned only fixed-SELECT redacted evidence, and was executed by the owner against production. Cleanup PR #90 removes the temporary mode/helper/tests while preserving the legacy no-query route. The owner still needs to verify production flag deactivation and post-cleanup deployment separately; see `production-preflight.md`.

## PR 1 — preservation foundation

1. Independently review the private seven-entry / eleven-event production baseline and close the recovery readiness gate described in `production-preflight.md` and `recovery-runbook.md`.
2. Implement the approved additive migration 0023 design below; confirm the main migration list and private production ledger before implementation.
3. Add fresh, repeat, and populated legacy-upgrade tests using disposable PostgreSQL. Prove all seven fixture entries, revisions, archive states, legacy values, eleven audit events, and audit history survive unchanged. Never test against production.
4. Preserve the existing routes/DTOs; keep new reads/writes owner-authorized and default-off. Update operations and compatibility tests. No production migration, activation, merge, or deployment is authorized by this plan.

### Migration 0023 design proposal

- Keep `system_directory_entries` as the single registry identity and `system_directory_audit` as the immutable history. The seven current rows remain canonical provider/service entries; do not copy, rekey, or reseed them.
- Add a checked `entity_class` with `provider_service` as the default for existing rows, plus five explicit classes: `provider_account`, `subscription`, `application_workload`, `infrastructure_asset`, and `stack_component`. This gives six distinct classes without a parallel top-level registry.
- Add only the common verification/provenance fields needed by the foundation: verification state (unknown, candidate, owner-reviewed), provenance kind/reference, observed/confirmed timestamps, and responsible/recovery role labels. No credentials, recovery codes, payment secrets, or unrestricted operational notes.
- Keep this migration metadata-only for existing records: no `UPDATE` or backfill statement against the seven rows, so revision/audit triggers do not create revisions or audit records. The default class is supplied by the new column default. Do not alter migration 0020, audit history, audit trigger functions, or the existing audit FK policy.
- Preserve the compatibility surface. Existing `/api/systems-directory` and owner page return the current provider/service DTO shape and only provider/service records. New typed APIs and DTOs are additive and separately owner-authorized. Existing callers must not receive new fields or classes unexpectedly.
- New typed reads/writes and candidate creation stay behind a server-side feature flag that is off when unset and in every environment by default. Tenant and actor are fixed from server authorization; client payloads cannot choose them. Any relationship must stay in the fixed owner scope and validate both referenced entries.
- This is a proposal for implementation review, not production authorization. If code review shows typed class details need subtype tables, add them in a later separately reviewed additive migration rather than putting speculative subtype columns into 0023.

### Compatibility and disposable verification plan

1. **Fresh install:** run migrations 0001–0023 on disposable PostgreSQL; verify ordered checksums and all six accepted class values.
2. **Repeat:** run the migration checker/runner twice and confirm no changed schema, duplicate relation, or history alteration.
3. **Legacy upgrade:** build a synthetic, privacy-safe 0022 database with seven entries and eleven audit events. Snapshot synthetic IDs, revisions, archived flags, explicit legacy-column projection, per-entry audit counts/fingerprints, and legacy DTO JSON before migration. Apply 0023; require exact equality for all those properties and zero new audit events.
4. **Audit controls:** verify entry revision/audit triggers remain enabled, update creates the expected revision/audit in the disposable DB, and audit update/delete/truncate remains rejected. The test migration itself must not exercise a write against any production target.
5. **Compatibility/auth:** run contract fixtures for existing routes and DTOs; owner succeeds, unauthenticated/non-owner fails closed, client-supplied tenant/actor is ignored/rejected, and same-tenant relationship validation holds.
6. **Default off:** remove the feature variable entirely, set it false, and confirm new typed operations remain unavailable while legacy routes remain usable. Verify Preview and production default behavior from code/tests only; do not change deployed flags.
7. **Rollback:** revert the application to legacy readers/writers while retaining additive schema. Do not implement a destructive down migration. Any schema correction is forward-only.
8. **Preservation report:** compare private production evidence only after separate authorization. Because whole-row entry MD5 changes when columns are added, compare the versioned migration-0020 legacy projection; require all eleven original audit hashes/counts unchanged. Public artifacts show aggregate pass/fail only.

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
