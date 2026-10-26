# CC-013 implementation plan

1. Keep the feature read-only and on-demand: add typed fixed dependency/job/recovery status models and a pure aggregate/incident classifier.
2. Add an independently owner-authenticated GET controller. Its trusted runtime adapter checks Better Auth configuration and schema plus `SELECT 1` with fixed PostgreSQL queries, a small connection/query timeout and no writes. It reads only safe morning-briefing status fields and static `vercel.json` schedule declarations; it never contacts a URL from runtime data.
3. Reduce `/api/health` to generic liveness and test that no dependency detail remains public.
4. Add an owner page, dashboard navigation/sidebar/command-palette entries, explicit refresh, severity alerts and a recovery evidence checklist linking existing runbooks. Keep all unknown production evidence visibly unverified.
5. Add focused unit/API/browser checks. No migration, dependency, live provider call, production operation, manual deployment or customer capability change.

Rollback: remove the new Operations page, API/runtime/model and navigation entries; revert the public health response to its previous compatibility behavior only if an external uptime consumer requires it. No database rollback is required.

Known limits: uptime is checked only when an owner refreshes the page; failure before page access is not independently paged. Vercel scheduler execution for reminders/retention, external providers, backups, restore tests, rollback rehearsal and named incident ownership have no trusted source in this slice and remain unverified. The current incident list is a point-in-time classification, not a persisted history.
