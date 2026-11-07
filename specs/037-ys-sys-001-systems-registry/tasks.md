# YS-SYS-001 tasks

## Production-derived database restore and application readiness — 2026-11-07

- [x] Record owner-reported encrypted artifact retrieval, decryption, ciphertext checksum, archive validation, and successful isolated PostgreSQL 18.6 database restore in [`recovery-rehearsal-evidence.md`](recovery-rehearsal-evidence.md); preserve the first failed restore and missing Neon-managed role as a prerequisite finding.
- [x] Record aggregate migration, table/row inventory, Directory constraint/audit tests, and the reported restore-operation time without exposing row-level evidence.
- [x] Document provider-compatible restore role prerequisites and prohibit recreating Neon-managed roles with elevated privileges.
- [x] Prepare the isolated application-readiness plan with outbound egress blocked and jobs, webhooks, email, payments, and integrations disabled or stubbed.
- [ ] Run application readiness against a fresh disposable copy; test synthetic authentication and owner authorization, essential read-only dashboard/legacy Directory workflows, tenant isolation, no persistent writes, and no external side effects.
- [ ] Complete a continuously measured incident-to-verified-service recovery exercise, including artifact retrieval/decryption, provider-role preparation, restore, app configuration, smoke tests, and owner verification; meet the full 60-minute RTO.
- [ ] Review private evidence of the exact role/ownership/ACL mapping used in the successful restore and record only a sanitized result.
- [ ] Obtain separate authorization for any future Production migration 0023/0024 and Registry activation; no authorization is implied by this restore.

The 2026-11-07 owner-reported database restore supersedes earlier checklist text below that says no Production-derived artifact or restore exists. The old seven-entry/eleven-audit assumptions remain obsolete; the current observed Directory state is empty. This database restore does not complete application readiness or the recovery exercise.

## Temporary Production identity diagnostic — 2026-11-03

Design and implementation specification: [`production-identity-diagnostic.md`](production-identity-diagnostic.md).

- [x] Confirm current main and Production source revision; preserve the original dirty checkout.
- [x] Reuse Better Auth owner authorization and document its narrowly authorized session-lookup database access.
- [x] Add a separate no-query identity endpoint that only parses effective `DATABASE_URL` and compares one private expected Neon hostname/database pair.
- [x] Return only `MATCH`, `MISMATCH`, or `UNVERIFIED` with UTC capture time; keep response private and non-cacheable.
- [x] Add synthetic tests for authorization, identity comparison, malformed/ambiguous input, non-disclosure, and zero application-data queries.
- [x] Run local scaffold, migration-order, lint, typecheck, and unit checks; record database/browser environment limits in the PR evidence.
- [ ] Run exact-head Actions with disposable PostgreSQL and obtain independent PR security review.
- [ ] Stop at a reviewable PR; Production request, merge, and deployment require separate authorization.

## Dependency impact and activation readiness continuation

Detailed acceptance, semantics and limits: [`dependency-impact-readiness/spec.md`](dependency-impact-readiness/spec.md).

- [ ] Confirm the existing relationship table and migration 0024 fields are the only data sources; no migration or speculative edges.
- [ ] Add bounded read-only snapshot loading behind owner authorization and exact default-off feature flag.
- [ ] Implement deterministic dependency traversal, reverse impact, cycle detection and truncation reporting.
- [ ] Implement truthful readiness classification for verification, roles, billing, monitoring, links and activation conditions.
- [ ] Add impact graph with semantic table/list, search/class filters and links to Registry records.
- [ ] Add readiness overview with counts, severity, actionable record navigation and explicit unknown/incomplete states.
- [ ] Add focused unit/controller/synthetic PostgreSQL/browser tests, including empty and partial inventories and all six classes.
- [ ] Verify the legacy `/api/systems-directory` DTO/view remains unchanged; no production migration or feature activation.
- [ ] Run migration check, lint, typecheck, complete tests, browser suite and build; document skips and Preview isolation limits.
- [ ] Review the exact PR diff, Actions and Preview; stop at draft PR pending separate merge/deploy authorization.

The PR 0 / PR 1 sections below are historical completion records. Their former-database and fixed seven-entry/eleven-audit production-baseline gates are superseded by the 2026-11-03 owner direction and are not active tasks.

## PR 2 — staged inventory and ownership (owner direction 2026-11-03)

**Status note:** The implementation items below are represented on current main by merged PR #97 (inventory, typed routes/relationships, access gates, UI and regression tests). Only Production migration, activation, merge/deployment, and unrelated separately authorized data reconstruction are outside that completed code delivery; historical private parity is superseded.

- [x] Reconcile spec, plan, tasks, and ADRs with retained Production/Preview database decision; remove historical row-count parity and former-database recovery as active gates while keeping prior evidence labeled historical.
- [x] Implement six-class Registry DTO/schema, canonical-entry service, typed routes, owner + default-off gate, safe errors, revision conflicts, and append-only audit.
- [x] Implement typed relationship listing/mutation using migration 0023's normalized tables, foreign keys, revisioning, and audit history.
- [x] Add owner Registry page with class filters, search, type-specific field groups, role/provenance fields, clear empty/partial states, and links to existing systems.
- [x] Keep `/api/systems-directory`, its DTO, and legacy page behavior compatible, with a guard against reclassifying legacy rows.
- [x] Add owner/flag/origin/input boundary tests and synthetic database tests for six classes, audit, revision conflict, and legacy DTO shape.
- [x] Add migration upgrade coverage for empty and partial synthetic states; populated synthetic migration preservation remains covered by the existing migration test.
- [x] Address PR #97 review findings with ISO renewal-date serialization, legacy provenance round-trip, immutable legacy identity, and transaction-client relationship reads covered by focused regression tests.
- [ ] Keep migration 0023 unapplied to Production and do not reconstruct Production records in this PR.
- [x] Run repository checks, tests, lint, typecheck, browser tests, disposable PostgreSQL integration, and build; exact-head CI evidence is recorded in `verification.md`.
- [ ] Review exact PR branch diff; do not merge or deploy without separate authorization.

## PR 0 — discovery and decision

- [x] Verify GitHub default branch and current main SHA using GitHub API evidence.
- [x] Create a clean dedicated checkout at the verified main SHA; preserve the dirty original checkout.
- [x] Read AGENTS, constitution, current/historical handoff, CC-023 spec/plan/tasks/operations/verification, architecture decision template, skills, migration and release conventions.
- [x] Identify CC-023's existing routes, owner boundary, tables, migration and audit behavior.
- [x] Verify current production source deployment SHA through Vercel metadata.
- [x] Owner-reported diagnostic establishes production counts/migration evidence; exact provider endpoint metadata matches Neon project, production branch and database. Private row-level parity still needs independent review.
- [x] Record source evidence, uncertainty, compatibility decision and PR sequence.
- [x] Update project roadmap and current handoff with cross-workstream sequencing.
- [x] Review and open draft PR 0 with discovery and implementation sequence; preserve historical handoff and verify final PR head.

## PR 1 — preservation foundation

- [x] Match the owner-reported production diagnostic endpoint to Neon project `website`, production branch, and `neondb` using exact endpoint metadata.
- [x] Confirm owner-reported aggregate production baseline and 22/22 matching migration checksums; see `production-preflight.md`.
- [x] Historical seven-entry/eleven-audit parity and private row-level review: superseded by the owner decision to retain the current database; the observed empty Directory state is accepted as the current state, not compared with unavailable historical rows.
- [x] Verify an encrypted Production artifact and database-level isolated restore: owner-reported PASS on 2026-11-07; see `recovery-rehearsal-evidence.md`. The reported restore-only interval does not satisfy the full RTO.
- [x] Prepare migration 0023 design, six-class and legacy DTO compatibility contract, default-off authorization boundaries, parity procedure and disposable verification plan in `plan.md`.
- [x] Implement additive migration 0023 with six checked classes, provenance/verification metadata, normalized FK-backed relationships, revision/audit protection, and indexes; no existing rows are updated or seeded.
- [x] Preserve the legacy service DTO and filter it to provider/service records; add a default-off exact-value feature gate that also requires server-derived owner authorization.
- [x] Author a synthetic seven-entry/eleven-audit populated-upgrade parity test, relationship integrity/audit tests, class constraints, and legacy DTO compatibility test.
- [x] Execute database-backed migration and preservation tests on disposable PostgreSQL; [PR #92 CI run 41499404998](https://github.com/yorkstead/website/actions/runs/41499404998) passed the then-current head. Recheck the consolidated head before review completion.
- [x] Rehearse database restoration from the owner-authorized recovery artifact in isolated PostgreSQL 18.6; owner-reported PASS after a first attempt failed on a missing Neon-managed role prerequisite. No row-level artifact is stored here.
- [ ] Resolve and document a provider-supported, least-privilege role/ownership mapping for future restore targets; never recreate an elevated Neon-managed role.
- [ ] Run disposable application-readiness checks with outbound network blocked and scheduled jobs, webhooks, email, payment, and other external effects disabled or mocked.
- [ ] Measure complete incident-to-verified-application recovery and demonstrate the 60-minute RTO.
- [x] Run complete repository verification on the reconciled proposed merge; record the initial exact-head evidence in `verification.md` and rerun on the final documentation head.

## Recovery preparation — historical planning record; see 2026-11-07 exercise status above

- [x] Prepare a specific production recovery approval package with encrypted custom-format dumps, owner-approved daily cadence/24-hour RPO, 30-day retention, 60-minute RTO target, cost verification procedure, one-time first-backup authorization request, single-operator exception, and isolated restore rehearsal plan. Exact storage/key/cost approvals and production execution remain open.
- [x] Add a step-by-step private R2 setup checklist, verified provider links, region/jurisdiction irreversibility warning, bucket-scoped credentials, key custody, retention, logging, and cost verification steps; do not provision R2 resources.
- [x] Add the private row-level parity comparison method, concise owner exception acknowledgment, and PR #94 release recommendation with expected Production impact and smoke checks.

- [x] Record planning choice of encrypted custom-format `pg_dump`, 30-day artifact retention, and 60-minute incident-to-service RTO target in `recovery-runbook.md`.
- [x] Prepare synthetic-only backup/encryption/local-upload/restore scripts, automated failure and integrity tests, private evidence template and narrow owner-decision checklist.
- [x] Verify the synthetic restore rehearsal on disposable PostgreSQL with age; PR #93's exact-head [Actions run 41552395705](https://github.com/yorkstead/website/actions/runs/41552395705) passed its isolated recovery job. A synthetic pass is not a production-derived restore.
- [x] Owner selects daily backups and 24-hour RPO; owner is primary recovery operator and approver. Secondary operator and independent human reviewer are unassigned; record explicit owner acknowledgment of the single-operator exception before production operation.
- [x] One-time encrypted Production artifact retrieval and database restore recorded as owner-reported evidence above. This does not verify current retention enforcement, cost, recurring backup cadence, application readiness, or the full RTO; do not infer authorization for another export or recurring schedule.
- [ ] Privately verify applicable 30-day artifact retention/expiration and storage cost before relying on this artifact for a future Production migration.
- [x] Historical seven-entry/eleven-audit parity review: superseded; no fixed historical row count is required.
- [ ] Complete application readiness and full RTO acceptance before requesting any Production migration decision.
- [ ] Obtain separate explicit authorization for any Production migration 0023/0024 and Registry activation; this rehearsal grants neither.

## PR 0 follow-up — production identity diagnostic and retirement

- [x] Reuse the existing owner-only server diagnostic route; add no public route or UI.
- [x] Add default-off production and owner gates, no-store headers, and a WAF-confirmation gate with local rate limiting.
- [x] Query database identity, safe schema/migration metadata, Systems Directory preservation counts, stable IDs/revisions/archive state, audit counts/fingerprints, trigger and constraint facts using fixed SELECTs.
- [x] Document separate production deployment/access approval and the explicit disable/removal procedure.
- [x] Run focused/full tests and repository verification; keep PR 1 blocked until verified production evidence is reviewed.
- [x] Owner reports a successful production diagnostic; Neon endpoint/project/branch/database mapping and aggregate facts are documented without public IDs or fingerprints.
- [x] Cleanup PR #90 removes temporary code/helper/tests/docs; latest Actions and Preview pass. PR remains draft/unmerged.
- [x] Owner reports both temporary flags disabled, Production cleanup deployed, and owner-authenticated retired-mode 404; no protected values or response bodies recorded.
## Historical phase — staged inventory and ownership (merged PR #97)

- [x] Add unverified candidate staging, duplicate review, owner/recovery roles and provenance.
- [x] Preserve legacy endpoints and test owner/cross-tenant boundaries.

## Historical phase — subscription evidence and reconciliation (merged PR #99)

- [x] Add actual/estimated/unknown subscription evidence and shared-entitlement dedupe.
- [x] Prove unknown values do not become zero and legacy values remain intact.

## Historical phase — applications, infrastructure and stack usage (six-class model merged PR #97)

- [x] Link workload, infrastructure/asset and stack-component records with evidence.
- [x] Verify compatibility and source visibility.

## Dependency impact and readiness — current continuation

- [ ] Add typed, bounded dependency edges and accessible impact inspection.
- [ ] Test cycles, truncation, provenance and non-inference of health.

## Historical phase — monitoring evidence (merged PR #99)

- [x] Add truthful monitored/not-configured/unknown/stale states and history.
- [x] Reuse existing trusted read-only checks only; no arbitrary probes or alerts.

## Controlled Production activation — separately gated

- [ ] Verify compatibility and current-state preservation against a new prospective baseline; no historic row count assumed.
- [ ] Rehearse restore/rollback on disposable data and document remaining gates.
- [ ] Seek separate authorization before any production operation, merge or deployment.
