# YS-SYS-001 one-time Production database backup

**Status:** Preparation and synthetic testing only. No Production export, upload, restore, schedule, migration, or Registry activation is authorized by this document.

## Scope and evidence

The requested artifact is one full logical backup of the single `neondb` database, in PostgreSQL custom archive format. It captures the schema and data that exist at dump time. It does not apply migrations 0023/0024, reconstruct former data, or make an RPO commitment. A daily schedule is out of scope and requires separate approval.

The current baseline below is owner-reported from the successful local preflight; this repository review has not accessed its private output or connected to Production:

- Migration ledger 0001–0022 and recorded checksums: PASS.
- Migrations 0023 and 0024: not applied.
- Current Directory entries, audit events, and orphan audit events: 0, 0, and 0.
- Existing Directory protections and count visibility: PASS.
- Historical seven-entry/eleven-audit expectations: obsolete; no historical parity or reconstruction is required.

The Production identity was previously owner-verified against the intended direct Neon endpoint. Reconfirm it immediately before any separately authorized export. Do not publish the endpoint or connection details.

## What the artifact does and does not contain

Use `pg_dump --format=custom --create` (`-Fc -C`) with no schema/table exclusions and no data/ACL/owner suppression options. This includes the database's schemas, tables, data, sequence states, large objects, functions, triggers, policies, database-local ACLs/owner/settings, and extension declarations/data registered for dump. The custom format is compressed and is read by `pg_restore`.

`pg_dump` covers one database, not cluster-global roles or tablespaces. Restore prerequisites must be inventoried privately and recreated/verified in the isolated target before restoration: role names/attributes and memberships, object owners, grants, tablespaces where relevant, required extension binaries/provider support, database settings, RLS behavior, and any provider-managed objects. Do not export role password hashes or global credentials. Current repository migrations do not create extensions or roles; actual provider-created objects still need confirmation. RLS-restricted dumps fail rather than silently include only visible rows unless `--enable-row-security` is explicitly used; do not use that option for this complete backup. The dump role must be able to read every table, sequence and large object and inspect catalogs; if `pg_dump` reports a permission error or warning, stop and treat the artifact as incomplete. Do not use `--no-owner`, `--no-acl`, `--no-privileges`, `--no-blobs`, `--schema`, `--table`, or `--enable-row-security` to make it pass.

The chosen client must be the same PostgreSQL major as the source server (or newer); never use a client older than the server. For the currently reported PostgreSQL 18.6 source, use a current PostgreSQL 18 client, record both versions, and fail closed on a version mismatch or a different major. A restore target must be PostgreSQL 18 or newer and have compatible extensions/roles prepared. PostgreSQL documents that `pg_dump` creates a consistent snapshot during concurrent database use; use the direct, unpooled endpoint. [PostgreSQL `pg_dump` documentation](https://www.postgresql.org/docs/18/app-pgdump.html)

## Owner-operated procedure — run only after separate authorization

Run from an owner-controlled, encrypted ThinkPad/WSL filesystem with enough free space for both the plaintext archive and encrypted copy. Verify active Windows/WSL disk encryption before use; do not assume it. Use a dedicated private libpq service entry and password file; never put a URL or password in command arguments, shell history, GitHub, CI, or this repository. The service entry must use the owner-verified direct endpoint, `dbname=neondb`, and the specifically approved dump role. The command also supplies `sslmode=verify-full sslrootcert=system channel_binding=require` directly in its libpq connection string; connection-string options take precedence over service-file and environment values, so a stale service-file option cannot weaken TLS. The private source check verifies the session reports TLS enabled. The password file, service file, age identity, and private approval/evidence files must be regular files owned by the current user and mode 0600. Do not reuse a Preview service profile.

Before starting, privately confirm all of these:

1. Vercel Production still resolves to the previously verified direct endpoint; compare the private runtime binding with the intended Neon project and `production` branch. The pooled endpoint is not interchangeable for `pg_dump`.
2. The owner-selected service profile resolves to that same host and `neondb`; TLS is `verify-full`; no inherited `PG*`, URL, Preview, or alternate-service setting can override it.
3. The existing reviewed read-only preflight has been rerun under the approved method immediately before capture. It must show checksums valid, migrations through 0022 only, and expected current schema/protections. Any difference from the supplied baseline is a stop and review point.
4. The owner has checked the live server version and permissions; the installed `pg_dump`/`pg_restore` client is PostgreSQL 18 and `pg_dump` is not older than the server. The role can dump all database objects, including RLS-protected data, without enabling row security or skipping objects.
5. Private Cloudflare configuration has been rechecked: US jurisdiction, Standard class, no public access, exact backup prefix covered by the intended 30-day lock and expiration rules, correct lock/lifecycle precedence, bucket-scoped Object Read & Write credential, client-side age recipient, recovery identity available separately, cost under the $5/month stop threshold, and no legal hold conflict. Owner's prior synthetic R2 and key-copy tests are supporting evidence only; they do not verify the current bucket settings or Production artifact.
6. A one-time approval records source identity, operation window, role, destination, encryption recipient/key identifier, retention, current cost estimate, cleanup, failure path, and the single-operator exception. Do not execute without this separate approval.

Use the following command pattern only after these private checks and approval. Replace service/profile placeholders locally; do not add live values to this document. Run the shell in a clean session with shell tracing disabled. Ensure the work directory is on encrypted local storage, mode 0700, with enough free space for the uncompressed temporary dump plus retrieved ciphertext. Do not place the workspace in a synced folder.

```bash
(
set -euo pipefail
umask 077
set +x
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
for name in $(compgen -e); do
  case "$name" in PATH|HOME) ;; *) unset "$name";; esac
done

export PGSERVICEFILE="$HOME/.pg_service.conf"
export PGPASSFILE="$HOME/.pgpass"
export PGSSLMODE=verify-full
unset PGHOST PGHOSTADDR PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE PGOPTIONS
unset DATABASE_URL POSTGRES_URL POSTGRESQL_URL DIRECT_URL DB_URL
for name in $(compgen -e); do [[ $name == AWS_* ]] && unset "$name"; done

workspace="$HOME/.local/state/yorkstead/ys-sys-001/backups"
install -d -m 0700 "$workspace"
[[ ! -L "$workspace" && -d "$workspace" && $(stat -c %a "$workspace") == 700 ]]
[[ $(stat -c %u "$workspace") == $(id -u) ]]
[[ $(realpath -e "$workspace") == "$workspace" ]]
stage="$(mktemp -d "$workspace/one-time.XXXXXX")"
chmod 0700 "$stage"
cleanup() {
  unset R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
  rm -f -- "$stage/plain.dump" "$stage/retrieved.dump.age" "$stage/backup.dump.age" \
    "$stage/backup.dump.age.partial" "$stage/manifest.txt" "$stage/manifest.age" \
    "$stage/manifest.age.partial" "$stage/retrieved.manifest.age" "$stage/archive.list" \
    "$stage/retrieved-archive.list" "$stage/source-check.txt" "$stage/ciphertext.sha256" \
    "$stage/manifest.sha256" "$stage/object.head" "$stage/connection-error.txt" \
    "$stage/pg-dump-stderr.txt" "$stage/archive-check-error.txt" "$stage/age-error.txt" \
    "$stage/upload-error.txt" "$stage/download-error.txt" "$stage/decrypt-error.txt" \
    "$stage/restore-archive-error.txt"
  rm -rf -- "$stage"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# Enter these only from the existing protected local configuration/secure prompt.
# Never echo them or run the session with shell tracing enabled.
read -rsp 'R2 access key: ' R2_ACCESS_KEY_ID; printf '\n'
read -rsp 'R2 secret key: ' R2_SECRET_ACCESS_KEY; printf '\n'
read -rsp 'Approved private R2 bucket name: ' R2_BUCKET; printf '\n'
read -rsp 'Private US-jurisdiction R2 S3 endpoint: ' R2_S3_ENDPOINT; printf '\n'
read -rp 'Approved age public recipient: ' AGE_PUBLIC_RECIPIENT
read -rsp 'Age identity file path: ' AGE_IDENTITY_FILE; printf '\n'
read -rp 'Approved PostgreSQL dump role name: ' APPROVED_DUMP_ROLE
read -rp 'Non-secret age key label: ' AGE_KEY_ID
read -rp 'Current preflight evidence reference: ' PREFLIGHT_REFERENCE
read -rp 'Current Directory entry count from preflight: ' DIRECTORY_ENTRY_COUNT
read -rp 'Current Directory audit count from preflight: ' DIRECTORY_AUDIT_COUNT
read -rp 'Unused R2 Standard free storage allowance (GB-month, 0..10): ' R2_UNUSED_GB_MONTH
[[ $DIRECTORY_ENTRY_COUNT =~ ^[0-9]+$ && $DIRECTORY_AUDIT_COUNT =~ ^[0-9]+$ ]]
[[ $R2_UNUSED_GB_MONTH =~ ^([0-9]|10)(\.[0-9]{1,3})?$ ]]
[[ $AGE_KEY_ID =~ ^[A-Za-z0-9_-]{1,64}$ && $PREFLIGHT_REFERENCE =~ ^[A-Za-z0-9_.:-]{1,120}$ ]]
[[ $AGE_PUBLIC_RECIPIENT =~ ^age1[a-z0-9]{50,}$ ]]
[[ $APPROVED_DUMP_ROLE =~ ^[A-Za-z_][A-Za-z0-9_$]{0,62}$ ]]
[[ $R2_BUCKET =~ ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$ ]]
[[ $R2_S3_ENDPOINT =~ ^https://[a-z0-9-]+\.us\.r2\.cloudflarestorage\.com$ ]]
[[ -f $AGE_IDENTITY_FILE && ! -L $AGE_IDENTITY_FILE ]]
[[ -f $PGSERVICEFILE && ! -L $PGSERVICEFILE && -f $PGPASSFILE && ! -L $PGPASSFILE ]]
[[ $(realpath -e "$AGE_IDENTITY_FILE") == "$AGE_IDENTITY_FILE" && $(realpath -e "$PGSERVICEFILE") == "$PGSERVICEFILE" && $(realpath -e "$PGPASSFILE") == "$PGPASSFILE" ]]
[[ $(stat -c %a "$PGSERVICEFILE") == 600 && $(stat -c %a "$PGPASSFILE") == 600 ]]
[[ $(stat -c %a "$AGE_IDENTITY_FILE") == 600 ]]
[[ $(stat -c %u "$PGSERVICEFILE") == $(id -u) && $(stat -c %u "$PGPASSFILE") == $(id -u) && $(stat -c %u "$AGE_IDENTITY_FILE") == $(id -u) ]]
[[ $(age-keygen -y "$AGE_IDENTITY_FILE") == "$AGE_PUBLIC_RECIPIENT" ]]
capture_utc="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
UNIQUE_OBJECT_KEY="ys-sys-001/production/full-db/${capture_utc}-$(openssl rand -hex 16).dump.age"
printf '%s\n' "$UNIQUE_OBJECT_KEY"

# Run privately; capture and inspect output without printing endpoint or credentials.
# The private output must confirm the approved role, database=neondb, and PostgreSQL major.
env -i PATH="$PATH" HOME="$HOME" PGSERVICEFILE="$PGSERVICEFILE" PGPASSFILE="$PGPASSFILE" \
  PGSSLMODE=verify-full PGSSLROOTCERT=system \
  psql -X -w -qAt "service=ys-sys-001-approved sslmode=verify-full sslrootcert=system channel_binding=require" \
  -F '|' \
  -c "SELECT current_user, current_database(), current_setting('server_version_num'), COALESCE((SELECT ssl::text FROM pg_catalog.pg_stat_ssl WHERE pid = pg_catalog.pg_backend_pid()), 'false')" \
  > "$stage/source-check.txt" 2> "$stage/connection-error.txt"
chmod 0600 "$stage/source-check.txt" "$stage/connection-error.txt"
IFS='|' read -r actual_user actual_database server_version_num tls_in_use < "$stage/source-check.txt"
client_major="$(pg_dump --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')"
restore_major="$(pg_restore --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')"
psql_major="$(psql --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')"
[[ $actual_user == "$APPROVED_DUMP_ROLE" && $actual_database == neondb && $server_version_num =~ ^[0-9]+$ && $tls_in_use == true ]]
[[ ${server_version_num:0:2} == 18 && $client_major == 18 && $restore_major == 18 && $psql_major == 18 ]]

env -i PATH="$PATH" HOME="$HOME" PGSERVICEFILE="$PGSERVICEFILE" PGPASSFILE="$PGPASSFILE" \
  PGSSLMODE=verify-full PGSSLROOTCERT=system PGCHANNELBINDING=require \
pg_dump --dbname="service=ys-sys-001-approved sslmode=verify-full sslrootcert=system channel_binding=require" --format=custom --create \
  --no-password --lock-wait-timeout=15s --file="$stage/plain.dump" \
  > /dev/null 2> "$stage/pg-dump-stderr.txt"
chmod 0600 "$stage/pg-dump-stderr.txt"
[[ ! -s "$stage/pg-dump-stderr.txt" ]]
test -s "$stage/plain.dump"
pg_restore --list "$stage/plain.dump" > "$stage/archive.list" 2> "$stage/archive-check-error.txt"
[[ ! -s "$stage/archive-check-error.txt" ]]
test -s "$stage/archive.list"
age --encrypt --recipient "$AGE_PUBLIC_RECIPIENT" \
  --output "$stage/backup.dump.age.partial" "$stage/plain.dump" \
  > /dev/null 2> "$stage/age-error.txt"
test -s "$stage/backup.dump.age.partial"
mv -- "$stage/backup.dump.age.partial" "$stage/backup.dump.age"
sha256sum "$stage/backup.dump.age" > "$stage/ciphertext.sha256"
chmod 0600 "$stage/ciphertext.sha256"
server_version_num="$(cut -d '|' -f 3 "$stage/source-check.txt")"
backup_bytes=$(stat -c %s "$stage/backup.dump.age")
estimated_storage_cost="$(awk -v bytes="$((backup_bytes + 1048576))" -v unused="$R2_UNUSED_GB_MONTH" \
  'BEGIN { gb=bytes/1000000000; billable=gb-unused; if (billable<0) billable=0; printf "%.4f", billable*0.015 }')"
cat > "$stage/manifest.txt" <<EOF
format=ys-sys-001-full-database-backup-v1
captured_at_utc=$capture_utc
encrypted_dump_object_key=$UNIQUE_OBJECT_KEY
source_token=website-production-neondb
database=neondb
migration_state=0001-0022-checksums-pass;0023-0024-unapplied
preflight_evidence_ref=$PREFLIGHT_REFERENCE
directory_entries=$DIRECTORY_ENTRY_COUNT
directory_audits=$DIRECTORY_AUDIT_COUNT
server_version_num=$server_version_num
client_version=$(pg_dump --version)
archive_format=postgresql-custom-Fc
encryption=age-x25519
age_key_id=$AGE_KEY_ID
retention_days=30
encrypted_dump_bytes=$(stat -c %s "$stage/backup.dump.age")
encrypted_dump_sha256=$(cut -d ' ' -f 1 "$stage/ciphertext.sha256")
estimated_incremental_storage_usd_month=$estimated_storage_cost
EOF
chmod 0600 "$stage/manifest.txt"
age --encrypt --recipient "$AGE_PUBLIC_RECIPIENT" --output "$stage/manifest.age.partial" \
  "$stage/manifest.txt" > /dev/null 2> "$stage/age-error.txt"
mv -- "$stage/manifest.age.partial" "$stage/manifest.age"
sha256sum "$stage/manifest.age" > "$stage/manifest.sha256"
chmod 0600 "$stage/manifest.sha256"
artifact_bytes=$(( $(stat -c %s "$stage/backup.dump.age") + $(stat -c %s "$stage/manifest.age") ))
estimated_cost="$(awk -v bytes="$artifact_bytes" -v unused="$R2_UNUSED_GB_MONTH" \
  'BEGIN { gb=bytes/1000000000; billable=gb-unused; if (billable<0) billable=0; printf "%.4f", billable*0.015 }')"
[[ $(awk -v cost="$estimated_cost" 'BEGIN { print (cost <= 5.00) ? 1 : 0 }') == 1 ]] || {
  printf 'Cost gate exceeded; no upload was attempted.\n' >&2
  exit 1
}
printf 'Pre-upload encrypted size: %s bytes; estimated incremental R2 Standard storage: $%s/month (excluding shared request usage).\n' \
  "$artifact_bytes" "$estimated_cost"

# Supply bucket-scoped R2 credentials only in the private process environment.
# Use the preapproved fixed bucket, a unique timestamp/random key, and R2 endpoint.
# Suppress CLI output; keep errors in mode-0600 files and sanitize before review.
# Conditional PutObject is create-if-absent and atomic, but only supports single objects
# through 5 GiB. Fail closed above that limit; do not use multipart without a
# separately reviewed conditional strategy and transport test.
conditional_put_max_bytes=$((5 * 1024 * 1024 * 1024))
encrypted_dump_bytes=$(stat -c %s "$stage/backup.dump.age")
encrypted_manifest_bytes=$(stat -c %s "$stage/manifest.age")
if (( encrypted_dump_bytes > conditional_put_max_bytes || encrypted_manifest_bytes > conditional_put_max_bytes )); then
  printf 'Encrypted object exceeds the conditional PutObject 5 GiB limit; no upload was attempted. Multipart requires a separate reviewed and tested conditional-write design.\n' >&2
  exit 1
fi
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true AWS_DEFAULT_REGION=auto AWS_MAX_ATTEMPTS=1 AWS_PAGER= \
  aws --no-cli-pager --endpoint-url "$R2_S3_ENDPOINT" s3api put-object \
    --bucket "$R2_BUCKET" --key "$UNIQUE_OBJECT_KEY" --body "$stage/backup.dump.age" \
    --if-none-match '*' > /dev/null 2> "$stage/dump-upload-error.txt"
chmod 0600 "$stage/dump-upload-error.txt"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true AWS_DEFAULT_REGION=auto AWS_MAX_ATTEMPTS=1 AWS_PAGER= \
  aws --no-cli-pager --endpoint-url "$R2_S3_ENDPOINT" s3api put-object \
    --bucket "$R2_BUCKET" --key "${UNIQUE_OBJECT_KEY%.dump.age}.manifest.age" --body "$stage/manifest.age" \
    --if-none-match '*' > /dev/null 2> "$stage/manifest-upload-error.txt"
chmod 0600 "$stage/manifest-upload-error.txt"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true AWS_DEFAULT_REGION=auto AWS_MAX_ATTEMPTS=1 AWS_PAGER= \
  aws --no-cli-pager --endpoint-url "$R2_S3_ENDPOINT" s3 cp \
    "s3://$R2_BUCKET/$UNIQUE_OBJECT_KEY" "$stage/retrieved.dump.age" --only-show-errors \
    > /dev/null 2> "$stage/download-error.txt"
chmod 0600 "$stage/download-error.txt" "$stage/retrieved.dump.age"
cmp --silent "$stage/backup.dump.age" "$stage/retrieved.dump.age"
sha256sum --check --status "$stage/ciphertext.sha256"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true AWS_DEFAULT_REGION=auto AWS_MAX_ATTEMPTS=1 AWS_PAGER= \
  aws --no-cli-pager --endpoint-url "$R2_S3_ENDPOINT" s3 cp \
    "s3://$R2_BUCKET/${UNIQUE_OBJECT_KEY%.dump.age}.manifest.age" "$stage/retrieved.manifest.age" --only-show-errors \
    > /dev/null 2> "$stage/download-error.txt"
chmod 0600 "$stage/retrieved.manifest.age"
cmp --silent "$stage/manifest.age" "$stage/retrieved.manifest.age"
sha256sum --check --status "$stage/manifest.sha256"
age --decrypt --identity "$AGE_IDENTITY_FILE" \
  --output "$stage/plain.dump" "$stage/retrieved.dump.age" \
  > /dev/null 2> "$stage/decrypt-error.txt"
pg_restore --list "$stage/plain.dump" > "$stage/retrieved-archive.list" \
  2> "$stage/restore-archive-error.txt"
cmp --silent "$stage/archive.list" "$stage/retrieved-archive.list"
)
```

The block is a command pattern, not execution authorization. The operator must resolve private variables from protected local files/secure input without writing secret values to history or logs. R2 credentials must be injected through the AWS CLI's environment for this one process only; never use an account-wide token or persistent shared credentials file. Ensure the AWS-compatible `put-object` requests are covered by the exact R2 bucket-lock prefix policy; do not change R2 settings from the command. Upload only the encrypted dump and encrypted manifest. Redact error files before any sharing; do not share the generated archive list because it reveals schema names.

The owner reports a PASS for a synthetic Cloudflare R2 transport test using fictional age-encrypted data and `aws s3api put-object --if-none-match '*'`; no Production data or additional transport operation was performed for this change. Cloudflare documents that `If-None-Match: *` on `PutObject` is checked atomically when the object commits, so a key collision fails rather than replacing the object. Each encrypted dump and encrypted manifest uses its own unique key and conditional PutObject. Never retry the same key after an ambiguous result; keep the encrypted object if only one of the two writes committed, and require review before a new attempt. The object keys and command errors stay private. Repository CI uses a local tmpfs simulator only and does not contact Cloudflare.

Conditional single-object PutObject has a 5 GiB per-object maximum. The script measures the encrypted dump and manifest independently and refuses to upload if either exceeds that limit. R2 supports larger objects through multipart, but this procedure does not silently switch to multipart: the conditional no-overwrite semantics, retention interaction, retry behavior, and cleanup for multipart must be designed, independently reviewed, tested against R2, and separately approved before use. The actual encrypted Production archive size is unknown because no Production export has been authorized; compatibility with that future artifact is therefore unverified until its encrypted size is measured locally before any upload. Before a separately authorized backup, privately reverify the bucket lock and lifecycle coverage for the chosen prefix. Do not weaken or change bucket settings to make a test pass, and do not use CI credentials or cloud services.

### Failure and cleanup

- Any identity, TLS, role, migration/checksum, version, permission, warning, nonempty-file, archive-list, age, upload, download, checksum, or decryption failure means **backup FAIL**. Do not retry automatically or count the artifact as recoverable.
- If either conditional PutObject fails after the other ciphertext has uploaded, mark the operation failed and do not retry, delete, or overwrite the committed object. Record the private transfer reference locally, retain the committed encrypted object under approved retention, and require review plus a new unique key before another one-time attempt. PutObject errors are kept in mode-0600 files inside the private stage and removed by cleanup; never publish their contents.
- Before remote upload, delete the partial ciphertext and plaintext staging files via the trap. The WSL filesystem must be encrypted; unlinking does not guarantee physical erasure. Do not use broad cleanup commands.
- If upload succeeds but independent retrieval/decryption fails, keep the remote object as encrypted evidence under the approved retention rule; mark it invalid and request owner review. Do not try to delete a possibly retention-locked object or upload over the same key. A later attempt requires a new one-time approval/key.
- On success, compare local and retrieved ciphertext byte-for-byte and SHA-256, decrypt only in the private workspace, verify the custom archive list and compare archive lists, then remove the local plaintext, ciphertext, retrieval copy, temporary metadata and error files. Retain only the encrypted remote artifact and the encrypted private evidence manifest.
- This operation does not modify database data or schema. No rollback SQL is needed. Rollback for an incomplete operation is cancellation and local cleanup; no deployment, connection change or automated restore is part of the backup procedure.

### Recovery validation after the backup

The first Production dump does not prove restoration. A separately authorized rehearsal must download and decrypt a copy into an isolated disposable PostgreSQL 18 target with no Production traffic, jobs, mail, webhooks, or customer side effects. Pre-create only the documented global roles and install required extensions/owners before restore. Require the database name embedded in the archive to be absent, then use `pg_restore --create --exit-on-error --dbname=<fresh disposable admin database> <decrypted archive>` without `--clean`; this restores the database owner, settings and ACLs while creating the archived database. Never restore over Production or a shared database. Verify migration ledger/checksums, schema objects, role/ownership/grants, RLS, Directory protections and counts (the current baseline is empty, but the full database may contain other business data). Measure from rehearsal start through verified application readiness against the 60-minute RTO. Keep the source artifact unchanged. This restore requires a separate authorization and does not authorize migration 0023/0024.

## Cost model and threshold

The archive size and remaining account-wide free-tier usage are unknown until an approved dump exists, so a dollar estimate cannot yet be verified. The command calculates an estimate after local encryption and before upload, using the ciphertext bytes and the remaining free storage amount confirmed privately in Cloudflare billing. It stops if the storage estimate exceeds $5/month. This does not include any billed request usage already exceeding the shared allowance, so verify the owner billing view. At current Cloudflare R2 Standard published rates, storage is `$0.015/GB-month`; Class A operations are `$4.50/million`, Class B `$0.36/million`, egress is free, and current monthly included usage is 10 GB-month, 1 million Class A and 10 million Class B operations. Verify current prices and account usage in the owner billing view immediately before approval. [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)

- One dump plus its encrypted manifest stored for 30 days: approximately `encrypted_GB × $0.015`, less unused Standard storage allowance; two PUTs and two GETs are below operation allowances unless the account has already consumed them.
- Preliminary storage-only sensitivity with no free allowance remaining: 100 GB is about `$1.50/month`, 250 GB about `$3.75/month`, and 333 GB about `$5.00/month`; with free allowance remaining, subtract that amount first. Actual database/archive size and account usage are not known, so these are examples, not a verified bill estimate. Multipart request charges depend on final size; compare the calculated upload/download request estimate with the live billing view before approval.
- Daily full archives and encrypted manifests at steady state with 30-day retention: approximately `30 × daily_encrypted_GB × $0.015` before unused free allowance, plus about 60 PUTs and 60 verification GETs per month. Do not enable that schedule here.
- Confirm lock and lifecycle rules jointly enforce a minimum 30-day hold and eventual expiration. Cloudflare notes lifecycle removal typically completes within 24 hours after the expiration time; lock rules can defer lifecycle deletion. Use the measured configured rule precedence, not an assumption of exact deletion at the 30-day instant. [R2 lifecycle behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) [R2 bucket-lock overview](https://developers.cloudflare.com/changelog/post/2025-03-06-r2-bucket-locks/)
- Stop before upload if the estimated incremental monthly charge, including account-wide usage and any applicable tier overages, could exceed the accepted `$5/month` threshold.

## Gates and decision

**Current recommendation: NO-GO for Production backup execution.** Preparation and synthetic testing may proceed. The owner-reported baseline is complete for this point in time, but no complete `pg_dump` artifact, live R2 retention verification, Production restore, or timed RTO test exists.

A single pre-migration artifact is only a recovery point at its capture time. It does not satisfy the ongoing 24-hour RPO unless the separately approved daily backup process is later operated and monitored. This task prepares a one-time checkpoint only; it does not authorize or configure recurrence.

Before a one-time backup can be authorized: merge/review this procedure through normal PR review; pass the dedicated synthetic PostgreSQL backup/restore tests; privately reverify Production identity, preflight/checksums, role coverage and server/client versions; verify the current R2 target, lock/lifecycle prefix and cost; verify age recipient and recovery copy; confirm the operator's single-person risk acknowledgment; and review the exact one-time execution command. This does not authorize recurrence or restore.

### Separate owner authorization request — one-time export only

After these preparation gates pass, request explicit approval limited to one `pg_dump -Fc` of the privately confirmed Production `neondb` direct endpoint during a named UTC window, using the named approved role and PostgreSQL client version; local age encryption with the previously approved recipient; one encrypted upload to the existing private US R2 bucket with the verified 30-day lock/lifecycle policy; independent retrieval, ciphertext comparison, decryption, archive validation, local cleanup, and private evidence retention. Include the redacted expected cost and stop conditions. This approval must explicitly exclude recurring scheduling, R2 policy changes, credentials/ACL changes, database restores, migrations 0023/0024, Registry activation, Production deployment, and endpoint/connection changes. A later isolated restore rehearsal needs its own authorization.
