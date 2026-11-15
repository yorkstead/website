# CC-028 Phase 7 — tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** Specced (2026-11-15); **owner-gated** pending trigger, target-record, and overlap decisions.

- [ ] T001 — Owner decision gate: confirm pull vs push trigger, `research_opportunities` / `opportunity_evidence` mapping, and overlap/suppression handling.
- [ ] T002 — Reconcile v1 handoff contract between `website` and `yorkstead-automation-hub` (`specs/005-prospecting-process-signal/`).
- [ ] T003 — Add an ordered, additive migration for `(external_source, external_candidate_id)` idempotency on `research_opportunities` (verified via `db:migrate:check`) and extend `opportunityStore` in `lib/opportunity-discovery-store.ts` to create/return the opportunity + `opportunity_evidence` idempotently.
- [ ] T004 — Implement authenticated Hub candidate reader/handoff and explicit owner-only **Import to Discovery** action surfaced in `app/dashboard/opportunities/page.tsx`.
- [ ] T005 — Add focused unit/integration tests for authorization, idempotency, unapproved-candidate rejection, and Hub-unavailable degradation.
- [ ] T006 — Run repository verification (`lint`, `typecheck`, `db:migrate:check`, `test`, `build`) and open a reviewable PR.

## Exclusions

- [x] E001 — Automatic import of unreviewed/queued postings.
- [x] E002 — Direct creation of `contact_inquiries` CRM records without Discovery vetting.
- [x] E003 — Parallel dossier/prospect tables outside `research_opportunities` and `opportunity_evidence`.
- [x] E004 — Enabling production Hub schedules or provisioning external API secrets.
