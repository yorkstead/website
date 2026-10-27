# CC-013 — Production operations and observability

## User value

The owner can review current service health, see actionable degraded dependencies, and find safe incident and recovery guidance from the Command Center without combining provider consoles and logs manually.

## Scope and operating mode

Version 1 is an owner-only, on-demand, read-only operational view. The owner explicitly opens or refreshes the page; no background polling, scheduled probes, event persistence, alert dispatch or remediation runs. Runtime checks use only the application's fixed database and checked-in scheduler configuration. They never accept a target URL or contact GitHub, Vercel, Neon control-plane, email or customer endpoints.

## Requirements

1. `/dashboard/operations` is owner-only at render and `/api/operations` independently authenticates every request with `getOwnerSession`. Responses are bounded, generic on failure, and private/no-store/no-referrer. No health detail is exposed from a public API.
2. The public `/api/health` endpoint reports application liveness only. Its response does not reveal database, auth, environment, dependency or deployment state.
3. The owner API checks application liveness, database connectivity and Better Auth configuration plus its expected user/session schema using a bounded, read-only database query. A failed check becomes a sanitized status and safe next step; error messages, SQL, URLs, config values and customer data never enter the response.
4. Background processing shows checked-in Vercel cron definitions as configured intent. It reports the last safe morning-briefing status/timestamp when available. Reminder and retention execution, scheduler delivery, external service health and missing heartbeat history remain `not_verified`, never inferred from a configuration entry.
5. Current failed checks produce severity-ranked in-page incident alerts with affected capabilities, owner action and links to the related owner readiness/communications areas. Alerts are derived on demand and are not acknowledged, stored, paged or delivered externally.
6. Recovery controls display explicit evidence states for backups/restore, rollback, incident owner, provider/auth dependencies and production access. Unknown evidence remains unknown and links to the existing release runbook. No restore, rollback, restart, mutation, customer activation, invite, email or recovery action is exposed.
7. Preserve existing owner/customer authorization and the privacy-first lead pipeline. Do not return customer identifiers, inquiry details, operational error internals or configuration values.
8. No database migration or dependency is required. Existing migration checksums and runtime integrations stay unchanged.

## Status semantics

- `healthy`: directly observed during this owner request.
- `degraded`: a fixed check failed or a recorded job result is failed/stale.
- `not_configured`: a required runtime dependency is absent or invalid.
- `not_verified`: the app has no trusted observation source for that control.
- `unknown`: evidence cannot safely support a conclusion.

The aggregate health state is degraded if any required live check fails; otherwise it is `needs_review` while any operational control is unverified; it is healthy only when all required live checks pass. Missing observations never count as healthy.

## Non-goals and restrictions

- No customer production activation; real customer invitation, email, proof or recovery activity; Adorned provisioning/exposure; live alert delivery; production data mutation; backup/restore initiation; production migration/rollback; environment or secret changes; authorization weakening; arbitrary URL probing; customer/internal health disclosure through public APIs; automatic merge or manual deployment.
- No claim of production readiness, complete uptime coverage, independent alert delivery, backup existence, restore capability, or incident response ownership from app configuration alone.
- Do not alter customer routes, Better Auth gates, delivery/recovery services, Vercel schedules or production environment configuration.

## Acceptance evidence

- Pure check aggregation and redaction tests cover healthy, degraded, missing, timeout and unknown states.
- API tests prove authentication precedes dependency access; database work is read-only/bounded; errors are generic; all response headers are private; public health remains liveness-only.
- Owner page and browser coverage prove denied sessions are redirected, owner sees status/alerts/unknown controls, refresh works, and no mutation/delivery request is sent.
- Full repository checks and production build pass. No production target is called during verification.
