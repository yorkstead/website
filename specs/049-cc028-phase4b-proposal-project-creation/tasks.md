# CC-028 Phase 4b — tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** Specced (2026-11-15); awaiting implementation authorization.

- [ ] T001 — Confirm whether project creation is offered as an opt-in checkbox during acceptance, a post-acceptance action, or both.
- [ ] T002 — Extract/verify the transactional idempotent CRM-to-project conversion service shared by `convertLeadToProject` and proposal acceptance.
- [ ] T003 — Wire the explicit project-creation action and linked-project badge into the CRM proposal acceptance UI.
- [ ] T004 — Add focused concurrency, idempotency, authorization, and rollback tests against the disposable database.
- [ ] T005 — Run repository verification (`lint`, `typecheck`, `db:migrate:check`, `test`, `test:e2e`, `build`).
- [ ] T006 — Open a reviewable PR; no merge or deployment without separate authorization.

## Exclusions

- [x] E001 — Automatic project creation without explicit owner trigger.
- [x] E002 — Proposal pricing/attribution changes (covered in Phase 4a).
