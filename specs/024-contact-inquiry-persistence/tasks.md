# Tasks: Contact inquiry persistence recovery

- [x] T001 Audit all contact inquiry insertions and verify the existing partial unique index and migration conventions.
- [x] T002 Add a shared partial-index-compatible insertion helper and correct other exact conflict-target mismatches.
- [x] T003 Add disposable PostgreSQL persistence and duplicate regression coverage; make email fallback status truthful.
- [x] T004 Run required checks, document environment limits and rollback, update handoff, and open an urgent PR without merging.

## Handoff state
- Current task: Complete; PR #71 is open for review and unmerged.
- Last verified: source head `b6fde5f1f1332409252e791759815541ff427227`; exact PR-head CI run `40800610037` passed, including the migrated PostgreSQL persistence/duplicate regression.
- Next action: Human review; do not merge or deploy under this task authorization.
- Blockers: Local PostgreSQL, build worker binding, and audit DNS remain unavailable; hosted CI verified all required checks.
