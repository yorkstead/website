# Verification record

## Local verification — 2026-11-07

- Revision under test: branch `feat/112-marketing-crm-link`, based on verified live `main` `d92ecf1459ff09a620bebc4144262daf15f4a3e6`.
- `bun test lib/marketing-plan.test.ts lib/data-retention.test.ts tests/private-authorization.test.ts` — 20 passed, 0 failed.
- `bun run yorkstead:check` — passed (40 active spec directories).
- `bun run db:migrate:check` — passed (24 ordered migrations; no migration added).
- `bun run typecheck` — passed.
- `bun test` — 500 passed, 121 skipped, 0 failed. Skips are database-backed tests; `TEST_DATABASE_URL` is not configured.
- `bun run lint` — passed with one existing warning in `components/login-panel.tsx:62`.
- `git diff --check` — passed.
- `bun run test:e2e` — 25 passed, 10 failed. The unauthenticated owner-route scenarios failed because the local PostgreSQL/Better Auth connection is unavailable (`ECONNREFUSED 127.0.0.1:5432`); portfolio JSON parse and public navigation cases also failed in this broad run. No Marketing owner browser scenario is exercised by the default suite.
- `bun run build` — passed; production compilation, TypeScript, and static page generation completed.

## Pull request state

- PR [#113](https://github.com/yorkstead/website/pull/113) is open and unmerged against `main`; GitHub verified base `d92ecf1459ff09a620bebc4144262daf15f4a3e6`. The PR contains the implementation head `f1d1e4358504d2092111f70bf077ef785bc23e36` and a documentation-only closeout update.
- GitHub reports the PR mergeable. Vercel status for the closeout update was pending when checked; a prior implementation head received an automatic Ready PR preview. Automated Codex review was running when last inspected; no final exact-head review result was available yet.
- No production deployment was requested or performed.

## Merge-readiness follow-up — 2026-11-07

- The previous PR head `c1dde8dfb66dc8844671a1ec9549a09d92a14221` completed full GitHub Actions run [42352490009](https://github.com/yorkstead/website/actions/runs/42352490009): migrations and database integration against disposable PostgreSQL, all configured browser suites, lint, typecheck, build, and clean-worktree check passed. Its Vercel status is successful. This run predates the dedicated Marketing browser workflow below.
- Added `playwright.cc038.config.ts` and `tests/e2e-cc038/marketing-crm.e2e.ts`. It signs in as the configured owner, links a seeded Marketing prospect to a CRM inquiry, checks canonical CRM status/next step/follow-up and navigation, confirms linked sales fields are not editable, attempts a duplicate through the owner-authenticated API, and verifies activities/campaign content survive. It also checks the linked inquiry's archived state.
- Added `tests/marketing-retention-database.test.ts` to exercise the actual retention SQL in disposable PostgreSQL: a linked expired archive is retained, an unrelated expired archive is purged, an active inquiry is untouched, and removing the link restores normal purge eligibility. Local run skipped this database-backed test because `TEST_DATABASE_URL` is unset; exact-head CI is required for execution evidence.
- Local typecheck, lint, focused tests (21 passed, 1 database skip), full unit suite (501 passed, 122 database skips), scaffold, migration check (24), and production build passed. Local Playwright could not start its loopback dev server in the sandbox (`listen EPERM`); the disposable PostgreSQL service is also unavailable locally.
- Prior local full E2E: eight owner-authenticated cases failed because the local database was not listening (`ECONNREFUSED 127.0.0.1:5432`). The two other failures had separate causes: the `jwld-store` trace records `SyntaxError: Unexpected end of JSON input` in Next.js `loadManifest` while a production build and dev-server Playwright run overlapped, indicating a shared `.next` manifest race; the public-link crawler exhausted its explicit 60-second test budget while navigating serially to `/work/employee-barcodes`. That failure was a test timeout with no HTTP response or PostgreSQL dependency. The previous exact-head GitHub run's browser step passed, providing an independent successful run of those existing cases.
- Exact-head execution of the new Marketing browser flow and retention integration test is pending the next PR CI run.

## Acceptance evidence

- A1/A5: `marketingCrmLinkShapeError` and `validateMarketingCrmLinks`; owner-only `PUT /api/marketing-workspace`; route tests reject missing, invalid, and duplicate relationships.
- A2: Marketing pipeline cards and prospect editor render CRM status, `next_step`, follow-up date, and the canonical lead URL.
- A3/A4: normalized prospects retain only `crmLeadId`; unit coverage confirms existing outreach activity and campaign content survive linking.
- A6: `archivedInquiryPurgeQuery` excludes CRM IDs referenced by Marketing; retention test checks the guard.
- A7: no Opportunity Discovery files changed.
- A8: focused route, validation, duplicate-link, unauthorized-access, retention, and history tests above.
- A9: no CRM creation, field synchronization, new migration/service/event system, production operation, merge, or deployment.
