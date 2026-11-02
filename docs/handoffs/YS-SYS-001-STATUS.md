# YS-SYS-001 status — PR 1 implementation

**Updated:** 2026-11-02
**Scope:** additive schema foundation only. This standalone handoff contains no historical operations log or row-level production evidence.

## Verified repository and PR state

- The current verified repository `main` is `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`; the migration sequence ended at 0022 before this branch, making 0023 the next migration.
- PR #90 and PR #91 are open drafts. Their latest GitHub Actions runs passed. No review submissions or inline threads were present at the latest check.
- PR #90 removes the temporary diagnostic mode in source. Production flag deactivation, post-cleanup production redeployment, and authenticated 404 remain unverified by the available Vercel integration.
- PR #91 contains the recovery runbook and migration design. This implementation is stacked on that documentation branch; no `CURRENT.md` update is included.

## Implementation state

- Migration 0023 adds six checked registry classes and provenance/verification/role metadata to the existing entries table, defaulting old rows to provider/service, legacy provenance, and unknown verification without row updates or audit events.
- Migration 0023 adds typed relationship rows with source/target foreign keys, owner scope, constrained relation kinds, revision and audit triggers, immutable history, and indexes. No relationship or speculative subscription is seeded.
- The existing directory service continues to return only provider/service entries in its existing DTO shape, and treats a missing class column as legacy provider/service so schema-0022 Preview environments remain compatible. Typed registry access requires both server-derived owner authorization and `YS_SYS_001_ENABLED=true`; missing or non-exact values deny access. No new typed route is activated in this slice.
- Disposable PostgreSQL tests compare a synthetic seven-entry/eleven-event baseline before and after migration using explicit migration-0020 legacy-column projections and deterministic SHA-256 fingerprints. The test suite also covers class constraints, relationship FKs, audit protections, and legacy DTO compatibility.
- Local verification: migration check, scaffold, lint, and typecheck pass; 437 tests pass, 117 skip, 0 fail. The PostgreSQL preservation test skips locally because no PostgreSQL service or Docker daemon is available. An earlier local build passed before the schema-0022 fallback; the latest Turbopack retry hit a sandbox port-bind denial and webpack failed reading TypeScript's `--showConfig`. Vercel Preview is Ready on the exact latest PR head. Browser suite: 25 passed / 10 failed, including database-dependent owner checks and public/browser timeouts. GitHub Actions has not scheduled because its PR workflow only targets `main`; this stack's base is PR #91's docs branch.

## Recovery and preservation gates

- The owner-reported aggregate diagnostic states seven entries, eleven audit events, zero orphan events, all entries unarchived, and 22/22 migration checksums. This report has not been independently reconciled with the private row-level artifact.
- The exact seven IDs, revisions, archive states, field values, per-entry audit counts, fingerprints, capture timestamp, and source revision must be verified privately by an independent reviewer. Keep fingerprints and row-level evidence out of public GitHub.
- Neon metadata previously reported a six-hour PITR history and no snapshot schedule/saved snapshots. A current recoverable point and authorized recovery artifact have not been verified. Local PostgreSQL and Docker daemon are unavailable in this environment; no restore rehearsal is claimed.
- Draft recovery objectives in `specs/037-ys-sys-001-systems-registry/recovery-runbook.md` require owner approval: zero loss/alteration of the original seven/eleven baseline, general production RPO, a proposed 60-minute RTO, private encrypted storage and access, minimum proposed 30-day post-acceptance retention, and named operators.

## Decision and next action

- PR #92 now targets `main` so the existing GitHub Actions PostgreSQL service can execute its integration suite. The production build wrapper no longer invokes migrations; migration 0023 requires a separate operator command and authorization. Exact-head CI and production cleanup verification remain pending.

- **Implementation:** review and run the migration tests in GitHub Actions disposable PostgreSQL. A CI pass does not establish production parity or recovery readiness.
- **Production migration:** **NO-GO** until private row-level parity is independently verified, a usable recovery point/artifact is approved, restore rehearsal passes, objectives/operators/storage are approved, and the owner separately authorizes the exact production operation.
- **Next action:** review PR 1 schema and exact-head CI; obtain the private evidence bundle and owner recovery decisions through an authorized private channel; complete disposable restore rehearsal before any production migration proposal.

No production data, schema, configuration, backup, branch, or deployment was changed. No PR was merged.
