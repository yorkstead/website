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
| Authenticated browser coverage passes | PASS — Website CI disposable PostgreSQL bootstrap/sign-in ran the new authenticated Dashboard browser test as part of the successful browser-test step on PR #115 head `1f904ce97fba90b26f2b4054cfc8a7ce40ef4e95`. Local run skipped because `TEST_DATABASE_URL` is unset. Full local E2E: 25 passed, 10 failed, 1 skipped; eight owner-only routes fail because local PostgreSQL is unavailable; separately, JWLD portfolio JSON parsing fails and public-navigation enumeration times out. These unrelated failures are not attributed to PostgreSQL. |
| Exact-head Website CI passes | PASS — workflow run [42448145846](https://github.com/yorkstead/website/actions/runs/42448145846), exact head `1f904ce97fba90b26f2b4054cfc8a7ce40ef4e95`; application verification and all three synthetic recovery jobs passed, including migrations, unit/integration tests, lint, typecheck, browser workflows, production build, and clean-worktree check. Vercel preview status succeeded; this is not production deployment evidence. |

## Commands

Runtime: Bun 1.4.2, Node 26.10.0, Next.js 16.4.2. `bun run yorkstead:check` passed; `bun run db:migrate:check` validated all 24 migrations; lint passed with one pre-existing warning at `components/login-panel.tsx:62`; typecheck passed; full local unit suite passed 517 with 123 existing database-gated skips. Focused CC-021/data/component tests passed 18/18. Local full E2E completed 25 passes, 10 environment/unrelated failures, and 1 skip (details above); authenticated CC-021 browser coverage passed in exact-head CI. Local `bun run build` could not fetch Geist fonts because sandbox DNS/network access is blocked; CI production build passed. PR #115 remains draft at `1f904ce97fba90b26f2b4054cfc8a7ce40ef4e95`; no production deployment, live data, or external task/calendar mutation was performed.
