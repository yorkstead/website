# Website implementation plan

## Architecture

1. Read the Automation Hub CC-021 spec in `yorkstead/yorkstead-automation-hub/specs/002-website-automations-read-contract/spec.md` as the single response-contract authority.
2. Extend the Website Zod DTO with optional `dateContext`, `calendar`, and `dashboardTasks`; preserve parsing of older v1 responses. A missing optional section maps to a supported-but-unavailable view state, never an empty source.
3. Replace the network behavior in `lib/dashboard-google-operations.ts` with a pure adapter from the validated Hub response. Format Calendar items as the current `time — summary` or all-day `summary`; filter `dashboardTasks` using the contract's Denver date window; do not generate priority.
4. In `app/dashboard/page.tsx`, perform the existing owner session check first, then read `getAutomationHubData()` once in the existing parallel source load. Pass that single serializable DTO to `Dashboard`.
5. Derive Google Tasks and agenda from the same DTO in `Dashboard`; pass the DTO into `CommandCenterOverview` and `UnifiedAttentionView`. Remove the child's second `/api/dashboard/automation-hub` fetch for this page. Keep the owner BFF for its other existing consumers.
6. Keep `/api/dashboard/google-task` and its explicit POST completion path unchanged. Add independent source-state messaging for Calendar and Dashboard Tasks; retain the existing task and CalendarTimeline presentation.
7. Leave `components/dashboard/dashboard-operations-briefing.tsx` untouched and unmounted. It has no current call sites and needs fields not in CC-021 (`priority`, news) if reactivated.

## Files

- `app/dashboard/page.tsx`
- `lib/automation-hub-data.ts` and `lib/automation-hub-data.test.ts`
- `lib/dashboard-google-operations.ts` and focused adapter tests
- `components/dashboard.tsx`
- `components/dashboard/command-center-overview.tsx`
- `components/dashboard/unified-attention-view.tsx` and its tests
- focused authenticated Dashboard browser coverage and workflow wiring, if required
- this `specs/040-cc021-dashboard-read-consolidation/` plan/tasks/verification and `docs/handoffs/CURRENT.md`

## Rollout and rollback

Hub is the backend-first dependency. Hub v1 remains additive so the existing Website reader can tolerate new fields. The Website parser also accepts an older Hub response and shows missing Calendar/Dashboard Tasks as unsupported/unavailable. No production configuration or external data is changed. Roll back the Website consumer first; this restores the former `/api/briefing` request and its execution-event side effect. The additive Hub response may remain.
