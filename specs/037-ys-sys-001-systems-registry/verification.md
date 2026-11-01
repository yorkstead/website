# YS-SYS-001 verification record — PR 0

## Current session evidence

- Observed at `2026-11-01T23:25:12Z` from system UTC clock.
- GitHub repository API: `yorkstead/website`, default branch `main`.
- GitHub commit lookup resolved `main` to `9070c538277cccf852a3fc0efc214fe65238c1fa`.
- Dedicated checkout `/tmp/website-ys-sys-001`, branch `codex/ys-sys-001-pr0`, HEAD `9070c538277cccf852a3fc0efc214fe65238c1fa`; clean before PR 0 edits.
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

Draft [PR #87](https://github.com/yorkstead/website/pull/87), `YS-SYS-001 PR 0: Systems Registry discovery and sequence`, is open against `main` and references issue #86. The initial remote branch head was `c4be1eee6c0092b174786140a77f99ac54f79721`; the PR comparison initially exposed a truncated `CURRENT.md` update (91 deleted historical lines). That was corrected from the complete local handoff and verified byte-for-byte; final remote branch head and exact-head CI/Vercel status are recorded in the current handoff/PR after recheck.

PR 0 is not a declaration that the production row/audit baseline or database binding has been verified. Do not merge or deploy. The next implementation slice is PR 1 preservation foundation, blocked on read-only production baseline evidence and independent review.
