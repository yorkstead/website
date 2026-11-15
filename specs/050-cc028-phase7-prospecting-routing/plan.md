# CC-028 Phase 7 — implementation plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. **Owner gate & contract alignment:** Confirm pull (Website Command Center fetches approved Hub candidates and triggers `import_qualified_prospect()`) vs push (Hub review approval invokes authenticated Website import endpoint). Document the v1 payload contract alongside `yorkstead-automation-hub/specs/005-prospecting-process-signal/`.
2. **Idempotent Discovery import:** Extend or wrap `import_qualified_prospect()` to accept an optional `external_source` + `external_candidate_id` idempotency key so repeated imports return the existing dossier.
3. **Owner-only UI / action:** Surface approved, not-yet-imported candidates in Opportunity Discovery (or Command Center review queue) with an explicit **Import to Discovery** action, source-reported signal badge, and overlap check against existing dossiers/CRM.
4. **Tests:** Add contract, idempotency, authorization, and degraded-source tests using mocked Hub responses and the disposable database.

## Boundaries

- No direct writes to `contact_inquiries` (CRM).
- No Hub database access from Website; communicate strictly over the authenticated HTTP contract.
- No production Hub schedule/secret changes in this slice.

## Rollback

Remove the Discovery import action and Hub candidate reader; additive idempotency metadata on `crm_prospect_dossiers` remains inert.
