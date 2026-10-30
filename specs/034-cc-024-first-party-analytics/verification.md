# CC-024 verification

## Baseline

- Feature branch: `feat/cc-024-first-party-analytics` in the clean checkout `/home/brandon/development/yorkstead/website-cc024`.
- Base: `main` at `5c6109eebdb3900870ec6a7c6ad96b73c65e0efa` (GitHub API verified); branch parent commit `0e813e5c11f3e2497b3433a168470a0487475e27` contains only the CC-024 handoff update.
- Original dirty checkout `/home/brandon/development/yorkstead/website` is not used or modified.
- Shell `git ls-remote` is unavailable because `github.com` DNS resolution fails; connected GitHub API verifies the main tip and PR ancestry.

## Verification results

Commands were run in the isolated feature checkout after implementation:

- `bun run yorkstead:check` — passed; 35 active spec directories detected.
- `bun run db:migrate:check` — passed; 21 ordered migrations validated, including 0021.
- `bun run lint` — passed with one pre-existing warning in `components/login-panel.tsx:62`.
- `bun run typecheck` — passed after adding snapshot props to overview regressions.
- Focused analytics, migration, and Command Center tests — passed, 26 tests / 99 assertions; additional analytics persistence run passed 12 tests / 39 assertions.
- `bun test` — passed after the review corrections: 412 pass, 111 skipped database-backed tests, 0 failures (523 tests, 4,154 assertions). The 14 focused analytics persistence tests pass (43 assertions).
- `bun run build` — passed with Next.js 16.4.2.
- Local Playwright attempt — 24 passed, 8 failed while the isolated checkout had no local PostgreSQL; the failures were owner-route checks and public browser timeouts. A later local rerun could not bind the Playwright server because sandbox networking returned `EPERM`. The exact-head CI browser matrix below passed.
- Disposable PostgreSQL migration, fresh/repeat upgrade and inquiry-link integration — passed in GitHub CI. Local `TEST_DATABASE_URL` is not configured and `127.0.0.1:5432` has no listener. No production database is used.
- Exact implementation-head GitHub Actions run [41027641504](https://github.com/yorkstead/website/actions/runs/41027641504) — passed at `d3daf18abda8d7e53f6953ff20ef12b0390b80ec`: disposable PostgreSQL migrations/integration, full browser suite and isolated workflows, lint, typecheck, production build, and generated-worktree cleanliness.
- Local `git diff --check` passed. The current handoff/verification documentation update is a follow-up commit and triggers a fresh exact-head CI run.

## Limits

- No production environment/configuration, production database or production analytics data was inspected or changed.
- No test result is inferred from historical handoff counts.

## Final review corrections — 2026-10-30

- Verified starting PR #81 head: `5ea49b517a6c682062aaf7d12bf3a6716bf52dd6`; PR open, unmerged, draft. The three live Vercel review findings are preserved on the PR.
- Added view-instance-scoped event ID generation so React effect replays/retries reuse an ID while remounts, navigations, and changed view data create a new ID. Focused ID tests pass.
- Dashboard reporting now uses explicit `[since, now)` and `[previousSince, since)` boundaries for summary and seven-day snapshot metrics; related time-series, acquisition, CTA, interest, device, geography, vital, and pipeline queries are also capped at `now`.
- Stored-inquiry funnel attribution requires a non-null CRM inquiry link. Unlinked legacy outcomes remain a separate labeled step and in the historical outcome count.
- Focused analytics tests: 18 passed, 0 failed; the disposable PostgreSQL analytics regression is skipped locally because `TEST_DATABASE_URL` is unavailable. Exact-head CI run `41032496471` reached PostgreSQL and caught an incorrect test expectation that counted the prior-window inquiry in the current-window funnel. The expected current funnel delta is corrected to two; the prior inquiry remains covered by the prior-period summary assertion. Full verification is rerunning on the corrected head.
