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
locked_admin_psql() {
  env -i PATH="$PATH" HOME="$work_dir" PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres \
    PGPASSWORD=postgres PGDATABASE=postgres PGOPTIONS='-c lock_timeout=200ms' \
    psql -X -q -v ON_ERROR_STOP=1 "$@"
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
  if ! admin_psql -Atc "SELECT NOT rolcanlogin FROM pg_catalog.pg_roles WHERE rolname = '$role_name'" | grep -qx t; then
    fail "failed rerun left the managed role login enabled ($label)"
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

# Unrelated public relations must not expose any table/maintenance or
# column-write capability through PUBLIC. The relation has no SELECT grant,
# so these specifically exercise the former SELECT-only verification gap.
for privilege in INSERT UPDATE DELETE TRUNCATE REFERENCES TRIGGER MAINTAIN; do
  admin_psql -d ys_sys_001_full -c "GRANT $privilege ON TABLE public.ys_unrelated_permission_probe TO PUBLIC"
  expect_setup_rejected ys_sys_001_full "PUBLIC $privilege on unrelated relation"
  admin_psql -d ys_sys_001_full -c "REVOKE $privilege ON TABLE public.ys_unrelated_permission_probe FROM PUBLIC"
done
for privilege in INSERT UPDATE REFERENCES; do
  admin_psql -d ys_sys_001_full -c "GRANT $privilege (id) ON TABLE public.ys_unrelated_permission_probe TO PUBLIC"
  expect_setup_rejected ys_sys_001_full "PUBLIC column $privilege on unrelated relation"
  admin_psql -d ys_sys_001_full -c "REVOKE $privilege (id) ON TABLE public.ys_unrelated_permission_probe FROM PUBLIC"
done

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

# The independent verifier rejects the same unrelated PUBLIC write and column
# privileges. Include the reported TRUNCATE case explicitly, as well as every
# other supported table and column write class.
for privilege in INSERT UPDATE DELETE TRUNCATE REFERENCES TRIGGER MAINTAIN; do
  admin_psql -d ys_sys_001_full -c "GRANT $privilege ON TABLE public.ys_unrelated_permission_probe TO PUBLIC"
  if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/unrelated-$privilege.out" 2>&1; then
    fail "effective verifier accepted PUBLIC $privilege on an unrelated relation"
  fi
  admin_psql -d ys_sys_001_full -c "REVOKE $privilege ON TABLE public.ys_unrelated_permission_probe FROM PUBLIC"
done
for privilege in INSERT UPDATE REFERENCES; do
  admin_psql -d ys_sys_001_full -c "GRANT $privilege (id) ON TABLE public.ys_unrelated_permission_probe TO PUBLIC"
  if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/unrelated-column-$privilege.out" 2>&1; then
    fail "effective verifier accepted PUBLIC column $privilege on an unrelated relation"
  fi
  admin_psql -d ys_sys_001_full -c "REVOKE $privilege (id) ON TABLE public.ys_unrelated_permission_probe FROM PUBLIC"
done

# Grant options are prohibited even when introduced directly on an unrelated
# relation rather than through PUBLIC; rerun must fail closed and leave LOGIN off.
admin_psql -d ys_sys_001_full -c "GRANT TRUNCATE ON TABLE public.ys_unrelated_permission_probe TO $role_name WITH GRANT OPTION"
expect_rerun_rejected ys_sys_001_full 'unrelated TRUNCATE grant option'
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/unrelated-truncate-option.out" 2>&1; then
  fail 'effective verifier accepted unrelated TRUNCATE grant option'
fi
admin_psql -d ys_sys_001_full -c "REVOKE TRUNCATE ON TABLE public.ys_unrelated_permission_probe FROM $role_name"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -c 'ALTER ROLE ys_sys_001_preflight_reader LOGIN'
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

# A live managed login must be disabled even when a rerun detects an unsafe
# direct privilege and rolls back its transactional grant work.
admin_psql -d ys_sys_001_full -c "GRANT CREATE ON SCHEMA public TO $role_name"
expect_rerun_rejected ys_sys_001_full 'direct schema CREATE after login'
admin_psql -d ys_sys_001_full -c "REVOKE CREATE ON SCHEMA public FROM $role_name"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -c "GRANT TEMPORARY ON DATABASE ys_sys_001_full TO $role_name"
expect_rerun_rejected ys_sys_001_full 'direct database TEMP after login'
admin_psql -d ys_sys_001_full -c "REVOKE TEMPORARY ON DATABASE ys_sys_001_full FROM $role_name"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/create-reader.sql"
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name LOGIN"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

# The production verifier continues to reject direct unsafe schema/database
# capabilities even though revocation itself preserves unrelated grants.
admin_psql -d ys_sys_001_full -c "GRANT CREATE ON SCHEMA public TO $role_name"
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/direct-create.out" 2>&1; then
  fail 'effective verifier accepted direct schema CREATE'
fi
admin_psql -d ys_sys_001_full -c "REVOKE CREATE ON SCHEMA public FROM $role_name; GRANT TEMPORARY ON DATABASE ys_sys_001_full TO $role_name"
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/direct-temp.out" 2>&1; then
  fail 'effective verifier accepted direct database TEMPORARY'
fi
admin_psql -d ys_sys_001_full -c "REVOKE TEMPORARY ON DATABASE ys_sys_001_full FROM $role_name"

# Publicly readable views are treated as another path to data and rejected.
admin_psql -d ys_sys_001_full -c 'CREATE VIEW public.ys_sensitive_view AS SELECT name FROM public.system_directory_entries; GRANT SELECT ON public.ys_sensitive_view TO PUBLIC'
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/view.out" 2>&1; then
  fail 'effective verifier accepted a PUBLIC-readable view'
fi
admin_psql -d ys_sys_001_full -c 'DROP VIEW public.ys_sensitive_view'

admin_psql -d ys_sys_001_full -c "CREATE ROLE $writer_name NOLOGIN; GRANT TRUNCATE ON public.ys_unrelated_permission_probe TO $writer_name; GRANT $writer_name TO $role_name"
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/membership.out" 2>&1; then
  fail 'effective verifier accepted inherited TRUNCATE on an unrelated public relation'
fi
admin_psql -d ys_sys_001_full -c "REVOKE $writer_name FROM $role_name; REVOKE TRUNCATE ON public.ys_unrelated_permission_probe FROM $writer_name; DROP ROLE $writer_name"
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name INHERIT"
if admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql" >"$work_dir/inherit.out" 2>&1; then
  fail 'effective verifier accepted INHERIT'
fi
admin_psql -d ys_sys_001_full -c "ALTER ROLE $role_name NOINHERIT"
admin_psql -d ys_sys_001_full -v expected_database=ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-reader.sql"

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

# Add unrelated direct grants after setup. They make the role unsafe while live,
# but revocation must preserve them after disabling its login.
admin_psql -d ys_sys_001_full -c "GRANT CREATE ON SCHEMA public TO $role_name"
admin_psql -d ys_sys_001_full -c "GRANT TEMPORARY ON DATABASE ys_sys_001_full TO $role_name"
admin_psql -d ys_sys_001_full -c "GRANT SELECT ON public.ys_unrelated_permission_probe TO $role_name"
admin_psql -d ys_sys_001_full -c 'GRANT CONNECT ON DATABASE ys_sys_001_full TO PUBLIC; GRANT USAGE ON SCHEMA public TO PUBLIC; GRANT SELECT (id) ON public.system_directory_entries TO PUBLIC'

# Hold a conflicting relation lock so cleanup fails after the separately
# committed NOLOGIN/password cutoff.
admin_psql -d ys_sys_001_full -c 'BEGIN; LOCK TABLE public.application_migrations IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(2); COMMIT' >"$work_dir/lock-holder.out" 2>&1 &
lock_holder_pid=$!
lock_acquired=false
for attempt in $(seq 1 40); do
  if admin_psql -d ys_sys_001_full -Atc "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_locks l JOIN pg_catalog.pg_class c ON c.oid=l.relation WHERE c.relname='application_migrations' AND l.mode='AccessExclusiveLock' AND l.granted AND l.pid <> pg_backend_pid())" | grep -qx t; then
    lock_acquired=true
    break
  fi
  sleep 0.05
done
if [[ "$lock_acquired" != true ]]; then
  kill "$lock_holder_pid" 2>/dev/null || true
  wait "$lock_holder_pid" 2>/dev/null || true
  fail 'could not establish the synthetic lock needed for the revoke failure case'
fi
if locked_admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql" >"$work_dir/revoke-failure.out" 2>&1; then
  fail 'revocation cleanup unexpectedly succeeded while the relation was locked'
fi
wait "$lock_holder_pid"
admin_psql -Atc "SELECT NOT rolcanlogin AND rolpassword IS NULL FROM pg_catalog.pg_authid WHERE rolname = '$role_name'" | grep -qx t || fail 'failed revocation did not commit the login/password cutoff'

# Normal revocation removes only setup-managed grants and preserves unrelated
# CREATE, TEMPORARY, and table SELECT privileges.
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-revoked.sql"
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_table_privilege('$role_name', 'public.ys_unrelated_permission_probe', 'SELECT')" | grep -qx t || fail 'revocation changed an unrelated permission'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_schema_privilege('$role_name', 'public', 'CREATE')" | grep -qx t || fail 'revocation changed an unrelated schema CREATE grant'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_database_privilege('$role_name', 'ys_sys_001_full', 'TEMPORARY')" | grep -qx t || fail 'revocation changed an unrelated database TEMPORARY grant'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_database_privilege('$role_name', 'ys_sys_001_full', 'CONNECT')" | grep -qx t || fail 'revocation unexpectedly removed inherited PUBLIC CONNECT'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_schema_privilege('$role_name', 'public', 'USAGE')" | grep -qx t || fail 'revocation unexpectedly removed inherited PUBLIC schema USAGE'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_column_privilege('$role_name', 'public.system_directory_entries', 'id', 'SELECT')" | grep -qx t || fail 'revocation unexpectedly removed inherited PUBLIC column SELECT'
if reader_psql ys_sys_001_full -c 'SELECT 1' >/dev/null 2>&1; then fail 'revoked full-schema reader still logged in'; fi

# Repeating the same revocation is safe and still preserves unrelated grants.
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/revoke-reader.sql"
admin_psql -d ys_sys_001_full -f "$repo_root/scripts/ys-sys-001-readonly-role/verify-revoked.sql"
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_table_privilege('$role_name', 'public.ys_unrelated_permission_probe', 'SELECT')" | grep -qx t || fail 'repeated revocation changed unrelated table SELECT'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_schema_privilege('$role_name', 'public', 'CREATE')" | grep -qx t || fail 'repeated revocation changed unrelated schema CREATE'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_database_privilege('$role_name', 'ys_sys_001_full', 'TEMPORARY')" | grep -qx t || fail 'repeated revocation changed unrelated database TEMPORARY'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_database_privilege('$role_name', 'ys_sys_001_full', 'CONNECT')" | grep -qx t || fail 'repeated revocation changed inherited PUBLIC CONNECT'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_schema_privilege('$role_name', 'public', 'USAGE')" | grep -qx t || fail 'repeated revocation changed inherited PUBLIC schema USAGE'
admin_psql -d ys_sys_001_full -Atc "SELECT pg_catalog.has_column_privilege('$role_name', 'public.system_directory_entries', 'id', 'SELECT')" | grep -qx t || fail 'repeated revocation changed inherited PUBLIC column SELECT'
admin_psql -d ys_sys_001_full -c "REVOKE SELECT ON public.ys_unrelated_permission_probe FROM $role_name; REVOKE CREATE ON SCHEMA public FROM $role_name; REVOKE TEMPORARY ON DATABASE ys_sys_001_full FROM $role_name"
admin_psql -d ys_sys_001_full -c 'REVOKE CONNECT ON DATABASE ys_sys_001_full FROM PUBLIC; REVOKE USAGE ON SCHEMA public FROM PUBLIC; REVOKE SELECT (id) ON public.system_directory_entries FROM PUBLIC'
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
