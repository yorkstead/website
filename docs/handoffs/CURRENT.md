# Current handoff

- Active feature: Issue #47 — client delivery workspace and Adorned handoff verification.
- Active spec: `specs/008-client-delivery-workspace/`.
- Current task: Implementation complete on `feat/47-client-delivery-workspace`; run full verification, resolve failures, converge acceptance evidence, and open the pull request.
- Read-only production audit: Current website DB has one Adorned inquiry (ID 8), status `won`, with no `converted_project_id`; the primary workspace contains no Adorned project. CRM has one Adorned company, one won opportunity, one active project, eight open milestones, and no project/payment records. The legacy website DB has no Adorned match.
- Production-data blocker: Creating or linking the Adorned workspace project requires explicit confirmation and a backup. No live records were changed.
- Implementation: Optional Zod-validated delivery JSON; recoverable project deep links; private read-only website/CRM linkage; idempotent conversion helper with database coverage; existing task/repository/deployment, undo, snapshot, and version-conflict behavior preserved.
- Verification pending: `bun run yorkstead:check`, `bun run db:migrate:check`, `bun run lint`, `bun run typecheck`, `bun test`, `bun run test:e2e`, and `bun run build`.
- Rollback: Revert the Issue #47 feature commit. No SQL or CRM rollback is required because the schema extension is optional JSON and production records were not mutated.
- Prior release note: Morning briefing work remains in review; this feature does not alter Morning Command audio flow.
