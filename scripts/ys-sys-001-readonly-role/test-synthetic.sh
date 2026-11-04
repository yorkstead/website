#!/usr/bin/env bash
set -euo pipefail
umask 077

fail() { printf 'Synthetic role test failed: %s\n' "$1" >&2; exit 1; }

# CI-only entry point. The independent Actions job provisions the local
# PostgreSQL service. Callers cannot provide a URL, host, password, or cloud
# destination; client processes below receive only fixed synthetic credentials.
[[ "${GITHUB_ACTIONS:-}" == true && "${CI:-}" == true ]] || fail 'must run inside the dedicated GitHub Actions job'
for name in $(compgen -e); do
  case "$name" in
    PG*|DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DIRECT_URL|DB_URL|*_DATABASE_URL|*_DB_URL|*_CONNECTION_STRING|VERCEL_*|NEON_*|AWS_*|AZURE_*|GOOGLE_*|CLOUDSDK_*)
      fail "external database/cloud environment is not accepted: $name" ;;
  esac
done

repo_root="$(git rev-parse --show-toplevel)"
role_name=ys_sys_001_preflight_reader
writer_name=ys_sys_001_synthetic_writer
work_dir="$(mktemp -d)"
reader_password="$(openssl rand -hex 32)"
trap 'rm -rf "$work_dir"' EXIT INT TERM

admin_psql() {
  env -i PATH="$PATH" HOME="$work_dir" PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres \
    PGPASSWORD=postgres PGDATABASE=postgres psql -X -q -v ON_ERROR_STOP=1 "$@"
}
reader_psql() {
  local database="$1"; shift
  env -i PATH="$PATH" HOME="$work_dir" PGHOST=127.0.0.1 PGPORT=5432 PGUSER="$role_name" \
    PGPASSWORD="$reader_password" PGDATABASE="$database" psql -X -q -v ON_ERROR_STOP=1 "$@"
}

admin_psql -c 'CREATE DATABASE ys_sys_001_full'
admin_psql -c 'CREATE DATABASE ys_sys_001_legacy'

prepare_schema() {
  local database="$1" through_registry="$2" migration version name checksum
  admin_psql -d "$database" -f "$repo_root/scripts/ys-sys-001-readonly-role/synthetic-fixture.sql"
  for migration_path in "$repo_root"/migrations/*.sql; do
    migration="${migration_path##*/}"
    version="${migration:0:4}"
    case "$version" in
      0020) ;;
      0023|0024) [[ "$through_registry" == true ]] || continue ;;
      *) continue ;;
    esac
    admin_psql -d "$database" -f "$migration_path"
    name="${migration#????_}"; name="${name%.sql}"
    checksum="$(sha256sum "$migration_path" | cut -d' ' -f1)"
    admin_psql -d "$database" -c "INSERT INTO public.application_migrations(version,name,checksum) VALUES ('$version', '$name', '$checksum')"
    if [[ "$version" == 0024 ]]; then
      admin_psql -d "$database" -f "$repo_root/scripts/ys-sys-001-readonly-role/synthetic-data.sql"
    fi
  done
}

expect_setup_rejected() {
  local database="$1" label="$2"
  if admin_psql -d "$database" -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql" >"$work_dir/rejected.out" 2>&1; then
    fail "unsafe effective privilege was accepted ($label)"
  fi
  if admin_psql -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '$role_name')" | grep -qx t; then
    fail "failed setup left a role behind ($label)"
  fi
}

prepare_schema ys_sys_001_full true
prepare_schema ys_sys_001_legacy false

# PUBLIC grants which widen effective privilege must abort setup transactionally.
admin_psql -d ys_sys_001_full -c 'GRANT TEMP ON DATABASE ys_sys_001_full TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC TEMP'
admin_psql -d ys_sys_001_full -c 'REVOKE TEMP ON DATABASE ys_sys_001_full FROM PUBLIC'
admin_psql -d ys_sys_001_full -c 'GRANT SELECT (name) ON public.system_directory_entries TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC sensitive-column SELECT'
admin_psql -d ys_sys_001_full -c 'REVOKE SELECT (name) ON public.system_directory_entries FROM PUBLIC'
admin_psql -d ys_sys_001_full -c 'GRANT UPDATE ON public.system_directory_entries TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC UPDATE'
admin_psql -d ys_sys_001_full -c 'REVOKE UPDATE ON public.system_directory_entries FROM PUBLIC'

admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

admin_psql -d ys_sys_001_full -c "CREATE ROLE $writer_name NOLOGIN; GRANT UPDATE ON public.system_directory_entries TO $writer_name; GRANT $writer_name TO $role_name"
if admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/membership.out" 2>&1; then
  fail 'effective verifier accepted a writer-role membership'
fi
admin_psql -d ys_sys_001_full -c "REVOKE $writer_name FROM $role_name; DROP ROLE $writer_name"
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name INHERIT"
if admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/inherit.out" 2>&1; then
  fail 'effective verifier accepted INHERIT'
fi
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name NOINHERIT"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

# Password exists only in this process and the synthetic CI database.
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name PASSWORD '$reader_password'"
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name LOGIN"
admin_psql -d ys_sys_001_full -c 'CREATE ROLE ys_sys_001_forbidden_target NOLOGIN'
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/synthetic-privilege-tests.sql"
admin_psql -d ys_sys_001_full -c 'DROP ROLE ys_sys_001_forbidden_target'
for sql in \
  'SELECT count(id) FROM public.system_directory_entries' \
  'SELECT count(id) FROM public.system_directory_audit' \
  'SELECT version, checksum, applied_at FROM public.application_migrations ORDER BY version' \
  'SELECT count(*) FROM public.system_directory_relationships' \
  'SELECT count(*) FROM public.system_directory_billing_evidence'; do
  reader_psql ys_sys_001_full -c "$sql" >/dev/null
done
if reader_psql ys_sys_001_full -Atc "SELECT count(*) FROM public.system_directory_entries WHERE name = 'Synthetic Service A'" >/dev/null 2>&1; then
  fail 'actual reader login could read protected business labels'
fi
if reader_psql ys_sys_001_full -c "INSERT INTO public.system_directory_entries(id,name,category,provider) VALUES ('00000000-0000-0000-0000-000000000009','Denied','other','Denied')" >/dev/null 2>&1; then
  fail 'actual reader login unexpectedly inserted data'
fi
for command in \
  'UPDATE public.system_directory_entries SET revision=revision' \
  'DELETE FROM public.system_directory_entries' \
  'TRUNCATE public.system_directory_entries' \
  'CREATE TABLE public.ys_forbidden(id integer)' \
  'CREATE TEMP TABLE ys_forbidden_temp(id integer)' \
  'ALTER TABLE public.system_directory_entries ADD COLUMN forbidden integer' \
  'DROP TABLE public.system_directory_entries' \
  'CREATE ROLE ys_forbidden_role'; do
  if reader_psql ys_sys_001_full -c "$command" >/dev/null 2>&1; then fail 'actual login performed prohibited operation'; fi
done

reader_psql ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/preflight-readonly.sql" >"$work_dir/preflight.out"
if rg -q 'Synthetic Service|SYNTHETIC PRIVATE SENTINEL|SYNTHETIC-BILLING-SENTINEL|synthetic-fixture-actor' "$work_dir/preflight.out"; then
  fail 'fixed preflight exposed synthetic row-level content'
fi
grep -q '0024' "$work_dir/preflight.out" || fail 'preflight omitted 0024 ledger evidence'

# Each role is restricted to one database. Revoke/remove it before the legacy
# schema case so it cannot retain CONNECT on the full-schema database.
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-revoked.sql"
if reader_psql ys_sys_001_full -c 'SELECT 1' >/dev/null 2>&1; then fail 'revoked full-schema reader still logged in'; fi
admin_psql -d ys_sys_001_full -c "DROP ROLE $role_name"

# Legacy-only schema confirms optional 0023/0024 relations are not assumed.
admin_psql -d ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"
admin_psql -d ys_sys_001_legacy -c "ALTER ROLE $role_name PASSWORD '$reader_password'"
admin_psql -d ys_sys_001_legacy -c "ALTER ROLE $role_name LOGIN"
reader_psql ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/preflight-readonly.sql" >"$work_dir/legacy-preflight.out"

admin_psql -d ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql"
admin_psql -d ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-revoked.sql"
if reader_psql ys_sys_001_legacy -c 'SELECT 1' >/dev/null 2>&1; then fail 'revoked legacy reader still logged in'; fi
admin_psql -d ys_sys_001_legacy -c "DROP ROLE $role_name"

printf 'PASS: actual migrations 0020/0023/0024, legacy-only schema, aggregate/metadata reads, sensitive-column and DML/DDL denial, PUBLIC/inherited privilege fail-closed checks, idempotence, output redaction, and revocation.\n'
