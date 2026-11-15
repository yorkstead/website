# CC-028 Phase 4b — Explicit project creation on proposal acceptance

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Parent:** [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/spec.md) (task T104b)
**Decision owner:** Brandon York, 2026-11-11 — approved in principle as an explicit, owner-triggered step on proposal acceptance (never automatic).

## Problem

Accepting a CRM proposal (`crm_proposals`) updates the proposal status to `accepted`, while creating a delivery project from the parent CRM inquiry (`convertLeadToProject` in [`app/actions/leads.ts`](../../app/actions/leads.ts)) lives on a separate lead action. Without an explicit, traceable handoff at proposal acceptance, the owner must navigate back to the lead record and manually trigger project creation, or risk double-creating/orphaning delivery workspaces if two actions race.

## Decision

- Proposal acceptance (`accepted`) remains distinct from project creation by default.
- After or during explicit owner confirmation of proposal acceptance, the owner can trigger an explicit **Create project** action that reuses the existing idempotent CRM-to-workspace conversion path.
- Inquiry, proposal, and workspace project links are preserved; no second project-creation path or automatic background conversion is introduced.

## Requirements

- **R1 — Explicit owner trigger:** Project creation on proposal acceptance is opt-in and owner-initiated (e.g., an explicit confirmation checkbox or follow-up action on the accepted proposal), never silent or automatic.
- **R2 — Reuse existing conversion path:** The action delegates to the existing idempotent lead/inquiry-to-workspace conversion logic (`convertLeadToProject` / underlying conversion service) rather than duplicating project insertion logic.
- **R3 — Traceable linkage:** The resulting workspace project preserves its link to both the originating CRM inquiry (`lead_id`) and the accepted proposal (`proposal_id` / proposal reference) without mutating historical proposal amounts.
- **R4 — Concurrency & idempotency:** Concurrent or repeated submissions for the same accepted proposal/inquiry must return the existing linked project without creating duplicate workspace projects or corrupting proposal state.
- **R5 — Rollback safety:** If project creation fails after proposal acceptance (or vice versa when invoked together), partial state is either rolled back atomically or surfaced clearly with a safe retry path that does not double-create records.

## Acceptance criteria

- **A1:** Accepting a proposal without opting into project creation updates only the proposal state and creates no workspace project.
- **A2:** Triggering the explicit project-creation action on an accepted proposal creates (or returns) exactly one workspace project linked to the inquiry and proposal.
- **A3:** Concurrent or repeated project-creation requests for the same inquiry/proposal are idempotent and produce zero duplicate projects.
- **A4:** Failed conversion leaves proposal/project state consistent and surfaces an actionable, retry-safe error.
- **A5:** Owner-only server-side authorization is enforced on all proposal acceptance and conversion mutations.

## Non-goals

- Automatic project creation whenever a proposal status changes to `accepted`.
- Changing `crm_proposals.amount_cents` or Marketing attribution semantics (covered in Phase 4a, [`specs/046-cc028-phase4a-commercial-value/`](../046-cc028-phase4a-commercial-value/spec.md)).
- Customer portal activation, billing/invoicing automation, or Systems Registry / Recovery changes.

## Risks and controls

| Risk | Control |
|---|---|
| Double-click or concurrent requests create two projects | Enforce idempotency key / unique inquiry-to-project constraint in a transaction and return the existing project on conflict. |
| Proposal acceptance succeeds but conversion fails silently | Separate or transactionally guard the steps; surface explicit status and retry action if conversion fails. |
| Unauthorized user triggers conversion | Enforce owner-only server-side session/role checks before any read or write. |

## Rollback

Keep any new proposal-to-project reference additive. UI and action wiring can be reverted independently without affecting existing proposals or workspace projects.
