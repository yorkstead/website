# CC-028 Phase 3 — implementation plan

**Specification:** [`spec.md`](spec.md)
**Parent plan:** [`specs/042-cc-028-command-center-consolidation/plan.md`](../042-cc-028-command-center-consolidation/plan.md) (phase 3)

## Approach

Enforce the snapshot in one pure function, apply it on the only write path that can change a consultation, and reflect it in the editor.

1. `lib/consultation-model.ts` — `preserveLinkedIdentity(existing, input)` returns the request unchanged for unlinked records, and for linked records returns the request with the stored identity and link. Pure, no I/O, directly testable.
2. `lib/consultations.ts` — `updateConsultation` reads the stored `lead_id`, `client_name`, `business`, and `email` before updating, applies `preserveLinkedIdentity`, and writes those values. One extra indexed lookup by primary key on an owner-only path.
3. `components/consultation-workspace.tsx` — when `draft.leadId` is set, the three identity inputs are replaced by a read-only snapshot panel naming the capture date and linking to `/dashboard/leads?lead=<id>`. Unlinked drafts keep the inputs unchanged.

## Boundaries

- No migration: the columns already exist and no value is rewritten.
- No change to creation, deletion, pagination, or the lead-consultation joins.
- No CRM write path is touched; CRM remains the place current contact details are edited.

## Rollback

Revert the three files. Stored data is untouched by the feature, so reverting restores the previous editing behavior with no reconciliation needed.

## Verification

- Unit: `lib/consultation-model.test.ts` covers linked edits, link repointing, non-identity edits, and unlinked behavior.
- Repository: `yorkstead:check`, `db:migrate:check`, `lint`, `typecheck`, `bun test`, `build` against the local disposable database (`scripts/local-db.sh`).
- Browser: existing consultation flow is unaffected for unlinked records; the linked panel is presentation-only. Targeted browser coverage is recorded as not added for this slice.
