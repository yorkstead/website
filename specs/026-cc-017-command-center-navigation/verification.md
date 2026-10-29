# Verification

No database changes were introduced.

## Required commands

- `bun run yorkstead:check`
- `bun run db:migrate:check`
- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run test:e2e`
- `bunx playwright test -c playwright.cc017.config.ts`
- `bun run build`
- `git diff --check`

Record local environment limitations and exact-head CI evidence after running checks. Do not use production data or deployment operations for verification.

## Local results

- `bun run yorkstead:check` — pass; 27 active spec directories.
- `bun run db:migrate:check` — pass; 18 migrations validated.
- `bun run lint` — pass; one pre-existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — pass.
- `bun test` — 369 passed, 109 PostgreSQL-dependent skipped, 0 failed.
- `bun run test:e2e` — 32/32 passed.
- `bunx playwright test -c playwright.cc017.config.ts` — app started, but authenticated fixture stopped before tests because identical loopback disposable `DATABASE_URL` and `TEST_DATABASE_URL` values are unavailable. The fixture did not connect to a non-disposable database.
- `bun run build` — blocked by Turbopack worker-port `EPERM` in the sandbox; the webpack fallback (`bunx next build --webpack`) fails parsing TypeScript `--showConfig`. Typecheck passes. Exact-head CI is expected to provide build and isolated browser evidence.
- `git diff --check` — pass at last local check; repeat after final edits.
