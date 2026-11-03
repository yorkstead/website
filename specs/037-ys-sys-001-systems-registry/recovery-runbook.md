# YS-SYS-001 — Neon recovery readiness runbook

**Status:** Planning policy accepted; no production export, backup, storage activation, restore, migration, or configuration change has been authorized. A production-derived recovery point and successful restore have not been verified.

## Owner policy decision (updated 2026-11-03)

| Item | Planning decision | Execution state |
| --- | --- | --- |
| Recovery artifact | PostgreSQL custom-format `pg_dump`, encrypted client-side with an approved age recipient | Production export **not authorized** |
| Retention | 30 days from the UTC timestamp of a successfully verified encrypted artifact | Storage expiration and deletion proof still need design/approval; legal hold pauses deletion only with documented owner approval |
| RTO | 60 minutes from incident declaration to verified service recovery | Target accepted for planning; not demonstrated |
| RPO and backup cadence | 24-hour RPO; daily encrypted custom-format backups | First production backup and any recurring schedule require separate authorization; objective is unproven until completion monitoring and recovery rehearsal pass |
| Retention and RTO | 30 days; 60-minute RTO target | Retention implementation and deletion verification pending exact bucket approval; RTO awaits timed restore verification |
| Operator | Yorkstead owner is primary recovery operator and approver | Single-person operation; each production action requires scoped owner approval |
| Secondary operator / independent human reviewer | Unassigned because no additional personnel are available | Not represented by automated checks; explicit owner acknowledgment of exception and residual risk required before export or migration approval |
| Storage, key custody and cost | Private Cloudflare R2 proposed; separately protected recovery-key copy required | Exact account, bucket, region, permissions, spend cap and key custody remain pending approval; no activation authorized |

### Single-operator exception and compensating controls

Yorkstead currently has no additional personnel available for secondary recovery operations or independent human review. This is an explicit exception to any policy requiring separation of recovery operator and reviewer, not a staffing task left open indefinitely. Before production export or migration approval, the owner must acknowledge privately that one person may initiate, execute, validate and approve recovery, and accept the residual risk of mistaken target selection, compromised credentials/key access, and undetected mistakes. If this acknowledgment is not recorded, the relevant operation remains blocked. Automated validation, immutable evidence, a separately protected recovery-key copy, restore rehearsal and owner sign-off reduce risk but are not independent human review. Reassess the exception when staffing changes and at least annually.

The synthetic rehearsal is now restricted to the dedicated `recovery-rehearsal` GitHub Actions job. That job provisions a new PostgreSQL 18 container on a Docker `--internal` network, verifies the network is internal and initially attached only to that database container, and runs a recovery-only image with minimum read permission. Docker's internal network boundary blocks external network access; the recovery container has no Docker socket, host mounts, cloud credentials, or provider-specific code. Its root filesystem is read-only except for `/work` and `/tmp` tmpfs mounts; the entry point verifies both writable mounts are tmpfs and pins Bun's runtime cache to `/tmp`. It uses the official PostgreSQL Apt Repository's PostgreSQL 18 client against the same-major synthetic service. The container receives no `PG*`, connection-string, Vercel, Neon, cloud, deployment, or caller-selected storage-path environment variables. The helper accepts only generated credentials from the entry point, builds fixed artifact paths inside its private workspace, and simulates upload by copying within that same tmpfs. The recovery-only image copies only the migration fixture, recovery scripts, and required directory service modules; it has no application server or provider SDK execution path. CI also runs negative tests for external URLs, inherited PostgreSQL overrides, alternate storage paths, production/cloud variables, direct helper invocation, and execution outside the approved container. Local execution fails closed. These synthetic controls do not establish production data provenance, durable storage, or recoverability of a production artifact.

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

PITR alone does not satisfy the durable pre-migration artifact requirement. A 30-day dump retention is not a 30-day history of recoverable points. The approved daily cadence targets a 24-hour maximum recovery-point age only when backups complete and are verified; missed or failed backups breach that objective until a newer verified artifact exists.

## Production export approval checklist

1. Reconfirm the actual production deployment and protected database binding against the previously matched Neon project, branch, endpoint and database using approved read-only metadata. Record identifiers only in private evidence. Verify the direct connection, server/client versions, schemas, extensions, role ownership, ACLs, RLS and restore privileges without logging credentials.
2. Owner approves the exact source, least-privileged dump role, time window, procedure and cancellation path. No script in this PR connects to production.
3. Owner approves a private storage provider/account/bucket/path and region, expected cost, encryption at rest and client-side age recipient, key owner, secondary recovery key access, rotation, and emergency recovery.
4. Prove upload/download/list/delete permissions, audit logs, no public access, 30-day retention from verified capture, expiration/deletion verification, and documented legal-hold exceptions.
5. The owner-approved RPO is 24 hours with a daily cadence; verify a failure alert and escalation for any backup that is not uploaded, checksummed, retrieved, and validated within the objective. The 60-minute RTO remains unverified pending a timed rehearsal. Record the owner's explicit acknowledgment of the single-operator exception and residual risk. The owner is primary operator and approver; secondary and independent reviewer are unassigned. Do not claim separation of duties.
6. Independently review the private seven-entry/eleven-event row-level baseline and capture provenance. Approve a truly isolated restore target with outbound jobs, mail and webhooks disabled.
7. Review space, bandwidth, database impact, runtime and charges. Grant a separate explicit approval for the specified production export. Production migration and any restore/cutover each need later separate approvals.

The redacted [evidence template](recovery-evidence-template.md) records PASS/FAIL/NOT RUN and private artifact references without disclosing identifiers. Public PR/issue comments may carry aggregate results only.

For the currently reported `free_v3` plan, retained PITR is the lowest-cost available provider recovery path, but its six-hour expiry does not meet the durable pre-migration requirement. An encrypted `pg_dump` in an already approved private storage location is the lowest-cost durable candidate without a Neon plan change; storage and operator costs still require owner confirmation. One-time snapshot eligibility and price remain unverified, so do not select or purchase one from this runbook.

## Independent private parity checklist

Complete this checklist in private storage. Normally an independent reviewer verifies it; currently no reviewer is available. The owner must explicitly acknowledge the single-operator exception and personally sign off. Such owner sign-off and automated recalculation are not independent review; only aggregate pass/fail and capture time may enter GitHub.

1. Record the capture UTC time, deployed source SHA, diagnostic/code revision, fingerprint algorithm/version, and exact Neon project, branch, endpoint, and database identity. Confirm the connection is the production binding without revealing credentials.
2. Capture the pre-migration legacy-column projection for exactly seven entries and the full original audit projection for exactly eleven events. Record each stable entry ID, revision, archive state, per-entry audit count, and deterministic entry/audit fingerprints in the private evidence bundle.
3. Independently recalculate all fingerprints from the same ordered, versioned projections. Confirm seven unique IDs, eleven distinct audit events, zero orphan events, all seven expected archive states, and migration ledger 0001–0022 with checksums. Sign off on any discrepancy before proceeding.
4. After an authorized disposable rehearsal, compare every original entry ID, revision, archive state, account relationship, legacy field, and original audit event against the private before-state. Confirm unchanged fingerprints and per-entry counts; record new migration 0023 separately. Retain the private comparison report and reviewer sign-off.
5. Repeat the same comparison against production only if a later, separately authorized production migration occurs. A synthetic fixture pass does not substitute for this independent review.

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

Estimate potential data exposure as the interval from the selected recovery point to the incident/migration. With the current six-hour PITR window, choosing the oldest available point could lose up to the full retained window of legitimate writes; a pre-migration point selected immediately before execution narrows this interval but does not make it zero. A restore may also remove later audit events and unrelated writes. Snapshot or export restore exposure is the interval between capture and failure. Record affected business writes and audit events for reconciliation before any cutover. RPO remains open and the accepted 60-minute RTO target is unmeasured.

## Recovery objectives and operating model

- **Registry preservation requirement:** no loss or alteration of the seven original entries or eleven original audit events across migration and rollback. This is a required parity outcome, not evidence that the private row-level baseline has been independently verified.
- **General production RPO:** owner-approved **24 hours**, supported by a planned daily encrypted full custom-format dump. This is an objective, not evidence of achieved recovery. It is met only while a current backup completes and passes remote integrity/retrieval checks; alert/escalate on every missed or failed cycle. The six-hour PITR history is a maximum recovery lookback, not a six-hour RPO commitment. If restoring to the oldest available PITR point, potential exposure is up to six hours of writes.
- **RTO target:** the owner accepted 60 minutes from incident declaration through verified service recovery for planning. This target is unmeasured; revise the proposed procedure if a production-like rehearsal cannot meet it.
- **Storage and retention:** retain a verified encrypted artifact for 30 days from its UTC capture time. The exact private storage location, access controls, expiration/deletion proof, legal-hold exceptions, and cost still require owner approval before creating an artifact.
- **Responsibilities:** the Yorkstead owner is the primary recovery operator and approver. A secondary operator and independent human reviewer are unassigned due to current staffing. The explicit single-operator exception and acknowledgment gate above apply. Automated verification, immutable evidence, a separately protected recovery-key copy and restore rehearsal are compensating controls only. The application operator performs only separately approved deployment/cutover steps.
- **Rehearsal:** the synthetic seven-entry/eleven-audit encrypted dump and isolated restore passed in disposable PostgreSQL in [CI run 41504298230](https://github.com/yorkstead/website/actions/runs/41504298230). This is not a production-derived artifact or a measured production-like RTO. An authorized production-derived artifact and isolated rehearsal remain outstanding; compare the private legacy projection and all audit fingerprints, verify post-point markers are absent, and exercise the pre-migration application against the restored state.

## Required owner approvals

Before the first production backup, obtain explicit owner approval for the exact source, window, method, target bucket, region, access list, key custody, 30-day retention/deletion, measured cost cap, private parity result and the one-time scope. The owner must acknowledge the single-operator exception and residual risk. That authorization does not create a recurring schedule; daily automation and later backup runs require separate authorization. Before any restore, obtain separate approval for exact source/target, point in time, expected data loss, reconciliation owner, and whether endpoint reassignment/cutover is allowed. Production migration, branch restore, traffic switch, and deployment each require their own scoped approval. This runbook authorizes none of those operations. The 60-minute RTO includes artifact acquisition/decryption, isolated restore, configuration, smoke checks and readiness; it remains unmeasured.

## Migration gate

Merging source must not run migration 0023. `vercel-build` only builds the application; a named operator must run `bun run db:migrate` as a separate, explicitly authorized production operation after all gates below pass. CI migration commands use only the disposable PostgreSQL service.

Production migration remains **NO-GO** until all of the following are privately evidenced and independently reviewed:

- The selected recovery point is available, appropriately durable for the migration window, and restorable.
- The non-production restore rehearsal and migration/rollback verification pass.
- The exact private seven-entry / eleven-audit baseline has been reviewed and its stable legacy data reconciles.
- Owner-approved recovery exposure, RPO/RTO, restore operator, reconciliation owner, and cutover/rollback decision are documented.
- Separate explicit authorization names the production migration and any backup/restore/configuration operations.
