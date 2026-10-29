# CC-017 — Command Center Navigation & Interface Simplification

## User value

Give owners one predictable Yorkstead navigation system across the Command Center, CRM, project workspace, analytics, and administrative tools. Reduce duplicate navigation while keeping every existing route and deep link available.

## Scope

- Replace the homepage destination strip, WORK//CTRL desktop sidebar, and dashboard mobile bottom bar with one shared responsive sidebar in the `/dashboard` layout.
- Provide expanded icon-and-label navigation and a persisted collapsed icon-only mode with accessible names and tooltips.
- Provide a mobile drawer with menu, close, backdrop, Escape, focus handling, and route-change close behavior.
- Primary destinations: Overview, CRM, Projects, Tasks, and Insights. CRM follow-ups and consultations; Insights analytics, marketing, and operations; existing admin/tools routes remain reachable in a secondary section.
- Keep current route handlers, server authorization, tenant isolation, customer publication gates, CRM search parameters, and project deep links unchanged.
- Add isolated authenticated browser coverage for active links, all navigation destinations, collapse and reload persistence, mobile drawer, and keyboard access.

## Acceptance criteria

- A1: Every `/dashboard` page renders one shared Yorkstead navigation with active route indication; the old homepage route strip, WORK//CTRL sidebar, and dashboard mobile bottom bar are removed.
- A2: Expanded navigation displays icons and labels; collapse shows icons only, keeps accessible names/tooltips, and persists the preference after reload.
- A3: On narrow viewports the sidebar is available as an accessible slide-out drawer. It opens and closes by button, Escape, backdrop, and route selection; keyboard focus is visible and moves into/restores from the drawer.
- A4: Overview, CRM, Projects, Tasks, and Insights destinations resolve to their existing pages or workspace anchors. Leads, follow-up query links, consultations, analytics, marketing, operations, Client Access, Client Publishing, Portal Preview, Portal Readiness, Customer Communications, account, workspace settings, and existing external operations tools remain reachable.
- A5: Existing CRM query parameters and project deep links are preserved when loaded directly and continue to work with shared navigation present.
- A6: Existing authentication, tenant checks, customer publication gates, business logic, workspace data and widgets are not rewritten.
- A7: Browser tests cover active links and destinations, collapse, persistence, mobile drawer behavior, and keyboard operation.
- A8: Scaffold, lint, typecheck, unit, browser, build, migration validation, and diff checks are recorded. No database change is introduced.
- A9: Open `CC-017: Simplify Command Center Navigation`; do not merge, manually deploy, or modify production data.

## Constraints and non-goals

- Keep the Next.js App Router and Bun; keep each page's existing owner authorization and server data loading.
- Reuse existing routes and workspace section IDs (`#projects`, `#tasks`). Do not add a database model or rewrite dashboard widgets.
- No production reads/writes, deployment, merge, publication/access mutation, or auth behavior change.
- Use existing Yorkstead type, spacing, and theme tokens. Keep borders light, focus visible, and reduced-motion behavior respected.
