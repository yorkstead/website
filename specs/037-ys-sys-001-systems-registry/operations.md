# YS-SYS-001 operations, migration and backout gates

## PR 0 boundary

PR 0 is discovery/documentation only. It performs no database connection, production write, migration, environment read, credential inspection, provider request, configuration change, merge or deployment. GitHub/Vercel metadata is used only to verify repository default branch and deployed source SHA.

## Temporary diagnostic status and retirement

PR #89 added the special read-only mode to the existing owner-only leads diagnostic. The owner reports one successful production execution; endpoint identity and aggregate data are summarized in `production-preflight.md`. PR #90 removed the mode, helper, temporary tests, and activation guide while retaining the legacy no-query leads diagnostic; it is merged and deployed.

The owner reports both temporary Production flags are disabled, and after PR #90's deployment the retired query returned 404 while the normal owner diagnostic and access restrictions passed. Any temporary WAF rule removal requires separate owner approval. No environment or firewall change is authorized here.

## Pre-migration gate

Before PR 1 implementation:

1. Use the exact provider endpoint mapping and migration evidence recorded in `production-preflight.md`; never copy a DSN, host, secret, or credential into GitHub.
2. Independently review the private seven-entry / eleven-event inventory, stable IDs, revisions, archive state, material legacy values, audit counts, and fingerprints. Keep these details in private evidence only.
3. Select and confirm a usable recovery point and perform the disposable rehearsal in `recovery-runbook.md`. No production recovery operation is implied.
4. Confirm audit triggers/permissions and compatibility contracts. Review the versioned legacy-column fingerprint projection before/after schema change; the all-column entry fingerprint is expected to change when columns are added.
5. Have an independent reviewer approve preservation evidence, migration 0023, compatibility and backout before implementation. Production migration remains a separate explicit approval.

If private row-level evidence or a usable recovery point is unavailable, production migration remains blocked. Do not improvise with deployment secrets, shell environment dumps, client requests, or a different database. PR 1 design and disposable tests may continue without claiming production parity.

## Recovery readiness

Use `recovery-runbook.md` as the controlled recovery plan. Current PITR history is six hours; no snapshot schedule or saved snapshots were found. The document covers a one-time snapshot if available and approved, an encrypted logical export, or PITR as a short-window option; non-production restore rehearsal; verification; data-loss exposure; and approvals. No backup, export, restore, schedule, branch, or production setting is changed by this specification.

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
