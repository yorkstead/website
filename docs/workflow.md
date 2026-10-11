# Spec-driven workflow

1. Intake: create or update a spec under `specs/`.
2. Clarify: resolve ambiguity, non-goals, and decisions.
3. Plan: map the smallest safe file-level approach.
4. Task: split into independently verifiable slices.
5. Implement: one task at a time; update status immediately.
6. Verify: run `docs/verification.md` and task-specific checks.
7. Converge: compare implementation with every acceptance criterion.
8. Review/release: include evidence, risks, rollback, and manual setup.

If interrupted, update the active task and `docs/handoffs/SESSION-END.md` with the next exact action.
