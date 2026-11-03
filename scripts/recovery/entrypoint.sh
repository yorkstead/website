#!/usr/bin/env bash
set -euo pipefail
umask 077
while IFS= read -r name; do
  case "$name" in
    PG*|DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DIRECT_URL|DB_URL|*_DATABASE_URL|*_DB_URL|*_CONNECTION_STRING|RECOVERY_OUTPUT_DIR|RECOVERY_STORAGE_DIR|RECOVERY_ENCRYPTED_FILE|RECOVERY_MANIFEST_FILE|RECOVERY_IDENTITY_FILE|VERCEL_*|NEON_*|AWS_*|AZURE_*|GOOGLE_*|CLOUDSDK_*)
      echo "rejected inherited environment: $name" >&2; exit 78;;
  esac
done < <(compgen -e)
for name in $(compgen -e); do
  case "$name" in
    RECOVERY_DB_HOST|RECOVERY_DB_PORT|RECOVERY_DB_USER|RECOVERY_DB_PASSWORD|RECOVERY_DB_NAME|PATH|HOME|HOSTNAME|PWD|SHLVL|_|BUN_INSTALL|BUN_INSTALL_BIN|BUN_INSTALL_CACHE_DIR|BUN_RUNTIME_TRANSPILER_CACHE_PATH|BUN_CONFIG_MAX_HTTP_REQUESTS|TERM|LANG|LC_*) ;;
    *) echo "unexpected environment variable: $name" >&2; exit 78;;
  esac
done
[[ -d /work && $(findmnt -n -o FSTYPE /work) == tmpfs ]] || { echo 'isolated tmpfs workspace required' >&2; exit 78; }
[[ -d /tmp && $(findmnt -n -o FSTYPE /tmp) == tmpfs && ${BUN_RUNTIME_TRANSPILER_CACHE_PATH:-} == /tmp/bun-runtime-cache ]] || { echo 'runtime temporary storage must remain on tmpfs' >&2; exit 78; }
[[ -n ${RECOVERY_DB_HOST:-} && -n ${RECOVERY_DB_USER:-} && -n ${RECOVERY_DB_PASSWORD:-} && -n ${RECOVERY_DB_NAME:-} ]] || exit 78
export RECOVERY_WORKSPACE="$(mktemp -d /work/rehearsal.XXXXXX)"
export YS_RECOVERY_BOUNDARY="ephemeral-container-internal-network-tmpfs-v1"
cleanup() { rm -rf -- "$RECOVERY_WORKSPACE"; }
trap cleanup EXIT
export RECOVERY_TEST_HOST="$RECOVERY_DB_HOST" RECOVERY_TEST_PORT="${RECOVERY_DB_PORT:-5432}" RECOVERY_TEST_USER="$RECOVERY_DB_USER" RECOVERY_TEST_PASSWORD="$RECOVERY_DB_PASSWORD" RECOVERY_TEST_DB="$RECOVERY_DB_NAME"
unset RECOVERY_DB_HOST RECOVERY_DB_PORT RECOVERY_DB_USER RECOVERY_DB_PASSWORD RECOVERY_DB_NAME
if bun test ./scripts/recovery/rehearsal.integration.ts; then status=0; else status=$?; fi
cleanup
trap - EXIT
exit "$status"
