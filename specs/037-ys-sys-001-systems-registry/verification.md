# YS-SYS-001 verification record — PR 0

## PR 1 implementation preparation — 2026-11-02

- Isolated branch is based on PR #91 head `6629324a7c6c9cdbc9ce91cd13d962dd0345b4ef`, stacked on main `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`. `docs/handoffs/CURRENT.md` is unchanged; this slice uses standalone redacted `docs/handoffs/YS-SYS-001-STATUS.md`.
- Migration `0023_systems-registry-foundation.sql` is additive. It adds six checked classes and provenance/verification/role fields without updating legacy rows; adds normalized owner-scoped relationships with endpoint FKs and audit protection; and adds indexes. No seed or data migration is included.
- Legacy directory service filters to `provider_service` and returns the existing explicit DTO projection. Typed access requires exact `YS_SYS_001_ENABLED=true` and server-derived owner authorization; no typed route is introduced.
- Added a disposable upgrade test with seven synthetic entries and eleven synthetic audit events. It compares explicit migration-0020 legacy-column projections, per-entry counts, deterministic SHA-256 fingerprints, and all audit rows after 0023; it also checks class/FK/immutability and legacy DTO behavior. CI's existing disposable PostgreSQL workflow runs the full migration runner twice; exact PR-head CI is pending.
- `bun run db:migrate:check` passes with 23 ordered migrations; `bun run yorkstead:check` passes (39 active specs); `bun run typecheck`, `bun run build`, and `bun run lint` pass. Lint retains the existing warning at `components/login-panel.tsx:62`.
- Full `bun test`: 437 passed, 117 skipped, 0 failed. The new PostgreSQL preservation test is among the skips because no PostgreSQL service is running and Docker cannot reach a daemon.
- `bun run test:e2e`: 25 passed, 10 failed. Failures include database-dependent owner-session requests against unavailable `127.0.0.1:5432` and unrelated public/browser navigation timeouts; CI browser execution with disposable PostgreSQL is pending.
- No authorized production recovery artifact was available, so private row-level parity and restore rehearsal remain incomplete. Production migration is **NO-GO** pending private evidence, owner decisions, and a passed isolated restore rehearsal.
- No production data/schema/configuration/backup/branch changed. No PR was merged or production deployment triggered.

## PR #89 — rebased read-only production diagnostic

- PR #89 has been refreshed onto newer `main` at `798c9ed7f6115a332c8c35cee8456ae16d5010a7` (PR #88 merge). Its diagnostic changes are preserved; PR remains draft and unmerged.
- Reuses the existing owner-only route; mode requires production environment, owner auth, both absent-by-default flags, and the published Vercel per-IP rate rule. It returns only endpoint ID and safe database/schema/migration metadata, aggregate counts, stable IDs/revision/archive state, per-entry audit counts/fingerprints, and schema protection summaries.
- No production secret was retrieved, production database queried, or production configuration/data/schema changed.
- Local verification on the unchanged implementation: focused tests passed (6 tests, 40 assertions); full suite passed (435 passed, 116 skipped, 0 failed); typecheck/build/spec check/migration check passed; lint passed with one pre-existing warning at `components/login-panel.tsx:62`.
- The repository's Vercel integration created a Preview deployment; its check succeeded. The preflight mode is inaccessible in Preview because `VERCEL_ENV` is not production and the two flags are absent.
- See the [live PR checks](https://github.com/yorkstead/website/pull/89) for current exact-head Actions and Vercel status.
## PR 1 readiness preflight — 2026-11-02

- Live `origin/main` is `0d7f2379d359fa63ee7cf70e4fa49040328f30e2`; PR #87 merged at that SHA. Latest Vercel production deployment is READY at the same source SHA.
- Production DB binding could not be verified: Vercel connector metadata returned 403 for the project, Vercel environment metadata returned 404 under available scope, and multiple Neon `website` projects remain unbound to the deployed `DATABASE_URL`.
- No production database query was run. The earlier candidate-only 7/11/0 counts and 22 migration matches remain historical and do not establish production state.
- Production migration ledger, seven-record identities/revisions/archive values, audit counts/fingerprints and trigger/schema protections remain unverified. Production backup/PITR retention, current recovery point and restore procedure are also unverified; no restore was tested.
- Recommendation: **NO-GO for PR 1 implementation**. The complete access boundary and next required evidence are documented in `production-preflight.md`.
- No production configuration/data/schema action, merge or deployment occurred.

## Current session evidence

- Initial repository observation at `2026-11-01T23:25:12Z`; final PR-head check at `2026-11-02T00:04:00Z` UTC.
- GitHub repository API: `yorkstead/website`, default branch `main`.
- GitHub commit lookup resolved `main` to `9070c538277cccf852a3fc0efc214fe65238c1fa`.
- Dedicated checkout `/tmp/website-ys-sys-001`, delivery branch `docs/86-systems-registry-pr0`, base `9070c538277cccf852a3fc0efc214fe65238c1fa`; initial checkout was clean before PR 0 edits. Local commit history differs from the API-published branch because network publishing used GitHub's file API after shell DNS failed.
- Original checkout `/home/brandon/development/yorkstead/website` remains on its pre-existing dirty CC-022B branch and was not modified.
- Vercel production deployment list reports project `website`, state `READY`, branch `main`, and source SHA `9070c538277cccf852a3fc0efc214fe65238c1fa`.
- Follow-up cross-project check at `2026-11-01T23:28:04Z`: Hub `main` is `02c21a31784de965ce35d1af8c6cedcfd57230f2`; incident PR #93 is closed/merged; latest Hub Vercel production deployment is READY at the same SHA. Its PR record says production schema recovery still requires separately authorized migrations. No Website/Hub production database was queried in this session.
- Git shell remote/DNS commands could not resolve `github.com`; GitHub API and Vercel connectors supplied the remote facts. No shell `git fetch` or CI-run query occurred.
- Repository discovery confirms migration `0020` defines `system_directory_entries` and `system_directory_audit`; there is no seed statement. Audit insert/update is trigger-recorded and history update/delete/truncate is rejected by a database trigger.
- Production database target, applied migration ledger, current seven rows and audit fingerprints are not verified. No production DB or environment values were read.
- Dependencies were installed with `bun install --frozen-lockfile --offline`; no lockfile or manifest changes resulted.

## Checks

- Not applicable: no code, SQL migration, dependency, route or runtime behavior changed in PR 0.
- `bun run yorkstead:check` — passed; 39 active spec directories and required scripts present.
- `bun run db:migrate:check` — passed; all 22 ordered application migrations validate. This checks repository migration ordering only, not production application state.
- `git diff --check` — passed.
- No tests were added or run. Database and browser verification belong to implementation slices and require disposable fixtures, never production.

## Acceptance mapping

1. Sole registry authority and existing compatibility surfaces: `discovery.md`, `spec.md`, ADR 0001.
2. Seven-record preservation and audit fingerprint gate: `discovery.md`, `operations.md`; live baseline remains an explicit unresolved pre-PR-1 gate.
3. Six distinct classes, provenance, ownership, cost, dependency and monitoring scope: `spec.md`.
4. Seven independently reviewable implementation slices with cross-workstream sequencing: `plan.md`, `tasks.md`, `docs/ROADMAP.md`.
5. Production safety, rollback, authorization gates: `operations.md`.

## Delivery

Draft [PR #87](https://github.com/yorkstead/website/pull/87), `YS-SYS-001 PR 0: Systems Registry discovery and sequence`, is open against `main` and references issue #86. At exact remote head `d1c949fccae3786f7a5b358e0bc0312f02c131d8`, GitHub compare reports nine intended files, 353 additions, zero deletions, ahead 13/behind 0 from base `9070c538277cccf852a3fc0efc214fe65238c1fa`. The full `CURRENT.md` was verified byte-for-byte against the remote branch after an earlier truncated update was detected and corrected. Exact-head GitHub Actions [run 41362511856](https://github.com/yorkstead/website/actions/runs/41362511856) completed successfully, and Vercel [preview](https://vercel.com/yorkstead/website/7czDzzR8d4efSbbjScJQv9U8dxx6) succeeded. A follow-up handoff/verification documentation commit comes after this checked SHA; inspect current PR checks before review completion.

PR 0 is not a declaration that the production row/audit baseline or database binding has been verified. Do not merge or deploy. The next implementation slice is PR 1 preservation foundation, blocked on read-only production baseline evidence and independent review.

## PR 90 review and PR 1 recovery readiness — 2026-11-02

- Live GitHub still identifies `main` as `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`; migration list ends at `0022`, so `0023` is the next repository candidate.
- PR #90 latest head `dc57479314ca5fbd296f5215cbf4efa274a83011`: GitHub Actions run 41382676615 completed successfully; Vercel Preview is Ready. PR remains open/draft. No review submissions or inline review threads were found; the only PR comment is Vercel's automated Preview status. No fixes were requested.
- Read-only Neon recheck at 2026-11-02T03:25Z confirms six-hour project history, no branch snapshot schedule, no saved snapshots, project plan metadata `free_v3`. No branch, snapshot, database, schedule, or connection was changed; no restore was tested.
- The owner-reported endpoint remains exactly matched to Neon project `website`, production branch and `neondb`. Owner diagnostic results report seven entries, eleven audits, zero orphans and matching 22-migration ledger. Exact stable IDs, revisions/archive flags, per-entry counts/values/fingerprints and diagnostic timestamp are not available here for independent review.
- Added the private parity procedure, the schema-change fingerprint caveat, a Neon recovery runbook, and migration 0023 compatibility/disposable-test design. The whole-row entry MD5 changes when columns are added; post-migration checks therefore use an explicit versioned projection of the original 0020 columns. The unchanged audit table's eleven event fingerprints/counts must remain exact.
- **Readiness:** GO to continue design and disposable-only migration/restore preparation. NO-GO for production migration pending private row-level review, verified recovery point and durability, disposable restore rehearsal, agreed RPO/RTO/data exposure, and separate owner authorization.
- No production query or mutation was performed in this documentation update. Repository checks on this docs branch: `bun install --frozen-lockfile --offline` passed without lockfile changes; `bun run yorkstead:check` passed (39 active specs); `bun run db:migrate:check` passed (22 ordered migrations); `git diff --check` passed. No application tests were run because this slice changes documentation only.
- Recovery and preservation procedures: `recovery-runbook.md` and `production-preflight.md`. Exact private row-level evidence has not been independently reviewed; production migration remains NO-GO.
