# CC-019 — CRM Pipeline & Sales Workflow

## User value

Give Yorkstead Systems an owner-only sales workspace for manufacturing, logistics, and restaurant leads, from qualification through a priced proposal and explicit won/lost outcome.

## Scope and requirements

- Use existing `contact_inquiries` as the lead source of truth and retain the New, Contacted, Qualified, Proposal, Won, Lost lifecycle, archive handling, follow-up dates, and CC-015 idempotent project conversion/deep links.
- Capture industry, pain, company size, urgency, decision-maker, budget indication, and next step as bounded owner-managed qualification fields. Free-text budget indications are context only and never revenue.
- Keep consultations linked to leads and preserve consultation outcomes and requirements; expose the association from lead workflow.
- Store explicit proposals linked to inquiries, including engagement type, amount in cents, draft/sent/accepted/declined state, dates, and next action. Owners can edit engagement type, explicit amount, and next action/date on an existing proposal without replacing its identity or state; blank action and date clear the scheduled action. Only explicit proposal amounts count toward actual pipeline value; do not infer amount from offer guidance or lead budget text.
- Capture won/lost reason and report conversion using authoritative won/lost statuses. Won value comes only from an explicitly accepted proposal, with conversion/project identity still governed by existing idempotent conversion.
- Integrate sales priorities and proposal totals into CC-018 Overview. Retain empty/error states, exact links, owner authorization, tenant isolation, retired-engagement safeguards, and America/Denver follow-up dates.
- Provide a clear manual follow-up queue with complete/reschedule actions. Do not send customer messages automatically.
- Match the minimal Yorkstead dashboard style and existing responsive App Router navigation.

## Acceptance criteria

- A1: CRM displays New, Contacted, Qualified, Proposal, Won, and Lost stages; archived/retired inquiries remain excluded from active work.
- A2: Owners can save/reload all qualification fields and next step; public forms remain unchanged.
- A3: Consultation records and outcomes are associated with the exact lead and requirements remain accessible.
- A4: Owners can create/edit proposals with validated explicit amount, engagement, state, dates, and next action; edit preserves proposal identity/state, blank next-action fields clear the action, and draft/sent/accepted/declined transitions persist.
- A5: Actual pipeline value is derived only from explicit proposal amounts in appropriate states; free-text budget and offer menu amounts are never counted. Won/lost reasons and conversion counts are accurate.
- A6: Overview surfaces follow-up, qualified/proposal sales priorities, pending proposal count, and supported actual value with exact lead links and readable empty/error states.
- A7: Follow-up completion/rescheduling, idempotent conversion, exact project deep links, owner-only access, tenant isolation, retired/archived protections, and no-message behavior remain intact.
- A8: Disposable PostgreSQL and browser coverage exercises pipeline, qualification, proposals, follow-ups, conversion, authorization, and empty states; repository checks are recorded.
- A9: No production data/schema changes, fake production records, customer messages, payment requests, portal publication, merge, or manual deployment.

## Non-goals

- Changing the public intake form, adding advertising identifiers, or exposing private CRM fields to customers.
- Treating indicative offer prices or free-text budgets as confirmed deal values.
- Automated outreach, billing, payment requests, or customer portal publication.
- Replacing existing CRM, consultation, project, or workspace sources of truth.
