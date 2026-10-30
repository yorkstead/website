# CC-026 discovery audit

## Existing sales and research-adjacent architecture

- `contact_inquiries` is the existing CRM lead source of truth. Its lifecycle is `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`, and `archived`; lead follow-ups, archive/retirement rules, and project conversion are implemented in `lib/contact-inquiries.ts`, `lib/lead-follow-up.ts`, and `lib/lead-conversion.ts`.
- CC-019 added bounded qualification fields and `crm_proposals` in migration `0019_crm-sales-workflow.sql`. Explicit proposal amounts and accepted states drive CRM pipeline and won value; budget text is contextual only.
- `consultations` are owner-managed guided consultation records, optionally linked to an existing lead. `/dashboard/consultations` and `components/consultation-workspace.tsx` remain the consultation editor and source of truth.
- Owner pages call `getOwnerSession` server-side. Server actions repeat that check using request headers. Customer portal routes have separate authorization and are not an appropriate surface for research records.
- The CC-025 sidebar groups consultation and follow-up links under CRM in `components/dashboard/dashboard-navigation.tsx`, which is the existing navigation extension point.
- Migrations are ordered SQL files; current latest is `0021_analytics-inquiry-links.sql`. Migration validation is in `scripts/migrate.ts` / `bun run db:migrate:check`.
- `CURRENT.md` records prior work and restrictions. The CC-025 entry describes its then-open PR and is superseded by live GitHub evidence: PR #82 merged as `62a64895117c8e6a8f3b45adfa45e8884fb33452`.

## Design decisions

1. Research opportunities are separate from contact inquiries and excluded from CRM conversion, analytics conversions, proposal totals, and project counts until an owner deliberately promotes them.
2. A research record contains only professional/business workflow context. Contact name/email are collected only in the explicit new-lead promotion form after the participant has authorized commercial follow-up. Existing leads can instead be linked by an owner after duplicate review.
3. Evidence is stored as separate dated entries with a source label and epistemic type: verified fact, business statement, research-based inference, or unvalidated hypothesis. The UI labels each type; hypotheses are never presented as confirmed business problems.
4. Guided discovery notes are structured, nullable, and may remain research-only. Existing consultations can be linked by ID and opened in their existing workspace; they are not copied into a parallel consultation editor.
5. Qualification inputs use explicit ordinal choices and an `unknown` value. A total score is shown only when every criterion is known; incomplete records show known strengths and unresolved criteria. A manual owner ordering override is retained separately from the calculated assessment.
6. Status changes, archive, permission changes, and CRM promotion are append-only research history events. Evidence and interview records remain attached after promotion; archival is soft and does not erase history.
7. Promotion is performed through a single parameterized database transaction. A unique opportunity-to-lead relationship is locked and checked first; concurrent retries return the existing link. Duplicate matches are surfaced for owner selection, not auto-merged.

## Boundaries / non-goals

- No external prospect-data provider, scraping, advertising identifiers, automated outbound messaging, or speculative AI score.
- No creation of sample prospects, guessed financial estimates, or conversion of research into analytics events.
- No change to public intake, customer portal, existing CRM stages, lead conversion semantics, first-party analytics definitions, or proposal authority.
- No production database operation, secret/configuration change, deployment, merge, or outreach.

## Risks and operational considerations

- Migration `0022` is additive and creates opportunity, evidence, interview, and history tables with FK constraints and indexes. It is not applied to production by this change.
- Research records can contain sensitive operational observations. Owner authorization is required on every page read and mutation; all actions are validated and use server-side database access. Responses are private/no-store where route responses are used.
- Research data should be reviewed periodically. Archival hides it from active work while retaining traceability; a documented deletion/retention action must not cascade-delete existing CRM or consultation records.
- CRM leads require an email under the established schema. New-lead promotion therefore requires explicit commercial permission plus a human-supplied, validated name/email; an existing lead can be linked without creating a contact.
- PostgreSQL concurrency and unique constraints must be tested using disposable loopback PostgreSQL. No production data or real prospect data is used in fixtures.
