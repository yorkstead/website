# Website verification evidence

## Acceptance evidence

| Requirement | Evidence |
|---|---|
| Owner auth precedes one CC-021 read | PASS — page source regression test asserts owner redirect gate precedes the single server read. |
| Calendar/tasks map to active UI without reducing the 100-item task bound | PASS — adapter tests retain 100 tasks, canonical status/due data, Denver timed label, and all-day summary; no priority is synthesized. |
| Older v1 responses show unsupported/unavailable rather than empty | PASS — parser accepts the prior optional-field-free v1 fixture; adapter maps missing Dashboard task/Calendar sections to unavailable. |
| Dashboard uses one shared DTO for task panel and attention view | PASS — server page calls `getAutomationHubData()` once; the same sanitized result is passed to Dashboard and Unified Attention View. |
| No ordinary `/api/briefing` call or client-visible credential | PASS — static call-path regression test finds no briefing route in Dashboard page/adapter and no attention-view Hub fetch; server-only fetch credential remains in the existing read client. |
| Explicit task completion remains on its existing authorized POST endpoint | PASS by code review — the existing confirmed `/api/dashboard/google-task` POST handler was not changed; new projection adapter/view is pure/read-only. |
| Authenticated browser coverage passes | Test added with synthetic owner bootstrap/sign-in only when `TEST_DATABASE_URL` is explicit; it skips without that disposable database. Local run skipped because `TEST_DATABASE_URL` is unset. Exact-head CI result pending. Full local E2E: 25 passed, 10 failed, 1 skipped; owner-only routes fail in this environment because PostgreSQL at 127.0.0.1:5432 is unavailable. Separate failures: JWLD portfolio page hits `Unexpected end of JSON input`; public-navigation enumeration timed out. These are not attributed to PostgreSQL without evidence. |
| Exact-head Website CI passes | Pending — draft PR not yet opened. |

## Commands

Runtime: Bun 1.4.2, Node 26.10.0, Next.js 16.4.2. `bun run yorkstead:check` passed; `bun run db:migrate:check` validated all 24 migrations; lint passed with one pre-existing warning at `components/login-panel.tsx:62`; typecheck passed; full unit suite passed 517 with 123 existing database-gated skips. Focused CC-021/data/component tests passed 18/18. Targeted CC-021 E2E and full E2E were run; the focused test skipped because `TEST_DATABASE_URL` is unset, full suite completed 25/36 passing with 10 environment failures and 1 skip (details above). Local `bun run build` is NOT VERIFIED: Next could not fetch Geist/Geist Mono from Google Fonts because sandbox DNS/network access is blocked. No production deployment, live data, or external task/calendar mutation was performed. `git diff --check`, exact implementation SHA, and GitHub CI will be recorded after final review/push.
