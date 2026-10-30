# CC-026 — Opportunity Discovery & Problem-Led Prospecting

## User value

Give the owner a practical private workspace to research operational problems, record sources and confidence, validate problems with guided conversations, decide what to research next, and deliberately move a supported opportunity into the existing CRM.

## Acceptance criteria

- A1 — Discovery is linked under the Command Center CRM navigation and all research reads/writes require the existing owner session on the server. Customer routes and public analytics cannot read or ingest research data.
- A2 — Owners can create, edit, search, filter, paginate, transition, and archive a research opportunity. Fields include industry, optional market, workflow, suspected problem, observed/verified dates, confidence, workaround, likely frequency/severity, impact context, possible software approach, open questions, separate research/outreach statuses, and next action/date. Empty states do not fabricate records.
- A3 — Evidence entries require source reference, observed date, and one explicit epistemic label: verified fact, business statement, research-based inference, or unvalidated hypothesis. The UI never labels an unvalidated hypothesis as a confirmed customer problem.
- A4 — Guided interviews capture the requested present-state workflow, participants by role, tools/handoffs, manual work, errors, volume, delays, workaround/cost, inaction consequences, authority, budget/urgency when appropriate, desired outcome, change willingness, and next agreed action. Values can remain unknown. A research-only conversation does not imply purchasing intent.
- A5 — Commercial permission is recorded as an explicit state and timestamp with an owner-confirmed change. No outbound message is sent. Existing consultations may be linked and opened in their current workspace.
- A6 — Qualification uses explicit 1–3 or unknown inputs for evidence, severity, frequency, impact, decision-maker access, willingness, technical feasibility, reusability, complexity, and revenue-to-delivery fit. A total is computed only when every criterion is known; unknowns remain visible. The ordered queue explains positive inputs and unknown facts, and allows a separate owner order override.
- A7 — Opportunity summaries distinguish hypotheses, validated problems, qualified research opportunities, promoted CRM leads, proposals, and won engagements. They show industries, recurring workflow patterns with links to records, interview schedule, overdue actions, and promotion/engagement outcomes. Research never contributes hypothetical value to booked revenue.
- A8 — Owner-confirmed CRM promotion requires validated research, explicit commercial permission, and a confirmation step. Existing duplicate leads are shown and linked only after owner selection. New leads require owner-entered valid contact details and use the existing CRM lifecycle. Promotion is transactionally safe and idempotent under concurrent retries; research, evidence, and interview history remain traceable.
- A9 — Promotion does not overwrite CRM status or follow-up data, duplicate an existing lead, create proposals/projects automatically, or alter first-party conversion definitions. An existing lead can be linked without re-creating it.
- A10 — Material transitions are auditable; archive is reversible/soft and retention behavior does not cascade into existing CRM/consultation records. Customer-route isolation, owner authorization, responsive layouts, accessible forms/dialogs, and migration integrity have regression coverage.
- A11 — Security review, spec convergence, task-specific tests, repository-required checks, disposable PostgreSQL, focused/full Playwright, responsive screenshots, operations and verification records are completed and reported accurately.
- A12 — One PR titled `CC-026: Opportunity Discovery & Problem-Led Prospecting` targets `main`; no merge, manual deployment, outreach, production data/secrets/configuration changes.

## Non-goals

- Replacing or duplicating CRM leads, consultations, proposals, engagement/project workflow, follow-ups, or customer communications.
- Scraping, buying third-party prospect data, mass unsolicited communication, autonomous message delivery, predictive lead ranking, or AI-generated evidence.
- Storing sensitive personal, financial, or operational details without business need; inventing prospects, sources, customer statements, or dollar estimates.
- Changing public intake, customer portal, analytics conversion definitions, or existing CRM statuses.

## Qualification model

Each of the ten criteria is explicitly selected as low / medium / high / unknown. An opportunity receives a comparable 10–30 point total only when all ten values are known; complexity is reverse-scored so lower implementation complexity contributes more points. Incomplete opportunities display the number of answered criteria, the known positive/negative reasons, and remaining unknowns without a normalized score. Owners can set a separate 1–5 manual research-order override and explanation; it does not alter the qualification inputs or CRM.

## Security and retention

- Owner-only page and mutation authorization via existing `getOwnerSession` server checks.
- Parameterized SQL, bounded text/arrays/JSON, explicit enums, UUID validation, URL-safe source references limited to safe `https:` or same-origin local links, private responses, and audit history for material transitions.
- Additive ordered migration only. Foreign keys from research records to opportunities/consultations/leads are restrictive or nullable where appropriate; no research history is deleted on promotion/archive.
- Archive hides active work but retains the record and evidence. Deletion/retention is owner-only and must not delete CRM leads, consultations, proposals, or projects.
- An archived CRM inquiry linked to retained opportunity research is deferred from the existing time-based inquiry purge. Unrelated eligible inquiries continue to purge. Deliberate erasure of archived research releases the link for a later retention run and leaves minimal audit history.

## Rollback

Revert the opportunity UI/actions first, leaving the additive migration and research records intact. If a reviewed retention/deletion operation is later needed, it must be a separately authorized owner workflow that preserves linked CRM and consultation records.
