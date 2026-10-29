# Tasks: Contact inquiry persistence recovery

- [x] T001 Audit all contact inquiry insertions and verify the existing partial unique index and migration conventions.
- [x] T002 Add a shared partial-index-compatible insertion helper and correct other exact conflict-target mismatches.
- [x] T003 Add disposable PostgreSQL persistence and duplicate regression coverage; make email fallback status truthful.
- [ ] T004 Run required checks, document environment limits and rollback, update handoff, and open an urgent PR without merging.

## Handoff state
- Current task: T004 — verification and delivery.
- Last verified: `origin/main` at `075a6b5a189696ab5842ff5a4e13a53052af5e62`; PR #70 merged at that revision; audited `app/actions/contact.ts`, `app/actions/nonprofit.ts`, `app/actions/workflow-audit.ts`, `app/actions/workflow.ts`, and `app/actions/restaurant-trial.ts`.
- Next action: Verify the PR-head CI result and record exact disposable PostgreSQL/build/audit outcomes.
- Blockers: Local PostgreSQL is unavailable (no `TEST_DATABASE_URL`; Docker daemon denies API access). Disposable PostgreSQL integration evidence must come from CI.
