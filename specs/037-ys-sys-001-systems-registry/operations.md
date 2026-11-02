# YS-SYS-001 operations, migration and backout gates

## PR 0 boundary

PR 0 is discovery/documentation only. It performs no database connection, production write, migration, environment read, credential inspection, provider request, configuration change, merge or deployment. GitHub/Vercel metadata is used only to verify repository default branch and deployed source SHA.

## Pre-migration gate

Before PR 1 implementation:

1. Identify the actual production database through an approved read-only operator workflow without copying a DSN, host, secret or credential into GitHub.
2. Capture current migration ledger and verify whether migrations `0020` and `0022` are applied to that exact target.
3. Capture a redacted inventory of seven original rows: stable IDs; non-sensitive labels and field-presence/checksum metadata for sensitive fields; cost/cadence/basis/confirmation; URL presence/domain class; renewal presence/date; archive/revision values. Keep raw notes and account identifiers out of the artifact.
4. Capture per-entry audit counts and deterministic fingerprints over canonical audit metadata. Verify triggers/permissions prevent update/delete/truncate and that all historical events remain reachable through the owner interface.
5. Have a reviewer compare the evidence bundle to this specification and approve the forward-only design before migration code is written.

If a production read-only route is unavailable, do not improvise with deployment secrets, shell environment dumps, client requests or a different database. Keep schema work paused and request the approved operator evidence.

## Migration conventions

- Use the next ordered migration after checking all current numbered SQL files, manifest/checksum conventions, fresh/repeat migration tests and production ledger.
- Make changes additive and forward-compatible. Preserve existing tables, IDs, triggers, constraints, compatibility endpoints and audit data.
- Prefer nullable/new tables and bounded backfills with resumable checkpoints. Do not rewrite historical migrations or fabricate legacy values.
- Run `bun run db:migrate:check`, disposable PostgreSQL fresh/repeat checks and an upgrade test loaded with the exact redacted legacy shape and seven synthetic fixture IDs.
- No production DDL or data write is authorized. Automatic production migration behavior remains subject to separate release authorization.

## Rollback and recovery

- Keep the new UI/reader default-off until a separately authorized release.
- If a PR is reverted before migration, no data recovery is needed.
- If an additive migration has been applied in an authorized future release, roll back application reads/writes first and retain new and legacy audit records. Do not drop tables, truncate audit, delete/rekey the seven records or execute a destructive down migration.
- Correct schema/data issues with a reviewed forward migration and a separately authorized recovery procedure. Any backfill must be idempotent, checkpointed, audited and verified on disposable copies first.
- Registry availability failure must leave the existing CC-023 page/API and owner workflows usable or fail closed with a clear generic error.

## Independent release blockers

Automation Hub shopping-capture recovery and CC-026 production migration evidence are coordinated release dependencies only; no co-deployment is planned. MKT-QR-001 is separate and remains print-critical. No merge, production configuration/data/migration change, deployment, external communication, paid service purchase or provider mutation is authorized by PR 0.
