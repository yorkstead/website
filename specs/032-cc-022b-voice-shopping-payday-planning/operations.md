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
