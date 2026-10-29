# CC-022 verification

## Hub
- Route tests: independent write bearer, bounds/schema/action/state validation, constant-time token compare, private/no-store headers, idempotency replay and conflict.
- Disposable PostgreSQL: migration fresh/repeat/upgrade; concurrent approve claims; duplicate command key and capture; task/CRM uniqueness; audit rows and no secrets/content.
- Mock Google token/task provider: success, pre-write failure retry safety, request timeout after POST start, malformed provider result and partial database completion.
- Run `git diff --check`, `bun run test`, `bun run typecheck`, `bun run build`, and available disposable schema checks. Never call production APIs.

## Website
- Verify Better Auth owner denial occurs before any Hub request; Hub write BFF fixed URL, no browser credential relay, body size/schema, CSRF and private/no-store.
- Unit tests cover disabled write credential, read credential compatibility, action results/conflicts/retry safety and safe error mapping.
- Playwright synthetic owner flows at desktop/mobile include details, confirmation, action destination/outcome, pending/failure/conflict/retry and lead staged review.
- Run `bun run yorkstead:check`, `bun run db:migrate:check`, lint, typecheck, all unit/integration/browser suites and build.

No live records, Google actions, production env modifications, manual deployments or merges. Record skipped checks and tested SHAs exactly.

## Local evidence — 2026-10-29

- Revision under test: `feat/cc-022-automation-capture-management`, based on verified Website `main` `94fc79aaa294532987526e9a50f82aff335cf1ec`. `bun run yorkstead:check` passed; `bun run db:migrate:check` validated all 19 existing Website migrations (CC-022 adds no Website migration).
- `bun run typecheck` passed. Focused CC-021/CC-022 tests passed 8/8; full `bun test` passed 391, with 110 existing database-dependent tests skipped because `TEST_DATABASE_URL` is not configured. `bun run lint` passed with the existing warning in `components/login-panel.tsx:62`. `git diff --check` passed.
- The CC-022 Playwright owner flows are discovered in `playwright.cc017.config.ts`; `--list` reports 7 total CC-017 cases. Local browser execution is blocked by missing disposable `TEST_DATABASE_URL` and `next dev` `listen EPERM` on loopback. Exact-head Website CI passed all browser cases, including the 2 CC-022 flows.
- `bun run build` is blocked locally by Turbopack's `creating new process / binding to a port / Operation not permitted`, including an elevated retry. `bunx next build --webpack` was also attempted and Next failed to parse TypeScript `--showConfig`; regular CI build remains required. TypeScript, lint and route tests passed independently.
- Hub backend-first dependency [PR #91](https://github.com/yorkstead/yorkstead-automation-hub/pull/91) has passing exact-head verification [run 40924663461](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40924663461) and PostgreSQL compatibility [run 40924663477](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40924663477). Website PR [#78](https://github.com/yorkstead/website/pull/78) is open second. Exact-head Website CI [run 40926030944](https://github.com/yorkstead/website/actions/runs/40926030944) passed on code revision `f6c7004`: disposable PostgreSQL and database tests, lint, typecheck, the complete Playwright matrix including all six CC-017 desktop/mobile navigation and capture tests, production build, and clean-worktree verification.
- No Website migration, production credential, record, route call, Google task, capture action, deployment or merge was performed. CC-021 reads remain version-1 compatible; added `captureActions` is optional in the parser.

## Existing PR follow-up — exact-head verification

- Website PR #78 head `8a2a85059e215acecee4b2c1449d5e578ff0b1be` passed exact-head CI [run 40940215215](https://github.com/yorkstead/website/actions/runs/40940215215): disposable PostgreSQL migrations/tests, full unit/integration suite, lint, typecheck, browser workflows (including immediate reclassification, `hub_unavailable` same-key recovery through failed refresh/remount, and needs_review controls), production build, and clean worktree.
- Hub PR #91 head `7422f1197b2a9cf3a97a7aff346b496dca64a93e` passed verification [run 40936292670](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40936292670) and PostgreSQL 16 compatibility [run 40936292765](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40936292765), including fresh/repeat/upgrade migrations, concurrency and audit checks, tests, typecheck, build and dependency audit.
- Earlier Website CI runs exposed two Playwright fixture issues in the new recovery case: reads stayed unavailable across an expected remount, and the restored capture heading matched two panels. The fixture now restores reads and scopes its heading locator; the exact-head run above passes.
- No live capture action, Google Task, CRM write, production data/configuration change, merge or deployment occurred. No production secrets were provisioned.

## Existing PR follow-up — 2026-10-29

- Hub race/recovery fixes and Website state persistence are being applied to existing PRs #91 and #78. No new PR is authorized. The current source changes add a Hub processing lease/CAS, marker-gated Google ambiguity recovery, and a reclassification/review guard; Website stores the request, command ID when returned, capture snapshot, and same-key recovery state in session storage.
- Final local Website checks: `bun run test` passed 391 tests with 110 pre-existing disposable-PostgreSQL-dependent skips; `bun run typecheck`, `bun run lint` (one existing login-panel warning), focused BFF tests (5/5), `bun run yorkstead:check`, and `bun run db:migrate:check` (19 migrations) passed.
- Playwright `--list` discovers CC-017 cases, including immediate default reclassification, no state-changing controls for `needs_review`, and same-key recovery across `hub_unavailable`, failed refresh and remount. Execution was attempted; owner fixtures stopped before tests because identical disposable `DATABASE_URL` and `TEST_DATABASE_URL` values are required and unavailable. No production database was used.
- `bun run build` was attempted in the sandbox and with filesystem/port escalation; both stop at Turbopack's `creating new process / binding to a port / Operation not permitted`. The PR CI build remains required.
- Updated-head Website CI and Hub PostgreSQL 16 disposable verification are pending after push. Replace this status with exact commit SHAs and CI links before completion.
