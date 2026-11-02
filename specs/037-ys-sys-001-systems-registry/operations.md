# YS-SYS-001 operations, migration and backout gates

## PR 0 boundary

PR 0 is discovery/documentation only. It performs no database connection, production write, migration, environment read, credential inspection, provider request, configuration change, merge or deployment. GitHub/Vercel metadata is used only to verify repository default branch and deployed source SHA.

## Temporary read-only identity preflight

The PR 1 readiness helper extends the already-existing owner-only `GET /api/dashboard/leads/diagnostic` route using the exact query `mode=ys-sys-001-preflight`. It adds no route or UI. The special mode runs only when `VERCEL_ENV=production`, both `YS_SYS_001_PREFLIGHT_ENABLED=true` and `YS_SYS_001_PREFLIGHT_WAF_CONFIRMED=true`, and the Better Auth owner session is valid. Both flags are absent/false by default; the WAF confirmation flag is set only after the shared platform rate rule is active. The handler uses the runtime `DATABASE_URL` internally and issues only fixed `SELECT` statements.

Before enabling the flag in a separately approved production verification window:

1. Confirm the intended READY production deployment and approve its merge/deployment separately.
2. Configure and publish a Vercel Firewall rate-limit rule for the existing exact path `/api/dashboard/leads/diagnostic` at one request per 60 seconds per source IP. This WAF rule is the shared, platform-level limiter; the in-process limiter is only additional protection. The WAF rule applies to the existing diagnostic path as a whole. Review Vercel's rate-limit pricing prompt and stop for separate purchase approval if any charge is presented.
3. Set both non-secret flags `YS_SYS_001_PREFLIGHT_ENABLED=true` and `YS_SYS_001_PREFLIGHT_WAF_CONFIRMED=true` for Production only, with the latter set only after the WAF rule is active. Then use the separately approved deployment process so the new runtime receives them. Do not set either in Preview or Development.
4. In a browser authenticated as the Yorkstead owner, issue one same-origin GET to `/api/dashboard/leads/diagnostic?mode=ys-sys-001-preflight`. Do not copy or export the session cookie. Confirm `Cache-Control: private, no-store`, then retain only the approved redacted evidence bundle outside public GitHub.
5. Resolve `identity.endpointId` in Neon control-plane endpoint metadata. Match the exact endpoint ID, then record its non-secret Neon `project_id` and `branch_id` plus `identity.databaseName`. Do not infer project/branch from project names or `DATABASE_URL_RECOVERY`.
6. Verify the seven expected stable IDs, revision/archive state, each audit count/fingerprint, migration versions/checksum-match flags, table/trigger/constraint summaries and zero unexpected/orphan audit conditions. This endpoint returns no row names, account labels, costs, URLs, notes, role names, hostnames, connection strings or raw audit snapshots.

### Temporary diagnostic disable and removal

1. Set/remove both preflight flags in Production and complete the separately approved deployment needed to apply that change.
2. Confirm the special query mode returns 404 while the existing legacy diagnostic mode remains available to the owner.
3. Remove the route branch, preflight helper and diagnostic-only tests in a small cleanup PR; after that cleanup is deployed, remove the temporary WAF rule. Keep the redacted verification result in the approved evidence record, never in logs or a public issue.

No Vercel environment update, Firewall change, merge, deployment, production request or database operation is authorized by this implementation PR.

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
