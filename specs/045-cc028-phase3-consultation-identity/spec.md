# CC-028 Phase 3 — Consultation identity semantics

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Parent:** [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/spec.md) (task T103)
**Decision owner:** Brandon York, 2026-11-11 — linked consultation identity is a **meeting-time snapshot**; the CRM inquiry remains canonical for current contact details.

## Problem

A consultation row stores `lead_id` alongside its own `client_name`, `business`, and `email`. Creating a consultation from a CRM lead prefills those values, but the editor allowed them to be changed afterwards. Two records therefore described one contact, and the consultation copy could silently disagree with the inquiry it linked to.

## Decision

The identity stored on a linked consultation is the snapshot recorded when the meeting record was created:

- It does not follow later CRM edits.
- It is not editable from the consultation editor.
- The link itself is fixed once set; changing which lead a consultation belongs to requires an explicit future feature, not an edit.
- Unlinked consultations keep the existing editable behavior, because no canonical CRM identity exists for them.

## Requirements

- R1: A linked consultation renders its identity as read-only, labelled as a meeting-time snapshot, with a direct link to the CRM lead.
- R2: `updateConsultation` ignores identity and link changes for linked records, so the invariant holds for API callers as well as the UI.
- R3: Non-identity fields (service, date, stage, responses) remain fully editable on linked records.
- R4: Unlinked consultations are unchanged in behavior and editability.
- R5: Identity is never migrated, backfilled, or rewritten; historical values are preserved exactly.

## Acceptance

- A1: Updating a linked consultation with different name/business/email persists the stored snapshot, not the request values.
- A2: Updating a linked consultation with a different `lead_id` keeps the original link.
- A3: Status, date, and responses still update on linked records.
- A4: Unlinked records still accept identity edits.
- A5: The editor shows the snapshot panel and CRM link only when `leadId` is present.
- A6: No schema change, migration, data backfill, or new store.

## Non-goals

- Changing CRM contact details from the consultation record.
- Re-linking or unlinking existing consultations.
- Reconciling historical consultations that already drifted from their CRM inquiry — they keep their recorded values by design.
- Merging or deduplicating CRM inquiries.
