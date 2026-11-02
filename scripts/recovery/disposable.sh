#!/usr/bin/env bash
# Synthetic/disposable rehearsal only. This is not a production backup command.
set -euo pipefail
umask 077

fail() { printf 'Recovery preparation failed: %s\n' "$1" >&2; exit 1; }
[[ ${RECOVERY_PREP_DISPOSABLE:-} == 1 ]] || fail 'disposable authorization marker is required'
[[ ${PGHOST:-} == localhost || ${PGHOST:-} == 127.0.0.1 || ${PGHOST:-} == ::1 ]] || fail 'local PostgreSQL host is required'
[[ ${PGDATABASE:-} =~ (^|[_-])(test|disposable)([_-]|$) ]] || fail 'a test/disposable database name is required'
[[ -z ${PGHOSTADDR:-} && -z ${PGSERVICE:-} && -z ${PGSERVICEFILE:-} ]] || fail 'connection overrides are forbidden'
[[ ${PGPORT:-} =~ ^[0-9]+$ ]] || fail 'PGPORT is required'
[[ -n ${PGUSER:-} ]] || fail 'PGUSER is required'

mode=${1:-}
stage=''
partial=''
manifest_partial=''
cleanup() {
  if [[ -n $stage && -d $stage ]]; then
    rm -f -- "$stage/plain.dump" "$stage/archive.list"
    rmdir -- "$stage" 2>/dev/null || true
  fi
  if [[ -n $partial ]]; then rm -f -- "$partial"; fi
  if [[ -n $manifest_partial ]]; then rm -f -- "$manifest_partial"; fi
}
trap cleanup EXIT INT TERM

case $mode in
  backup)
    command -v pg_dump >/dev/null && command -v pg_restore >/dev/null && command -v age >/dev/null && command -v psql >/dev/null || fail 'required tools are missing'
    [[ -n ${BACKUP_RECIPIENT:-} && ${BACKUP_KEY_ID:-} =~ ^[A-Za-z0-9_-]+$ && ${BACKUP_SOURCE_TOKEN:-} =~ ^[A-Za-z0-9_-]+$ ]] || fail 'recipient, key ID and source token are required'
    output=${RECOVERY_OUTPUT_DIR:-}
    [[ -n $output && -d $output && ! -L $output ]] || fail 'existing private output directory is required'
    [[ $(stat -c %a "$output") == 700 ]] || fail 'output directory must have mode 700'
    [[ -z $(find "$output" -mindepth 1 -maxdepth 1 -print -quit) ]] || fail 'output directory must be empty'
    server_number=$(psql -w -X -A -t -q -c 'SHOW server_version_num' | tr -d '\r\n')
    client_major=$(pg_dump --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')
    [[ $server_number =~ ^[0-9]+$ && $client_major =~ ^[0-9]+$ ]] || fail 'PostgreSQL versions could not be checked'
    (( client_major >= server_number / 10000 )) || fail 'pg_dump is older than the server'
    stage=$(mktemp -d "${TMPDIR:-/tmp}/ys-sys-001-recovery-XXXXXXXX")
    pg_dump --format=custom --no-password --file "$stage/plain.dump" >/dev/null
    pg_restore --list "$stage/plain.dump" > "$stage/archive.list"
    [[ -s "$stage/archive.list" ]] || fail 'archive listing is empty'
    partial="$output/.backup.dump.age.partial"
    age -r "$BACKUP_RECIPIENT" -o "$partial" "$stage/plain.dump" >/dev/null
    checksum=$(sha256sum "$partial" | cut -d ' ' -f 1)
    bytes=$(stat -c %s "$partial")
    server_version=$(psql -w -X -A -t -q -c 'SHOW server_version' | tr -d '\r\n')
    migration_version=$(psql -w -X -A -t -q -c 'SELECT max(version) FROM application_migrations' 2>/dev/null | tr -d '\r\n' || true)
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
    mv -- "$partial" "$output/backup.dump.age"
    partial=''
    mv -- "$manifest_partial" "$output/manifest.txt"
    manifest_partial=''
    ;;
  upload-local)
    # Local private-store simulator only; a provider adapter needs separate approval.
    source=${RECOVERY_OUTPUT_DIR:-}; store=${RECOVERY_STORAGE_DIR:-}
    [[ -n $source && -n $store && -d $source && -d $store && ! -L $store ]] || fail 'source and private store are required'
    [[ $(stat -c %a "$store") == 700 ]] || fail 'private store must have mode 700'
    [[ -f $source/backup.dump.age && -f $source/manifest.txt ]] || fail 'backup and manifest are required'
    [[ ! -e $store/backup.dump.age && ! -e $store/manifest.txt ]] || fail 'destination already contains an artifact'
    expected=$(sed -n 's/^encrypted_sha256=//p' "$source/manifest.txt")
    [[ $expected =~ ^[0-9a-f]{64}$ ]] || fail 'manifest checksum is invalid'
    partial="$store/.backup.dump.age.partial"
    cp -- "$source/backup.dump.age" "$partial"
    [[ ${RECOVERY_TEST_FAIL_AFTER_COPY:-} != 1 ]] || fail 'injected upload interruption'
    [[ $(sha256sum "$partial" | cut -d ' ' -f 1) == "$expected" ]] || fail 'uploaded bytes differ from manifest'
    manifest_partial="$store/.manifest.partial"
    cp -- "$source/manifest.txt" "$manifest_partial"
    mv -- "$partial" "$store/backup.dump.age"
    partial=''
    mv -- "$manifest_partial" "$store/manifest.txt"
    manifest_partial=''
    ;;
  restore)
    [[ -n ${RECOVERY_ENCRYPTED_FILE:-} && -f ${RECOVERY_ENCRYPTED_FILE:-} && -f ${RECOVERY_MANIFEST_FILE:-} && -f ${RECOVERY_IDENTITY_FILE:-} ]] || fail 'encrypted artifact, manifest and identity are required'
    expected=$(sed -n 's/^encrypted_sha256=//p' "$RECOVERY_MANIFEST_FILE")
    [[ $expected =~ ^[0-9a-f]{64}$ ]] || fail 'manifest checksum is invalid'
    [[ $(sha256sum "$RECOVERY_ENCRYPTED_FILE" | cut -d ' ' -f 1) == "$expected" ]] || fail 'encrypted artifact checksum mismatch'
    table_count=$(psql -w -X -A -t -q -c "SELECT count(*) FROM pg_class WHERE relkind IN ('r','p') AND relnamespace='public'::regnamespace" | tr -d '\r\n')
    [[ $table_count == 0 ]] || fail 'restore target must have no user tables'
    stage=$(mktemp -d "${TMPDIR:-/tmp}/ys-sys-001-recovery-XXXXXXXX")
    age -d -i "$RECOVERY_IDENTITY_FILE" -o "$stage/plain.dump" "$RECOVERY_ENCRYPTED_FILE" >/dev/null
    pg_restore --list "$stage/plain.dump" > "$stage/archive.list"
    [[ -s "$stage/archive.list" ]] || fail 'decrypted archive listing is empty'
    pg_restore --exit-on-error --no-password --dbname "$PGDATABASE" "$stage/plain.dump" >/dev/null
    ;;
  *) fail 'use backup, upload-local or restore' ;;
esac
