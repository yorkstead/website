# YS-SYS-001 trusted preservation baseline runner

**Implementation state:** synthetic validation only. Production role creation and baseline capture are not authorized by this change.

## Scope and safety boundary

The owner-operated Ubuntu WSL runner captures only the Systems Directory's seven owner-scoped entries, their eleven audit events, the application migration ledger, and trigger/role metadata required to verify preservation. It does not run `pg_dump`, enumerate arbitrary tables, accept caller SQL, modify data, execute migrations, create roles, or change Vercel/Neon/R2 configuration.

The CLI refuses to run outside an interactive Ubuntu WSL session, rejects CI and unrecognized/inherited provider/connection environment, accepts no command-line options, and requires private target, storage, and one-time authorization attestations. It pins the database name and reader role, checks the runtime host against the private Neon target attestation, and requires the expected source deployment/endpoint metadata. A repeatable-read, read-only transaction verifies the exact read-only role and captures all selected data from one consistent snapshot. The fixed SQL is in `scripts/ys-sys-001-preservation/capture.ts`.

The protected local workspace is `~/.local/state/yorkstead/ys-sys-001` with mode 0700; private configuration and key directories use the same mode, and private files must be owner-only. Plaintext evidence exists only in a mode-0600 temporary file during encryption/decryption verification and is removed on success or failure. The retained local artifact is ciphertext. Full-disk encryption for the ThinkPad/WSL VHDX is an owner precondition; unlinking temporary files is not a physical-erasure guarantee.

The runner encrypts with the configured age public recipient before any object-store call. R2 calls use the fixed private bucket and key prefix, the account-scoped endpoint, and bucket-scoped Object Read & Write credentials injected only through the process environment. The AWS CLI runs with an empty private home/config and metadata credentials disabled; stdout/stderr are discarded. The pipeline retrieves the just-uploaded ciphertext independently, compares SHA-256, decrypts privately, verifies plaintext hash and canonical evidence fingerprint, and removes only the unique run key if validation fails.

The main application CI does not run the owner CLI. Its dedicated recovery job exercises the same evidence, encryption, upload/retrieval, decryption, integrity and cleanup pipeline using ephemeral PostgreSQL and an in-memory synthetic object store inside the existing isolated recovery container. CI has no R2, age-recipient, Neon, Vercel, or production secrets.

## Canonical evidence format

Format identifier: `ys-sys-001-preservation-baseline/v1`.

- UTF-8 JSON with recursively lexicographically sorted object keys and no insignificant whitespace. The transaction sets UTC timezone, ISO YMD dates and row security on.
- SQL returns every selected field through `jsonb_each_text`; scalar values are represented as text, SQL null remains JSON null, and JSON/JSONB values are represented by PostgreSQL's JSONB text serialization. This avoids JavaScript numeric precision loss for database numeric values.
- Entry arrays are ordered by UUID. Audit arrays are ordered by database audit ID. Per-entry audit fingerprints use that stable audit order.
- SHA-256 is computed over UTF-8 canonical JSON. Each entry receives a fingerprint over its full captured row projection. Each entry's audit history receives a fingerprint over the ordered array of its full audit row projections. The top-level evidence fingerprint covers the complete versioned evidence body before the fingerprint field is appended.
- Exact row values, IDs, account labels, billing values, audit snapshots, source endpoint identity, migration checksums, and fingerprints stay in the encrypted private artifact. The printed report omits all row-level values, hostnames, endpoint/account identifiers, object keys and fingerprints.

## Fixed capture checks

1. Connection hostname equals the fresh private target attestation; database equals `neondb`; runtime role equals `ys_sys_001_baseline_reader`; SSL certificate validation is required; the role may not be superuser, create roles/databases/schemas, bypass RLS, replicate, inherit broad read/write roles, execute server programs, or write to the three permitted tables.
2. The repository has exactly migrations 0001–0023. The production migration ledger must contain exactly 0001–0022 with matching names and SHA-256 checksums; 0023 must be present in repository input but absent from the production ledger.
3. Exactly seven unique `system_directory_entries` rows and eleven `system_directory_audit` rows are present for fixed tenant `yorkstead-owner`; all audit IDs are distinct, all entries receive a per-record event count, and orphan count is zero.
4. The three expected revision/append/immutability triggers exist, are enabled, match their expected table, event type and function, and their private function-source fingerprints are recorded. Row-security flags and the trigger definitions are included in the encrypted evidence.
5. Everything is read within one `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` transaction. Any failed check aborts capture; no partial evidence is uploaded.

## Owner setup — preparation only

Do not perform the production role or capture steps until their separate approvals below are granted.

1. Confirm the ThinkPad's Windows device encryption and keep WSL's VHDX under that protected device. Use the owner's Ubuntu WSL identity; do not run from a shared or cloud workspace.
2. Install/verify current PostgreSQL client tools, `age`/`age-keygen`, Bun matching the repository, and AWS CLI v2. The capture runner uses the `aws s3api` commands only for R2 object PUT, GET, and deletion of a failed unique object. It never uses a profile, shared credentials file, metadata service, arbitrary endpoint, or shell command.
3. Create the protected root and subdirectories with mode 0700. Store the existing age identity at `keys/ys-sys-001.agekey`, mode 0600. Confirm its derived public recipient matches the already-approved age recipient; do not copy the identity into the repo or runner environment.
4. In `config/target-attestation.json`, record the owner-verified provider, project, production branch, endpoint ID, direct (unpooled) hostname, database, accepted Vercel deployment SHA, and UTC verification time. This file is private and mode 0600. Attestation must be no older than 24 hours at capture time.
5. In `config/storage-attestation.json`, record the verified Cloudflare R2 account identifier, fixed bucket, US jurisdiction, Standard class, private access, bucket-scoped Object Read & Write credential scope, 30-day lock/lifecycle, age recipient, recent synthetic upload/download/decryption and recovery-copy results, and a current estimated monthly cost below the $5 stop threshold. This file is private and mode 0600; attestation must be no older than seven days. Confirm jurisdiction, public access, lock/lifecycle precedence, billing, and spend in Cloudflare's owner console; the runner does not change these settings.
6. Only after separate capture authorization, create `config/capture-authorization.json` for this exact one-time, seven-entry/eleven-audit preservation capture. It must identify the approval reference, owner, scope, and UTC approval time. The runner rejects a missing, stale, or broader authorization.
7. Start a clean shell with `env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME="$HOME" WSL_DISTRO_NAME="$WSL_DISTRO_NAME" TERM=dumb LANG=C.UTF-8 bash --noprofile --norc`. The runner requires this fixed system-only PATH so user-writable directories cannot shadow `age` or `aws`. In that shell, read the source host, role, database password, and bucket-scoped R2 credentials into variables with `read -s`; export only `YS_SYS_001_DB_HOST`, `YS_SYS_001_DB_USER`, `YS_SYS_001_DB_PASSWORD`, `YS_SYS_001_R2_ACCESS_KEY_ID`, and `YS_SYS_001_R2_SECRET_ACCESS_KEY`. Do not put values in command arguments or shell history. The role must be the dedicated read-only role, not the Vercel application role, database owner, recovery variable, or administrator. The runner rejects `DATABASE_URL`, all `PG*`, `AWS_*`, `NEON_*`, `VERCEL_*`, CI variables, and unknown environment names.
8. Run from the verified repository checkout with `bun scripts/ys-sys-001-preservation/cli.ts`. The interactive prompt requires the exact one-time confirmation. Do not use `set -x`, shell tracing, verbose AWS/PG logging, or paste output other than the redacted report into GitHub.
9. Review only the redacted report: capture UTC time, PASS status, aggregate counts, migration state, source verification, integrity status and verification method. Independently retrieve the encrypted object from R2 through the runner's GET step and confirm the local encrypted artifact SHA-256 matches the remote retrieval. Keep the ciphertext and private evidence reference in approved private storage. The runner never publishes its object key or checksums.
10. After capture, unset all secret environment variables and close the shell. Keep the encrypted artifact; securely remove transient files under the owner data-handling policy. Re-run the owner-private retrieval/decryption verifier when needed; do not reconstruct the historical baseline.

The private attestation files use these exact fields. Replace every angle-bracket placeholder using the owner's private provider-console evidence; do not store passwords, access keys, private age identities, connection strings, or other credentials in these JSON files. Set file mode 0600. These examples are templates only and do not satisfy the required separate approvals.

`config/target-attestation.json`:

```json
{
  "provider": "neon",
  "project": "website",
  "branch": "production",
  "endpointId": "<owner-verified-endpoint-id>",
  "hostname": "<owner-verified-direct-endpoint-hostname>",
  "database": "neondb",
  "deploymentSha": "<40-character-production-deployment-sha>",
  "verifiedAtUtc": "<UTC timestamp ending in Z>"
}
```

`config/storage-attestation.json`:

```json
{
  "provider": "cloudflare-r2",
  "accountId": "<owner-private-cloudflare-account-id>",
  "bucket": "yorkstead-production-backups",
  "jurisdiction": "us",
  "storageClass": "Standard",
  "publicAccess": false,
  "credentialScope": "bucket-scoped-object-read-write",
  "retentionDays": 30,
  "lifecycleDays": 30,
  "syntheticTransportTest": "PASS",
  "recoveryKeyCopyTest": "PASS",
  "costThresholdUsd": 5,
  "monthlyEstimateUsd": "<verified numeric estimate at or below 5>",
  "ageRecipient": "<owner-approved-age-public-recipient>",
  "verifiedAtUtc": "<UTC timestamp ending in Z>"
}
```

`config/capture-authorization.json`:

```json
{
  "scope": "capture-seven-directory-records-and-associated-audit-only",
  "oneTime": true,
  "authorized": true,
  "approver": "Yorkstead owner",
  "approvalReference": "<private owner approval reference>",
  "authorizedAtUtc": "<UTC timestamp ending in Z>"
}
```

## Least-privileged PostgreSQL role grant plan — NOT EXECUTED

This is a reviewed grant specification, not a migration or an execution command. Role creation and grants require a separate owner authorization for the exact verified production database. Execute through the database owner's approved administrative process, then verify attributes and effective grants before any capture. Never supply owner credentials to the runner.

```sql
CREATE ROLE ys_sys_001_baseline_reader
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE neondb TO ys_sys_001_baseline_reader;
GRANT USAGE ON SCHEMA public TO ys_sys_001_baseline_reader;
GRANT SELECT ON TABLE
  public.system_directory_entries,
  public.system_directory_audit,
  public.application_migrations
TO ys_sys_001_baseline_reader;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.system_directory_entries,
  public.system_directory_audit,
  public.application_migrations
FROM ys_sys_001_baseline_reader;
REVOKE CREATE ON SCHEMA public FROM ys_sys_001_baseline_reader;
REVOKE CREATE ON DATABASE neondb FROM ys_sys_001_baseline_reader;
```

Set the login secret through the approved secure administrative session's interactive password prompt (for example, `psql`'s `\password ys_sys_001_baseline_reader`), never as SQL text, shell history, a command argument, or a repository artifact. Inject the resulting credential only into the owner's clean local capture shell.

Do not alter PUBLIC grants, existing roles, RLS, owners, application privileges, or audit triggers to make this plan pass. Inspect existing grants and role memberships first; if inherited access expands beyond the three tables or includes any write/administrative privilege, stop and request a separately reviewed least-privilege design. No grant should be made to the production application role. Revoke this reader role after the one-time capture only under a separately approved owner operation.

## Private storage and retention proposal

Use the already owner-configured private US-jurisdiction R2 Standard bucket with bucket-scoped Object Read & Write. Keep the 30-day bucket lock/lifecycle controls and their precedence as owner-verified configuration; do not alter them from this runner. Upload one age-encrypted evidence JSON at an unpredictable key under a fixed YS-SYS-001 prefix. Retain the encrypted artifact for 30 days from successful remote retrieval verification. Do not upload a plaintext report or manifest containing source identity. Keep the local retained artifact encrypted and the redacted report private; the full plaintext bundle is transient only. Stop if current Cloudflare billing estimate cannot be shown below the $5/month threshold.

The current tool environment has no Cloudflare/R2 connector or R2 credentials, so actual bucket policy, lifecycle and cost are not independently verified here. The owner's previously reported synthetic R2 acceptance is supporting operational evidence, not a fresh production-capture verification. If bucket-lock rules prevent deletion after an interrupted upload, the artifact is ciphertext only and must be left to its approved expiry; the runner suppresses cleanup errors and reports the capture as failed.

## Separate approval requests

### A. Production role creation

> I request approval to create only the `ys_sys_001_baseline_reader` login role on the owner-verified Website production database, grant CONNECT to `neondb`, USAGE on `public`, and SELECT on `public.system_directory_entries`, `public.system_directory_audit`, and `public.application_migrations`, with no role memberships or write/admin privileges. This request does not authorize row queries, capture/export, backup, migration 0023, R2 writes, configuration changes, or deployment. Any existing grant/membership conflict stops the operation.

### B. One-time baseline capture

> After the role is independently verified and the target/storage attestations pass, I request separate approval for one consistent, read-only capture of exactly seven existing Systems Directory entries, their eleven audit events, migration ledger rows 0001–0022, and the relevant directory trigger metadata. The runner will verify its role and target, compute versioned canonical SHA-256 evidence, encrypt locally with the approved age recipient, upload only ciphertext to the approved private R2 bucket, retrieve it independently, compare ciphertext checksums, decrypt privately, verify the evidence fingerprint, remove temporary plaintext, and emit only a redacted aggregate report. This does not authorize a full database dump, recurring backup, production data write, migration 0023, application deployment, or later capture. The owner must separately approve the exact source identity, UTC execution window, role, storage/cost attestation, and operation reference. Stop on any mismatch.

## Production GO / NO-GO

- **Implementation and synthetic CI: GO** after the dedicated disposable recovery job passes.
- **Production role creation: NO-GO** until the separate scoped role-creation authorization is granted.
- **Production capture: NO-GO** until the role, target identity, storage policy/cost, encrypted key custody, and separate one-time capture authorization are verified. This task does not authorize those actions.
- Historical baseline parity remains unproven. A new baseline cannot repair or replace the missing historical evidence.
