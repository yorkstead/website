# CC-028 Phase 7 — tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** Specced (2026-11-15); **owner-gated** pending trigger, target-record, and overlap decisions.

- [ ] T001 — Owner decision gate: confirm pull vs push trigger, `crm_prospect_dossiers` target, and overlap/suppression handling.
- [ ] T002 — Reconcile v1 handoff contract between `website` and `yorkstead-automation-hub` (`specs/005-prospecting-process-signal/`).
- [ ] T003 — Ensure `import_qualified_prospect()` supports idempotent `external_candidate_id` key (additive migration if needed, verified via `db:migrate:check`).
- [ ] T004 — Implement authenticated Hub candidate reader/handoff and explicit owner-only **Import to Discovery** action.
- [ ] T005 — Add focused unit/integration tests for authorization, idempotency, unapproved-candidate rejection, and Hub-unavailable degradation.
- [ ] T006 — Run repository verification (`lint`, `typecheck`, `db:migrate:check`, `test`, `build`) and open a reviewable PR.

## Exclusions

- [x] E001 — Automatic import of unreviewed/queued postings.
- [x] E002 — Direct creation of `contact_inquiries` CRM records without Discovery vetting.
- [x] E003 — Enabling production Hub schedules or provisioning external API secrets.
