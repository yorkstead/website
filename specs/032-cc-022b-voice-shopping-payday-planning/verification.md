# CC-022B verification

## Required Hub checks

- Deterministic capture unit tests for shopping intent, distinct items, dates/next payday, ambiguous scope, duplicate identity, repeat intent, corrections, carry-forward, priority confirmation and explicit recurrence.
- Mocked Google Tasks/Calendar/CRM providers prove shopping captures never dispatch to them.
- Disposable PostgreSQL runs migration fresh/repeat/upgrade, transaction/idempotency, concurrent CAS, immutable audit and personal/business isolation cases.
- Run `bun test`, `bun run typecheck`, `bun run build`, migration verifier and `git diff --check`.

## Required Website checks

- BFF owner denial before Hub request, strict validation, body bounds, origin checks, private response headers and no browser credential forwarding.
- Same-key recovery across timeout/failed refresh/remount and safe handling of stale revisions.
- Browser coverage for capture-to-shopping, immediate review/correction, purchase/undo/postpone, filters, payday receipt/reserves, refresh failure, and responsive 390px/desktop layouts.
- Run `bun run yorkstead:check`, `bun run db:migrate:check`, lint, typecheck, full Bun tests, build and relevant Playwright suites.

## Manual acceptance

Use a synthetic utterance only: “Add bottled water and laundry detergent to my shopping list for next payday.” Verify two Hub items share one capture, review/edit and history work, CC-021 exposes only sanitized bounded fields, Website owner planner displays them, and no Google Task, Calendar event or CRM record is created. This is a disposable/synthetic environment exercise only.

Record command, result, revision, environment, skips and exact CI run. Do not access production data, credentials, providers or scheduled automation.

## Local verification — 2026-10-29

- `bun run yorkstead:check` — passed; 33 active specs and required scripts detected.
- `bun run db:migrate:check` — passed; all 19 Website migrations validated.
- `bun run lint` — passed with zero errors and one existing warning at `components/login-panel.tsx:62` (`no-location-assign-relative-destination`).
- `bun run typecheck` — passed.
- `bun test` — 396 passed, 110 PostgreSQL-dependent skipped, 0 failed (506 tests, 4,085 assertions).
- Shopping contract/BFF tests — 5 passed, 0 failed. E2E discovery — 32 tests listed.
- `bunx next build --webpack` — passed. The standard Turbopack build hit host worker process/port `EPERM` both in the default sandbox and after escalation.
- CC-017 browser execution started, then stopped in its shared fixture before running scenarios because identical disposable `DATABASE_URL` and `TEST_DATABASE_URL` values were not configured. The local disposable database is unavailable; no screenshots were generated. CI PostgreSQL and browser checks remain pending the PR.
- No production system, data, credential, external provider, or scheduled automation was accessed or changed.
