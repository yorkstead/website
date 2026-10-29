# CC-020 — Unified Command Center & Automation Hub

## Goal

Make `yorkstead.com/dashboard` the primary owner operating interface and replace its external Daily Operations navigation item with a first-party Automations destination. Keep the separate Automation Hub as the owner of its capture, Google, and automation records while surfacing safe integration status in the website.

## Discovery and current ownership

Repository discovery on 2026-10-29:

- Website repository: `yorkstead/website`, default branch `main`; the verified local base for this work is `0fdd303991e6b0d9739f7f572ed47950a974d03b` (CC-019 merge, PR #75).
- Automation Hub: private `yorkstead/yorkstead-automation-hub`, default branch `main`, a separate Next.js 16/Bun application. Its owner UI is served at `https://cal.yorkstead.com/command`; `/api/health` is a basic service response. Connected GitHub source inspection found the Hub master roadmap and current Command Center/API code. This discovery does not verify a current production deployment or Tasker configuration.
- Hub UI includes Quick Capture, CRM review and pipeline, projects, scorecard, operational health, playback history, execution history, and a safe action queue. Relevant Hub APIs include `/api/capture`, `/api/briefing`, `/api/command/integration-health`, `/api/command/execution-logs`, `/api/command/playback-status`, `/api/command/crm-overview`, and `/api/command/action-queue`.
- Hub `/api/capture` authenticates with its bearer token, classifies and persists into the Hub `captures` inbox, and returns pending/approval state. Its docs require keeping Tasker local-file fallback intact. Hub read APIs generally use the Hub CRM session or Hub bearer-token authorization; the website bridge secret is accepted by `/api/briefing` only among the inspected APIs.
- Hub data uses its own PostgreSQL/Neon configuration and schema, including captures, CRM companies/opportunities/interactions, Google connection, automation execution logs, and playback/plan records. Website data uses the website's own database and schemas, including `contact_inquiries`, CC-019 CRM records, workspace data, and the website `morning_briefings` cache. No shared database is assumed.
- Both repositories contain CRM and morning-briefing concepts. Hub CRM and website CRM are separate records with existing bridge/sync endpoints; they are not a single source of truth. The website remains authoritative for public inquiries and its own CRM/project workspace. The Hub remains authoritative for voice captures, Google connection/task actions, Hub execution and playback records. Neither side should silently create a second copy of the other's operational data.
- The website already calls Hub `GET https://cal.yorkstead.com/api/briefing` using the server-only `YORKSTEAD_DASHBOARD_BRIDGE_SECRET` in `lib/dashboard-google-operations.ts`. The Hub implementation generates a briefing, reads Google Calendar/Tasks, and records an execution event, so Automations does not call this route as a health probe. It probes only the existing static Hub `GET /api/health`. Hub `/api/briefing` also has its independent Tasker bearer contract. Website `/api/morning-briefing` is a separate protected plain-text endpoint using `MORNING_BRIEFING_ACCESS_TOKEN`; `docs/MORNING-BRIEFING.md` describes its own cron generation, cache, Pixel Tasker schedule, and Bluetooth playback. These APIs, credentials, response formats, schedules, and URLs are preserved. Which Tasker profile is currently active is not verified.
- The website's `/api/operations` and `/dashboard/operations` report website dependency/readiness observations. They do not prove Hub scheduler activation, Google write success, Tasker capture delivery, or Bluetooth playback. Hub's own integration-health and execution-history routes remain protected by Hub authorization and are not called with an incompatible credential.

## First-slice scope

1. Keep the existing website Command Center and shared responsive navigation as the primary interface.
2. Provide the requested primary destinations: Overview, CRM, Projects, Tasks, Automations, Insights, and Settings & Tools.
3. Replace the external Daily Operations sidebar item with internal `/dashboard/automations`.
4. Build an owner-only Automations view that reuses the existing website operations monitor and probes only the Hub's existing static `/api/health` endpoint. Do not use `/api/briefing` as a health check: it generates a briefing, calls Google read APIs, and records an execution event.
5. Provide links from Automations to the existing Hub Command Center capture controls and review workflows. Keep Hub's separate authentication visible to the owner; do not imply SSO.
6. Show unavailable, unconfigured, and degraded integrations distinctly. A bridge timeout or invalid response must never render an empty queue as a successful zero.
7. Preserve all existing routes, APIs, auth, storage, task/briefing/voice contracts, and provider behavior. Keep Automations read-only; no automatic customer communication or external task mutation is added.

## Acceptance criteria

- A1: Website owner navigation exposes the requested seven destinations; Automations is internal and the Daily Operations item no longer points to the external host.
- A2: `/dashboard/automations` checks the existing website owner session and redirects unauthenticated visitors to `/login?next=/dashboard/automations`.
- A3: The Automations page combines existing website operations checks with the Hub's existing static health route. It does not use briefing generation as a probe. No new Hub endpoint, secret, storage, scheduled job, or duplicated processing logic is introduced.
- A4: The browser receives only the validated Hub liveness state and check time; credentials and operational record content stay server-side.
- A5: Hub unreachable or unexpected health responses are visible and never appear healthy. Website operations errors remain visible.
- A6: Voice capture/review links lead to the existing Hub workflows and describe Hub's independent auth and Tasker fallback boundary.
- A7: Existing `/dashboard/operations`, website morning briefing endpoints/schedules, Hub endpoints, Tasker playback, LIFX/TV/Bluetooth routines, Google routes, and capture ingestion contracts remain unchanged.
- A8: Responsive and authorization coverage includes mobile/desktop nav, Automations owner gate, unavailable integration rendering, and no sensitive DTO fields.
- A9: Spec, plan, task, discovery, verification, handoff, compatibility, external-dependency, and rollback documentation are synchronized.
- A10: Open PR `CC-020: Unified Command Center & Automation Hub`; do not merge, manually deploy, change production environment configuration, or perform production data migrations.

## Non-goals and deferred milestones

- No Hub repository code or deployment changes in this website PR.
- No database/schema migration or data copy/reconciliation.
- No website proxy for Hub capture writes or CRM/Google mutations.
- No change to production endpoint URLs, Tasker profiles, bearer tokens, Vercel schedules, LIFX/TV/audio/Bluetooth actions, Google OAuth scopes, or production environment variables.
- No Hub-to-website SSO or shared authentication.
- Full display of Hub capture content, detailed execution history, device/routine inventory, and cross-system entity reconciliation require separately specified compatible Hub read APIs and authorization/tenant review. These remain follow-up milestones.
- Hub integration/database/Google health details are opened in the Hub's own authorized interface. The website has no compatible read authorization for the protected Hub health and execution APIs; `/api/health` proves only that the route answered.
- Live Tasker capture ingestion, actual morning playback, and current production provider/deployment state are not verifiable from this source-only change.
