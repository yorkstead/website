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

Run from an owner-controlled, encrypted ThinkPad/WSL filesystem with enough free space for both the plaintext archive and encrypted copy. Verify active Windows/WSL disk encryption before use; do not assume it. Use the existing private libpq service entry at `~/.config/ys-sys-001/pg_service.conf`, service alias `ys-sys-001-admin`; do not copy it to another location or change its endpoint or credentials for this procedure. Never put a URL or password in command arguments, shell history, GitHub, CI, or this repository. The service entry must privately resolve to the owner-verified direct endpoint, `dbname=neondb`, and the specifically approved dump role. The command supplies `sslmode=verify-full sslrootcert=system channel_binding=require` directly in its libpq connection string; connection-string options take precedence over service-file and environment values, so service-file options cannot weaken TLS. Verify TLS client-side using `psql \conninfo` (captured privately and checked by the repository helper below), not `pg_stat_ssl`: the owner observed that the server-side catalog can report `ssl=false` while the PostgreSQL client reports its connection as SSL/TLS. `verify-full` performs certificate-chain and hostname validation before a connection succeeds; the client report confirms that the established session is using TLS. The service file and age identity must be regular files owned by the current user and mode 0600. The existing default `~/.pgpass` must already be a regular file owned by the current user and mode 0600. If it is absent or fails validation, stop before connecting; do not create or change a credential file for this procedure. Do not reuse a Preview service profile.

Run the command only from an isolated checkout of one exact full commit approved for this operation. Never resolve a branch name, tag, or “latest main” at execution time. The pinned checkout must contain this runbook and both reviewed helpers below. Before running the backup command, complete the pinned-source procedure in the next section. If the exact commit cannot be fetched, its identity does not match, a file is missing/modified, a blob hash differs, or Bash syntax validation fails, stop. Do not source a local helper or fall back to another revision.

Before starting, privately confirm all of these:

1. Vercel Production still resolves to the previously verified direct endpoint; compare the private runtime binding with the intended Neon project and `production` branch. The pooled endpoint is not interchangeable for `pg_dump`.
2. The owner-selected service profile resolves to that same host and `neondb`; TLS is `verify-full`; no inherited `PG*`, URL, Preview, or alternate-service setting can override it.
3. The existing reviewed read-only preflight has been rerun under the approved method immediately before capture. It must show checksums valid, migrations through 0022 only, and expected current schema/protections. Any difference from the supplied baseline is a stop and review point.
4. The owner has checked the live server version and permissions; the installed `pg_dump`/`pg_restore` client is PostgreSQL 18 and `pg_dump` is not older than the server. The role can dump all database objects, including RLS-protected data, without enabling row security or skipping objects.
5. Private Cloudflare configuration has been rechecked: US jurisdiction, Standard class, no public access, exact backup prefix covered by the intended 30-day lock and expiration rules, correct lock/lifecycle precedence, bucket-scoped Object Read & Write credential, client-side age recipient, recovery identity available separately, cost under the $5/month stop threshold, and no legal hold conflict. Owner's prior synthetic R2 and key-copy tests are supporting evidence only; they do not verify the current bucket settings or Production artifact.
6. A one-time approval records source identity, operation window, role, destination, encryption recipient/key identifier, retention, current cost estimate, cleanup, failure path, and the single-operator exception. Do not execute without this separate approval.

Use the following command pattern only after these private checks and approval. Replace service/profile placeholders locally; do not add live values to this document. Run the shell in a clean session with shell tracing disabled. Ensure the work directory is on encrypted local storage, mode 0700, with enough free space for the uncompressed temporary dump plus retrieved ciphertext. Do not place the workspace in a synced folder.

### Pin and verify the execution source

Obtain the exact 40-character commit SHA from the separate, operation-specific owner approval. The commit must be the reviewed source containing this runbook and the helpers; the hash is not a secret. Use a clean shell and the fixed repository URL below. This fetch requests only that commit SHA, checks out detached HEAD, verifies the runbook against that commit, verifies both helper Git blob IDs, and checks their on-disk Git blob IDs and Bash syntax before any helper is sourced. It extracts and syntax-checks the production command from the pinned runbook. If any command fails, stop; do not substitute `main`, a local copy, another commit, or a different helper.

```bash
set -euo pipefail
set +x
read -r -p 'Exact approved full source commit SHA: ' APPROVED_BACKUP_COMMIT
[[ "$APPROVED_BACKUP_COMMIT" =~ ^[0-9a-f]{40}$ ]] || { printf 'Pinned-source check 01 failed: enter the exact approved 40-character commit SHA.\n' >&2; exit 1; }

PIN_PARENT="$HOME/.local/state/yorkstead/ys-sys-001/pinned"
install -d -m 0700 -- "$PIN_PARENT"
[[ "$(stat -c %a -- "$PIN_PARENT")" == 700 && "$(stat -c %u -- "$PIN_PARENT")" == "$(id -u)" ]] || { printf 'Pinned-source check 02 failed: private pinned-source directory permissions or ownership are unsafe.\n' >&2; exit 1; }
[[ "$(realpath -e -- "$PIN_PARENT")" == "$PIN_PARENT" ]] || { printf 'Pinned-source check 02 failed: pinned-source directory is not canonical.\n' >&2; exit 1; }
PINNED_DIR="$PIN_PARENT/$APPROVED_BACKUP_COMMIT"
[[ ! -e "$PINNED_DIR" && ! -L "$PINNED_DIR" ]] || { printf 'Pinned-source check 03 failed: pinned checkout path already exists; stop for review.\n' >&2; exit 1; }
install -d -m 0700 -- "$PINNED_DIR"
git -C "$PINNED_DIR" init --quiet
git -C "$PINNED_DIR" remote add origin https://github.com/yorkstead/website.git
git -C "$PINNED_DIR" fetch --quiet --no-tags --depth=1 origin "$APPROVED_BACKUP_COMMIT" || { printf 'Pinned-source check 04 failed: the exact approved commit could not be fetched.\n' >&2; exit 1; }
FETCHED_COMMIT="$(git -C "$PINNED_DIR" rev-parse --verify FETCH_HEAD^{commit})"
[[ "$FETCHED_COMMIT" == "$APPROVED_BACKUP_COMMIT" ]] || { printf 'Pinned-source check 04 failed: fetched commit did not match the approved commit.\n' >&2; exit 1; }
git -C "$PINNED_DIR" checkout --quiet --detach "$APPROVED_BACKUP_COMMIT"
[[ "$(git -C "$PINNED_DIR" rev-parse HEAD)" == "$APPROVED_BACKUP_COMMIT" ]] || { printf 'Pinned-source check 05 failed: checkout is not at the approved commit.\n' >&2; exit 1; }

RUNBOOK_REL='specs/037-ys-sys-001-systems-registry/one-time-production-backup.md'
INPUT_HELPER_REL='scripts/backup/validate-one-time-backup-inputs.sh'
TLS_HELPER_REL='scripts/backup/verify-psql-client-tls.sh'
EXPECTED_INPUT_HELPER_BLOB='acfe7b447fb7d3daba597ae8bd6aaf2100b36380'
EXPECTED_TLS_HELPER_BLOB='35a4ef061a95bf59215127751a273d7f93880eb9'
for relative_path in "$RUNBOOK_REL" "$INPUT_HELPER_REL" "$TLS_HELPER_REL"; do
  file="$PINNED_DIR/$relative_path"
  [[ -f "$file" && ! -L "$file" ]] || { printf 'Pinned-source check 06 failed: a required runbook or helper file is missing or unsafe.\n' >&2; exit 1; }
  [[ "$(git -C "$PINNED_DIR" rev-parse "$APPROVED_BACKUP_COMMIT:$relative_path")" == "$(git -C "$PINNED_DIR" hash-object -- "$file")" ]] || { printf 'Pinned-source check 06 failed: a checked-out file differs from its approved Git blob.\n' >&2; exit 1; }
done
[[ "$(git -C "$PINNED_DIR" rev-parse "$APPROVED_BACKUP_COMMIT:$INPUT_HELPER_REL")" == "$EXPECTED_INPUT_HELPER_BLOB" ]] || { printf 'Pinned-source check 07 failed: input-validation helper blob SHA did not match the reviewed pin.\n' >&2; exit 1; }
[[ "$(git -C "$PINNED_DIR" rev-parse "$APPROVED_BACKUP_COMMIT:$TLS_HELPER_REL")" == "$EXPECTED_TLS_HELPER_BLOB" ]] || { printf 'Pinned-source check 07 failed: TLS helper blob SHA did not match the reviewed pin.\n' >&2; exit 1; }
git -C "$PINNED_DIR" diff --quiet "$APPROVED_BACKUP_COMMIT" -- "$RUNBOOK_REL" "$INPUT_HELPER_REL" "$TLS_HELPER_REL" || { printf 'Pinned-source check 08 failed: a reviewed source file has local changes.\n' >&2; exit 1; }
bash -n "$PINNED_DIR/$INPUT_HELPER_REL" || { printf 'Pinned-source check 09 failed: input-validation helper has invalid Bash syntax.\n' >&2; exit 1; }
bash -n "$PINNED_DIR/$TLS_HELPER_REL" || { printf 'Pinned-source check 09 failed: TLS helper has invalid Bash syntax.\n' >&2; exit 1; }
printf '%s\n' "$APPROVED_BACKUP_COMMIT" > "$PINNED_DIR/.approved-source-commit"
chmod 0600 "$PINNED_DIR/.approved-source-commit"
awk '
  /^<!-- YS-SYS-001-BACKUP-COMMAND-BEGIN -->$/ { marked=1; next }
  marked && /^```bash$/ { code=1; next }
  marked && code && /^```$/ { exit }
  marked && code { print }
' "$PINNED_DIR/$RUNBOOK_REL" > "$PINNED_DIR/.backup-command.sh"
[[ -s "$PINNED_DIR/.backup-command.sh" ]] || { printf 'Pinned-source check 10 failed: production command block could not be extracted from the pinned runbook.\n' >&2; exit 1; }
chmod 0600 "$PINNED_DIR/.backup-command.sh"
bash -n "$PINNED_DIR/.backup-command.sh" || { printf 'Pinned-source check 10 failed: extracted production command has invalid Bash syntax.\n' >&2; exit 1; }
printf 'Pinned runbook and helper integrity checks passed. Review the pinned runbook at the exact commit before continuing.\n'
```

Do not run the extracted command until all private target, storage, permissions, size, cost, recovery-key, and operation-specific approval gates above are independently satisfied. From the same clean shell, run `cd "$PINNED_DIR" && bash .backup-command.sh`. The command repeats the approved-commit, clean-file, Git blob, runbook-command, and syntax checks immediately before sourcing the input helper. Keep the pinned checkout until the operation is either cancelled or fully complete; remove only that private code-only directory afterwards. If the shell is closed, repeat this exact pin procedure from the same approved SHA.

<!-- YS-SYS-001-BACKUP-COMMAND-BEGIN -->
```bash
(
set -euo pipefail
umask 077
set +x
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
for name in $(compgen -e); do
  case "$name" in PATH|HOME) ;; *) unset "$name";; esac
done

export PGSERVICEFILE="$HOME/.config/ys-sys-001/pg_service.conf"
export PGPASSFILE="$HOME/.pgpass"
export PGSSLMODE=verify-full
export PGSSLROOTCERT=system
export PGCHANNELBINDING=require
unset PGHOST PGHOSTADDR PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE PGOPTIONS
unset DATABASE_URL POSTGRES_URL POSTGRESQL_URL DIRECT_URL DB_URL
for name in $(compgen -e); do [[ $name == AWS_* ]] && unset "$name"; done

if [[ ! -r scripts/backup/validate-one-time-backup-inputs.sh ]]; then
  printf '[YS-SYS-001 check 00] Reviewed local backup validation helper is missing.\n' >&2
  exit 1
fi
[[ -f .approved-source-commit && ! -L .approved-source-commit && "$(stat -c %a -- .approved-source-commit)" == 600 && "$(stat -c %u -- .approved-source-commit)" == "$(id -u)" ]] || { printf '[YS-SYS-001 check 20] The pinned source-commit record is missing or unsafe.\n' >&2; exit 1; }
APPROVED_BACKUP_COMMIT="$(<.approved-source-commit)"
[[ "$APPROVED_BACKUP_COMMIT" =~ ^[0-9a-f]{40}$ && "$(git rev-parse HEAD)" == "$APPROVED_BACKUP_COMMIT" ]] || { printf '[YS-SYS-001 check 20] The execution directory is not at the exact approved source commit.\n' >&2; exit 1; }
EXPECTED_INPUT_HELPER_BLOB='acfe7b447fb7d3daba597ae8bd6aaf2100b36380'
EXPECTED_TLS_HELPER_BLOB='35a4ef061a95bf59215127751a273d7f93880eb9'
[[ "$(git rev-parse "$APPROVED_BACKUP_COMMIT:scripts/backup/validate-one-time-backup-inputs.sh")" == "$EXPECTED_INPUT_HELPER_BLOB" && "$(git hash-object scripts/backup/validate-one-time-backup-inputs.sh)" == "$EXPECTED_INPUT_HELPER_BLOB" ]] || { printf '[YS-SYS-001 check 20] The input-validation helper is missing, modified, or does not match the reviewed Git blob.\n' >&2; exit 1; }
[[ "$(git rev-parse "$APPROVED_BACKUP_COMMIT:scripts/backup/verify-psql-client-tls.sh")" == "$EXPECTED_TLS_HELPER_BLOB" && "$(git hash-object scripts/backup/verify-psql-client-tls.sh)" == "$EXPECTED_TLS_HELPER_BLOB" ]] || { printf '[YS-SYS-001 check 20] The TLS helper is missing, modified, or does not match the reviewed Git blob.\n' >&2; exit 1; }
[[ -f specs/037-ys-sys-001-systems-registry/one-time-production-backup.md && ! -L specs/037-ys-sys-001-systems-registry/one-time-production-backup.md ]] && git diff --quiet "$APPROVED_BACKUP_COMMIT" -- specs/037-ys-sys-001-systems-registry/one-time-production-backup.md || { printf '[YS-SYS-001 check 20] The runbook is missing or differs from the approved commit.\n' >&2; exit 1; }
cmp -s "${BASH_SOURCE[0]}" <(awk '/^<!-- YS-SYS-001-BACKUP-COMMAND-BEGIN -->$/ { marked=1; next } marked && /^```bash$/ { code=1; next } marked && code && /^```$/ { exit } marked && code { print }' specs/037-ys-sys-001-systems-registry/one-time-production-backup.md) || { printf '[YS-SYS-001 check 20] The executed command does not match the command in the pinned runbook.\n' >&2; exit 1; }
bash -n scripts/backup/validate-one-time-backup-inputs.sh && bash -n scripts/backup/verify-psql-client-tls.sh || { printf '[YS-SYS-001 check 20] A pinned helper failed Bash syntax validation.\n' >&2; exit 1; }
source scripts/backup/validate-one-time-backup-inputs.sh
ys_sys_001_check_local_utilities || exit 1
ys_sys_001_check_postgres_clients || exit 1

workspace="$HOME/.local/state/yorkstead/ys-sys-001/backups"
ys_sys_001_prepare_workspace || exit 1
stage="$(mktemp -d "$workspace/one-time.XXXXXX")" || {
  ys_sys_001_fail_check 01 "A private temporary workspace could not be created."
  exit 1
}
cleanup() {
  unset R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
  rm -f -- "$stage/plain.dump" "$stage/retrieved.dump.age" "$stage/backup.dump.age" \
    "$stage/backup.dump.age.partial" "$stage/manifest.txt" "$stage/manifest.age" \
    "$stage/manifest.age.partial" "$stage/retrieved.manifest.age" "$stage/archive.list" \
    "$stage/retrieved-archive.list" "$stage/source-check.txt" "$stage/ciphertext.sha256" \
    "$stage/manifest.sha256" "$stage/object.head" "$stage/connection-error.txt" \
    "$stage/pg-dump-stderr.txt" "$stage/archive-check-error.txt" "$stage/age-error.txt" \
    "$stage/upload-error.txt" "$stage/download-error.txt" "$stage/decrypt-error.txt" \
    "$stage/restore-archive-error.txt" "$stage/client-conninfo.txt"
  rm -rf -- "$stage"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
if ! chmod 0700 "$stage"; then
  ys_sys_001_fail_check 01 "The private temporary workspace could not be secured."
  exit 1
fi

# Enter secrets only from the existing protected local configuration/secure prompt.
# Never echo them or run the session with shell tracing enabled.
ys_sys_001_read_secret R2_ACCESS_KEY_ID 'R2 access key: ' 'R2 access key' || exit 1
ys_sys_001_read_secret R2_SECRET_ACCESS_KEY 'R2 secret key: ' 'R2 secret key' || exit 1
ys_sys_001_read_secret R2_BUCKET 'Approved private R2 bucket name: ' 'R2 bucket name' || exit 1
ys_sys_001_read_secret R2_S3_ENDPOINT 'Private US-jurisdiction R2 S3 endpoint: ' 'R2 endpoint' || exit 1
ys_sys_001_read_text AGE_PUBLIC_RECIPIENT 'Approved age public recipient: ' 'Age recipient' || exit 1
ys_sys_001_read_secret AGE_IDENTITY_FILE 'Age identity file path: ' 'Age identity file path' || exit 1
ys_sys_001_read_text APPROVED_DUMP_ROLE 'Approved PostgreSQL dump role name: ' 'PostgreSQL dump role' || exit 1
ys_sys_001_read_text AGE_KEY_ID 'Non-secret age key label: ' 'Age key label' || exit 1
ys_sys_001_read_text PREFLIGHT_REFERENCE 'Current preflight evidence reference (short token or absolute local path): ' 'Preflight evidence reference' || exit 1
ys_sys_001_read_text DIRECTORY_ENTRY_COUNT 'Current Directory entry count from preflight: ' 'Directory entry count' || exit 1
ys_sys_001_read_text DIRECTORY_AUDIT_COUNT 'Current Directory audit count from preflight: ' 'Directory audit count' || exit 1
ys_sys_001_read_text R2_UNUSED_GB_MONTH 'Unused R2 Standard free storage allowance (GB-month, 0..10): ' 'R2 free storage allowance' || exit 1
ys_sys_001_validate_backup_inputs || exit 1
capture_utc="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
UNIQUE_OBJECT_KEY="ys-sys-001/production/full-db/${capture_utc}-$(openssl rand -hex 16).dump.age"
printf '%s\n' "$UNIQUE_OBJECT_KEY"

# Run privately; capture and inspect output without printing endpoint or credentials.
# The private output must confirm the approved role, database=neondb, and PostgreSQL major.
env -i PATH="$PATH" HOME="$HOME" PGSERVICEFILE="$PGSERVICEFILE" PGPASSFILE="$PGPASSFILE" \
  PGSSLMODE=verify-full PGSSLROOTCERT=system PGCHANNELBINDING=require \
  psql -X -w -v ON_ERROR_STOP=1 -qAt "service=ys-sys-001-admin sslmode=verify-full sslrootcert=system channel_binding=require" \
  -F '|' \
  -c "SELECT current_user, current_database(), current_setting('server_version_num')" \
  > "$stage/source-check.txt" 2> "$stage/connection-error.txt"
chmod 0600 "$stage/source-check.txt" "$stage/connection-error.txt"
IFS='|' read -r actual_user actual_database server_version_num < "$stage/source-check.txt"
if [[ "$actual_user" != "$APPROVED_DUMP_ROLE" || "$actual_database" != neondb || ! "$server_version_num" =~ ^[0-9]+$ ]]; then
  ys_sys_001_fail_check 19 "The connected PostgreSQL identity did not match the privately approved role and database."
  exit 1
fi
if [[ "${server_version_num:0:2}" != 18 ]]; then
  ys_sys_001_fail_check 19 "The Production PostgreSQL server major version is not compatible with the approved PostgreSQL 18 clients."
  exit 1
fi

# Capture only psql's own connection report. It contains private connection metadata;
# the helper reads it without printing it and returns only success/failure.
if ! env -i PATH="$PATH" HOME="$HOME" PGSERVICEFILE="$PGSERVICEFILE" PGPASSFILE="$PGPASSFILE" \
  PGSSLMODE=verify-full PGSSLROOTCERT=system PGCHANNELBINDING=require LC_ALL=C \
  psql -X -w -v ON_ERROR_STOP=1 -q "service=ys-sys-001-admin sslmode=verify-full sslrootcert=system channel_binding=require" \
  -c '\conninfo' > "$stage/client-conninfo.txt" 2> "$stage/connection-error.txt"; then
  chmod 0600 "$stage/client-conninfo.txt" "$stage/connection-error.txt"
  printf 'Client connection verification failed; details remain in the private stage.\n' >&2
  exit 1
fi
chmod 0600 "$stage/client-conninfo.txt" "$stage/connection-error.txt"
scripts/backup/verify-psql-client-tls.sh "$stage/client-conninfo.txt"

env -i PATH="$PATH" HOME="$HOME" PGSERVICEFILE="$PGSERVICEFILE" PGPASSFILE="$PGPASSFILE" \
  PGSSLMODE=verify-full PGSSLROOTCERT=system PGCHANNELBINDING=require \
pg_dump --dbname="service=ys-sys-001-admin sslmode=verify-full sslrootcert=system channel_binding=require" --format=custom --create \
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
<!-- YS-SYS-001-BACKUP-COMMAND-END -->

The block is a command pattern, not execution authorization. The operator must resolve private variables from protected local files/secure input without writing secret values to history or logs. R2 credentials must be injected through the AWS CLI's environment for this one process only; never use an account-wide token or persistent shared credentials file. Ensure the AWS-compatible `put-object` requests are covered by the exact R2 bucket-lock prefix policy; do not change R2 settings from the command. Upload only the encrypted dump and encrypted manifest. Redact error files before any sharing; do not share the generated archive list because it reveals schema names.

### Numbered pre-upload diagnostics

The sourced offline validator reports the first failed check as `[YS-SYS-001 check NN]` plus a condition-specific message. It never echoes entered values, file paths, recipients, credentials, identity output, or connection details. Correct the named condition privately, then repeat only after checking that no prior Production or remote operation occurred. Checks are:

| Check | Condition |
|---|---|
| 01 | Fixed local workspace location, directory type, canonical path, owner, and mode 0700; stage creation and mode. |
| 02 | A prompted value was not supplied. The message names its input class, never its value. |
| 03 | Preflight entry and audit counts are non-negative integers. |
| 04 | R2 free-storage allowance is a decimal from 0 through 10 GB-month inclusive, with at most three fractional digits; values above 10 and negative/non-numeric values fail. |
| 05 | Age key label and evidence-reference format. The evidence reference accepts a short token or slash-prefixed private local path. |
| 06–09 | Age public-recipient format, PostgreSQL role-name format, R2 bucket-name format, or HTTPS US-jurisdiction R2 endpoint format. |
| 10–13 | Age identity, PostgreSQL service, or password file missing/unsafe, or file paths not absolute and canonical. Enter expanded absolute paths; `~` is not expanded by `read`. |
| 14–15 | Required private file mode or owner does not meet the current-user/mode-0600 requirement. |
| 16 | A required local utility is unavailable. The message names only the executable. |
| 17 | The local age identity cannot be read or does not derive the supplied recipient. No key material or recipient is printed. |
| 18 | `psql`, `pg_dump`, or `pg_restore` is unavailable, fails to report a version, or is not PostgreSQL major 18. |
| 19 | After the fixed source query, connected role/database identity or server major does not match the privately approved target. No actual identity is printed. |
| 20 | Pinned commit, runbook/helper Git blobs, local source integrity, or helper Bash syntax does not match the approved source. |

For the earlier attempt, the owner confirmed the exact preflight evidence reference was a short token that satisfies the former token pattern, so rejection of slash-prefixed paths cannot explain that attempt. The former validator did have a confirmed limitation: it rejected absolute evidence paths; that is only a hypothetical failure if such a path had been entered. The actual failure remains unconfirmed because no numbered diagnostic or complete input record was captured. The owner later independently confirmed endpoint format, private files and permissions, PostgreSQL 18.6 clients, and age identity/recipient match, but that does not establish every other input or shell prerequisite from the failed run. The old PostgreSQL version check occurred after object-key output and cannot explain the reported stop before the key. Treat any other pre-key failure causes as hypotheses; do not claim this incident is diagnosed. The updated offline validator accepts a safe short token or slash-prefixed local path, and emits the first failing numbered check without repeating input values.


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
