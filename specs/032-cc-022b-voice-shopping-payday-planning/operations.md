# CC-022B operations and rollback

## Disabled-by-default rollout

1. Review and merge/release the Hub PR first through the normal process. Apply additive ordered migrations only through the separately authorized Hub migration workflow. Keep Hub `SHOPPING_COMMANDS_ENABLED` false and `YORKSTEAD_SHOPPING_WRITE_SECRET` unconfigured.
2. Provision a distinct high-entropy shopping write credential in server environments and verify Hub contract/read behavior with synthetic records. Do not reuse CC-021 read or CC-022 command credentials.
3. Release Website only after Hub contract verification. Keep Website `YORKSTEAD_SHOPPING_ACTIONS_ENABLED` false until the owner BFF and disabled state are verified; then enable only in approved nonproduction first. The Sunday planning banner is a UI-only date view with no scheduled job or notification.
4. Production migration, secret provisioning, flag changes, merge and deployment each require their own authorization. No step here authorizes them.

## Data and privacy

Raw text stays only in Hub captures under existing retention/security. Shopping projections contain sanitized item name, allowable category/estimate/currency, confirmed scope/priority, timing, state, source IDs/timestamps and bounded audit metadata. No personal payday, income or reserve values appear in public/tenant records or analytics. Spoken briefing omits amounts.

## Rollback

Disable Website shopping mutations first, then Hub mutations. Retain Hub purchases, capture links and immutable audit. Roll back Website UI/BFF before Hub API only after in-flight commands are reconciled. Do not down-migrate or delete purchase history. Existing capture, CC-021 reads, CC-022 commands, Tasker, Calendar, Google Tasks, CRM, briefing and playback remain operational.

## Manual check

Run the synthetic acceptance utterance in `verification.md` against a disposable environment with all external provider clients mocked. Never use real captures or enable purchases/notifications.

## Review-correction recovery notes — 2026-10-29

- A confirmed receipt requires an explicit nonblank finite amount of at least zero. Never fill a missing amount from the expected schedule or convert a blank field to zero.
- No repeat is stored as a null recurrence rule. This supports both ordinary edits and clearing a recurrence.
- Treat HTTP 202 or a network/provider failure as unresolved. Retain and retry the exact command payload and key; do not issue a conflicting action until Hub state is reconciled. A definitive 400/415/422 payday input/schema rejection is not an ambiguous commit: discard that rejected key, let the owner correct input, and submit a new command. Hub conflicts may be cleared after refreshing the current revision.
- Keep Hub #92 first in the rollout order, then verify its deployed contract with synthetic data before releasing Website #79. This correction task does not authorize either merge, production configuration, migration, or deployment.
- Review correction evidence: Website application head `6e9527e219e3dd3f7e4c65d23b3be9b13e5d3aca` passed [full exact-head CI](https://github.com/yorkstead/website/actions/runs/40965424225), including PostgreSQL integration, browser workflows, and production build. Companion Hub fixes passed [Hub PostgreSQL CI](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40965183305) and [PostgreSQL 16 compatibility](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40965183311). No manual deployment or production flag/configuration change occurred.
- If browser session storage rejects writes, the currently mounted planner keeps the exact payday command in memory and retries that key. A single in-flight command lock prevents concurrent submits from replacing each other's recovery records. The user must keep the planner tab open until an ambiguous command is reconciled; durable recovery across a closed tab requires browser storage to be available.
- Follow-up review evidence: Website application head `c34fa996cc6afb8dacf80dbcdeab2934e2857ffb` passed [full CI](https://github.com/yorkstead/website/actions/runs/40971125294), including PostgreSQL integration, shopping/browser recovery regressions, all application browser flows and production build. Final docs head `81c10dec9be6883567a606c53ebf8a5b73915d0a` passed [exact-head CI](https://github.com/yorkstead/website/actions/runs/40972288651) and [Vercel](https://vercel.com/yorkstead/website/2S2RE2hSzSCHgfoVZrNEFzbRMCUF). Hub head `5d8274f6516f011a1f23f1203cb14c11f2226d0a` passed [PostgreSQL route regressions](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40966998237) and [PostgreSQL 16 compatibility](https://github.com/yorkstead/yorkstead-automation-hub/actions/runs/40966998076). Both follow-up Website threads have been resolved, and PR #79 is ready for review.
- On refresh, never send an edited item's form against a newer revision than the one loaded into that form. Show the revision change, block save/split, and require the owner to load/review current Hub values. Preserve the opening revision in the command for Hub-side compare-and-set when another tab changes the item before refresh.
- Keep any unresolved payday payload/key in the stable `AutomationHubRecords` page owner as well as session storage when available. A failed or degraded read may unmount the planner; once reads recover, its remount must retry the exact command before any new shopping mutation. Page-memory fallback lasts while the owner page remains mounted; a full browser reload cannot retain that fallback if browser storage is blocked.
