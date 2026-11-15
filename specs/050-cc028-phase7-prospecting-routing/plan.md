# CC-028 Phase 7 — implementation plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. **Owner gate & contract alignment:** Confirm pull (Website Command Center fetches approved Hub candidates and triggers `opportunityStore` import) vs push (Hub review approval invokes authenticated Website import endpoint). Document the v1 payload contract alongside `yorkstead-automation-hub/specs/005-prospecting-process-signal/`.
2. **Idempotent Discovery import on `opportunityStore`:** Extend `research_opportunities` (additive migration) and `opportunityStore` in [`lib/opportunity-discovery-store.ts`](../../lib/opportunity-discovery-store.ts) with an idempotent import method keyed on `(external_source, external_candidate_id)` that creates the `research_opportunities` row, attaches `opportunity_evidence` for the source-reported posting excerpts, and appends `opportunity_history` in one transaction.
3. **Owner-only UI / action:** Surface approved, not-yet-imported candidates in [`app/dashboard/opportunities/page.tsx`](../../app/dashboard/opportunities/page.tsx) (or Command Center review queue) with an explicit **Import to Discovery** action, source-reported signal badge, and overlap check against existing `research_opportunities` / `contact_inquiries`.
4. **Tests:** Add contract, idempotency, authorization, and degraded-source tests using mocked Hub responses and the disposable database.

## Boundaries

- No direct writes to `contact_inquiries` (CRM); promotion remains an explicit `opportunityStore.promote()` step.
- No parallel dossier/prospect table outside `research_opportunities` and `opportunity_evidence`.
- No Hub database access from Website; communicate strictly over the authenticated HTTP contract.
- No production Hub schedule/secret changes in this slice.

## Rollback

Remove the Discovery import action and Hub candidate reader; additive external-candidate columns on `research_opportunities` remain inert.
