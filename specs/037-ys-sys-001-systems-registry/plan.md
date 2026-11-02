# YS-SYS-001 implementation plan

## PR 0 — discovery and architecture (merged as PR #87)

1. Verify current default branch, clean isolated base, implementation owner, current production source deployment and available issue/handoff context.
2. Inspect CC-023 routes, schema, audit triggers, validation/security patterns and ordered migration convention read-only.
3. Record initial production DB and row-level evidence gaps in PR 0; later owner diagnostic and Neon endpoint matching are summarized in `production-preflight.md`, with private row-level parity still awaiting review.
4. Ratify the single-registry/additive compatibility decision, detailed specification, PR sequence, roadmap and handoff.
5. Open PR 0 for review. No code, migration, production data/configuration, merge or deployment.

## PR 0 follow-up — read-only production identity diagnostic (merged as PR #89)

The temporary mode was added to the existing owner diagnostic route, used by the owner to collect production evidence, and is removed by cleanup PR #90. It introduced no separate route or UI. The reviewed response was fixed-SELECT-only and redacted; see `production-preflight.md` for evidence provenance, privacy and limitations.

## PR 1 — preservation foundation

1. Obtain and independently review the private row-level production baseline and confirm the pre-migration recovery point. Aggregate facts are recorded in `production-preflight.md`; the exact IDs/revisions/fingerprints remain private and have not been independently reviewed here.
2. Finalize and review the additive schema/DTO compatibility needed for typed records, provenance and owner/recovery roles; current `main` contains migrations through `0022`, so the next candidate is `0023` (reconfirm at implementation start).
3. Add disposable PostgreSQL migration-upgrade tests using a privacy-safe fixture derived from the reviewed private baseline and synthetic stable IDs; prove seven legacy rows and all audit history survive unchanged. Test immutable audit and rollback behavior; never test against production.
4. Update operations/runbook and acceptance mappings. Do not activate or deploy production.

### PR 1 schema and compatibility contract (review-ready; implementation gated)

- Keep `system_directory_entries` as the sole shared registry identity and preserve the existing seven provider/service rows in place. The five additional classes are provider account, subscription, application/workload, infrastructure/asset, and stack component; model class-specific fields as additive typed data with explicit entry identity/relationships, not as a second independent registry.
- Preserve legacy API paths and response DTOs. Existing directory readers/writers continue to expose provider/service entries with the current shape; new typed routes/DTOs are separately versioned and owner-authorized. New relationships may reference only same-tenant records, and actor/tenant remain server-derived.
- New candidate records and reads stay behind an explicit server-side feature switch defaulting off. Default off must survive missing environment configuration and preview/production alike. Authorization remains owner-session plus fixed owner tenant; no client-supplied owner or tenant value is trusted.
- Store provenance/evidence state, source reference, observation/confirmation timestamps, and responsible/recovery role separately from credentials, recovery codes, payment data, or private operational notes. Staged candidates do not become authoritative without explicit owner review.
- Migration `0023` is the next repository candidate after current `0022`; reconfirm the live main migration list and production ledger before implementation or migration. Additive DDL only; no rewrite of `0020`/`0022`, delete/rekey/backfill of the seven entries, or change to immutable audit history.
- Use a synthetic seven-entry fixture shaped from the private baseline's reviewed field-presence/value-class metadata. Assert stable IDs, revisions, archived state, legacy DTOs and all audit rows/fingerprints are unchanged before/after fresh and upgrade migrations. Test fresh, repeat, populated legacy upgrade, constraint enforcement, owner/tenant authorization, feature flag default-off and application rollback against disposable PostgreSQL only.
- Application rollback means reverting new reads/writes and keeping additive schema/data/audit in place. Correct a schema defect with a forward migration. No destructive down migration or production cutover is part of PR 1.

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
