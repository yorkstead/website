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
    PG*|DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DIRECT_URL|DB_URL|*_DATABASE_URL|*_DB_URL|*_CONNECTION_STRING|VERCEL_*|NEON_*|AWS_*|GOOGLE_*|CLOUDSDK_*|AZURE_CLIENT_*|AZURE_TENANT_ID|AZURE_SUBSCRIPTION_ID|AZURE_CREDENTIALS|AZURE_FEDERATED_TOKEN_FILE|AZURE_CONFIG_DIR|ARM_*|*_TOKEN|*_SECRET|*_PRIVATE_KEY|*_CREDENTIALS)
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
  if admin_psql -d "$database" -v expected_database="$database" -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql" >"$work_dir/rejected.out" 2>&1; then
    fail "unsafe effective privilege was accepted ($label)"
  fi
  if admin_psql -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '$role_name')" | grep -qx t; then
    fail "failed setup left a role behind ($label)"
  fi
}

expect_rerun_rejected() {
  local database="$1" label="$2"
  if admin_psql -d "$database" -v expected_database="$database" -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql" >"$work_dir/rejected-rerun.out" 2>&1; then
    fail "unsafe effective privilege was accepted on rerun ($label)"
  fi
  if ! admin_psql -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '$role_name')" | grep -qx t; then
    fail "failed rerun unexpectedly removed the managed role ($label)"
  fi
}

prepare_schema ys_sys_001_full true
prepare_schema ys_sys_001_legacy false

# Any role able to create public routines must have its implicit PUBLIC
# EXECUTE default revoked before this reader can be configured.
admin_psql -d ys_sys_001_full -c 'CREATE ROLE ys_synthetic_creator NOLOGIN; GRANT CREATE ON SCHEMA public TO ys_synthetic_creator; SET ROLE ys_synthetic_creator; CREATE TABLE public.ys_synthetic_creator_owned(id integer); RESET ROLE'
expect_setup_rejected ys_sys_001_full 'creator with implicit PUBLIC routine defaults'
admin_psql -d ys_sys_001_full -c 'DROP TABLE public.ys_synthetic_creator_owned; REVOKE CREATE ON SCHEMA public FROM ys_synthetic_creator; DROP ROLE ys_synthetic_creator'

# The fixed scripts refuse a database-name mismatch before changing roles.
if admin_psql -d ys_sys_001_full -v expected_database=wrong_target -f \
  "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql" >"$work_dir/wrong-target.out" 2>&1; then
  fail 'setup accepted a database-name mismatch'
fi
if admin_psql -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '$role_name')" | grep -qx t; then
  fail 'wrong-target setup created a role'
fi

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

# Public routines, sequence grants, and unsafe defaults fail closed too.
admin_psql -d ys_sys_001_full -c "CREATE FUNCTION public.ys_test_exposed() RETURNS text LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT 'synthetic secret'::text \$\$; GRANT EXECUTE ON FUNCTION public.ys_test_exposed() TO PUBLIC"
expect_setup_rejected ys_sys_001_full 'PUBLIC EXECUTE on SECURITY DEFINER routine'
admin_psql -d ys_sys_001_full -c 'DROP FUNCTION public.ys_test_exposed()'
admin_psql -d ys_sys_001_full -c 'CREATE SEQUENCE public.ys_test_sequence; GRANT USAGE ON SEQUENCE public.ys_test_sequence TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC sequence USAGE'
admin_psql -d ys_sys_001_full -c 'DROP SEQUENCE public.ys_test_sequence'
admin_psql -d ys_sys_001_full -c 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC default table SELECT'
admin_psql -d ys_sys_001_full -c 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON TABLES FROM PUBLIC'
admin_psql -d ys_sys_001_full -c 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE ON SEQUENCES TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC default sequence USAGE'
admin_psql -d ys_sys_001_full -c 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE USAGE ON SEQUENCES FROM PUBLIC'
admin_psql -d ys_sys_001_full -c 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO PUBLIC'
expect_setup_rejected ys_sys_001_full 'PUBLIC default routine EXECUTE'
admin_psql -d ys_sys_001_full -c 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC'

admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -Atc "SELECT NOT rolcanlogin AND rolpassword IS NULL FROM pg_catalog.pg_authid WHERE rolname = '$role_name'" | grep -qx t || fail 'new role was not kept NOLOGIN/passwordless'

# Grant options are tested on the managed role; PostgreSQL does not allow
# granting grant options to PUBLIC itself.
admin_psql -d ys_sys_001_full -c "GRANT CONNECT ON DATABASE ys_sys_001_full TO $role_name WITH GRANT OPTION"
expect_rerun_rejected ys_sys_001_full 'CONNECT grant option'
admin_psql -d ys_sys_001_full -c "REVOKE CONNECT ON DATABASE ys_sys_001_full FROM $role_name"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -c "GRANT USAGE ON SCHEMA public TO $role_name WITH GRANT OPTION"
expect_rerun_rejected ys_sys_001_full 'schema USAGE grant option'
admin_psql -d ys_sys_001_full -c "REVOKE USAGE ON SCHEMA public FROM $role_name"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -c "GRANT SELECT (id) ON public.system_directory_entries TO $role_name WITH GRANT OPTION"
expect_rerun_rejected ys_sys_001_full 'column SELECT grant option'
admin_psql -d ys_sys_001_full -c "REVOKE SELECT (id) ON public.system_directory_entries FROM $role_name"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name PASSWORD '$reader_password'; ALTER ROLE $role_name LOGIN"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

# Publicly readable views are treated as another path to data and rejected.
admin_psql -d ys_sys_001_full -c 'CREATE VIEW public.ys_sensitive_view AS SELECT name FROM public.system_directory_entries; GRANT SELECT ON public.ys_sensitive_view TO PUBLIC'
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/view.out" 2>&1; then
  fail 'effective verifier accepted a PUBLIC-readable view'
fi
admin_psql -d ys_sys_001_full -c 'DROP VIEW public.ys_sensitive_view'

admin_psql -d ys_sys_001_full -c "CREATE ROLE $writer_name NOLOGIN; GRANT UPDATE ON public.system_directory_entries TO $writer_name; GRANT $writer_name TO $role_name"
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/membership.out" 2>&1; then
  fail 'effective verifier accepted a writer-role membership'
fi
admin_psql -d ys_sys_001_full -c "REVOKE $writer_name FROM $role_name; REVOKE UPDATE ON public.system_directory_entries FROM $writer_name; DROP ROLE $writer_name"
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name INHERIT"
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/inherit.out" 2>&1; then
  fail 'effective verifier accepted INHERIT'
fi
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name NOINHERIT"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

# Password exists only in this process and the synthetic CI database.
admin_psql -d ys_sys_001_full -c 'CREATE ROLE ys_sys_001_forbidden_target NOLOGIN'
reader_psql ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/synthetic-privilege-tests.sql"
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

reader_psql ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/preflight-readonly.sql" >"$work_dir/preflight.out"
if reader_psql ys_sys_001_full -v expected_database=wrong_target -f "$repo_root/scripts/ys-sys-001-readonly-role/preflight-readonly.sql" >"$work_dir/wrong-preflight.out" 2>&1; then
  fail 'preflight accepted a database-name mismatch'
fi
if grep -Eq 'Synthetic Service|SYNTHETIC PRIVATE SENTINEL|SYNTHETIC-BILLING-SENTINEL|synthetic-fixture-actor' "$work_dir/preflight.out"; then
  fail 'fixed preflight exposed synthetic row-level content'
fi
grep -q '0024' "$work_dir/preflight.out" || fail 'preflight omitted 0024 ledger evidence'

# Each role is restricted to one database. Revoke/remove it before the legacy
# schema case so it cannot retain CONNECT on the full-schema database.
admin_psql -d ys_sys_001_full -c "GRANT SELECT ON public.ys_unrelated_permission_probe TO $role_name"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-revoked.sql"
admin_psql -Atc "SELECT pg_catalog.has_table_privilege('$role_name', 'public.ys_unrelated_permission_probe', 'SELECT')" | grep -qx t || fail 'revocation changed an unrelated permission'
if reader_psql ys_sys_001_full -c 'SELECT 1' >/dev/null 2>&1; then fail 'revoked full-schema reader still logged in'; fi
admin_psql -d ys_sys_001_full -c "REVOKE SELECT ON public.ys_unrelated_permission_probe FROM $role_name"
admin_psql -d ys_sys_001_full -c "DROP ROLE $role_name"

# Legacy-only schema confirms optional 0023/0024 relations are not assumed.
admin_psql -d ys_sys_001_legacy -v expected_database=ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_legacy -c "ALTER ROLE $role_name PASSWORD '$reader_password'; ALTER ROLE $role_name LOGIN"
admin_psql -d ys_sys_001_legacy -v expected_database=ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"
reader_psql ys_sys_001_legacy -v expected_database=ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/preflight-readonly.sql" >"$work_dir/legacy-preflight.out"

admin_psql -d ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql"
admin_psql -d ys_sys_001_legacy -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-revoked.sql"
if reader_psql ys_sys_001_legacy -c 'SELECT 1' >/dev/null 2>&1; then fail 'revoked legacy reader still logged in'; fi
admin_psql -d ys_sys_001_legacy -c "DROP ROLE $role_name"

printf 'PASS: actual migrations 0020/0023/0024, legacy-only schema, aggregate/metadata reads, sensitive-column and DML/DDL denial, PUBLIC/inherited/default/sequence/routine/grant-option fail-closed checks, idempotence, output redaction, and scoped revocation.\n'
