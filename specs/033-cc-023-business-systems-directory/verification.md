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
- GitHub Actions and preview-deployment results must be recorded against the exact PR head after the PR is opened. No merge or deployment is authorized.

## Exact-head CI follow-up

- Initial PR head `09644573e303093d47fea7cb5cfce5da905cdd63` failed two database tests: the integration fixture passed an empty documentation URL instead of `NULL`, and the prepared migration protocol assertion expected four CC-023 triggers while migration 0020 defines three. Both test expectations were corrected; rerun full checks and record the new exact-head CI result after pushing the correction.
- Browser rerun at corrected head `51ef671d72c77ea4e59281dfc98119b37f565c38` reached CC-023 but revealed that PostgreSQL DATE values decoded as `Date` objects were formatted as a weekday string by the persistence DTO. The mapper now converts date objects to `YYYY-MM-DD`, and the database integration case asserts the round trip. Rerun CI after pushing this correction.
