# Tasks

- [x] Inspect the existing Yorkstead deployment, auth, cron, database, and lead-pipeline patterns.
- [x] Confirm the first release uses existing qualified/due Yorkstead leads rather than cold-prospect discovery.
- [x] Add briefing domain, ranking, and spoken-text composition.
- [x] Add NWS, Google, lead, and trusted-news source adapters.
- [x] Add ordered cache migration and repository migration checks.
- [x] Add protected cron and Tasker routes plus DST-safe schedules.
- [x] Add environment and operator setup documentation.
- [x] Add focused tests.
- [x] Run complete verification and record evidence.
- [ ] Confirm production Vercel access and Google account authorization with the owner.
- [ ] Deploy and perform a locked-phone Tasker acceptance test (explicitly out of scope until owner confirmation).

## Verification evidence

- 2026-10-17: migration plan validated through `0008`.
- 2026-10-17: repository policy check and TypeScript check passed.
- 2026-10-17: ESLint passed with three pre-existing warnings in Open Graph and login files; the morning-briefing change introduced no warning.
- 2026-10-17: focused briefing, retention, and migration tests passed.
- 2026-10-17: full unit/integration suite passed with two expected database skips.
- 2026-10-17: Next.js production build passed and emitted both new dynamic routes.
- Not run: production database migration, live Google/NWS/feed calls, Vercel cron invocation, protected production endpoint, and locked-Pixel playback. Those require owner account authorization and deployment confirmation.
