# YS-SYS-001 operations, migration and backout gates

## PR 0 boundary

PR 0 is discovery/documentation only. It performs no database connection, production write, migration, environment read, credential inspection, provider request, configuration change, merge or deployment. GitHub/Vercel metadata is used only to verify repository default branch and deployed source SHA.

## Retired production identity diagnostic

The temporary YS-SYS-001 query mode on the existing owner-only leads diagnostic was used once by the owner and is removed by cleanup PR #90. The route now returns 404 for any `mode` query while retaining its existing no-query legacy diagnostic behavior. After the cleanup is reviewed, merged and deployed through the normal separately authorized release process, the owner should verify both Production flags are false/removed and the owner-authenticated mode URL returns 404. This repository work does not change Vercel settings, merge, or deploy.

The approved private evidence store must retain the unredacted row-level diagnostic result and timestamps. Public artifacts may contain aggregate counts and a parity pass/fail only. The deterministic comparison fields and procedure are recorded in `production-preflight.md`.

No Vercel environment update, Firewall change, merge, deployment, production request or database operation is authorized by this implementation PR.

## Pre-migration gate

Before PR 1 implementation:

1. Confirm the production target by exact provider endpoint binding; do not infer it from migration counts or `DATABASE_URL_RECOVERY`.
2. Review the private seven-record row set, stable IDs/revisions/archive state, per-entry audit counts/fingerprints, migration ledger, triggers and constraints against the aggregate report in `production-preflight.md`.
3. Confirm a usable pre-migration recovery timestamp with the provider and test restore/upgrade/backout only on disposable data.
4. Have an independent reviewer approve the preservation comparison and forward-only design before migration code is written.

If the private baseline or recovery point is unavailable, keep production migration blocked. Do not improvise with deployment secrets, shell environment dumps, client requests or a different database. Schema work may proceed only against disposable databases and must not claim production parity.

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
