# Contact inquiry persistence verification

## Local verification (2026-10-29)

- `bun test tests/contact-submission.test.ts` — pass, 10 tests / 50 assertions.
- `bun run yorkstead:check` — pass; 25 active specs and required scripts.
- `bun run db:migrate:check` — pass; 18 ordered migrations validate. No migration added.
- `bun run lint` — pass with the pre-existing `components/login-panel.tsx:62` navigation warning.
- `bun run typecheck` — pass.
- `bun test` — pass, 363 passed / 108 skipped / 0 failed (3,939 assertions). Database-backed tests, including the new regression, skip locally because `TEST_DATABASE_URL` is not configured.
- Disposable PostgreSQL attempt — blocked: Docker CLI exists, but access to `/var/run/docker.sock` is denied. No local PostgreSQL server is installed or running. CI workflow provisions PostgreSQL 16, applies migrations twice, and runs the unskipped database suite.
- `bun run build` — blocked by Turbopack worker port binding (`Operation not permitted`). Webpack fallback `node node_modules/next/dist/bin/next build --webpack` also failed because Next could not parse TypeScript's `--showConfig` output, although `bun run typecheck` passes and `tsc --showConfig` emits valid JSON. No build artifacts were committed.
- `bun audit --audit-level=critical` — blocked by npm registry DNS resolution in this shell.
- `git diff --check` — pass.

## Database test design

`tests/contact-persistence-database.test.ts` calls the same insertion helper used by the contact server action. It asserts the migration-created partial index exists, verifies the new inquiry's fields by selecting the row, then submits the same unique key again and verifies no second row was created. The fixture runs in a transaction and rolls back.

Urgent PR [#71](https://github.com/yorkstead/website/pull/71) was verified at source head `b6fde5f1f1332409252e791759815541ff427227`. Exact PR-head CI run [#40800610037](https://github.com/yorkstead/website/actions/runs/40800610037) completed successfully. Its merge checkout was `ca36ae7c146ce377a70b1a7ffe73023dbafc10ea`, merging that PR head into base `075a6b5a189696ab5842ff5a4e13a53052af5e62`.

- Scaffold validation, critical dependency audit, migration-plan validation, both application migration passes, and Better Auth schema migration — pass.
- Full deterministic and PostgreSQL integration suite — 471 pass, 0 fail, 0 skipped. The new `contact inquiry persistence against the migrated PostgreSQL schema` test passed, confirming the actual partial index, persisted row values, and duplicate suppression.
- Lint and typecheck — pass.
- Standard Playwright browser suite — 31 passed; isolated customer enrollment, owner publishing, client access, portal readiness, and customer communications workflows — pass.
- Production build and clean-checkout validation — pass.

The preceding CI run [#40800574098](https://github.com/yorkstead/website/actions/runs/40800574098) was cancelled after the required handoff update changed the PR source head; integration tests had not started on that cancelled run. Run #40800610037 is the completed verification for source head `b6fde5f1f1332409252e791759815541ff427227`.

## Rollback

Revert the fix source commit. No migration, schema change, data backfill, or cleanup is required.
