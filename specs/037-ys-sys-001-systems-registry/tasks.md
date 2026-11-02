# YS-SYS-001 tasks

## PR 0 — discovery and decision

- [x] Verify GitHub default branch and current main SHA using GitHub API evidence.
- [x] Create a clean dedicated checkout at the verified main SHA; preserve the dirty original checkout.
- [x] Read AGENTS, constitution, current/historical handoff, CC-023 spec/plan/tasks/operations/verification, architecture decision template, skills, migration and release conventions.
- [x] Identify CC-023's existing routes, owner boundary, tables, migration and audit behavior.
- [x] Verify current production source deployment SHA through Vercel metadata.
- [ ] Verify production DB binding, applied migration ledger, seven original records and immutable audit fingerprints using an approved read-only operator path. Current session has no verified DB target/access.
- [x] Record source evidence, uncertainty, compatibility decision and PR sequence.
- [x] Update project roadmap and current handoff with cross-workstream sequencing.
- [x] Review and open draft PR 0 with discovery and implementation sequence; preserve historical handoff and verify final PR head.

## PR 1 — preservation foundation

- [x] Match the owner-reported production diagnostic endpoint to the Neon `website` project, primary/default `production` branch and `neondb`; record non-secret outcome in `production-preflight.md`.
- [x] Record owner-reported aggregate counts, migration checksums, trigger/constraint facts and fingerprint comparison algorithm without publishing row-level identifiers or hashes.
- [ ] **Blocked:** review private seven-row IDs/revisions/per-entry audit counts/fingerprints and confirm a usable pre-migration recovery timestamp; restore remains untested.
- [ ] Capture and independently review row-level production baseline before schema implementation.
- [ ] Reconfirm `0023` is the next migration on current main and reconcile it with the verified production ledger.
- [ ] Implement a unified additive model for provider/service, provider account, subscription, application/workload, infrastructure/asset, and stack component; retain the existing entries as canonical provider/service records.
- [ ] Preserve existing routes/DTOs and owner-server auth; add only separately scoped typed APIs, fixed owner tenant, same-tenant relationship checks, and a default-off server feature flag.
- [ ] Add provenance, verification state, candidate staging and responsible/recovery roles without credentials or recovery secrets.
- [ ] Prove seven synthetic legacy IDs/material values/revisions/archive states and audit history/fingerprints survive fresh, repeat and populated disposable upgrades unchanged.
- [ ] Verify legacy DTO compatibility, cross-tenant denial, feature default-off, immutable audit constraints, forward-only rollback, migration check and repository checks.
- [ ] Run migration checks and required application verification; update exact-head evidence.

## PR 0 follow-up — temporary production identity diagnostic (PR #89 merged; cleanup PR #90)

- [x] Reuse the existing owner-only server diagnostic route; add no public route or UI.
- [x] Add default-off production and owner gates, no-store headers, and a WAF-confirmation gate with local rate limiting.
- [x] Query database identity, safe schema/migration metadata, Systems Directory preservation counts, stable IDs/revisions/archive state, audit counts/fingerprints, trigger and constraint facts using fixed SELECTs.
- [x] Document separate production deployment/access approval and the explicit disable/removal procedure.
- [x] Run focused/full tests and repository verification; keep PR 1 blocked until verified production evidence is reviewed.
- [x] Owner-reported diagnostic was executed against production and returned the facts recorded in `production-preflight.md`.
- [ ] Owner confirmation: both production flags false/removed, post-change production deployment identified, and owner-authenticated special mode returns 404. Vercel integration scope does not expose project/environment/deployment metadata.
- [x] Remove the temporary branch/helper/tests/docs while preserving legacy leads diagnostic behavior; open draft PR #90 and pass local verification. Exact-head automated checks are still pending.
## PR 2 — staged inventory and ownership

- [ ] Add unverified candidate staging, duplicate review, owner/recovery roles and provenance.
- [ ] Preserve legacy endpoints and test owner/cross-tenant boundaries.

## PR 3 — subscription evidence and reconciliation

- [ ] Add actual/estimated/unknown subscription evidence and shared-entitlement dedupe.
- [ ] Prove unknown values do not become zero and legacy values remain intact.

## PR 4 — applications, infrastructure and stack usage

- [ ] Link workload, infrastructure/asset and stack-component records with evidence.
- [ ] Verify compatibility and source visibility.

## PR 5 — dependencies and impact

- [ ] Add typed, bounded dependency edges and accessible impact inspection.
- [ ] Test cycles, truncation, provenance and non-inference of health.

## PR 6 — monitoring evidence

- [ ] Add truthful monitored/not-configured/unknown/stale states and history.
- [ ] Reuse existing trusted read-only checks only; no arbitrary probes or alerts.

## PR 7 — activation readiness

- [ ] Verify compatibility, seven-record preservation and audit parity.
- [ ] Rehearse restore/rollback on disposable data and document remaining gates.
- [ ] Seek separate authorization before any production operation, merge or deployment.
