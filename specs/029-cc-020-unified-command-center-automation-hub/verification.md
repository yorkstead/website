# CC-020 verification

## Acceptance evidence

| Criterion | Evidence |
|---|---|
| Navigation and first-party Automations destination | `tests/e2e-cc017/navigation.e2e.ts` verifies primary navigation, active route, mobile/desktop use, and absence of the old Daily Operations link. |
| Owner authorization | The same isolated browser suite verifies unauthenticated redirect and owner-only page access. |
| Existing website monitor and Hub health reuse | Existing `/api/operations` remains the website status API; `getAutomationHubHealth` calls only `https://cal.yorkstead.com/api/health`, which returns static service liveness. The briefing generation route is not used as a health probe. |
| Safe Hub health state and errors | `lib/automation-hub-health.test.ts` covers the existing static health contract, upstream errors, unexpected responses, and network failure. |
| Capture/review and cross-system isolation | Browser asserts the existing Hub owner links; code and discovery show no capture POST, no DB reads/copies, no briefing generation call, and no Hub mutation endpoint calls. |

## Commands

Observed 2026-10-29 for exact PR head `ce04707d5eb6cfa817e86d374fec8e78837e46e0` on `feat/cc-020-command-center-automation-hub`, based on `0fdd303991e6b0d9739f7f572ed47950a974d03b`:

| Command | Result |
|---|---|
| `bun test lib/automation-hub-health.test.ts` | Pass, 2 tests. |
| `bun run yorkstead:check` | Pass, 30 active spec directories and required scripts present. |
| `bun run db:migrate:check` | Pass, 19 migrations validated; no migration applied or added. |
| `bun run lint` | Pass with one existing warning in `components/login-panel.tsx:62`; zero errors. |
| `bun run typecheck` | Pass. |
| `bun test` | Pass, 383 tests; 110 database-dependent skips; zero failures; 4,031 assertions. Database integration was skipped because no test database is configured. |
| `bun run test:e2e` | 31 passed, 1 failed. Existing unrelated `tests/e2e/jwld-store.e2e.ts` gallery dialog timed out waiting for `button[aria-label^="Expand"]`. |
| `bunx playwright test -c playwright.cc017.config.ts` | Could not complete the CC-017/CC-020 isolated browser suite locally. The fixture requires identical disposable `DATABASE_URL` and `TEST_DATABASE_URL` values, unavailable here. Exact-head CI passed this browser test using disposable PostgreSQL. |
| `bun run build` | Local run failed in sandbox and on approved retry: Turbopack worker could not create a process/bind a port (`EPERM`) while processing `app/globals.css`. Exact-head CI production build passed without production runtime secrets. |
| `git diff --check` | Pass. |
| GitHub Actions CI [run 40904616670](https://github.com/yorkstead/website/actions/runs/40904616670) | Pass on exact head `ce04707d5eb6cfa817e86d374fec8e78837e46e0`: migration validation/application to disposable PostgreSQL, database integration tests, lint, typecheck, browser suite including Command Center navigation, production build without production secrets, and clean-worktree check. |

PR [#76](https://github.com/yorkstead/website/pull/76) is open as a draft. Preview deployment and automated review checks succeeded; no database migration or production endpoint mutation was performed.

## Operational verification boundaries

- Local checks did not call a Hub application `/api/*` production endpoint, read/change production environment, execute a Tasker/device routine, or query/migrate production records. Vercel deployment/domain metadata was inspected read-only to identify the Hub deployment. Website Vercel preview is from the PR and is not production.
- The cross-system path is source- and contract-reviewed, not a live deployment or Tasker ingestion test. Record the exact CI head and all local sandbox/environment limitations after the checks run.
- Website owner authorization and isolated test fixtures can be verified in browser CI. Hub's separate session/tenant authorization remains enforced by its APIs and is not bypassed by the website links.
