# CC-019 verification

## Local verification — 2026-10-29

- Worktree branch: `feat/cc-019-crm-sales-workflow`, based on successfully fetched `origin/main` `c6bdba2db78fafcb6f1745f30132ac82a55c7933`. Changes were uncommitted during local checks.
- `bun run yorkstead:check` — pass (29 active spec directories).
- `bun run db:migrate:check` — pass (19 ordered migrations).
- `bun run typecheck` — pass.
- `bun run lint` — pass with the existing `components/login-panel.tsx:62` navigation warning.
- `bun test` — 380 pass, 110 skipped, 0 fail (4,018 assertions). PostgreSQL tests, including the new CC-019 schema test, skipped because `TEST_DATABASE_URL` is not configured.
- Playwright CC-018/019 test discovery — pass (3 owner browser tests found) when given a syntactically valid loopback disposable URL for discovery only. The owner browser workflow itself was not run: no disposable PostgreSQL server is available. Docker cannot start in the sandbox (`XDG_RUNTIME_DIR` is read-only); PostgreSQL server binaries are absent and localhost:5432 has no server. CI provisions disposable PostgreSQL and runs this browser workflow.
- `bun run build` — blocked by sandbox `EPERM` when Turbopack's CSS worker tries to bind a port. No webpack fallback was used because it is not the repository build matrix.
- `git diff --check` — pass.

## CI evidence

PR [#75](https://github.com/yorkstead/website/pull/75) is open against `main`. The Vercel review bot added corrections for saved-consultation deep links and the test fixture service slug; code head `66bd6384caf5eb011131689f742ef340bf0dcc72` included those fixes. Earlier CI run [40868543028](https://github.com/yorkstead/website/actions/runs/40868543028) reached the CC-018/019 owner workflow and failed because its fixture service slug violated `consultations_service_slug_check`; the subsequent code head corrected that fixture. CI run [40869440315](https://github.com/yorkstead/website/actions/runs/40869440315) concluded `action_required` with no jobs created. That status is historical; see the later exact-head evidence below. Do not merge or manually deploy.

## Proposal editing and lifecycle follow-up — 2026-10-29

- Run [40869777657](https://github.com/yorkstead/website/actions/runs/40869777657) logs confirm migration application, database integration, lint, and typecheck succeeded; CC-016 failed at the post-completion `followUpAt` locator. The underlying assertion still expects an empty value. Playwright reports strict-mode selector-generation `TypeError: text.replace is not a function` for `#lead-14 input[name='followUpAt']`; the test now uses the exact accessible label while retaining the empty-value assertion and adds a direct database `follow_up_at IS NULL` assertion before conversion.
- Added `updateProposalAction` and `updateProposal` to edit engagement, explicit amount, next action, and date on the existing proposal row. Proposal ID and state are unchanged. Server action rechecks owner session and parser validation; SQL scopes by lead and proposal identity and excludes archived/retired inquiries. Empty action/date persists as empty text/null timestamp.
- Unit coverage validates edit amounts, UUID, field bounds, dates, and clearing. Owner authorization coverage includes edit action rejection. Disposable PostgreSQL coverage asserts in-place ID-preserving update, amount total recalculation, rescheduling/clearing, and retired lead rejection. Browser workflow edits engagement/amount, reschedules then clears the action/date, verifies active/won totals and one proposal identity. Browser coverage also keeps CC-016 follow-up clear assertions.
- Local follow-up checks: scaffold pass; 19 migrations pass; typecheck pass; lint pass with one pre-existing login warning; full unit suite 381 pass / 110 database skips / 0 failures; Playwright discovery finds 1 CC-016 and 3 CC-018 tests. The PostgreSQL/browser execution is deferred to CI because local disposable PostgreSQL is unavailable. `bun run build` is blocked by sandbox Turbopack worker port `EPERM`.
- Exact updated PR-head CI and review thread reconciliation remain pending.

## Acceptance evidence map

| Acceptance | Evidence |
|---|---|
| A1 stages and retired/archived exclusion | Existing lead stage actions/query predicates retained; CC-015/016 lifecycle coverage remains in the full suite and CI. |
| A2 qualification capture | `parseLeadQualification` tests; owner browser scenario saves/reloads industry, size, urgency, decision-maker, budget indication, pain, and next step. |
| A3 consultations and requirements | Existing `consultations.lead_id` association retained; owner lead detail renders linked outcome/status and bounded requirement values; existing consultation tests. |
| A4 explicit proposals | Parser tests plus PostgreSQL constraint test and browser scenario for amount, state, dates, next action, and accepted transition. |
| A5 value and conversion | Overview aggregates only explicit proposal cents; budget never appears in SQL; browser asserts a sent amount becomes won value only after acceptance. Existing idempotent conversion tests retained. |
| A6 Overview priorities | CC-018 snapshot includes explicit active proposal value, won value, conversion, exact proposal next-action links, and existing follow-ups; safe DTO unit coverage. |
| A7 auth/retirement/follow-up/conversion | Every Server Action rechecks owner session; SQL excludes tombstoned leads; existing owner/follow-up/conversion tests retained; no customer messaging action added. |
| A8 disposable PostgreSQL/browser | Added database regression and owner browser scenario; exact execution awaits CI due local environment limits. |
| A9 non-goals | Public intake untouched; no production data/schema operation, customer message, payment request, or publication action. |

## Rollback

Revert CC-019 application, test, and documentation commits. Migration 0019 is additive and has no backfill; rollback does not delete owner-entered CRM/proposal business records. If schema rollback is needed, first confirm the dependent code is removed and preserve owner-entered records for an explicit data-retention decision; never auto-drop business data.
