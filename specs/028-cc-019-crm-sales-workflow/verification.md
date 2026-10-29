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
- Exact-head CI [40880949267](https://github.com/yorkstead/website/actions/runs/40880949267) on `ecd41044c6e294381a07b96f930bc15ab2e538ff` passed disposable migrations/database tests, lint/typecheck, standard browsers, and isolated CC-016 lifecycle and CC-017 navigation. Its two earlier isolated workflows and two of three CC-018 tests passed. The expanded CC-018 proposal scenario timed out on the generic `getByLabel("State")` lookup before proposal creation. Exact head [b3c83db4f4397719f50209fe81c42832c2844804], CI [40882679045](https://github.com/yorkstead/website/actions/runs/40882679045) passed that corrected CC-018 workflow but exposed duplicate “Follow-up date” labels: the lead detail field and the unified queue field shared the same accessible name. The CC-016 assertion is now scoped to the form identified by its “Save notes & follow-up” button, retaining the empty-value check and database-null check.
- Both outstanding Codex threads are reconciled with replies and resolved: proposal detail editing is implemented/tested, and the saved consultation deep link was corrected in prior PR commit `c6f006db81a3b4fdbcff33e5c4efb8e0c372ca9c`. The follow-up Vercel browser locator thread was also replied to and resolved.

## Final exact-head verification — 2026-10-29

- CI run [40894267475](https://github.com/yorkstead/website/actions/runs/40894267475) on feature-code head `78b2dedeb719642306fa4efcf8eed80db71bb796` passed all workflow steps: scaffold/dependency audit, 19 migration plan and disposable PostgreSQL application, database integration tests, lint, typecheck, standard browsers, isolated customer enrollment, owner publishing, Client Access, Portal Readiness, Customer Communications, CC-016 lead conversion/navigation, CC-018/019 actionable overview, production build, and generated-worktree cleanliness.
- The passing browser workflow covers qualification, an explicit sprint proposal, in-place edit to system/`$3,250.75`, updated active totals and lead link, next-action reschedule and clear, accepted/won value, and persistence with one unchanged proposal identity. The disposable PostgreSQL tests cover in-place update, amount totals, reschedule/clear, and retired lead rejection. Owner-only Server Action tests reject unauthenticated create/edit/state writes. CC-016 retains its empty follow-up field assertion and pre-conversion PostgreSQL `NULL` assertion.
- Local verification remains as recorded above: migration/scaffold/typecheck/lint/unit checks pass; the database integration skips locally for absent `TEST_DATABASE_URL` and local build is sandbox-blocked. CI provides the disposable PostgreSQL/browser/build evidence for the exact branch head.
- Live review-thread check: proposal-editing, consultation deep-link, query-error, action-clearing, and browser locator findings are all resolved; the two Codex findings have replies. No production records were used or changed. PR #75 remains open and unmerged; no manual deployment.
- The documentation update triggered run [40895889365](https://github.com/yorkstead/website/actions/runs/40895889365). All setup, migration/database, lint/typecheck, browser, isolated workflow, and CC-016 checks passed; the final CC-018/019 browser check failed because the responsive won-total locator returned one element while the test assumed there must be two. The test now checks visibility of the exact `$3,250.75` won total, and final exact-head CI is pending.

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
| A8 disposable PostgreSQL/browser | Disposable PostgreSQL edit/retirement assertions and owner browser proposal lifecycle pass in exact-head CI run 40894267475. |
| A9 non-goals | Public intake untouched; no production data/schema operation, customer message, payment request, or publication action. |

## Rollback

Revert CC-019 application, test, and documentation commits. Migration 0019 is additive and has no backfill; rollback does not delete owner-entered CRM/proposal business records. If schema rollback is needed, first confirm the dependent code is removed and preserve owner-entered records for an explicit data-retention decision; never auto-drop business data.
