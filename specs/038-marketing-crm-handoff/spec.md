# Marketing → CRM handoff

## User value

An owner can connect a manually researched Marketing prospect to an existing website CRM inquiry and continue sales work from the canonical CRM record without losing Marketing outreach history.

## Scope and acceptance criteria

- A1 — An owner can link an existing Marketing prospect to an existing, non-retired CRM inquiry. The action never creates a CRM inquiry.
- A2 — Marketing shows the linked inquiry's current CRM status, CRM next step, and follow-up date, with a direct link to `/dashboard/leads?lead=<id>`.
- A2a — While linked, Marketing does not offer an editable sales stage, next action, or next-action date for the prospect; the editor identifies CRM as owner of those fields.
- A3 — The relationship stores only the CRM inquiry ID in the existing Marketing prospect JSON. CRM status, next step, and follow-up date are read from `contact_inquiries` and are never copied into Marketing fields.
- A4 — Marketing activities, prospect fields, campaign start, and content history survive linking and normal versioned saves.
- A5 — The owner-only `/api/marketing-workspace` boundary remains authoritative for reads and writes. Invalid, missing, archived, or retired CRM references are rejected; one CRM inquiry cannot be linked to multiple Marketing prospects.
- A6 — Marketing links prevent the existing archived-inquiry retention job from purging a linked inquiry. Removing a prospect/link releases the inquiry to normal retention eligibility.
- A6a — A linked archived inquiry remains visible with canonical archived status and remains protected while the link exists. Clearing the link releases it to the existing 365-day retention rule; unrelated archived records remain eligible.
- A6b — A linked retired or otherwise unavailable inquiry keeps its Marketing reference/history and is shown as unavailable. The owner can unlink it; an unavailable inquiry cannot be linked anew.
- A7 — Existing Opportunity Discovery CRM linking/promotion remains unchanged.
- A8 — Tests cover normalization, missing and invalid CRM relationships, duplicate links, unauthorized Marketing reads/writes, and preservation of activities/history.
- A9 — No new CRM, stage synchronization, proposal/revenue duplication, event system, migration, production operation, merge, or deployment is introduced.

## Existing record ownership

- `marketing_workspaces.data` owns Marketing prospect and outreach/campaign history.
- `contact_inquiries` owns CRM identity, status, next step, and follow-up date.
- `research_opportunities.crm_lead_id` and the CC-026 promotion/linking path remain the authority for Opportunity Discovery relationships.
- The current website application is a single owner tenant with one `primary` Marketing workspace; the CRM inquiry is selected only from the same server-side database after owner-session authorization. No caller-selected tenant or client-side database access is added.

## Implementation decision

Store a nullable positive `crmLeadId` reference on the existing JSON Marketing prospect. Keep the current owner-only versioned workspace API and reject malformed, duplicate, archived, retired, and missing references before saving. Load a bounded owner-only safe CRM summary from `contact_inquiries` for the Marketing UI. Retention must exclude linked CRM inquiry IDs so a JSON reference cannot outlive its canonical record. This keeps the existing persistence shape and avoids a new relationship service or duplicate CRM fields.

When linked, the editor hides Marketing's legacy sales-stage and next-action inputs, and pipeline/due-action views use CRM's canonical status and follow-up only. Existing legacy values remain unchanged so unlinking can restore the prior Marketing-only prospect state, but they are not displayed or editable while linked. An archived CRM record stays linked and visible as archived; a missing or retired record is shown as unavailable. The owner may clear either reference. Clearing an archived inquiry link releases it to the existing purge rule; a missing or retired inquiry cannot be linked anew.

## Non-goals

- Converting Marketing targets into CRM records automatically.
- Mirroring CRM lifecycle, qualification, proposal, revenue, or follow-up state into Marketing.
- Replacing or changing the existing Opportunity Discovery integration.
- Changing public intake, analytics attribution, or customer-facing routes.

## Rollback

Revert the Marketing UI/API and retention-query changes. Preserve the optional `crmLeadId` values as inert JSON until the owner decides whether to unlink them; do not delete Marketing history or CRM inquiries as part of rollback.
