# CC-021 discovery — 2026-10-29

## Current Git and deployment observations

| Item | Verified observation |
|---|---|
| Website repository | `yorkstead/website`; local `main` fetched from verified GitHub tip `17fa88bf502157d513ee98b981e6b61ae191065c` (CC-020 PR #76 merge); branch `feat/cc-021-automation-hub-data-integration` created from that SHA. |
| Automation Hub repository | Private `yorkstead/yorkstead-automation-hub`; GitHub connector verified default branch `main`, source tip `2e941bb61ce0dbf53ed98c5deace167850e82a17`. |
| Hub deployment | Read-only Vercel inspection of project `automation-hub` found latest production deployment READY at Hub main SHA `2e941bb61ce0dbf53ed98c5deace167850e82a17`; custom owner domain `cal.yorkstead.com`. Deployment metadata does not establish secret configuration or provider/workflow health. |
| Website PR #76 | GitHub source verified merged into website `main` as `17fa88bf502157d513ee98b981e6b61ae191065c`. |

GitHub shell DNS failed during initialization, so live repository/PR verification used the connected GitHub source. `git fetch origin main` later succeeded and matched the GitHub-verified website SHA. No production application endpoint or production data was queried.

## Records, contracts, and auth

| Capability | Hub source/route | Current auth and safety note |
|---|---|---|
| Capture/classification | `captures`: `id`, `text`, `classification`, `status`, timestamps. `POST /api/capture` also persists CRM lead/interaction drafts, may run existing approved Calendar path, and returns classification. | Hub `canWriteCrm` (Hub CRM session or Tasker bearer); not appropriate for website read use. `text` may contain sensitive voice transcripts; new website DTO reads only allowlisted classification fields. |
| CRM lead review | `GET /api/crm/review` joins captures with pending/missing `crm_intake`. | Hub `canReadCrm` (CRM cookie or Tasker bearer). Existing response includes payload/capture text. New DTO returns a constrained projection and keeps records in Hub. |
| Existing tasks shown in the website | Open Google Tasks read through the Hub's existing encrypted OAuth connection. Hub also stores capture task/follow_up classifications and CRM action commitments, which remain in Hub and are not duplicated in this view. | Google Tasks are shown with source, list ID, task ID, status, due/update timestamps. The Hub read contract only refreshes a Google token and performs bounded GETs; it never creates/completes tasks or calls dispatch/completion routes. |
| Activity | `automation_execution_logs`: `id`, creation timestamp, automation, run ID, severity, stage, outcome, duration, safe error code. `GET /api/command/execution-logs` caps 100. | Hub `canReadCrm`; new DTO has narrower 20 row cap and allowlisted columns. |
| Integration status | `GET /api/command/integration-health` reads DB and Google connection, then refreshes OAuth and GETs Google Tasks lists. | Hub `canReadCrm`. This performs a live provider request and is not reused as a passive website status probe. New DTO performs its own bounded read-only Tasks query and reports Google Tasks status based on that request. |
| Briefing/tasks | `GET /api/briefing` reads Calendar/Tasks, generates content and records automation events; Tasker-specific tracking headers can write plan/playback records. | Hub CRM session, Tasker bearer, or website bridge secret. Do not call it from the new dashboard. |
| Static health | `GET /api/health`. | Public service liveness only; never use it for sensitive records. |

Hub `canReadCrm` first verifies `ys_crm_session`; otherwise `authorized(req)` accepts only `TASKER_BEARER_TOKEN`. The Hub's `YORKSTEAD_DASHBOARD_BRIDGE_SECRET` special case exists in `/api/briefing`, not the inspected record routes. Reusing the Tasker token or forwarding a browser credential would widen risk. A dedicated server-to-server read token scoped to one new route is required.

## Integration design

- Add one Hub endpoint that produces a bounded, versioned projection from existing Hub records and a bounded read-only Google Tasks query. It does not call `/api/briefing`, mutate Google/CRM/capture status, or create Hub events.
- Use a dedicated shared bearer token named `YORKSTEAD_AUTOMATIONS_READ_SECRET` in both Hub and website projects. Never expose it in browser code or logs. Missing configuration returns an explicit unavailable/unconfigured result.
- Website `GET /api/dashboard/automation-hub` authenticates the Better Auth owner independently and acts as a no-store BFF. The browser cannot choose the Hub URL, token, query filters, or Hub auth mode.
- DTO sections: 20 recent captures, 20 recent execution events, bounded pending review items, 20 live open Google Tasks, and DB/Google Tasks connectivity state. Every item has source-native ID and timestamp/status as applicable. Capture transcript text/device values are not included. OAuth token refresh and Tasks GET are read-only; no briefing route, plan snapshot, or event logger is called. Hub's separate stored task classifications and CRM action commitments are deliberately left in their existing Hub workflows rather than mirrored here.
- Distinguish empty result from upstream error per section. Do not persist a local mirror. Exclude retired-company CRM records in the review queue when the retirement registry exists; fail closed on retirement capability-check failure.
- The website's current owner liveness panel and website operations checks remain as-is. Detailed Hub links remain available. Existing API/task/briefing/Tasker/device contracts and endpoint URLs remain unchanged.

## Rollout dependency and limits

Cross-repository release guidance requires backend API first, backend verification, then dependent website release. Proposed order: review/merge the Hub PR through normal owner workflow, provision the dedicated secret in Hub and website preview/prod only through separately authorized configuration work, verify the deployed Hub route with synthetic/disposable-safe contract checks, then merge/release the website PR. This task makes no production secret/config change and performs no manual deployment. Until that rollout, the website API must show an honest not-configured/unavailable state.

Rollback the website consumer first if it has been released, then revoke the dedicated read token and revert the Hub route through normal reviewed releases. Neither change alters Hub records or requires data cleanup. The token can be removed only through separately authorized configuration management.
