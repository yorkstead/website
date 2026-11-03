# YS-SYS-001 implementation plan

## Current execution direction — 2026-11-03

The owner has selected the existing Production and Preview databases and reconstruction from documented evidence for the specifically missing Systems Directory and original Opportunity Discovery records. Former-database recovery and the historical seven-entry/eleven-audit parity exercise are stopped. The Registry must preserve whatever data and audit history exists at release and support empty, partial, and populated starting states. CC-023 remains authoritative. Migration 0023 is not applied to Production by this work and still requires separate authorization.

PR #95's preservation runner is a prospective integrity tool only if its fixed historical count assertions are removed in a separately authorized follow-up; it is not part of this feature slice and must not be modified here.

## Next implementation slice — staged inventory and ownership

1. Reconcile the typed Registry requirements with migration 0023, current CC-023 behavior, and the owner direction above.
2. Add typed CRUD over the canonical entry table and normalized relationships. Preserve the legacy Systems Directory endpoint, DTO projection, filters, and page unchanged.
3. Require both the existing owner session and exact `YS_SYS_001_ENABLED=true` for every typed Registry API operation; deny by default. Render the Registry page only for an owner while the server-side flag is exactly enabled.
4. Support all six entity classes, role ownership, verification/provenance, revision conflicts, append-only audit, search/filter, and an empty/partial starting state.
5. Test fresh, empty, partial and populated synthetic PostgreSQL states. Migration checks and UI tests must not assert historical production row counts.
6. Keep any typed route unavailable when migration 0023 is absent. No Production query, migration execution, data reconstruction, deployment, or activation is included.

## PR 0 — discovery and architecture (merged as PR #87)

1. Verify current default branch, clean isolated base, implementation owner, current production source deployment and available issue/handoff context.
2. Inspect CC-023 routes, schema, audit triggers, validation/security patterns and ordered migration convention read-only.
3. Record the production DB binding and seven-record/audit baseline only from approved read-only evidence. Current discovery has not verified these; record the exact gap and do not infer values.
4. Ratify the single-registry/additive compatibility decision, detailed specification, PR sequence, roadmap and handoff.
5. Open PR 0 for review. No code, migration, production data/configuration, merge or deployment.

## PR 0 follow-up — read-only production identity diagnostic (merged as PR #89)

The temporary mode reused the existing owner-only leads diagnostic route, returned only fixed-SELECT redacted evidence, and was executed by the owner against production. Cleanup PR #90 removed the temporary mode/helper/tests while preserving the legacy no-query route and is merged/deployed. The owner reported both preflight flags disabled and the authenticated retired mode returning 404; see `production-preflight.md`.

## PR 1 — preservation foundation

1. Superseded: no historical row-level parity or former-database recovery is required under the 2026-11-03 owner decision. Preserve the current retained database state, without querying Production in this development slice.
2. Implement the additive migration 0023 design below; re-confirm the main migration list and independently verify the private production ledger before proposing a production migration.
3. Add fresh, repeat, empty, partial, and populated synthetic upgrade tests using disposable PostgreSQL. Assert preservation only for the synthetic fixtures created by each test. Never test against production.
4. Preserve the existing routes/DTOs; keep new reads/writes owner-authorized and default-off. Update operations and compatibility tests. This implementation authorization does not authorize production migration, activation, merge, or deployment.

### Migration 0023 design proposal

- Keep `system_directory_entries` as the single registry identity and `system_directory_audit` as the immutable history. The seven current rows remain canonical provider/service entries; do not copy, rekey, or reseed them.
- Add a checked `entity_class` with `provider_service` as the default for existing rows, plus five explicit classes: `provider_account`, `subscription`, `application_workload`, `infrastructure_asset`, and `stack_component`. This gives six distinct classes without a parallel top-level registry.
- Add only the common verification/provenance fields needed by the foundation: verification state (unknown, candidate, owner-reviewed), provenance kind/reference, observed/confirmed timestamps, and responsible/recovery role labels. No credentials, recovery codes, payment secrets, or unrestricted operational notes.
- Keep this migration metadata-only for existing records: no `UPDATE` or backfill statement against any existing rows, so revision/audit triggers do not create revisions or audit records. The default class is supplied by the new column default. Do not alter migration 0020, its audit history, audit trigger functions, or the existing no-FK retention policy for legacy entry audit.
- Add a normalized `system_directory_relationships` table with owner scope, constrained relationship kinds, source/target foreign keys with `ON DELETE RESTRICT`, revision/audit triggers, append-only relationship audit, and lookup indexes. The relationship history deliberately has no FK to the relationship row so it remains retained if live relationship cleanup is ever separately authorized. No relationships are seeded in 0023.
- Preserve the compatibility surface. Existing `/api/systems-directory` and owner page return the current provider/service DTO shape and only provider/service records. New typed APIs and DTOs are additive and separately owner-authorized. Existing callers must not receive new fields or classes unexpectedly.
- New typed reads/writes and candidate creation stay behind the server-side `YS_SYS_001_ENABLED` feature flag, which is off unless its value is exactly `true`; authorization must also be independently established by the existing owner server boundary and fail closed. Tenant and actor are fixed from server authorization; client payloads cannot choose them. Migration 0023 adds no new route or activation behavior.
- This is a proposal for implementation review, not production authorization. If code review shows typed class details need subtype tables, add them in a later separately reviewed additive migration rather than putting speculative subtype columns into 0023.

### Compatibility and disposable verification plan

1. **Fresh install:** run migrations 0001–0023 on disposable PostgreSQL; verify ordered checksums and all six accepted class values.
2. **Repeat:** run the migration checker/runner twice and confirm no changed schema, duplicate relation, or history alteration.
3. **Legacy upgrade:** test empty, partially populated, and synthetic populated 0022 databases. Snapshot each fixture's IDs, revisions, archived flags, explicit legacy-column projection, audit rows, and legacy DTO JSON before migration. Apply 0023; require exact equality for the values and history present in each fixture and zero migration-generated audit events.
4. **Audit and referential controls:** verify existing entry revision/audit triggers remain enabled, the original audit table is unchanged and immutable, relationship writes require owner audit context and append history, physical relationship deletion is rejected, and source/target foreign keys reject missing entries. The test migration itself must not exercise a write against any production target.
5. **Compatibility/auth:** run contract fixtures for existing routes and DTOs; owner succeeds, unauthenticated/non-owner fails closed, client-supplied tenant/actor is ignored/rejected, and same-tenant relationship validation holds.
6. **Default off:** remove `YS_SYS_001_ENABLED` entirely, set it false, and confirm new typed operations remain unavailable while legacy routes remain usable. Verify Preview and production default behavior from code/tests only; do not change deployed flags.
7. **Rollback:** revert the application to legacy readers/writers while retaining additive schema. Do not implement a destructive down migration. Any schema correction is forward-only.
8. **Preservation report:** do not perform or claim historical row-level parity. For any future separately authorized Production migration, record the actual pre-change current-state counts and compare a versioned migration-0020 legacy projection and every audit row present before/after. Public artifacts contain aggregate pass/fail only.

## PR 2 — candidate inventory and ownership (current slice)

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

1. Review current-state preservation and compatibility endpoints against the final schema and DTOs; do not claim historical parity.
2. Rehearse restoration/rollback against disposable data and document migration forward-fix limits.
3. Keep activation default-off until separate written authorization covers the exact release/migration scope; this plan does not authorize merge, deployment or production change.

## Cross-workstream sequencing

- Automation Hub shopping-capture recovery is independently owned and remains a release coordination item. Do not combine its recovery/deployment or database changes with this registry.
- CC-026 Opportunity Discovery is present in current source and production deployment source revision; its production DB binding/migration ledger remains unverified here. Confirm its activation/migration evidence separately before selecting any shared release window.
- MKT-QR-001 (#85) remains a distinct print-critical project before sticker printing; it is not a dependency for YS-SYS-001.
