# CC-023 verification record

## Baseline

- Verified at 2026-10-30 04:50 UTC: Website `main` was `7901d0b2e6de9fabf92c2739cdd539b2c41468a3`; merged PR #79 at the same merge SHA. CC-023 branch starts from this exact main tip.
- Existing developer checkout on `feat/cc-022b-voice-shopping-payday-planning` had uncommitted edits and an untracked workspace file. It was not modified; CC-023 is isolated at `/tmp/website-cc023`.
- Repository source inspection confirmed existing owner gates, Operations monitor, static Automation Hub health contract, and project intelligence. No new external credential or health integration is authorized by repository evidence.

## Checks

- `bun run yorkstead:check` — passed; 34 active spec directories.
- `bun run db:migrate:check` — passed; 20 ordered migrations, including additive migration 0020.
- `bun run lint` — passed with 0 errors and one existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — passed.
- `bun test` — 404 passed, 111 skipped, 0 failed; 4,122 assertions across 515 tests in 120 files. PostgreSQL-dependent suites, including the CC-023 persistence test, were skipped because no disposable database was configured.
- `bunx playwright test -c playwright.cc023.config.ts --list` — passed; discovers the CC-023 owner browser scenario. The browser scenario was not run locally because `TEST_DATABASE_URL` and local PostgreSQL are unavailable.
- `bun run test:e2e` — executed 32 existing browser tests: 24 passed and 8 failed. The failures include owner-authenticated routes logging `ECONNREFUSED` to local PostgreSQL; one public-flow failure also occurred in this database-less local run. Treat browser verification as pending the clean PostgreSQL-backed CI run.
- `bunx playwright test -c playwright.cc023.config.ts` — the local server started after allowing the loopback test port, then the owner fixture safely refused to run because identical `DATABASE_URL` and `TEST_DATABASE_URL` values for a loopback disposable database were not configured.
- `bun run build` — passed using the installed Next.js 16.4.2 toolchain; Systems Directory page and API routes were included.
- Focused system-directory, project-intelligence, migration-plan, and portal-readiness tests — passed; three database-backed cases skipped.
- `git diff --check` — passed after the final UI and documentation edits.

## Environment and limits

- No production database, provider account, token, secret, or subscription was accessed or changed.
- Local PostgreSQL was unavailable (`TEST_DATABASE_URL` unset; `pg_isready` had no response). Docker was unavailable because the local socket was denied. Migration/integration/browser persistence execution is delegated to the PR's PostgreSQL-backed CI job.
- Final exact-head GitHub Actions and preview results are recorded below; no merge or production deployment is authorized.

## Exact-head CI follow-up

- Final PR head `c4a6f8bc3c6e4c11b4bd35c8fdcb8ae8b71aa99a` passed exact-head GitHub Actions run [41009951558](https://github.com/yorkstead/website/actions/runs/41009951558), including disposable PostgreSQL migration/integration tests, deterministic tests, lint, typecheck, all browser workflows including CC-023, production build and clean-worktree verification.
- Vercel preview succeeded for this PR head: [deployment](https://vercel.com/yorkstead/website/5jA4ZAM1U22mh1ntUonAkydYBZ5h). Vercel Preview Comments passed; Vercel Agent Review was skipped by the provider.
- Earlier CI failures were resolved: the database fixture now uses a null documentation URL, protocol tests assert the three CC-023 triggers, PostgreSQL DATE values map to `YYYY-MM-DD`, and the audit browser check accounts for both legitimate update rows.
- No merge, production deployment, provider credential setup, production data change, or subscription change occurred.


## PR #80 review-correction verification — 2026-10-30

- Added amount parser regressions for `12.50`, a blank value, partial decimal and malformed/oversized values; owner-browser flow checks raw decimal preservation, saved value, and clearing the amount.
- Added an owner-browser flow that verifies duplicate and revision-conflict errors remain in the modal with drafts intact.
- Added panel refresh coverage for both overview and existing project intelligence, verifies one request per source on refresh, the overview checked time advances only on successful overview responses, and project failure transitions to fresh observations. Existing project-intelligence tests cover retained stale data and degraded/failure states.
- Local full `bun test`: 406 passed, 111 PostgreSQL-dependent skipped, 0 failed (517 total); `bun run db:migrate:check`: all 20 migrations validated; `bun run yorkstead:check`: passed; lint: 0 errors (one existing warning at `components/login-panel.tsx:62`); typecheck and `bun run build`: passed; `bunx playwright test -c playwright.cc023.config.ts --list`: two CC-023 owner-browser tests discovered.
- Local PostgreSQL is unavailable (`pg_isready` reports no server; `TEST_DATABASE_URL` is unset). Docker is installed as a snap but cannot launch because snap confinement refuses to start. The owner-browser tests and database suites therefore require GitHub CI's disposable PostgreSQL workflow. Exact-head run, Vercel status, and review-thread resolution will be recorded after push.

- First exact-head GitHub run `41012863223` passed disposable PostgreSQL migration/integration, deterministic tests, lint, typecheck and standard Playwright. The added coordinated-refresh browser test stopped at an ambiguous `New project` locator (three matches); it is now scoped to the primary button and full exact-head CI must be rerun.

- Second exact-head run `41013748867` passed disposable PostgreSQL, deterministic/database tests, lint, typecheck and the standard browser matrix. The CC-023 directory/save browser test passed; the refresh browser test reached its expected overview-error state but its broad `role=status` locator matched both the dashboard toast and panel warning. The assertion now targets the panel warning paragraph specifically.
