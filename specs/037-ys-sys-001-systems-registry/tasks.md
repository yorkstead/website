# YS-SYS-001 tasks

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
