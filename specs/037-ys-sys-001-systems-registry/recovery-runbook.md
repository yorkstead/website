# YS-SYS-001 — Neon recovery readiness runbook

**Status:** Preparation only. No Neon branch, snapshot, database, schedule, connection, or production configuration has been changed. A recovery point and a successful restore have not been verified.

## Current verified state (2026-11-02)

- The owner-reported production diagnostic endpoint was matched by exact endpoint metadata to the Neon `website` project, its primary/default `production` branch, and database `neondb`.
- Neon project metadata reports six hours of history retention. This is the available point-in-time recovery (PITR) window, not a durable backup guarantee.
- Read-only provider inspection found no snapshot schedule and no existing snapshots. Project metadata reports plan `free_v3`.
- A precise recoverable timestamp/LSN has not been confirmed in the Neon console, and no restoration has been tested. The current window can expire; do not use the historical inspection as proof a future migration has a usable point.
- Neon documents timestamp/LSN branching within retained history and snapshot restore into a new branch. Its snapshot schedule API currently documents a paid-plan requirement. Availability, snapshot retention, and any cost for this project must be confirmed by the owner before selecting that option. No service activation or purchase is approved here.

## Recovery point options

Choose and approve one method before any production migration:

1. **One-time Neon snapshot (preferred if available without unapproved cost).** Capture the exact production branch state immediately before the migration. Confirm the snapshot identity/time, database/branch scope, retention/lifecycle, access controls, and restore-to-new-branch behavior. Snapshots are separate from the six-hour PITR history. Do not enable a recurring schedule as part of this task.
2. **Encrypted logical export.** Have an authorized operator create a consistent `pg_dump` custom-format export using the direct production connection, then store it in an owner-approved encrypted location with restricted access, retention, and deletion policy. Do not place the DSN, dump, private row identifiers, or account fields in GitHub, logs, shell history, or this repository. Restore the dump only into a disposable non-production PostgreSQL database and verify it there.
3. **PITR branch within the current window.** Immediately before migration, verify a concrete timestamp/LSN remains available and record it privately. PITR is useful for short-window recovery, but it is not durable beyond the configured six-hour retention and may lose legitimate writes after the chosen point.

If a one-time snapshot is unavailable or introduces an unapproved charge, stop and seek owner direction on the encrypted export option. Do not silently fall back to PITR as the only recovery plan.

Neon provider references: [PITR and branch restore](https://neon.com/blog/announcing-point-in-time-restore), [snapshot recovery and retention](https://neon.com/blog/three-ways-to-use-your-snapshots), [snapshot schedule plan requirement](https://api-docs.neon.tech/reference/setsnapshotschedule), and [restore snapshot into a new branch](https://api-docs.neon.tech/reference/restoresnapshot).

## Non-production restore rehearsal

Perform this rehearsal before production migration authorization:

1. Use an isolated disposable PostgreSQL instance or a separately authorized non-production Neon project. Do not create a branch from production for rehearsal under this runbook.
2. Load a synthetic seven-entry / eleven-audit fixture with privacy-safe values and a known marker before backup. Record expected migration ledger, entry IDs, revisions, archive flags, audit counts, and stable legacy-field comparisons.
3. Capture a disposable snapshot/export and record its creation time. Apply candidate migration `0023` only to this disposable database; add a test marker after migration to simulate writes that must not be silently assumed recoverable.
4. Restore the backup to a separate disposable database/branch without finalizing over or reassigning any source endpoint. Verify the restored state is exactly the intended pre-migration state, the post-point marker is absent, and all seven entries and eleven audit rows match the recorded fixture.
5. Test application rollback by using the pre-migration application against the restored state. Separately test forward-only recovery for the migrated database: disable new reads/writes in the disposable app, keep additive schema/data/audit, and validate the forward-fix path. Do not use a destructive down migration.
6. Record measured elapsed time for restore, verification, and application readiness. These observations inform RTO; they do not establish a production RTO until an owner approves the target and a production-like rehearsal is authorized.

## Restore verification and data exposure

For any future restore, first restore into a new branch/database with no production traffic. Check database identity, expected recovery timestamp, schema and migration ledger, all seven stable IDs, revisions and archive states, all eleven original audit records, per-entry counts, zero orphans, immutable audit protections, and a privacy-safe legacy-field comparison. Preserve the source and restored candidate until the owner approves a cutover.

Estimate potential data exposure as the interval from the selected recovery point to the incident/migration. With the current six-hour PITR window, choosing the oldest available point could lose up to the full retained window of legitimate writes; a pre-migration point selected immediately before execution narrows this interval but does not make it zero. A restore may also remove later audit events and unrelated writes. Snapshot or export restore exposure is the interval between capture and failure. Record affected business writes and audit events for reconciliation before any cutover. Current RPO/RTO are unmeasured.

## Required owner approvals

Before creating a production recovery point or export, obtain explicit owner approval for the selected method, time, target, storage location, access list, retention/deletion, and any cost. Before any restore, obtain separate approval for the exact source/target, point in time, expected data loss, reconciliation owner, and whether endpoint reassignment/cutover is allowed. Production migration, branch restore, traffic switch, and deployment each require their own scoped approval. This runbook authorizes none of those operations.

## Migration gate

Production migration remains **NO-GO** until all of the following are privately evidenced and independently reviewed:

- The selected recovery point is available, appropriately durable for the migration window, and restorable.
- The non-production restore rehearsal and migration/rollback verification pass.
- The exact private seven-entry / eleven-audit baseline has been reviewed and its stable legacy data reconciles.
- Owner-approved recovery exposure, RPO/RTO, restore operator, reconciliation owner, and cutover/rollback decision are documented.
- Separate explicit authorization names the production migration and any backup/restore/configuration operations.
