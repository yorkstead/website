# Plan

1. Preserve existing inquiry stages, consultation linkage, Denver follow-up workflow, owner auth, retirement predicate, conversion transaction, and project deep links.
2. Add an ordered additive migration for qualification and close-out fields plus an explicit proposal table. Store money as nonnegative integer cents and enforce allowed states/engagement fields.
3. Add safe owner lead editing and proposal CRUD/status handling over existing lead IDs; never derive proposal amount from budget text.
4. Extend the lead page into a practical qualification/proposal workflow with related consultations and follow-up actions.
5. Add server-only Overview summaries for sales priorities and actual proposal value with distinct empty/unavailable behavior.
6. Add focused unit/PostgreSQL and isolated owner-browser coverage for lifecycle, tenant/auth/retirement protection, and empty states.
7. Run task-specific tests and all commands in `docs/verification.md`; complete security and spec-convergence review; update evidence and handoff; open the CC-019 PR without merge/deploy.

## Migration decision

Existing inquiry fields cannot represent qualification, close-out reason, or structured proposal amounts/state. An additive migration is therefore required. Existing lead values remain valid; new columns are nullable/defaulted, proposal storage starts empty, and no backfill or production operation is included.
