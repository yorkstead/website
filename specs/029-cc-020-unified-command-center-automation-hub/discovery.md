# CC-020 discovery inventory — 2026-10-29

## Repository and deployment boundary

| System | Repository/application | Owner UI | Deployment evidence |
|---|---|---|---|
| Website | `yorkstead/website`; Next.js App Router; Bun; Better Auth owner session | `https://yorkstead.com/dashboard` | Vercel project/source is configured in the website repo; current production deployment was not checked for this task. |
| Automation Hub | Private `yorkstead/yorkstead-automation-hub`; separate Next.js 16/Bun application and PostgreSQL configuration | `https://cal.yorkstead.com/command` | Read-only Vercel inspection at 2026-10-29 15:42 UTC found project `automation-hub` (`prj_05idlwp8QIbTYZyW52VKAzzw79fF`), verified custom domain `cal.yorkstead.com`, and latest production deployment READY from Hub `main` at `2e941bb61ce0dbf53ed98c5deace167850e82a17`. This is deployment metadata, not proof of Tasker/device workflow health. |

The owner views have independent login/session boundaries. Hub source has `ys_crm_session` and Hub CRM password/session handling; website owner pages use Better Auth and verify owner email. A link between them does not establish shared login/SSO.

## Pages and APIs inspected

| Capability | Existing owner/source | Contract/auth | Consumer and notes |
|---|---|---|---|
| Website Command Center | `/dashboard`, shared `DashboardNavigation` | Better Auth owner session | Current primary interface; existing Overview, CRM, project/task anchors, Insights, tools. |
| Website operational monitor | `/dashboard/operations`, `/api/operations` | Website owner session at page and API | Read-only website DB/auth/briefing/schedule/recovery observations. Scheduler configuration is intent, not proof of deployed execution. |
| Hub Command Center | `/command` | Independent Hub CRM session | Quick Capture, CRM/pipeline/projects, action queue, system health, playback history, execution history and scorecard. Captures and review queues remain on Hub. |
| Hub capture ingestion | `POST /api/capture` | `TASKER_BEARER_TOKEN` | Pixel Tasker caller; stores classified capture in Hub inbox, then returns pending/approval state. Hub docs retain local-file fallback if request fails. Clear, future timed captures can follow the existing Calendar action path. |
| Hub briefing | `GET /api/briefing` | Hub CRM session, Hub Tasker bearer, or existing server bridge `YORKSTEAD_DASHBOARD_BRIDGE_SECRET` | Tasker consumes JSON; website server helper `getGoogleOperations` already calls this URL. Hub reads its own Google connection and CRM data, generates a briefing, and records an execution event. Automations does not call this endpoint as a health probe. |
| Hub integration health | `GET /api/command/integration-health` | Hub `canReadCrm` (Hub session or Hub bearer authorization) | Reads Hub database/Google Tasks, queue counts. Not invoked from website with the website bridge credential because that endpoint did not expose the bridge auth. |
| Hub execution/playback | `GET /api/command/execution-logs`, `GET /api/command/playback-status` | Hub `canReadCrm` | Metadata/history stored by Hub. No Hub execution or playback mutation is added to website. |
| Hub CRM/action overview | `/api/command/crm-overview`, `/api/command/action-queue`, CRM review routes | Hub `canReadCrm`; writes use Hub authorization and guarded actions | Hub CRM interactions, proposals, capture-derived intakes, and Google task links remain Hub-owned records. |
| Website briefing generation/playback | `/api/cron/morning-briefing`, `/api/morning-briefing` | Independent cron authorization and `MORNING_BRIEFING_ACCESS_TOKEN` | Website-owned `morning_briefings` table and cron schedule; protected Tasker consumer receives plain text. Existing docs describe Pixel speech over Bluetooth. |
| Website-to-Hub bridge | Existing `lib/dashboard-google-operations.ts`, `app/actions/crm-opportunity.ts`, and dashboard routes | Server-only `YORKSTEAD_DASHBOARD_BRIDGE_SECRET` for compatible Hub routes | Existing briefing, website opportunity, summary, calendar-month, and task-completion integrations. Do not place this secret in browser code or change endpoint paths. |

## Storage and duplicate-record comparison

The repositories point at separate database configurations. Source inspection does not establish a shared Neon database or branch. Do not join by coincidental names or display the two sets as one queue.

| Record family | Website source of truth | Hub source of truth | CC-020 first-slice behavior |
|---|---|---|---|
| Public inquiries and website CRM | `contact_inquiries`, CC-019 qualification/proposals, existing website CRM routes | Hub `crm_companies`, `crm_opportunities`, `crm_interactions`, CRM intake | No copy, merge, or cross-count. Website public intake remains website-owned; Hub operational CRM stays in Hub. Existing explicit bridge endpoints remain unchanged. |
| Projects/tasks/workspace | `workspaces.primary`, project/task workflow and website Google task summaries | Hub CRM projects/milestones and Google task action links | No storage consolidation or duplicate tasks. Existing read/dispatch contracts remain unchanged. |
| Voice captures and classification | No website capture inbox identified | Hub `captures`, classification JSON, pending approval and CRM intake | Open existing Hub capture/review UI. No capture content is mirrored to the website. |
| Google connection / activity | Website's existing dashboard reads selected Google data through the Hub briefing bridge | Hub `google_connections`, Google APIs, automation execution logs | Existing dashboard bridge behavior is unchanged. The Automations page does not query, copy, or create a second event log for these records. |
| Morning briefings | Website `morning_briefings` cache, website cron declarations, plain-text `/api/morning-briefing` | Hub briefing composition and Hub playback/plan snapshots (`morning_playback_runs`, `morning_plan_snapshots`) | Preserve both systems and their distinct consumers, auth, data and schedules. No source-of-truth cutover in this PR. |

The Hub master roadmap states that its internal automation/Google/CRM flows belong in the Hub while public-site/customer-portal experiences belong in the website. Existing website bridge routes explicitly synchronize selected CRM/summary/task information; their independent stores make consistency dependent on those routes, not a shared transaction. Cross-system reconciliation is not complete or claimed here.

## Schedules and consumers

- Website code declares morning briefing cron generation (7:15 AM Mountain intent with a fallback) and its Tasker plain-text endpoint. The checked-in schedule does not establish the live Vercel scheduler. Website docs describe a Pixel Tasker routine and paired Bluetooth speaker.
- Hub briefing is also polled from Tasker using its bearer token and returns JSON, including `playbackRunId` when opted-in tracking is requested. Hub playback acknowledgment routes record Tasker-reported outcomes. Current Tasker profile(s), endpoint selection, active credentials, and physical Bluetooth playback were not inspected.
- Hub source search found no checked-in `vercel.json` cron declaration or `app/api/cron` route; its briefing appears Tasker/request driven in inspected code. Absence in these source paths does not establish the full live schedule configuration.
- Hub docs and master roadmap mark further audio/natural-voice and Tasker playback work deferred. CC-020 preserves the existing capture and playback path; it does not operate or edit a device routine.
- LIFX, TV, and Bluetooth playback are external device/Tasker consumers and were not read or changed. Their current inventory and health are not represented as verified by this website page.

## Verification limits and integration path

- GitHub source inspection confirmed the private Hub repository and its current `main` source. Read-only Vercel metadata confirmed the latest production deployment SHA/state; Hub production environment variables, Neon identity, Tasker device state, and external provider consoles were not inspected. Do not infer workflow health from a source endpoint or deployment state.
- The safe first slice probes the existing static Hub health route and reports only route liveness; it does not call briefing generation or present CRM queue/Google/device status as verified. Failed or unexpected responses remain unavailable/degraded.
- Hub capture text and full calendar/task contents are never sent to this page. Capture/review, detailed integration-health, and execution-history actions link to existing Hub owner routes.
- A future detailed Hub capture/activity integration needs a purpose-built, bounded, owner-authenticated read DTO and compatibility tests in the Hub repository. The cross-repository release workflow requires that backend change to be backward-compatible, deployed and verified before the website starts using it. Any access across Hub and website CRM records also needs explicit tenant/linkage reconciliation.
- No retirement or redirect of `cal.yorkstead.com/command`, Hub APIs, Tasker endpoints, website operations routes, or either morning-briefing system is included. Retire only after owner-approved usage inventory, replacement acceptance across Pixel/Tasker and device integrations, a rollback window, and separately authorized deprecation/removal PRs.
