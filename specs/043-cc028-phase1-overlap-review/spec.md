# CC-028 Phase 1 — Account overlap review

**Tracking:** issue #119; parent program `specs/042-cc-028-command-center-consolidation/`; architectural reference `docs/audits/2026-11-09-command-center-consolidation.md`.

## User value

The owner can search across Marketing prospects, Opportunity Discovery cases, and Website CRM inquiries to review possible account overlap before using each source's existing link or promotion action.

## Acceptance criteria

- A1. The new page is owner-only, server-rendered, noindex, and linked under CRM navigation. Authentication occurs before any private record read.
- A2. Search requires 3–80 characters; each source is bounded. The page warns when a source result may be incomplete and never treats an empty bounded search as proof of uniqueness.
- A3. Candidates require the same normalized company name across at least two distinct sources. Substring similarity, short/generic names, and multiple records from one source alone do not qualify. Exact email across sources raises confidence only when company also matches; different email leaves a weak company-only signal.
- A4. Every candidate shows its source, company, available contact email, existing CRM link, and a source navigation link. Marketing's current workspace has no exact prospect deep link, so its link opens that workspace.
- A5. Search is read-only. It creates no new account record, relationship, CRM inquiry, history event, or status change. Existing records and source ownership remain intact.
- A6. Tests cover false positives, authorization before reads, query and result limits, and record preservation. Any unavailable source makes the review unavailable rather than presenting a partial set as conclusive.

## Non-goals and rollback

No automatic matching, linking, merging, data migration, production query, external schedule, customer portal, Registry, Operations, or Recovery change. Rollback removes the page, navigation item, and read adapter; existing source records are untouched.
