# Plan

1. Audit the current Overview, CRM follow-up storage/actions, project/task workspace, activity history, Google bridge, authorization, and browser-test fixtures. Preserve existing authoritative models.
2. Add a server-only CRM overview read that returns bounded safe records, stage counts, due follow-ups, and stalled qualified/proposal leads while excluding retired/closed inquiries. Report revenue as not tracked unless a structured existing source qualifies.
3. Add pure prioritization/pipeline selectors with America/Denver date handling and focused tests.
4. Build the Overview action queue and pipeline snapshot over server CRM data plus the existing hydrated workspace/Google sources. Reuse project deep links, task composer/editor/toggle, and owner-only follow-up actions. Render persisted history only.
5. Add authenticated disposable browser coverage for links, completion/rescheduling/task mutations, empty and unavailable sources, mobile behavior, and authorization boundaries.
6. Run focused checks and every command in `docs/verification.md`; inspect security, spec convergence, and diff; update verification and current handoff.
7. Open PR `CC-018: Actionable Command Center`; do not merge, manually deploy, or touch production data.

## File-level approach

- `lib/contact-inquiries.ts`, `lib/dashboard-data.ts`: bounded CRM overview loader using existing `contact_inquiries` rows.
- `lib/command-center.ts`: deterministic prioritization, stage counts, and supported-revenue availability rules.
- `app/actions/leads.ts`, `lib/lead-follow-up.ts`: narrowly validated reschedule action using existing inquiry row and owner check.
- `app/dashboard/page.tsx`, `components/dashboard.tsx`, and a focused dashboard command-center component: authenticated data composition, overview presentation, and existing task/project actions.
- `tests/*`, `tests/e2e-cc018/*`, and workflow configuration: unit, database/auth, and owner-browser evidence as appropriate.
- `specs/027-cc-018-actionable-command-center/*`, `docs/handoffs/CURRENT.md`: acceptance, verification, and active state.

## Design decisions

- Website inquiry `budget` is free text and is not reliable structured revenue. Display no potential-revenue total unless a reviewed existing record source contains an authoritative amount.
- CRM contact inquiries have state and timestamps but no event log; do not turn `updated_at` into invented activity. Show only existing workspace/project activity entries.
- Workspace task creation/completion remains in the existing client flow and workspace persistence endpoint. Google task completion continues through the existing authenticated bridge route, with confirmation/error handling.
