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

## Current P2 review follow-up — 2026-10-30

- Edit forms capture the item's revision at `startEdit`; Save and Split submit that captured revision. A refresh that changes the server revision leaves the draft intact but blocks writes until the owner loads and reviews current values.
- Payday recovery lives in `AutomationHubRecords`, above the availability-dependent planner mount, and is hydrated from the validated sessionStorage payload when available. A blocked storage write retains the exact command in the stable page-session ref. HTTP 202 remains pending, item commands are blocked, and remount retries reuse the original payload/idempotency key.
- Local checks on the final code/test worktree: `bun run typecheck` passed; `bun run lint` passed with one pre-existing `components/login-panel.tsx:62` navigation warning; `bun test` passed (397 passed, 110 PostgreSQL-dependent skipped, 0 failed; 4,087 assertions); `bun run db:migrate:check` passed (19 migrations); `git diff --check` passed. Playwright discovered all 9 CC-017 tests. Local browser execution stopped at the shared fixture's required disposable-database guard because matching `DATABASE_URL`/`TEST_DATABASE_URL` are not configured. The local Turbopack build was blocked by host worker process/port `EPERM`; the exact-head CI build passed.
- Exact-head run 40976912340 initially caught two new-test locator issues (the item name changed after refresh, and the recovery text matched two status elements). Both selectors were corrected in `220ba94724df8871a9e117470cf67d1ad8e03fcf`; [full exact-head CI 40977677302](https://github.com/yorkstead/website/actions/runs/40977677302) passed disposable PostgreSQL migrations/integration, tests, lint, typecheck, all browser suites including the CC-017 cross-tab and blocked-storage/unavailable/degraded/remount scenarios, production build, and generated-worktree cleanliness. Final docs-head CI evidence is recorded in the PR verification summary after that run completes.


## Continued Website review follow-up — 2026-10-30

- Payday schedule drafts now capture the schedule revision when editing starts. A cross-tab refresh that advances the revision leaves the draft visible but blocks save until the owner reloads and reviews current schedule values. The new regression confirms no stale command is sent and the reviewed command uses the current revision.
- Item-command recovery now lives in the `AutomationHubRecords` parent for the page session, with schema-validated sessionStorage hydration when available. An HTTP 202 followed by an unavailable read may unmount the planner, but recovery survives in the parent; after reads return, the planner offers retry with the original payload/key and blocks a new conflicting command. The regression blocks storage writes, forces 503 then 202 and a failed refresh, remounts, verifies a duplicate action does not send, and reconciles with the identical idempotency key.
- First exact-head run `40980771660` passed PostgreSQL/database tests, lint, typecheck, and all but one CC-017 browser scenario. That scenario revealed an assertion ordering issue: 202 immediately triggers the simulated failed refresh and conditional unmount before the transient planner status can be asserted. The test now asserts the refresh failure, remount, duplicate prevention, and exact same-key retry directly.
- Final source/test head `69773a4b895bbce4d3f8918d8e6dc895af854a92` passed [full exact-head CI 40981740290](https://github.com/yorkstead/website/actions/runs/40981740290): disposable PostgreSQL migrations/integration, deterministic and database tests, lint, typecheck, all browser suites including CC-022B recovery/cross-tab cases, isolated owner/customer flows, production build, and generated-worktree cleanliness.
- Local typecheck, lint, full Bun suite (397 passed, 110 database-dependent skips, 0 failures; 4,087 assertions), scaffold validation (33 active specs), 19-migration check, webpack production build, and `git diff --check` passed. Lint reports only the existing `components/login-panel.tsx:62` warning. Local Playwright execution could not start the configured Next server in this sandbox; CI ran the disposable-database browser suite successfully. The two current P2 threads were resolved after the passing source/test head.
- Rollout remains Hub #92 first, then Website #79 after Hub contract validation in an approved nonproduction environment. No merge, deployment, production configuration/data change, purchase, or external provider operation was performed.


## Website review verification — 2026-10-30

- Cross-tab receipt regression: tab A captures the receipt revision when choosing a receipt date and enters amount/reserves; tab B confirms an updated amount; refreshing tab A marks the draft stale and disables confirmation. Reviewing the latest receipt resets its starting revision and requires reserves to be re-entered before a new confirmation. The command uses that reviewed revision.
- Bounded snapshot recovery regression: after an item command returns 202 and refresh unmounts the planner, a later available snapshot omits the pending item. The retry action remains visible outside the bounded item list, conflicting actions do not submit, and retry sends the exact original payload and idempotency key.
- Exact source/test head `fe99203ae14e39abc42e48d41d6d3562a67d5a86`: [full CI 40986168706](https://github.com/yorkstead/website/actions/runs/40986168706) passed disposable PostgreSQL migrations/integration, deterministic and DB tests, lint, typecheck, CC-022B browser scenarios, all other browser workflows, production build and clean generated-worktree verification. [Vercel](https://vercel.com/yorkstead/website/55sURrUbvS4kTYtMRfsrMKkXmbQj) succeeded.
- Local checks on the same code: `bun test` — 397 passed, 110 PostgreSQL-dependent skipped, 0 failed (4,087 assertions); `bun run typecheck`, `bun run yorkstead:check`, `bun run db:migrate:check` (19 migrations), and `bun run build -- --webpack` passed. `bun run lint` passed with the existing warning at `components/login-panel.tsx:62`. Playwright discovery listed 32 tests; full browser execution ran in CI with disposable PostgreSQL.
- Resolved only after the passing exact-head CI: bounded item recovery `PRRT_kwDOUJPn1c6x0BBI`; receipt revision guard `PRRT_kwDOUJPn1c6x0BBK`. No production data/configuration, deployment, merge or payment was performed.
