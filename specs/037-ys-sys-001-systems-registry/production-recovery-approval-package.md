# YS-SYS-001 — Production Recovery Approval Package

**Status:** Proposal only; no production export, backup, storage activation, restore, migration, or configuration change is authorized.
**Prepared:** 2026-11-03
**Tracking:** [Issue #86](https://github.com/yorkstead/website/issues/86)

## Production acceptance and current boundary

The owner reports that deployment `dpl_Fc1LKCvWKqwWEfoHvRTk7MrRfAkT` passed homepage, intake, owner dashboard, and Systems Directory smoke checks (4/4). The production deployment is the PR #92 release. A read-only Neon verification after deployment reported 22 applied migrations through 0022, no 0023 ledger entry, seven unarchived Systems Directory entries, eleven audit events, no entries without audit history, no orphaned audit events, and enabled revision/audit protections. No migration or data write was run.

This aggregate check does not replace an independent comparison of private row-level fingerprints with the pre-release evidence. The seven-entry/eleven-event preservation requirement remains a release gate for migration 0023.

## Proposed recovery design

### Artifact and source

- Create one consistent PostgreSQL custom-format archive with `pg_dump --format=custom` using a PostgreSQL 18 client against the verified production database through its **direct, unpooled** endpoint. Neon documents custom-format archives and requires an unpooled connection for `pg_dump` and `pg_restore` ([Neon pg_dump guide](https://neon.com/docs/manage/backup-pg-dump)).
- Before an approved export, verify the live server/client versions, database size, extensions, schemas, roles, ownership, ACLs and RLS behavior. The reported server is PostgreSQL 18.6; recheck it during the approved preflight and use a compatible 18.x client.
- Use a dedicated, least-privileged dump identity that can read every required object and row, including RLS-protected data. Do not create or change a role until separately authorized. Record global roles and grants as a reviewed non-secret restore manifest; `pg_dump` covers one database, not cluster-global roles.
- Inject database credentials through a short-lived secret mechanism or a mode-0600 `PGPASSFILE` on an isolated operator host. Keep credentials out of command arguments, shell history, logs, manifests, GitHub, and the artifact name.

### Client-side encryption and private storage

**Recommended destination:** a dedicated, private Cloudflare R2 Standard bucket in the US jurisdiction, in an owner-approved account separate from Website runtime credentials. Use an opaque, timestamped object key, no public bucket/domain, and a bucket-scoped token. R2's S3 API supports bucket-scoped Object Read & Write tokens ([R2 authentication](https://developers.cloudflare.com/r2/api/tokens/)).

- Encrypt the archive client-side with maintained `age` tooling before upload. Generate the private identity offline; only its public recipient is available to the export operator. Keep the identity in an owner-controlled vault with MFA and named custodians, plus an independently recoverable protected copy. The uploader must not possess the private identity.
- Enable an R2 bucket-lock rule for the backup prefix for 30 days and an expiration lifecycle rule at 30 days. Bucket locks block object deletion and overwrite during the period; lifecycle expiration removes expired objects, normally within 24 hours ([R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)). Document a legal hold as an explicit owner-approved extension, with a named reviewer and revised deletion date.
- Keep the bucket private and separate the export token from bucket-administration credentials. Before export, verify the bucket lock, lifecycle, access scope, no-public-access setting, audit visibility, and a test retrieval. Do not store plaintext there.
- Stage plaintext only in restrictive ephemeral storage with a bounded size. Encrypt it, validate `pg_restore --list`, compute SHA-256 over the encrypted artifact, then remove plaintext staging on success, failure, and interrupt. Record UTC capture time, redacted source token, PostgreSQL/tool versions, migration version, encryption recipient key identifier, encrypted size/checksum, expiry, and operator/reviewer initials. Upload only ciphertext; verify the remote object checksum and independently retrieve the encrypted bytes.

R2 requires enabling/purchasing the service before creating API tokens. No R2 service, bucket, token, lifecycle, lock, or storage billing will be activated as part of this proposal.

## Cost estimate

Cloudflare currently lists R2 Standard storage at **$0.015 per GB-month**, with 10 GB-month, one million Class A operations, and ten million Class B operations included monthly; Standard has no retrieval or internet-egress charge ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)). The free allowance is account-wide and may already be consumed.

Let **D** be the measured encrypted archive size in GB and **F** the remaining included storage (0–10 GB-month):

- One pre-migration artifact retained for 30 days: approximately `max(0, D − F) × $0.015` for storage.
- Daily full dumps with 30-day retention: approximately `max(0, 30D − F) × $0.015/month` at steady state.

| Measured archive size | One artifact, 30 days (assuming 10 GB free remains) | Daily full dumps, 30-day retention (same assumption) |
| ---: | ---: | ---: |
| 1 GB | $0.00 | $0.30/month |
| 10 GB | $0.00 | $4.35/month |
| 50 GB | $0.60 | $22.35/month |
| 100 GB | $1.35 | $44.85/month |

These are storage-only estimates, before any account-wide free usage, rounding, R2 activation/billing terms, tax, operator time, or Neon compute/data-transfer charges. Neon advises checking account-specific egress usage in its billing console ([Neon data-transfer allowance](https://neon.com/blog/more-data-transfer-on-paid-plans)). Obtain a measured database/archive size and an owner-approved spend cap before authorization. If a 15-minute or one-hour RPO is selected, full `pg_dump` cadence would require 2,880 or 720 full artifacts per 30 days; price and operational load would be materially higher. Evaluate a separately approved continuous/PITR option instead.

## Recovery objectives and proposed operating model

- **Retention:** 30 days from successful encrypted upload and remote checksum verification. Keep an expiry timestamp in the manifest. Verify lifecycle/lock configuration before each export and confirm deletion after expiration, allowing for the provider's documented processing delay. A legal hold requires owner approval and a recorded revised expiry.
- **RTO:** 60 minutes from incident declaration through artifact retrieval/decryption, isolated restore, security/consistency verification, configuration, and verified application readiness. This remains an unproven target until a timed rehearsal passes.
- **RPO:** still requires an owner decision. A one-time pre-migration dump protects only its capture point. Daily full dumps are a possible starting design for an owner-approved approximately 24-hour maximum gap; actual RPO must be measured between successful backup points, including failures and runtime. A 1-hour or 15-minute target should trigger a design and cost review for continuous/PITR recovery rather than assuming full dumps meet it.
- **Existing Neon recovery:** the latest recorded provider inspection reports a six-hour PITR history window, with no scheduled snapshots or saved snapshots. Treat PITR as a short-window complement, not the 30-day artifact or a 6-hour RPO guarantee; verify an exact recoverable point at the time of any separately authorized operation.
- **Responsibilities:** name a primary exporter/restorer, a secondary operator, an independent parity reviewer, an approval authority, and key custodians. The uploader receives only bucket-scoped access and the public encryption recipient; private-key retrieval and decryption require the separately approved recovery process.
- **Coverage:** this proposal covers only the Website production database. Other Yorkstead databases need separate inventories and policies.

## Production-export authorization request — not yet granted

The requested approval is for **one production read/export operation only**, after all fields and gates below are completed. Approval for this export does not authorize migration 0023, production restore/cutover, environment changes, a recurring schedule, or additional exports.

> I request authorization for one read-only custom-format PostgreSQL export of the verified Website production database during the owner-approved UTC window below. The dump will use the approved direct/unpooled source and least-privileged full-row dump identity, be client-side encrypted before upload, and be stored in the approved private 30-day-locked destination. The operator will verify the encrypted checksum and independent retrieval, then delete plaintext staging. No migration, production restore, application change, or database/configuration write is included. Stop if identity, size, client compatibility, permissions, checksum, retention, estimated charges, or private parity do not match this approved plan.

Complete and approve privately before executing:

- Source project/branch/endpoint/database, verified against the current Production deployment.
- UTC window and cancellation contact.
- Dump role and secure credential injection.
- Approved bucket/account/jurisdiction/prefix, access policy, bucket-lock and lifecycle evidence.
- Age recipient/key custodian, key recovery and rotation procedure.
- RPO and cadence decision; 30-day retention start/expiry procedure.
- Measured archive-size estimate, Neon egress estimate, total spend cap, and cost approver.
- Named primary/secondary operators, independent reviewer, and out-of-band contacts.
- Independent private seven-record/eleven-event parity review and evidence provenance.
- Separate authorization for this single export. Absence of an explicit approval means **do not execute**.

## Isolated restore rehearsal plan

The rehearsal uses an authorized encrypted recovery artifact only after export approval. No production destination is used.

1. Create a new, disposable PostgreSQL 18.x target with no production traffic, scheduled jobs, webhooks, email, or customer side effects. A disposable PostgreSQL service/container is preferred for the first rehearsal; a Neon test project requires separate owner approval and cost review.
2. Confirm artifact identity by private manifest and SHA-256 before retrieval. Retrieve ciphertext independently, verify the checksum again, and decrypt only in an isolated ephemeral workspace with the approved recovery identity.
3. Validate the custom archive with `pg_restore --list`. Restore into a newly created empty target using reviewed role/ownership mapping. Do not use `--clean`, `--create`, destructive SQL, or a target that may contain shared data.
4. Apply no production migration. Verify expected schemas, extensions, indexes, constraints, application migration ledger (expected 22 / latest 0022), role/grant mapping, RLS, and audit protections.
5. In private evidence, compare all seven stable entry IDs, revisions, archive flags, legacy values, per-entry audit counts, and eleven audit fingerprints against the independently reviewed pre-export baseline. Verify zero orphans and no missing audit history. Do not place row-level values or hashes in public GitHub.
6. Verify legacy Systems Directory behavior and owner/tenant authorization on the isolated target. Confirm outbound effects remain disabled.
7. Measure end-to-end time from rehearsal/incident start to validated application readiness against the 60-minute target. Record actual RPO gap and any restore/data exposure.
8. Have the independent reviewer sign the redacted result. Destroy the disposable target and plaintext staging under the approved retention policy; confirm cleanup. A rehearsal pass does not authorize a production restore or migration.

## Owner decisions still required

1. Select RPO (15 minutes, 1 hour, 24 hours, or another explicit target) and acceptable backup cadence.
2. Approve or replace the proposed R2 account, US jurisdiction, private bucket, 30-day lock/expiry controls, and the required R2 service activation.
3. Approve age key custody, emergency recovery, rotation, named operators/reviewer, and secure credential-injection method.
4. Approve a measured cost cap after database size/egress review.
5. Confirm this policy covers only Website production.
6. Complete the private row-level parity review and approve the specific one-time export request.

Until those decisions and separate export approval are recorded, production export/backup and recovery rehearsal from production data remain **NO-GO**. Migration 0023 and any production restore/cutover remain separately **NO-GO**.
