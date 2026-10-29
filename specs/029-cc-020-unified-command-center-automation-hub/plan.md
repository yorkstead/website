# CC-020 implementation plan

## Architecture

- Add a first-party owner page at `/dashboard/automations` in the existing App Router.
- Reuse `getOwnerSession`, `OperationsWorkspace`, and `/api/operations`; probe the existing Hub `/api/health` route from the server and pass only its validated liveness state/time. Do not call `getGoogleOperations`' Hub `/api/briefing` path from this page because that endpoint generates a briefing, reads Google APIs, and records an execution event.
- Keep the original `/dashboard/operations` route and its behavior for direct links. The navigation's Automations destination becomes the operating entry point and embeds/reuses the current site operations checks plus the Hub summary.
- Update the shared navigation's primary destination list and remove only the external Daily Operations link; do not remove the Hub or operations routes.
- No changes to the Hub repository, database, production environment, endpoint URLs, or mutation paths.

## File-level approach

1. `lib/automation-hub-health.ts`: call the existing static Hub `/api/health` endpoint and return only a safe responding/degraded/unavailable state and timestamp.
2. `app/dashboard/automations/page.tsx`: owner-gate the new route, obtain safe Hub metadata server-side, and render the reused operations workspace.
3. `components/dashboard/operations.tsx`: accept the safe optional Hub overview and render a responsive Automation Hub/capture/review panel with honest failure states and existing Hub links. Preserve website operations refresh and errors.
4. `components/dashboard/dashboard-navigation.tsx`: add Automations to primary navigation; remove external Daily Operations from Settings & Tools. Preserve all other routes and mobile/collapsed behavior.
5. Add focused unit/component and owner browser coverage for projection filtering, failure states, route authorization, navigation, and responsive use.
6. Record system ownership, API/auth/storage/schedule inventory, test limits, external dependencies, and rollback in this spec directory and the current handoff.

## Delivery

- Base: verified `origin/main` `0fdd303991e6b0d9739f7f572ed47950a974d03b`.
- Branch: `feat/cc-020-command-center-automation-hub`.
- No manual merge/deploy or production operation.
- Cross-repository API changes are deferred; any later backend change must preserve current Hub contracts and be deployed/verified before a dependent website update, under a separately authorized scope.
