# Current handoff

- Active feature: Yorkstead morning briefing service
- Active spec: `specs/007-morning-briefing/`
- Current task: Release the complete SystemForm refinement, Command Center clickability fix, and secure morning briefing service. The briefing composes deterministic, spoken-friendly output from NWS weather, read-only Google Calendar and Tasks, Gmail metadata, Yorkstead opportunities, and trusted news feeds; stores a 35-day fallback cache; and exposes independently protected cron and Tasker routes.
- Last verified: On 2026-10-17, migration validation through `0008`, repository policy, typecheck, focused tests, all unit/integration tests with two expected database skips, and the 75-route production build passed before the production-branch merge. ESLint reported only the three pre-existing warnings in Open Graph and login files. The production Command Center clickability fix is included in the merge.
- Next action: Re-run the full release checks on the merged branch, push it to GitHub, release it to production, confirm migrations `0007` and `0008`, and smoke-test the public and protected routes.
- Blockers: Live Google/provider calls and the locked-Pixel production acceptance test remain pending until the release is live. Secrets must remain server-side and must not be copied into logs or source control.
- Rollback: Remove the two morning-briefing cron entries and Tasker HTTP action, then redeploy. Leave additive migration `0008` dormant during an incident rather than dropping data.
- Recommended role: Production release and authorization verification.
- Included feature note: The complete SystemForm pacing refinement in `specs/006-system-form/` and the production Command Center clickability fix are part of this release.
