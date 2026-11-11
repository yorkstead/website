# CC-028 Phase 3 — tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** T103 selected by the owner on 2026-11-11 (snapshot semantics); implementation complete, verification pending.

- [x] T001 — Confirm the owner decision: linked consultation identity is a meeting-time snapshot.
- [x] T002 — Locate the single update path and confirm no migration is required.
- [x] T003 — Add `preserveLinkedIdentity` and apply it in `updateConsultation`.
- [x] T004 — Replace editable identity fields with a read-only snapshot panel and CRM link for linked drafts.
- [x] T005 — Add unit coverage for linked edits, link repointing, non-identity edits, and unlinked behavior.
- [ ] T006 — Run the repository baseline against the local disposable database and record evidence.
- [ ] T007 — Open the reviewable PR; no merge or deployment without separate authorization.

## Exclusions

- [x] E001 — No schema change, migration, or data backfill; historical values are preserved exactly.
- [x] E002 — No CRM write path, re-linking, unlinking, or record merge is introduced.
