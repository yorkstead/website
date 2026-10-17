# Current handoff

- Active feature: Yorkstead morning briefing service
- Active spec: `specs/007-morning-briefing/`
- Current task: Local implementation and verification are complete. The service composes a deterministic, 1,800-word-or-less briefing from NWS weather, read-only Google Calendar and Tasks, Gmail metadata, the Yorkstead lead pipeline, and trusted news feeds; stores a 35-day fallback cache; and exposes independently protected cron and Tasker routes.
- Last verified: On 2026-10-17, migration validation through `0008`, repository policy, typecheck, focused tests, all unit/integration tests with two expected database skips, and the 75-route production build passed. ESLint reported only the three pre-existing warnings in Open Graph and login files.
- Next action: Brandon confirms access to the production `yorkstead.com` Vercel project and authorizes the intended Google account with `calendar.events.readonly`, `tasks.readonly`, and `gmail.metadata`; then add the documented server-only variables and review a production deployment before applying migrations.
- Blockers: This workspace has no Vercel project link or runtime secrets. `DATABASE_URL`, `CRON_SECRET`, `MORNING_BRIEFING_ACCESS_TOKEN`, and all Google OAuth variables are absent locally. Production migration `0007` was already pending, and new migration `0008` must be applied only through the trusted production build. Live provider calls and locked-Pixel acceptance remain unverified.
- Rollback: Remove the two morning-briefing cron entries and Tasker HTTP action, then redeploy. Leave additive migration `0008` dormant during an incident rather than dropping data.
- Recommended role: Production release and authorization verification.
- Prior feature note: The SystemForm pacing refinement in `specs/006-system-form/` remains code-verified and still awaits its production-preview visual review.
