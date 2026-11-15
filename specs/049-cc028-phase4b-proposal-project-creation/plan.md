# CC-028 Phase 4b — implementation plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. **Inspect existing conversion path:** Extract or reuse the transactional core behind `convertLeadToProject` (`app/actions/leads.ts`) so both the lead detail page and proposal acceptance flow call the same idempotent service.
2. **Idempotency & concurrency guard:** Ensure the conversion service checks/locks on the inquiry (`lead_id`) and handles unique-constraint or already-converted states cleanly, returning the existing project ID.
3. **Proposal acceptance UI & action:** Add an explicit, opt-in "Create workspace project" control on proposal acceptance (and a direct "Create project" action on accepted proposals that do not yet have a linked project), displaying the linked project badge/link once created.
4. **Tests:** Add unit/integration tests covering opt-out acceptance (no project), explicit creation, repeated/concurrent idempotency, and failure/rollback behavior against the disposable database.

## Boundaries

- No automatic conversion on status change.
- No changes to Marketing attribution or proposal pricing math.
- No customer portal activation or external billing side effects.

## Rollback

Revert the proposal UI control and action wiring; existing `convertLeadToProject` and stored proposals/projects remain intact.
