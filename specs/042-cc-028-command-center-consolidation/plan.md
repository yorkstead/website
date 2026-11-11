# CC-028 — Command Center workflow consolidation plan

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Specification:** [`spec.md`](spec.md)
**Architectural baseline:** merged Command Center audit, [`docs/audits/2026-11-09-command-center-consolidation.md`](../../docs/audits/2026-11-09-command-center-consolidation.md).
**Plan status:** Proposed; sequence and owner gates require review. No implementation is authorized by this plan.

## Delivery strategy

Treat the audit as a set of independent follow-ups, not a broad rewrite. First resolve semantic and external-system questions. Then ship only owner-selected slices, each in a focused PR that updates the owning feature spec and verification evidence. Reuse current record stores, server authorization, routes, and integration contracts. Do not add a new CRM, event bus, task store, registry, or automation platform.

Effort estimates are relative: XS (documentation/review), S (small focused change), M (multiple adapters or meaningful workflow), L (separate program). Risk reflects data/security/behavior impact. Estimates exclude owner response time and external platform investigation.

## Phased implementation sequence

| Phase | Slice | Likely boundary / design | Effort | Risk | Benefit and review gate |
|---|---|---|---:|---|---|
| 0 | Owner decisions and external inventory | Record decisions listed in `spec.md`. Reconfirm live main and inspect the named code/spec references at the selected implementation head. Ask the owner to verify Quick Launch targets and external schedule/monitor through their owning systems; this plan performs no external inspection. | XS | Low | Prevents behavior being chosen from assumptions. Gate: decisions recorded in issue #119 or the affected spec. |
| 1 | Cross-source account overlap review | If selected, add a bounded owner-only review over existing Marketing, Discovery, and CRM records. Prefer read-only candidate display with source, safe candidate rationale, and direct source links. Reuse existing IDs and explicit link paths; do not create a canonical merged account. | S–M | Medium | Reduces duplicate lookup and manual reconciliation. Gate: privacy review, query bounds, false-positive handling, and owner-confirm action defined. |
| 2 | Attention source/freshness clarity | Review existing CC-021/CC-027 adapters and attention presentation. Ensure source, record/action type, canonical owner, exact destination, observation/freshness, partial results, and supported source action remain visible. Update the owning CC-021/CC-027 specs/tasks rather than creating a second aggregator. | S | Medium | Reduces missed/doubled follow-up and makes incomplete reads apparent. Gate: adapter-by-adapter contract review; source-owned mutation paths retained. |
| 3 | Consultation identity semantics | After decision, update the consultation workflow to label its linked CRM identity as a historical snapshot or projection. Keep `lead_id` and meeting history; avoid routine re-entry. Do not change what is editable until snapshot semantics are selected. | S | Medium | Reduces identity drift and unnecessary entry. Gate: owner decision plus regression for linked/unlinked and historical values. |
| 4 | Proposal value and project handoff | Align commercial-value labels with CRM proposal amount and keep Marketing attribution distinct. If approved, add a separate explicit project-creation action after acceptance that uses existing idempotent conversion and exact inquiry/proposal/project linkage. No automatic project creation. | M | Medium–High | Prevents value ambiguity and missed delivery handoff. Gate: value definitions, confirmation behavior, concurrency/idempotency, and rollback reviewed. |
| 5 | Disconnected component cleanup | Re-run exact-branch import/search checks and inspect route/dynamic usage. Remove only `ConnectedOperations` and/or `DashboardOperationsBriefing` if no consumer exists. Keep active `LeadPriorityQueue` and Hub source boundary. | XS | Low | Removes misleading dead presentation. Gate: consumer evidence attached to the PR. |
| 6 | Navigation and Quick Launch | Compare labels and grouping against existing CC-017/CC-025 navigation decisions. Change only confusing labels/grouping selected by the owner; preserve routes. Verify saved GitHub/Vercel targets before changing defaults. | S | Low–Medium | Makes record ownership and destinations easier to infer. Gate: target confirmation and responsive/keyboard route review. |

### Separate follow-ups

- **Client portal activation:** not a slice of this program. Continue only under its existing readiness/release specifications and separate authorization.
- **External prospecting schedules:** phase 0 records owner, status, and output contract only after separately authorized access. If active and retained, create a narrow follow-up to route candidates into existing Opportunity Discovery/CRM rules. Do not create or operate another schedule or database.
- **Systems Registry / Operations / Infrastructure & Recovery:** no changes in this plan. Any discovered boundary conflict returns to issue #112 and the Registry owner; no owned module is modified here.

## File and contract boundaries

Final paths must be confirmed from the implementation head before coding. Likely owners are:

- Marketing and CRM relationship/read models: existing Marketing workspace and CRM owner-only APIs/components; see `specs/038-marketing-crm-handoff/`.
- Research and explicit promotion: existing Opportunity Discovery records and CRM promotion/link path; see `specs/036-cc-026-opportunity-discovery/`.
- Consultations/proposals/conversion: existing consultation, CRM proposal and workspace conversion services; see `specs/023-cc-015-crm-project-workflow/` and `specs/028-cc-019-crm-sales-workflow/`.
- Attention/Calendar/Google Tasks/Hub: existing CC-021/CC-027 adapters and views; see `specs/039-cc-027-unified-attention/` and `specs/040-cc021-dashboard-read-consolidation/`.
- Navigation: existing App Router navigation and CC-017/CC-025 contracts.
- Cleanup: only the disconnected components named in the audit, after consumer validation.

No migration is currently proposed. If implementation reveals a need for persistence changes, stop that slice and update its spec/plan with ordered migration, backfill (if any), rollback, compatibility, and `bun run db:migrate:check` requirements before implementation.

## Verification and review gates

For each selected slice:

1. Rebase the work on freshly verified live `main`; record exact source SHA and PR state.
2. Run focused tests for source ownership, authorization, links, stale/partial results, and supported actions. Use disposable PostgreSQL/browser tests only if the slice affects those contracts.
3. Run the applicable commands from `docs/verification.md`; document environment blockers and skipped checks precisely.
4. Compare implementation to every applicable criterion in `spec.md` and the owning source spec. Confirm no copied lifecycle/status or cross-source write was introduced.
5. Attach evidence for the PR. Do not merge, deploy, query production, alter provider accounts, or mutate customer/business records without separate authorization.

## Rollback

For presentation/read-model slices, revert the adapter/UI change first and retain the original source workflows. For cleanup, restore the component if a consumer is discovered. For any separately approved persistence change, preserve source IDs/history, use an additive migration, and define rollback before implementation. Never delete historical research, Marketing activity, consultations, proposals, projects, Registry evidence, or recovery records as a consolidation shortcut.
