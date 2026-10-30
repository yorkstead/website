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

## Review corrections — 2026-10-29

- Receipt confirmation now requires an entered, finite, nonnegative amount; a blank value does not create a command or zero-income record.
- No repeat sends recurrenceRule as null, including ordinary edits and removal of an existing recurrence.
- HTTP 202 is rendered as pending. The original command and idempotency key remain stored, and another item action is blocked until that key is reconciled. Network/provider uncertainty keeps the same recovery key; definitive HTTP 400/415/422 input/schema rejection clears the rejected payday key so corrected input can be submitted with a new key.
- Added BFF status-preservation coverage and expanded the CC-017 Playwright scenario for blank receipt, recurrence removal, corrected payday input, 503 same-key recovery, 202 pending/retry, and blocking another action.
- Local evidence on the correction worktree: scaffold check and 19-migration check passed; typecheck passed; lint had 0 errors and one pre-existing login-panel warning; full Bun suite 397 passed, 110 PostgreSQL-dependent skipped, 0 failed; BFF/schema tests 6 passed. Playwright discovery passed, but local execution stopped at its disposable-database guard because matching `DATABASE_URL` and `TEST_DATABASE_URL` are unavailable. Local production build attempts hit sandbox/Next host restrictions; exact-head CI covers build and browser execution.
- Exact-head evidence for the initial fixes: Website `6e9527e219e3dd3f7e4c65d23b3be9b13e5d3aca`; [full CI](https://github.com/yorkstead/website/actions/runs/40965424225) passed PostgreSQL migrations/integration, unit tests, lint, typecheck, browser workflows including the CC-022 shopping owner scenario, production build, and clean generated-worktree check. The matching [Vercel check](https://vercel.com/yorkstead/website/3G6Ji8qdPJYQmn2pDqMwiSB5ZvrY) succeeded, resolving the four original review threads.
- A subsequent review pass identified two more recovery edge cases: overlapping shopping commands could overwrite pending state, and blocked session storage could discard a payday key after an ambiguous result. The planner now serializes all command submissions and retains the payday command in a page-session ref as a fallback. Browser coverage holds an item command in flight while another item's editor is open, and blocks payday session storage while exercising 503/202/same-key recovery.
- Follow-up exact-head verification: Website application `c34fa996cc6afb8dacf80dbcdeab2934e2857ffb`; [full CI run 40971125294](https://github.com/yorkstead/website/actions/runs/40971125294) passed disposable PostgreSQL migration/integration, deterministic and database tests, lint, typecheck, CC-022 shopping browser regressions, all other browser workflows, production build, and generated-worktree cleanliness. Final documentation head `81c10dec9be6883567a606c53ebf8a5b73915d0a` passed [full exact-head CI 40972288651](https://github.com/yorkstead/website/actions/runs/40972288651) and [Vercel](https://vercel.com/yorkstead/website/2S2RE2hSzSCHgfoVZrNEFzbRMCUF). Both follow-up review threads are resolved and PR #79 is ready for review.

## Current Website review follow-up — 2026-10-29

- Cross-tab edit regression: Tab A opens an item at revision 1 and changes its draft; Tab B updates it to revision 2; Tab A refreshes and must not submit the stale draft. Saving remains disabled until Tab A loads/reviews current values, then the new command uses revision 2.
- Payday recovery regression: block sessionStorage writes, receive an ambiguous result followed by HTTP 202, and make the automatic read refresh fail with 503. Confirm the planner unmounts, recover reads and remount it, then retry the exact payload/key. Repeat with a degraded Hub read, ensure conflicting item actions do not send, recover/remount, and reconcile using the same key without duplicate commands.
- Run task-specific browser tests, full Bun tests, scaffold/migration checks, lint, typecheck, production build, and full PR CI. Record exact final PR head and CI result here after completion. Do not resolve the two current P2 threads before those checks pass.
