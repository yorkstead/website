# Plan

1. Define deterministic briefing inputs, ranking, composition, and word-budget rules.
2. Add least-privilege clients for NWS, Google Calendar, Google Tasks, Gmail metadata, trusted news feeds, and the existing lead pipeline.
3. Add a daily briefing cache with an ordered migration and generation claim semantics.
4. Add independently protected cron and Tasker routes with partial-source and stale-cache fallbacks.
5. Schedule both possible UTC equivalents of 7:15 AM Mountain Time and gate execution using `America/Denver`.
6. Document Google OAuth, Vercel environment, deployment, health checks, and Tasker configuration.
7. Run focused tests, full repository verification, security review, and spec convergence.

## Architecture decision

The existing Yorkstead Next.js service and Neon database remain the control plane. A deterministic composer keeps Calendar, Tasks, Gmail metadata, and lead data out of third-party inference systems. The cron route warms a dated database cache; the protected Tasker route reads that cache and can attempt an on-demand generation if the scheduled job missed. Independent bearer secrets separate Vercel cron authority from phone playback authority.

Vercel schedules are UTC-only, so two daily invocations cover standard and daylight time. The route runs only when its local `America/Denver` hour is 7. Cached prior output remains available during provider or generation failures.
