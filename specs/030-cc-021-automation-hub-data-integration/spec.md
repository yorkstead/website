# CC-021 — Automation Hub Data Integration

## Goal

Show current read-only Automation Hub records in the owner-only `/dashboard/automations` interface while leaving each record in its source system.

## Verified system boundary

- Website: `yorkstead/website`, Next.js App Router, Better Auth owner session, existing Automations page and website Operations checks.
- Hub: private `yorkstead/yorkstead-automation-hub`, Next.js 16/Bun, separate PostgreSQL/Neon storage, owner UI at `https://cal.yorkstead.com/command`, production project `automation-hub` and custom domain `cal.yorkstead.com`.
- Verified Hub source tip on 2026-10-29: `2e941bb61ce0dbf53ed98c5deace167850e82a17`; read-only Vercel inspection found production READY at the same SHA. This proves deployment revision/state only, not credentials, Google access, capture delivery, or device health.
- Hub protected read routes authorize a Hub CRM cookie or `TASKER_BEARER_TOKEN`. Website `YORKSTEAD_DASHBOARD_BRIDGE_SECRET` is only specially accepted by the briefing route among inspected APIs. Do not forward the website session, reuse the Tasker bearer token, or call `/api/briefing` as a record or health probe.
- Source records remain owned by Hub tables and Google Tasks. The website displays Hub `captures` and `automation_execution_logs`, plus existing open Google Tasks read through the Hub's encrypted OAuth connection. Capture task drafts and CRM action commitments stay in their existing Hub workflows. Website does not persist copies.

## Contract and authorization

1. A coordinated Hub PR adds backward-compatible, read-only `GET /api/integrations/website-automations` with contract version 1. It accepts only a dedicated `Authorization: Bearer ...` read token, compared in constant time and separate from Hub CRM cookies, Tasker, and existing write-capable credentials.
2. Both deployments use the same manually provisioned secret name, `YORKSTEAD_AUTOMATIONS_READ_SECRET`. The route rejects absent configuration and invalid credentials, returns `Cache-Control: no-store`, exposes no mutating methods, accepts no caller-controlled query filters, and caps each section at 20 records.
3. The Website BFF at `GET /api/dashboard/automation-hub` verifies the Better Auth owner on every request before calling Hub. It never accepts or forwards a browser-provided Hub token. Hub failures become a safe unavailable response; upstream bodies and credentials are not returned.
4. The Hub DTO has top-level `contractVersion`, `source`, `generatedAt` and independent `captures`, `activity`, `integrationHealth`, `reviewQueue`, and `tasks` sections. Each section includes a source label, `available`/`unavailable` state, checked timestamp, bounded items and truncation marker. An available empty list is distinct from an unavailable query.
5. Records include their source-native ID and explicit timestamps. Capture text is not copied; the page displays classification fields. Activity includes only safe execution metadata and sanitized error codes. Google integration health reflects the bounded read-only task list/task request; no Google writes are made. Other integrations outside the Hub database and Google Tasks are not inferred.
6. Task cards show existing open Google Tasks fetched by the Hub read contract, with task ID, list ID, updated/due timestamps, title and status. The Hub inspects at most 10 lists and 20 tasks per list, returns at most 20 tasks, and marks truncation when not all lists/tasks are included. Provider calls have per-hop timeouts; the Website BFF also has a hard request timeout and response-body limit.

## Acceptance criteria

- A1: `/dashboard/automations` remains owner-only; `/api/dashboard/automation-hub` independently returns 401 for anonymous/non-owner website sessions.
- A2: Hub source contract rejects missing/short/mismatched tokens, cannot be read using the public health URL or Tasker token, and returns private no-store responses.
- A3: UI shows recent Hub capture classifications, activity, database/Google Tasks integration health, review queue, and live Google Tasks without storing or mutating Hub records.
- A4: Every record shows source and stable Hub ID; applicable event/check timestamps, status, due date, and truncation are visible.
- A5: Each section distinguishes loading, available-empty, available-populated, and unavailable/error. A failed source never appears as an empty successful list.
- A6: Hub data is bounded, classified through an allowlisted DTO, and does not expose raw capture text, device identifiers, OAuth tokens, database URLs, provider responses, stack traces, or website/Hub credentials.
- A7: The page does not include Hub CRM action/commitment records or create a second task store. Those remain available in their Hub workflow; the task panel shows only existing Google Tasks through the Hub read contract.
- A8: Refresh/retry remains read-only. Tasker capture, Hub classification, Google API write/read routes, morning briefing, playback, device, and website Operations contracts are not altered.
- A9: Responsive owner browser coverage exercises real data DTO rendering, empty and partial-failure states, and anonymous API denial. Contract tests cover authorization, bounds, source labels, timestamps, sanitization and failures.
- A10: No production records, environment variables, secrets, API URLs, schedules, or data migrations are changed. No automated customer messaging, API retirement, merge, or manual deployment.
- A11: Open website PR `CC-021: Automation Hub Data Integration` and a coordinated Hub contract PR (or record the exact dependency). Document credential provisioning, backend-first rollout, validation, unavailable state, and rollback.

## Non-goals

- No shared database, record replication, source-of-truth change, cross-tenant data reconciliation, CRM write, capture ingestion proxy, Google Task completion/creation, Tasker/device operation, morning-briefing change, or playback change.
- No live provider-health assertion from stored credential presence. Do not call Hub `/api/briefing` from this dashboard.
- No production configuration/secrets setup, PR merge, or deployment.
