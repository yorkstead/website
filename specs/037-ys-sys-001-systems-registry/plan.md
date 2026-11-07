# YS-SYS-001 implementation plan

## Recovery database restore complete; application readiness pending — 2026-11-07

The owner reports that the encrypted Production artifact was retrieved, decrypted, checksum-verified, and successfully restored into a fresh network-isolated PostgreSQL 18.6 Docker container after an initial attempt failed on a missing Neon-managed role. The sanitized result is in [`recovery-rehearsal-evidence.md`](recovery-rehearsal-evidence.md). Treat database-level restore as PASS by owner report. Do not treat that as application readiness, a complete recovery exercise, or proof of the 60-minute RTO. The reported restore operation interval covers only the restore step.

Next planning slice: execute a separately approved application-readiness rehearsal against a fresh disposable copy of that restored state. Block outbound network traffic; disable or stub all jobs, queue consumers, webhooks, email, payments, analytics, and external integrations. Use synthetic principals/fixtures. Do not apply migrations 0023/0024; verify the restored 0022-compatible application state, Better Auth session/authz path, essential read-only owner dashboard and legacy Directory, tenant isolation, and absence of writes/external effects. A separate disposable 0023/0024 migration rehearsal remains a distinct gate. Record the complete incident-to-ready elapsed time, including artifact retrieval, decryption, role/extension preparation, restore, app configuration, tests, and owner verification. Pass the 60-minute RTO only if that entire interval is measured at or below 60 minutes.

Restore prerequisites must be derived from the archive and target provider, including global role references, ownership/ACLs, memberships, extensions, and database settings. Never create a lookalike Neon-managed role or grant elevated privileges to satisfy an archive dependency. Use provider-supported roles or a reviewed least-privilege role mapping, and stop if ownership/security behavior cannot be preserved.

## Current continuation — dependency impact and activation readiness

PR #97/#99 provide the six canonical classes, evidence, billing, monitoring and explicitly sourced relationships on the CC-023 record model. This continuation adds read-only analysis and owner views; it introduces no schema migration. Before implementation, the class relationship semantics and readiness severity rules are recorded in [`dependency-impact-readiness/spec.md`](dependency-impact-readiness/spec.md), with file-level slices and test evidence in its plan and task list.

1. Add one owner/feature-flag gated `GET /api/systems-registry/analysis` snapshot using a repeatable-read, read-only transaction and strict record/edge caps. Return only the minimum fields needed for graph and readiness; no account labels, notes, evidence contents, or private billing values.
2. Compute upstream/downstream traversals, explicit edge classification, cycle paths, blast radius, readiness gaps, and bounded/truncated indicators in a pure deterministic module. Unknown or missing edges never become verified or healthy.
3. Add responsive, accessible impact and readiness views linked from the existing Registry. Provide a semantic table/list alongside the visual graph and direct record links to the existing Registry cards.
4. Add synthetic unit, controller, PostgreSQL, and browser coverage for empty/partial inventories, all six classes, traversal direction, cycles, filtering, relationship labels, limits, readiness, authorization, and legacy compatibility.
5. Add a controlled 0023/0024 Production rollout plan to operations docs. Production identity/data, backup/retrieval, migration, activation, smoke tests, and rollback/forward recovery remain separate, owner-approved gates.

The feature flag remains default-off, and the runbook does not grant Production access, migration, backup, or activation permission.

### Prior plan status reconciliation — 2026-11-03

The phase labels below predate the GitHub PR sequence and are historical ordering, not outstanding scope: six-class inventory/ownership/relationships shipped in merged PR #97; evidence-backed verification, subscription billing provenance and manual monitoring shipped in merged PR #99. The next product slice is the dependency-impact/readiness continuation above. Do not treat the former seven-entry/eleven-audit or former-database recovery gates in older plan prose as current requirements.

## Current execution direction — 2026-11-03

The owner has selected the existing Production and Preview databases and reconstruction from documented evidence for the specifically missing Systems Directory and original Opportunity Discovery records. Former-database recovery and the historical seven-entry/eleven-audit parity exercise are stopped. The Registry must preserve whatever data and audit history exists at release and support empty, partial, and populated starting states. CC-023 remains authoritative. Migration 0023 is not applied to Production by this work and still requires separate authorization.

PR #95's preservation runner is a prospective integrity tool only if its fixed historical count assertions are removed in a separately authorized follow-up; it is not part of this feature slice and must not be modified here.

## One-time full database backup preparation — 2026-11-05

This separate operational preparation uses the existing synthetic backup rehearsal in `scripts/recovery/`, not PR #95's selective Directory evidence capture. The owner-reported current source is migration 0022 with 0023/0024 unapplied and an empty Directory; there are no 7/11 production count assumptions. Update the synthetic test to apply the repository migrations through 0022, verify zero entries/audits, preserve synthetic application data and restore-required roles/grants, and exercise encrypted artifact validation/cleanup. Document the future owner-operated direct-service, `pg_dump -Fc`, age, private R2, retrieval, cost and recovery procedure in `one-time-production-backup.md`. Production export and R2 upload remain separately unauthorized.

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

- Keep `system_directory_entries` as the single registry identity and `system_directory_audit` as the immutable history. Present legacy rows remain canonical provider/service entries; do not copy, rekey, or reseed them.
- Add an immutable `legacy_directory_entry` marker that defaults true for legacy Directory inserts and is explicitly false for typed Registry inserts. A database check keeps marked entries in `provider_service`; provenance may be displayed and round-tripped but does not control legacy identity.
- Add a checked `entity_class` with `provider_service` as the default for existing rows, plus five explicit classes: `provider_account`, `subscription`, `application_workload`, `infrastructure_asset`, and `stack_component`. This gives six distinct classes without a parallel top-level registry.
- Add only the common verification/provenance fields needed by the foundation: verification state (unknown, candidate, owner-reviewed), provenance kind/reference, observed/confirmed timestamps, and responsible/recovery role labels. No credentials, recovery codes, payment secrets, or unrestricted operational notes.
- Keep this migration metadata-only for existing records: no `UPDATE` or backfill statement against any existing rows, so revision/audit triggers do not create revisions or audit records. The default class is supplied by the new column default. Do not alter migration 0020, its audit history, audit trigger functions, or the existing no-FK retention policy for legacy entry audit.
- Add a normalized `system_directory_relationships` table with owner scope, constrained relationship kinds, source/target foreign keys with `ON DELETE RESTRICT`, revision/audit triggers, append-only relationship audit, and lookup indexes. The relationship history deliberately has no FK to the relationship row so it remains retained if live relationship cleanup is ever separately authorized. No relationships are seeded in 0023.
- Preserve the compatibility surface. Existing `/api/systems-directory` and owner page return the current provider/service DTO shape and only provider/service records. New typed APIs and DTOs are additive and separately owner-authorized. Existing callers must not receive new fields or classes unexpectedly. PostgreSQL `DATE` values are returned as ISO calendar-date strings to keep date inputs editable without timezone conversion.
- New typed reads/writes and candidate creation stay behind the server-side `YS_SYS_001_ENABLED` feature flag, which is off unless its value is exactly `true`; authorization must also be independently established by the existing owner server boundary and fail closed. Tenant and actor are fixed from server authorization; client payloads cannot choose them. Migration 0023 adds no new route or activation behavior.
- This is a proposal for implementation review, not production authorization. If code review shows typed class details need subtype tables, add them in a later separately reviewed additive migration rather than putting speculative subtype columns into 0023.

### Compatibility and disposable verification plan

1. **Fresh install:** run migrations 0001–0023 on disposable PostgreSQL; verify ordered checksums and all six accepted class values.
2. **Repeat:** run the migration checker/runner twice and confirm no changed schema, duplicate relation, or history alteration.
3. **Legacy upgrade:** test empty, partially populated, and synthetic populated 0022 databases. Snapshot each fixture's IDs, revisions, archived flags, explicit legacy-column projection, audit rows, and legacy DTO JSON before migration. Apply 0023; require exact equality for the values and history present in each fixture and zero migration-generated audit events.
4. **Audit and referential controls:** verify existing entry revision/audit triggers remain enabled, the original audit table is unchanged and immutable, the legacy identity marker cannot change and marked entries cannot change class, relationship writes require owner audit context and append history, physical relationship deletion is rejected, and source/target foreign keys reject missing entries. The test migration itself must not exercise a write against any production target.
5. **Compatibility/auth:** run contract fixtures for existing routes and DTOs; owner succeeds, unauthenticated/non-owner fails closed, client-supplied tenant/actor is ignored/rejected, and same-tenant relationship validation holds.
6. **Default off:** remove `YS_SYS_001_ENABLED` entirely, set it false, and confirm new typed operations remain unavailable while legacy routes remain usable. Verify Preview and production default behavior from code/tests only; do not change deployed flags.
7. **Rollback:** revert the application to legacy readers/writers while retaining additive schema. Do not implement a destructive down migration. Any schema correction is forward-only.
8. **Preservation report:** do not perform or claim historical row-level parity. For any future separately authorized Production migration, record the actual pre-change current-state counts and compare a versioned migration-0020 legacy projection and every audit row present before/after. Public artifacts contain aggregate pass/fail only.

## Historical phase — candidate inventory and ownership (delivered by PR #97)

1. Add typed provider/service, account, application/workload, infrastructure/asset and stack-component staging using existing owner scope.
2. Import no candidate automatically. Add provenance, owner/recovery roles, duplicate review and unverified state.
3. Keep legacy entries available through existing APIs and UI; test preservation and owner-only behavior.

## Historical phase — subscriptions and cost evidence (delivered by PR #99)

1. Add evidence-backed subscription records, periods, entitlement-sharing and reconciliation states.
2. Distinguish actual, estimated and unknown; prove shared entitlements are counted once and unknown is not zero.
3. Preserve legacy billing values without treating the historical subtotal as current truth.

## Historical phase — workload and asset links (covered by PR #97 six-class relationship support)

1. Link applications/workloads to provider accounts, infrastructure/assets and stack components.
2. Add scoped search and source/provenance rendering; leave external provider refresh out of scope.

## Dependency impact and readiness — current continuation

1. Add typed dependency edges with evidence/provenance and bounded graph traversal.
2. Provide accessible table-first impact inspection; show direct/transitive scope, cycle/truncation and unknown state.
3. Do not infer health from graph connectivity.

## Historical phase — monitoring evidence (delivered by PR #99)

1. Represent monitor configuration and owner-approved observations, preserving `unknown`, `not_monitored`, stale and unavailable.
2. Reuse only existing read-only trusted checks; no arbitrary URL probes, polling, alerts, or credentials.

## Controlled Production activation — separately gated

1. Review current-state preservation and compatibility endpoints against the final schema and DTOs; use a new prospective baseline with no fixed historic row count.
2. Rehearse restoration/rollback against disposable data and document migration forward-fix limits.
3. Keep activation default-off until separate written authorization covers the exact release/migration scope; this plan does not authorize merge, deployment or production change.

The controlled migration and activation sequence is maintained in [`activation-runbook.md`](activation-runbook.md).

## Cross-workstream sequencing

- Automation Hub shopping-capture recovery is independently owned and remains a release coordination item. Do not combine its recovery/deployment or database changes with this registry.
- CC-026 Opportunity Discovery is present in current source and production deployment source revision; its production DB binding/migration ledger remains unverified here. Confirm its activation/migration evidence separately before selecting any shared release window.
- MKT-QR-001 (#85) remains a distinct print-critical project before sticker printing; it is not a dependency for YS-SYS-001.
