#!/usr/bin/env bash
# Private synthetic rehearsal helper. It only runs under the recovery container entry point.
set -euo pipefail
umask 077

fail() { printf 'Recovery rehearsal failed: %s\n' "$1" >&2; exit 1; }
[[ ${YS_RECOVERY_BOUNDARY:-} == ephemeral-container-internal-network-tmpfs-v1 ]] || fail 'approved isolated entry point is required'
[[ -d /work && $(findmnt -n -o FSTYPE /work) == tmpfs ]] || fail 'workspace must be an isolated tmpfs mount'
for name in $(compgen -e); do
  case "$name" in
    PG*|DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DIRECT_URL|DB_URL|*_DATABASE_URL|*_DB_URL|*_CONNECTION_STRING|RECOVERY_OUTPUT_DIR|RECOVERY_STORAGE_DIR|RECOVERY_ENCRYPTED_FILE|RECOVERY_MANIFEST_FILE|RECOVERY_IDENTITY_FILE|VERCEL_*|NEON_*|AWS_*|AZURE_*|GOOGLE_*|CLOUDSDK_*) fail "forbidden environment variable: $name";;
    RECOVERY_TEST_HOST|RECOVERY_TEST_PORT|RECOVERY_TEST_USER|RECOVERY_TEST_PASSWORD|RECOVERY_TEST_DB|RECOVERY_WORKSPACE|RECOVERY_CASE_NAME|RECOVERY_SOURCE_DB|RECOVERY_TARGET_DB|RECOVERY_TEST_FAIL_AFTER_COPY|BACKUP_RECIPIENT|BACKUP_KEY_ID|BACKUP_SOURCE_TOKEN|YS_RECOVERY_BOUNDARY|PATH|HOME|HOSTNAME|PWD|SHLVL|_|BUN_INSTALL|BUN_INSTALL_BIN|BUN_INSTALL_CACHE_DIR|TERM|LANG|LC_*) ;;
    *) fail "unexpected environment variable: $name";;
  esac
done
[[ -n ${RECOVERY_TEST_HOST:-} && ${RECOVERY_TEST_PORT:-} =~ ^[0-9]+$ && -n ${RECOVERY_TEST_USER:-} && -n ${RECOVERY_TEST_PASSWORD:-} && -n ${RECOVERY_TEST_DB:-} ]] || fail 'internally generated disposable database credentials are required'
[[ -d ${RECOVERY_WORKSPACE:-} && ! -L ${RECOVERY_WORKSPACE:-} ]] || fail 'internal tmpfs workspace is required'
[[ ${RECOVERY_CASE_NAME:-} =~ ^case-[A-Za-z0-9_-]{1,64}$ ]] || fail 'generated rehearsal case name is required'
case_dir="$RECOVERY_WORKSPACE/$RECOVERY_CASE_NAME"
case "$(realpath -e "$case_dir")" in "$RECOVERY_WORKSPACE"/*) ;; *) fail 'case directory escaped the isolated workspace';; esac
[[ -d $case_dir && ! -L $case_dir ]] || fail 'case directory must be created by the test within the isolated workspace'
output="$case_dir/output"
store="$case_dir/private-store"
key="$case_dir/identity.txt"
source_db=${RECOVERY_SOURCE_DB:-}
[[ $source_db =~ ^ys_sys_001_test_source_[0-9a-f]{32}$ ]] || fail 'generated synthetic backup database is required'
target_db=${RECOVERY_TARGET_DB:-}
[[ $target_db =~ ^ys_sys_001_test_target_[0-9a-f]{32}$ ]] || fail 'generated synthetic restore database is required'

pg() {
  env -i PATH="$PATH" PGHOST="$RECOVERY_TEST_HOST" PGPORT="$RECOVERY_TEST_PORT" PGUSER="$RECOVERY_TEST_USER" PGPASSWORD="$RECOVERY_TEST_PASSWORD" PGDATABASE="$1" "${@:2}"
}
mode=${1:-}
partial=''
manifest_partial=''
stage=''
cleanup() {
  [[ -z $stage ]] || rm -rf -- "$stage"
  [[ -z $partial ]] || rm -f -- "$partial"
  [[ -z $manifest_partial ]] || rm -f -- "$manifest_partial"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

case $mode in
  backup)
    command -v pg_dump >/dev/null && command -v pg_restore >/dev/null && command -v age >/dev/null && command -v psql >/dev/null || fail 'required tools are missing'
    [[ -n ${BACKUP_RECIPIENT:-} && ${BACKUP_KEY_ID:-} =~ ^[A-Za-z0-9_-]+$ && ${BACKUP_SOURCE_TOKEN:-} =~ ^[A-Za-z0-9_-]+$ ]] || fail 'internally generated encryption metadata is required'
    mkdir -m 700 "$output"
    [[ $(stat -c %a "$output") == 700 ]] || fail 'output directory must have mode 700'
    stage=$(mktemp -d "$RECOVERY_WORKSPACE/plain.XXXXXXXX")
    server_number=$(pg "$source_db" psql -w -X -A -t -q -c 'SHOW server_version_num' | tr -d '\r\n')
    client_major=$(pg_dump --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')
    [[ $server_number =~ ^[0-9]+$ && $client_major =~ ^[0-9]+$ ]] || fail 'PostgreSQL versions could not be checked'
    (( client_major >= server_number / 10000 )) || fail 'pg_dump is older than the server'
    pg "$source_db" pg_dump --format=custom --no-password --file "$stage/plain.dump" >/dev/null
    pg_restore --list "$stage/plain.dump" > "$stage/archive.list"
    [[ -s "$stage/archive.list" ]] || fail 'archive listing is empty'
    partial="$output/.backup.dump.age.partial"
    age -r "$BACKUP_RECIPIENT" -o "$partial" "$stage/plain.dump" >/dev/null
    checksum=$(sha256sum "$partial" | cut -d ' ' -f 1)
    bytes=$(stat -c %s "$partial")
    server_version=$(pg "$source_db" psql -w -X -A -t -q -c 'SHOW server_version' | tr -d '\r\n')
    migration_version=$(pg "$source_db" psql -w -X -A -t -q -c 'SELECT max(version) FROM application_migrations' 2>/dev/null | tr -d '\r\n' || true)
    [[ -n $migration_version ]] || migration_version=unrecorded
    created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    expires_at=$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)
    manifest_partial="$output/.manifest.partial"
    {
      printf 'format=ys-sys-001-disposable-v1\ncreated_at_utc=%s\nretention_starts_at_utc=%s\nexpires_at_utc=%s\n' "$created_at" "$created_at" "$expires_at"
      printf 'source_token=%s\nserver_version=%s\nclient_version=%s\nmigration_version=%s\n' "$BACKUP_SOURCE_TOKEN" "$server_version" "$(pg_dump --version)" "$migration_version"
      printf 'encryption=age-x25519\nkey_id=%s\nencrypted_bytes=%s\nencrypted_sha256=%s\n' "$BACKUP_KEY_ID" "$bytes" "$checksum"
      printf 'operator_initials=UNASSIGNED\nreviewer_initials=UNASSIGNED\n'
    } > "$manifest_partial"
    chmod 600 "$manifest_partial"
    mv -- "$partial" "$output/backup.dump.age"; partial=''
    mv -- "$manifest_partial" "$output/manifest.txt"; manifest_partial=''
    rm -f -- "$stage/plain.dump" "$stage/archive.list"; rmdir "$stage"; stage=''
    ;;
  upload-local)
    # In-memory tmpfs simulator only. This does not access a provider or network storage.
    [[ -d $output && -d $store ]] || fail 'internal rehearsal directories are required'
    [[ $(stat -c %a "$store") == 700 ]] || fail 'private store must have mode 700'
    [[ -f $output/backup.dump.age && -f $output/manifest.txt ]] || fail 'backup and manifest are required'
    [[ ! -e $store/backup.dump.age && ! -e $store/manifest.txt ]] || fail 'destination already contains an artifact'
    expected=$(sed -n 's/^encrypted_sha256=//p' "$output/manifest.txt")
    [[ $expected =~ ^[0-9a-f]{64}$ ]] || fail 'manifest checksum is invalid'
    partial="$store/.backup.dump.age.partial"
    cp -- "$output/backup.dump.age" "$partial"
    [[ ${RECOVERY_TEST_FAIL_AFTER_COPY:-} != 1 ]] || fail 'injected upload interruption'
    [[ $(sha256sum "$partial" | cut -d ' ' -f 1) == "$expected" ]] || fail 'simulated upload bytes differ from manifest'
    manifest_partial="$store/.manifest.partial"
    cp -- "$output/manifest.txt" "$manifest_partial"
    mv -- "$partial" "$store/backup.dump.age"; partial=''
    mv -- "$manifest_partial" "$store/manifest.txt"; manifest_partial=''
    ;;
  restore)
    expected=$(sed -n 's/^encrypted_sha256=//p' "$store/manifest.txt")
    [[ $expected =~ ^[0-9a-f]{64}$ ]] || fail 'manifest checksum is invalid'
    [[ $(sha256sum "$store/backup.dump.age" | cut -d ' ' -f 1) == "$expected" ]] || fail 'encrypted artifact checksum mismatch'
    table_count=$(pg "$target_db" psql -w -X -A -t -q -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'" | tr -d '\r\n')
    [[ $table_count == 0 ]] || fail 'restore target must have no user tables'
    stage=$(mktemp -d "$RECOVERY_WORKSPACE/restore.XXXXXXXX")
    age -d -i "$key" -o "$stage/plain.dump" "$store/backup.dump.age" >/dev/null
    pg_restore --list "$stage/plain.dump" > "$stage/archive.list"
    [[ -s "$stage/archive.list" ]] || fail 'decrypted archive listing is empty'
    pg "$target_db" pg_restore --exit-on-error --no-password --dbname="$target_db" "$stage/plain.dump" >/dev/null
    rm -f -- "$stage/plain.dump" "$stage/archive.list"; rmdir "$stage"; stage=''
    ;;
  *) fail 'use backup, upload-local or restore' ;;
esac
