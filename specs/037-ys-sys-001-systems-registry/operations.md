# YS-SYS-001 operations, migration and backout gates

## PR 0 boundary

PR 0 is discovery/documentation only. It performs no database connection, production write, migration, environment read, credential inspection, provider request, configuration change, merge or deployment. GitHub/Vercel metadata is used only to verify repository default branch and deployed source SHA.

## Temporary diagnostic status and retirement

PR #89 added the special read-only mode to the existing owner-only leads diagnostic. The owner reports one successful production execution; endpoint identity and aggregate data are summarized in `production-preflight.md`. PR #90 removed the mode, helper, temporary tests, and activation guide while retaining the legacy no-query leads diagnostic; it is merged and deployed.

The owner reports both temporary Production flags are disabled, and after PR #90's deployment the retired query returned 404 while the normal owner diagnostic and access restrictions passed. Any temporary WAF rule removal requires separate owner approval. No environment or firewall change is authorized here.

## Pre-migration gate

The following gates are maintained in the current [`activation runbook`](activation-runbook.md). Owner direction on 2026-11-03 retained the currently configured databases, stopped former-database recovery, and removed fixed seven-entry/eleven-audit historical parity as a production release requirement. `production-preflight.md` and older row-specific recovery instructions are historical source evidence only; do not use their counts or fingerprints as a current baseline.

Before any separately authorized Production migration, verify the actual deployed database identity and read-only migration/schema prerequisites, then create a new prospective encrypted baseline of whatever records and audit history exist at that time. Record its timestamp and source provenance privately. Verify the encrypted artifact can be retrieved and validated using the owner-approved recovery process. No fixed starting row count is expected. Preserve existing rows, relationships, audit history and revisions exactly across the migration. Perform migration 0023/0024 tests and recovery rehearsal using disposable PostgreSQL only. Production migration and activation require separate, explicit authorization.

## Recovery readiness

Use `recovery-runbook.md` as the controlled recovery plan. Current PITR history is six hours; no snapshot schedule or saved snapshots were found. The document covers a one-time snapshot if available and approved, an encrypted logical export, or PITR as a short-window option; non-production restore rehearsal; verification; data-loss exposure; and approvals. No backup, export, restore, schedule, branch, or production setting is changed by this specification.

## Migration conventions

- Use the next ordered migration after checking all current numbered SQL files, manifest/checksum conventions, fresh/repeat migration tests and production ledger.
- Make changes additive and forward-compatible. Preserve existing tables, IDs, triggers, constraints, compatibility endpoints and audit data.
- Prefer nullable/new tables and bounded backfills with resumable checkpoints. Do not rewrite historical migrations or fabricate legacy values.
- Run `bun run db:migrate:check`, disposable PostgreSQL fresh/repeat checks and an upgrade test loaded with the exact redacted legacy shape and seven synthetic fixture IDs.
- No production DDL or data write is authorized. `vercel-build` no longer runs migrations; a named operator must execute `bun run db:migrate` only after a separate, target-specific production authorization and recovery approval. CI migrations use the disposable PostgreSQL service.

## Rollback and recovery

- Keep the new UI/reader default-off until a separately authorized release.
- If a PR is reverted before migration, no data recovery is needed.
- If an additive migration has been applied in an authorized future release, roll back application reads/writes first and retain new and legacy audit records. Do not drop tables, truncate audit, delete/rekey the seven records or execute a destructive down migration.
- Correct schema/data issues with a reviewed forward migration and a separately authorized recovery procedure. Any backfill must be idempotent, checkpointed, audited and verified on disposable copies first.
- Registry availability failure must leave the existing CC-023 page/API and owner workflows usable or fail closed with a clear generic error.

## Independent release blockers

Automation Hub shopping-capture recovery and CC-026 production migration evidence are coordinated release dependencies only; no co-deployment is planned. MKT-QR-001 is separate and remains print-critical. No merge, production configuration/data/migration change, deployment, external communication, paid service purchase or provider mutation is authorized by PR 0.
