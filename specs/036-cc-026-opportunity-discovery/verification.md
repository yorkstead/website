# CC-026 verification record

## PR #83 review correction verification (2026-10-30)

- Corrected the overdue report's PostgreSQL `DATE` mapping to an ISO calendar-day string before rendering; a disposable PostgreSQL regression checks the returned value.
- Reused the retention job's restrictive migration-0022 CRM link with a shared parameterized purge query. Its disposable PostgreSQL regression checks that unrelated eligible inquiries purge while linked research remains, then that owner erasure releases the inquiry for a later purge and leaves an audit event.
- Promotion now takes independent normalized company and email transaction locks in fixed order. Disposable PostgreSQL regressions race two distinct opportunities with the same company/different emails and the same email/different companies, asserting exactly one new CRM lead and one rejected duplicate.
- Local `bun run yorkstead:check`, `bun run db:migrate:check`, `bun run typecheck`, `bun run lint`, `bun test`, and `bun run build` pass. Lint retains the pre-existing login-panel warning. Local `bun test` reports 428 pass, 116 PostgreSQL-backed skips, 0 fail. The disposable database and full browser suite are required in exact-head CI; the local browser run cannot exercise database-backed owner flows without PostgreSQL. Final CI evidence belongs in the PR review replies.
- [GitHub Actions run 457](https://github.com/yorkstead/website/actions/runs/41069465245) passed at code head `76960dbaabb9c3ebae69c381e0de0bc67ee8338c`, including disposable PostgreSQL migrations and integration tests, default and isolated Playwright suites, CC-026 screenshots, production build, and clean-worktree verification. Vercel passed at the same head. The local full browser suite had 27 passes and 6 database-dependent owner-route failures; CI passed those routes with its PostgreSQL service. All three review threads were answered and resolved after exact-code-head verification.

Verification is performed from the isolated `feat/cc-026-opportunity-discovery` checkout based on the verified `main` SHA `62a64895117c8e6a8f3b45adfa45e8884fb33452`. Record the final branch HEAD and CI result in the PR before completion.

## Required repository checks

| Check | Result |
|---|---|
| `bun run yorkstead:check` | Pass; 37 active spec directories |
| `bun run db:migrate:check` | Pass; migrations 0001–0022 validated |
| `bun run typecheck` | Pass |
| `bun run lint` | Pass with one pre-existing warning in `components/login-panel.tsx:62` (`window.location.assign`) |
| `bun test` | Pass: 428 passed, 113 skipped, 0 failed, 4,230 assertions. Skips are PostgreSQL-backed tests with no database URL. |
| `bun run build` | Pass on Next.js 16.4.2 |
| `bun run test:e2e` | 25 passed, 8 failed. This environment has no PostgreSQL (`ECONNREFUSED 127.0.0.1:5432`), which breaks existing owner/session route checks and owner workflows; one public navigation check also failed during the run. See CI with disposable PostgreSQL for authoritative browser results. |
| `bunx playwright test -c playwright.cc026.config.ts` | Could not start its Next web server in this local sandbox (`listen EPERM` on loopback). The owner workflow also requires disposable PostgreSQL; run in CI. |
| PostgreSQL opportunity integration tests | Skipped in local `bun test`; requires `TEST_DATABASE_URL` and `DATABASE_URL` pointing to disposable PostgreSQL, unavailable here. |

## Focused coverage

- `lib/opportunity-discovery.test.ts`: parser bounds, date/source URL safety, evidence classifications, transparent unknown behavior, transitions, duplicate name normalization, and evidence-grounded draft generation.
- `tests/opportunity-discovery-database.test.ts`: research/CRM separation, validation prerequisites, evidence and interview persistence, parallel idempotent promotion, independent company/email lock races, duplicate linking, CRM follow-up preservation, conversion-event separation, overdue DATE serialization, retention with linked and unrelated inquiries, audit history, and archived erasure.
- `tests/analytics-persistence.test.ts`: rejects a research event from the public first-party conversion event contract.
- `tests/e2e-cc026/opportunity-discovery.e2e.ts`: unauthenticated owner-page redirect, disabled customer-route isolation, authenticated research workflow, no premature CRM lead, responsive owner navigation, and desktop/mobile screenshots. CI uploads screenshots as `cc026-opportunity-discovery-screenshots` for 14 days.

## Local environment limits

The isolated local environment has no PostgreSQL server or `TEST_DATABASE_URL`; Docker is unavailable because its installed snap confinement refuses access. Database integration and owner browser workflow results must not be represented as locally passed. CI provisions disposable PostgreSQL, applies migrations twice, runs the full database suite and browser tests, and uploads responsive screenshots. No production database, customer data, secrets, configuration, deployment, or outbound communication was used.
