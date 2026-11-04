# YS-SYS-001 tasks

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
- [ ] **Blocked for production migration:** independently review private IDs/revisions/archive state, all seven entry values, per-entry audit counts/fingerprints and exact capture provenance.
- [ ] Verify a specific pre-migration recovery point; agree RPO/RTO and acceptable data exposure; rehearse restore on disposable PostgreSQL/Neon only.
- [x] Prepare migration 0023 design, six-class and legacy DTO compatibility contract, default-off authorization boundaries, parity procedure and disposable verification plan in `plan.md`.
- [x] Implement additive migration 0023 with six checked classes, provenance/verification metadata, normalized FK-backed relationships, revision/audit protection, and indexes; no existing rows are updated or seeded.
- [x] Preserve the legacy service DTO and filter it to provider/service records; add a default-off exact-value feature gate that also requires server-derived owner authorization.
- [x] Author a synthetic seven-entry/eleven-audit populated-upgrade parity test, relationship integrity/audit tests, class constraints, and legacy DTO compatibility test.
- [x] Execute database-backed migration and preservation tests on disposable PostgreSQL; [PR #92 CI run 41499404998](https://github.com/yorkstead/website/actions/runs/41499404998) passed the then-current head. Recheck the consolidated head before review completion.
- [ ] Rehearse restore from an authorized recovery artifact; none is available in this workspace.
- [x] Run complete repository verification on the reconciled proposed merge; record the initial exact-head evidence in `verification.md` and rerun on the final documentation head.

## Recovery preparation — owner planning decision, no production execution

- [x] Prepare a specific production recovery approval package with encrypted custom-format dumps, owner-approved daily cadence/24-hour RPO, 30-day retention, 60-minute RTO target, cost verification procedure, one-time first-backup authorization request, single-operator exception, and isolated restore rehearsal plan. Exact storage/key/cost approvals and production execution remain open.
- [x] Add a step-by-step private R2 setup checklist, verified provider links, region/jurisdiction irreversibility warning, bucket-scoped credentials, key custody, retention, logging, and cost verification steps; do not provision R2 resources.
- [x] Add the private row-level parity comparison method, concise owner exception acknowledgment, and PR #94 release recommendation with expected Production impact and smoke checks.

- [x] Record planning choice of encrypted custom-format `pg_dump`, 30-day artifact retention, and 60-minute incident-to-service RTO target in `recovery-runbook.md`.
- [x] Prepare synthetic-only backup/encryption/local-upload/restore scripts, automated failure and integrity tests, private evidence template and narrow owner-decision checklist.
- [x] Verify the synthetic restore rehearsal on disposable PostgreSQL with age; PR #93's exact-head [Actions run 41552395705](https://github.com/yorkstead/website/actions/runs/41552395705) passed its isolated recovery job. A synthetic pass is not a production-derived restore.
- [x] Owner selects daily backups and 24-hour RPO; owner is primary recovery operator and approver. Secondary operator and independent human reviewer are unassigned; record explicit owner acknowledgment of the single-operator exception before production operation.
- [ ] Approve exact storage and cost, key custody/recovery, private parity evidence, and source-specific one-time first-backup procedure.
- [ ] Independently review private production seven-entry/eleven-audit parity and capture provenance.
- [ ] Separately authorize a specific production export, verify remote storage/retention/retrieval, and complete an isolated restore rehearsal before any production migration request.

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
