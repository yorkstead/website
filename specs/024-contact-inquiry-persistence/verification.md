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

Urgent PR [#71](https://github.com/yorkstead/website/pull/71) is open at source head `0a79489ab68f20983090799579d4d2276fe4a217`. Exact-head CI run [#40800574098](https://github.com/yorkstead/website/actions/runs/40800574098) was queued at the last observation; append the completed disposable PostgreSQL, build, audit, browser, and other CI results after it finishes.

## Rollback

Revert the fix source commit. No migration, schema change, data backfill, or cleanup is required.
