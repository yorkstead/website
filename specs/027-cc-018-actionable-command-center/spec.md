# CC-018 — Actionable Command Center

## User value

Make the authenticated Overview a useful daily operating view that brings existing CRM follow-ups, project next steps, workspace tasks, supported Google task context, and persisted activity into one prioritized surface.

## Scope

- Prioritize active CRM follow-ups overdue or due today, stalled qualified/proposal leads, active project next steps, and incomplete tasks using America/Denver dates.
- Show open website inquiries by existing stage and pending proposal count. Display potential revenue only if an existing authoritative source supplies a structured amount; website inquiry budget text is not an amount source.
- Show recent persisted workspace/project history without synthesizing events.
- Link to exact leads and projects. Support completing/rescheduling CRM follow-ups and completing/opening/creating existing workspace tasks.
- Keep the existing App Router, owner authorization, workspace storage, CRM tables, Google bridge, and responsive CC-017 navigation.
- Make Overview scanable on mobile and clear when sources are empty, partially available, or unavailable.

## Acceptance criteria

- A1: An owner sees overdue and due-today follow-ups, stalled qualified/proposal leads, active project next steps, and incomplete tasks ranked from persisted dates/status/priority without fake records.
- A2: The pipeline snapshot shows open leads by stage and pending proposals from existing CRM records. Unsupported potential revenue is labeled unavailable/"not tracked" rather than estimated from free text.
- A3: Recent activity is sourced only from persisted workspace/project history and is empty when no history exists.
- A4: Lead/project links resolve to their exact records. Follow-ups can be completed or rescheduled through owner-authorized, validated mutations; tasks can be opened, completed, or created using existing workspace flows.
- A5: CRM and workspace read failures are distinct from empty data; errors do not expose sensitive fields. Google connection failure remains nonblocking and clearly indicated when relevant.
- A6: Overview is mobile usable, low clutter, visually consistent with CC-017, and has intentional loading, empty, and error states.
- A7: Tests cover prioritization, deep links/actions, empty/error states, authorization, tenant/retirement constraints, and mutation persistence. No new table or external communication/publication action is introduced.
- A8: Required repository checks and browser tests are recorded. Update this spec, verification, and `docs/handoffs/CURRENT.md`; open `CC-018: Actionable Command Center` without merge or manual deployment.

## Constraints and non-goals

- No duplicate CRM, project, task, or activity storage; no fabricated data or history; no public intake changes; no customer communication or publication; no production mutation or deployment.
- Preserve owner authentication, retired inquiry exclusion, current tenant boundaries, and existing customer publication gates.
- Keep dates and due buckets in `America/Denver`.
- No database migration unless discovery demonstrates a requirement; any such requirement pauses implementation for separate review.
