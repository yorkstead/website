# YS-SYS-001 — Neon recovery readiness runbook

**Status:** Preparation only. No Neon branch, snapshot, database, schedule, connection, or production configuration has been changed. A recovery point and a successful restore have not been verified.

## Owner policy decision (2026-11-02)

| Item | Planning decision | Execution state |
| --- | --- | --- |
| Recovery artifact | PostgreSQL custom-format `pg_dump`, encrypted client-side with an approved age recipient | Production export **not authorized** |
| Retention | 30 days from the UTC timestamp of a successfully verified encrypted artifact | Storage expiration and deletion proof still need design/approval; legal hold pauses deletion only with documented owner approval |
| RTO | 60 minutes from incident declaration to verified service recovery | Target accepted for planning; not demonstrated |
| RPO and backup cadence | Open | Owner must approve maximum data loss and backup frequency; one pre-migration dump is not ongoing protection |
| Storage, key custody, operators, cost | Open | Owner must approve exact destination, region, encryption/key recovery, access, cost, primary/secondary operators and independent reviewer |

The synthetic-only [rehearsal script](../../scripts/recovery/disposable.sh) and its tests accept database credentials through private `PG*` environment variables, never command-line literals. They reject non-local or non-test database names. They are **not** a production export command. The local upload mode simulates a private store; it does not choose or validate a cloud provider.

The local `pg_dump`/`pg_restore` clients report PostgreSQL 18.6; the earlier owner production diagnostic reported server 18.6. That is compatibility evidence for this workstation only, not an execution preflight. The disposable script checks its client is not older than its server. Before any production export, repeat the version check against the actual approved source. Source review of migrations 0001–0022 finds `public` objects plus `customer_auth`, explicit `REVOKE ALL` controls, and no application migration that creates an extension or global role. Better Auth and provider-created objects, actual extensions, owners, ACLs, RLS policies and effective permissions still require approved read-only catalog inspection; `pg_dump` of one database does not export cluster-global roles. Never infer portable security behavior from a successful archive listing.

## Current verified state (2026-11-02)

- The owner-reported production diagnostic endpoint was matched by exact endpoint metadata to the Neon `website` project, its primary/default `production` branch, and database `neondb`.
- Neon project metadata reports six hours of history retention. This is the available point-in-time recovery (PITR) window, not a durable backup guarantee.
- Read-only provider inspection found no snapshot schedule and no existing snapshots. Project metadata reports plan `free_v3`.
- A precise recoverable timestamp/LSN has not been confirmed in the Neon console, and no restoration has been tested. The current window can expire; do not use the historical inspection as proof a future migration has a usable point.
- Neon documents timestamp/LSN branching within retained history and snapshot restore into a new branch. Its snapshot schedule API currently documents a paid-plan requirement. Availability, snapshot retention, and any cost for this project must be confirmed by the owner before selecting that option. No service activation or purchase is approved here.

## Recovery point options

The owner selected an encrypted logical export for **planning**. Choose and approve an execution method separately before any production migration:

1. **Encrypted logical export (planning choice).** After a separate target-specific approval, an authorized operator would use a direct/unpooled connection and compatible client to make a consistent custom-format dump, encrypt it before upload, verify its checksum and independent retrieval, and rehearse restoration only in isolation. Do not place a DSN, dump, row identifiers, or account fields in GitHub, logs, shell history, or this repository. `pg_restore --list` alone is insufficient.
2. **One-time Neon snapshot (unselected alternative).** Eligibility, price and retention for the existing plan remain unverified. A snapshot cannot be created as part of this preparation.
3. **PITR branch within the current window.** Immediately before migration, verify a concrete timestamp/LSN remains available and record it privately. PITR is useful for short-window recovery, but it is not durable beyond the configured six-hour retention and may lose legitimate writes after the chosen point.

PITR alone does not satisfy the durable pre-migration artifact requirement. A 30-day dump retention is not a 30-day history of recoverable points. The maximum loss between dumps remains unbounded until the owner approves an RPO and cadence.

## Production export approval checklist — all open

1. Reconfirm the actual production deployment and protected database binding against the previously matched Neon project, branch, endpoint and database using approved read-only metadata. Record identifiers only in private evidence. Verify the direct connection, server/client versions, schemas, extensions, role ownership, ACLs, RLS and restore privileges without logging credentials.
2. Owner approves the exact source, least-privileged dump role, time window, procedure and cancellation path. No script in this PR connects to production.
3. Owner approves a private storage provider/account/bucket/path and region, expected cost, encryption at rest and client-side age recipient, key owner, secondary recovery key access, rotation, and emergency recovery.
4. Prove upload/download/list/delete permissions, audit logs, no public access, 30-day retention from verified capture, expiration/deletion verification, and documented legal-hold exceptions.
5. Owner approves ongoing RPO, backup cadence, expected gaps between points, and the 60-minute RTO measurement method. Assign primary and secondary operators, separate reviewer, approval authority and out-of-band contacts.
6. Independently review the private seven-entry/eleven-event row-level baseline and capture provenance. Approve a truly isolated restore target with outbound jobs, mail and webhooks disabled.
7. Review space, bandwidth, database impact, runtime and charges. Grant a separate explicit approval for the specified production export. Production migration and any restore/cutover each need later separate approvals.

The redacted [evidence template](recovery-evidence-template.md) records PASS/FAIL/NOT RUN and private artifact references without disclosing identifiers. Public PR/issue comments may carry aggregate results only.

Neon provider references: [PITR and branch restore](https://neon.com/blog/announcing-point-in-time-restore), [snapshot recovery and retention](https://neon.com/blog/three-ways-to-use-your-snapshots), [snapshot schedule plan requirement](https://api-docs.neon.tech/reference/setsnapshotschedule), and [restore snapshot into a new branch](https://api-docs.neon.tech/reference/restoresnapshot).

## Non-production restore rehearsal

Perform this rehearsal before production migration authorization:

1. Use an isolated disposable PostgreSQL instance or a separately authorized non-production Neon project. Do not create a branch from production for rehearsal under this runbook.
2. Load a synthetic seven-entry / eleven-audit fixture with privacy-safe values and a known marker before backup. Record expected migration ledger, entry IDs, revisions, archive flags, audit counts, and stable legacy-field comparisons.
3. Capture a disposable snapshot/export and record its creation time. Apply candidate migration `0023` only to this disposable database; add a test marker after migration to simulate writes that must not be silently assumed recoverable.
4. Restore the backup to a separate disposable database/branch without finalizing over or reassigning any source endpoint. Verify the restored state is exactly the intended pre-migration state, the post-point marker is absent, and all seven entries and eleven audit rows match the recorded fixture.
5. Test application rollback by using the pre-migration application against the restored state. Separately test forward-only recovery for the migrated database: disable new reads/writes in the disposable app, keep additive schema/data/audit, and validate the forward-fix path. Do not use a destructive down migration.
6. Record measured elapsed time for restore, verification, and application readiness. These observations inform RTO; they do not establish a production RTO until an owner approves the target and a production-like rehearsal is authorized.

The synthetic script uses restrictive staging permissions and removes plaintext on success, failure and interrupt. The operator must ensure the future approved production staging medium and deletion mechanism meet the private data-handling policy; unlinking a file does not guarantee physical media erasure. Its local upload simulator verifies bytes and removes partial objects on interruption. A provider-specific upload, remote checksum, retention lock, access audit and independent retrieval remain unimplemented until storage is selected. Never log a private download URL.

## Restore verification and data exposure

For any future restore, first restore into a new branch/database with no production traffic. Check database identity, expected recovery timestamp, schema and migration ledger, all seven stable IDs, revisions and archive states, all eleven original audit records, per-entry counts, zero orphans, immutable audit protections, and a privacy-safe legacy-field comparison. Preserve the source and restored candidate until the owner approves a cutover.

Estimate potential data exposure as the interval from the selected recovery point to the incident/migration. With the current six-hour PITR window, choosing the oldest available point could lose up to the full retained window of legitimate writes; a pre-migration point selected immediately before execution narrows this interval but does not make it zero. A restore may also remove later audit events and unrelated writes. Snapshot or export restore exposure is the interval between capture and failure. Record affected business writes and audit events for reconciliation before any cutover. Current RPO/RTO are unmeasured.

## Required owner approvals

Before creating a production recovery point or export, obtain explicit owner approval for the selected method, time, target, storage location, access list, retention/deletion, and any cost. Before any restore, obtain separate approval for the exact source/target, point in time, expected data loss, reconciliation owner, and whether endpoint reassignment/cutover is allowed. Production migration, branch restore, traffic switch, and deployment each require their own scoped approval. This runbook authorizes none of those operations. The 60-minute RTO is measured from incident declaration through artifact acquisition/decryption, isolated restore, required configuration, application smoke checks and owner-approved service readiness; it has not been measured.

## Migration gate

Production migration remains **NO-GO** until all of the following are privately evidenced and independently reviewed:

- The selected recovery point is available, appropriately durable for the migration window, and restorable.
- The non-production restore rehearsal and migration/rollback verification pass.
- The exact private seven-entry / eleven-audit baseline has been reviewed and its stable legacy data reconciles.
- Owner-approved recovery exposure, RPO/RTO, restore operator, reconciliation owner, and cutover/rollback decision are documented.
- Separate explicit authorization names the production migration and any backup/restore/configuration operations.
