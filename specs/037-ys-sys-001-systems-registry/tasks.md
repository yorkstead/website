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

- [ ] **Blocked (2026-11-02):** establish the production `DATABASE_URL` → Neon project/branch/database binding and complete the reviewed read-only preservation and recovery evidence bundle; see `production-preflight.md`.
- [ ] Capture and independently review redacted production baseline before schema implementation.
- [ ] Add default-off, additive schema/compatibility foundation and migration/backout record.
- [ ] Prove all seven legacy IDs, values and audit histories survive a disposable upgrade unchanged.
- [ ] Run migration checks and required application verification; update exact-head evidence.

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
