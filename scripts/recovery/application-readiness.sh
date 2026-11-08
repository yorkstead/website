#!/usr/bin/env bash
set -euo pipefail
umask 077
set +x

fail() { printf 'Application-recovery rehearsal failed: %s\n' "$1" >&2; exit 1; }

[[ "${CI:-}" == true && "${GITHUB_ACTIONS:-}" == true && -n "${GITHUB_WORKSPACE:-}" && -n "${RUNNER_TEMP:-}" ]] \
  || fail "dedicated GitHub Actions runner context is required"

# Never inherit database URLs, credentials, cloud keys, or provider configuration.
for name in $(compgen -e); do
  case "$name" in
    DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DIRECT_URL|DB_URL|PG*|NEON_*|VERCEL_*|AWS_*|R2_*|STRIPE_*|RESEND_*|SENDGRID_*|*_CONNECTION_STRING|*_PRIVATE_KEY|*_CREDENTIALS|*_TOKEN|*_SECRET)
      fail "unexpected inherited database or provider variable: $name";;
    PATH|HOME|PWD|SHLVL|_|CI|GITHUB_*|RUNNER_*|ACTIONS_*|BASH_ENV|GITHUB_ENV|GITHUB_PATH|GITHUB_OUTPUT|GITHUB_STEP_SUMMARY|TERM|LANG|LC_*) ;;
    *) fail "unexpected inherited variable: $name";;
  esac
done

for utility in docker bun curl openssl jq python3 sha256sum cut; do command -v "$utility" >/dev/null || fail "required utility is unavailable"; done
for env_file in .env .env.local .env.development .env.production .env.test; do
  [[ ! -e "$env_file" ]] || fail "workspace contains an environment file"
done
[[ -f scripts/recovery/application.Dockerfile && -f scripts/recovery/prepare-application-db.ts && -f scripts/recovery/verify-application-db.ts ]] || fail "recovery test sources are incomplete"

workspace="$(mktemp -d "${RUNNER_TEMP:-/tmp}/ys-app-recovery.XXXXXXXX")"
chmod 0700 "$workspace"
run_tag="$(openssl rand -hex 6)"
source_network="ys-app-recovery-source-net-${run_tag}"
runtime_network="ys-app-recovery-runtime-net-${run_tag}"
source_container="ys-app-recovery-source-${run_tag}"
target_container="ys-app-recovery-target-${run_tag}"
app_container="ys-app-recovery-web-${run_tag}"
proxy_container="ys-app-recovery-proxy-${run_tag}"
browser_container="ys-app-recovery-browser-${run_tag}"
app_image="ys-app-recovery:${run_tag}"
source_db="recovery_$(openssl rand -hex 12)"
admin_user="recovery_$(openssl rand -hex 8)"
admin_password="$(openssl rand -hex 32)"
app_user="recovery_app_$(openssl rand -hex 8)"
app_password="$(openssl rand -hex 32)"
owner_password="$(openssl rand -hex 24)"
owner_bootstrap="$(openssl rand -hex 32)"
auth_secret="$(openssl rand -hex 32)"
source_port=''
target_port=''
started_epoch="$(date -u +%s)"
started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
schema_started_epoch=''
schema_finished_epoch=''
restore_started_epoch=''
restore_finished_epoch=''
app_started_epoch=''
app_started_utc=''
ready_epoch=''
ready_utc=''
tests_started_epoch=''
tests_started_utc=''
tests_finished_epoch=''
tests_finished_utc=''

for secret in "$admin_user" "$admin_password" "$app_user" "$app_password" "$owner_password" "$owner_bootstrap" "$auth_secret"; do printf '::add-mask::%s\n' "$secret"; done

cleanup() {
  status=$?
  set +e
  docker rm -f "$browser_container" "$proxy_container" "$app_container" "$target_container" "$source_container" >/dev/null 2>&1
  docker network rm "$runtime_network" >/dev/null 2>&1
  docker network rm "$source_network" >/dev/null 2>&1
  docker image rm "$app_image" >/dev/null 2>&1
  rm -rf -- "$workspace"
  if [[ $status -ne 0 ]]; then printf 'Application-recovery rehearsal status: FAIL (private runtime diagnostics suppressed).\n' >&2; fi
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

docker pull postgres:18-alpine >/dev/null
docker pull nginx:1.27-alpine >/dev/null
docker pull mcr.microsoft.com/playwright:v1.62.1-noble >/dev/null
docker network create --internal "$source_network" >/dev/null
docker network create --internal "$runtime_network" >/dev/null
[[ "$(docker network inspect -f '{{.Internal}}' "$source_network")" == true \
  && "$(docker network inspect -f '{{.Internal}}' "$runtime_network")" == true ]] \
  || fail "Docker did not create both internal-only networks"

docker run -d --rm --name "$source_container" --network "$source_network" --network-alias ys-app-recovery-source \
  --health-cmd="pg_isready -U $admin_user -d $source_db" \
  --health-interval=2s --health-timeout=2s --health-retries=30 \
  -e POSTGRES_USER="$admin_user" -e POSTGRES_PASSWORD="$admin_password" -e POSTGRES_DB="$source_db" \
  --log-driver=none postgres:18-alpine >/dev/null
docker run -d --rm --name "$target_container" --network "$runtime_network" --network-alias ys-app-recovery-target \
  --health-cmd="pg_isready -U $admin_user -d postgres" \
  --health-interval=2s --health-timeout=2s --health-retries=30 \
  -e POSTGRES_USER="$admin_user" -e POSTGRES_PASSWORD="$admin_password" -e POSTGRES_DB=postgres \
  --log-driver=none postgres:18-alpine >/dev/null

source_attached="$(docker network inspect -f '{{range $id, $container := .Containers}}{{println $container.Name}}{{end}}' "$source_network")"
[[ "$source_attached" == "$source_container" ]] || fail "synthetic source network contains an unexpected container"

source_ip="$(docker inspect -f "{{(index .NetworkSettings.Networks \"$source_network\").IPAddress}}" "$source_container")"
target_ip="$(docker inspect -f "{{(index .NetworkSettings.Networks \"$runtime_network\").IPAddress}}" "$target_container")"
source_subnet="$(docker network inspect -f '{{(index .IPAM.Config 0).Subnet}}' "$source_network")"
target_subnet="$(docker network inspect -f '{{(index .IPAM.Config 0).Subnet}}' "$runtime_network")"
python3 -c 'import ipaddress,sys; net=ipaddress.ip_network(sys.argv[2], strict=False); assert net.is_private and ipaddress.ip_address(sys.argv[1]) in net' "$source_ip" "$source_subnet" \
  || fail "synthetic source container is outside its internal subnet"
python3 -c 'import ipaddress,sys; net=ipaddress.ip_network(sys.argv[2], strict=False); assert net.is_private and ipaddress.ip_address(sys.argv[1]) in net' "$target_ip" "$target_subnet" \
  || fail "restored target is outside its internal subnet"

for attempt in $(seq 1 60); do
  if docker exec "$source_container" pg_isready -U "$admin_user" -d "$source_db" >/dev/null 2>&1 \
    && docker exec "$target_container" pg_isready -U "$admin_user" -d postgres >/dev/null 2>&1; then break; fi
  [[ $attempt -lt 60 ]] || fail "disposable PostgreSQL 18 did not become ready"
  sleep 1
done
source_port=5432
target_port=5432

schema_started_epoch="$(date -u +%s)"
env -i PATH="$PATH" HOME="$HOME" CI=true GITHUB_ACTIONS=true YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 \
  YS_APP_RECOVERY_DB_HOST="$source_ip" YS_APP_RECOVERY_DB_PORT="$source_port" \
  YS_APP_RECOVERY_DB_USER="$admin_user" YS_APP_RECOVERY_DB_PASSWORD="$admin_password" \
  YS_APP_RECOVERY_DB_NAME="$source_db" bun scripts/recovery/prepare-application-db.ts >/dev/null \
  || fail "synthetic source schema preparation failed"

source_url="postgresql://${admin_user}:${admin_password}@${source_ip}:${source_port}/${source_db}"
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=development DATABASE_URL="$source_url" bun run auth:migrate \
  >"$workspace/auth-migrate.log" 2>&1 || fail "synthetic Better Auth schema preparation failed"
unset source_url
schema_finished_epoch="$(date -u +%s)"

archive="$workspace/synthetic-source.dump"
restore_started_epoch="$(date -u +%s)"
docker exec -e PGPASSWORD="$admin_password" "$source_container" pg_dump -w -U "$admin_user" -d "$source_db" -Fc \
  >"$archive" 2>"$workspace/pg-dump.log" || fail "synthetic custom-format archive creation failed"
[[ -s "$archive" ]] || fail "synthetic archive is empty"
chmod 0600 "$archive"
docker exec -i -e PGPASSWORD="$admin_password" "$target_container" pg_restore --create --exit-on-error -w -U "$admin_user" -d postgres \
  <"$archive" >"$workspace/pg-restore.log" 2>&1 || fail "synthetic restore to fresh PostgreSQL 18 failed"
rm -f -- "$archive" "$workspace/pg-dump.log" "$workspace/pg-restore.log" "$workspace/auth-migrate.log"
restore_finished_epoch="$(date -u +%s)"

if ! env -i PATH="$PATH" HOME="$HOME" CI=true GITHUB_ACTIONS=true YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 YS_APP_RECOVERY_PHASE=before \
  YS_APP_RECOVERY_DB_HOST="$target_ip" YS_APP_RECOVERY_DB_PORT="$target_port" \
  YS_APP_RECOVERY_DB_USER="$admin_user" YS_APP_RECOVERY_DB_PASSWORD="$admin_password" \
  YS_APP_RECOVERY_DB_NAME="$source_db" bun scripts/recovery/verify-application-db.ts >"$workspace/before.json"; then
  failed_checks="$(jq -r 'to_entries | map(select(.value == "FAIL") | .key) | join(", ")' "$workspace/before.json" 2>/dev/null || true)"
  [[ -z "$failed_checks" ]] || fail "restored database preflight checks failed: $failed_checks"
  fail "restored database preflight could not complete; see the sanitized connection/query category above"
fi

# The synthetic administrator owns schema preparation, migration execution,
# and restore. The app role gets reads for current application query paths,
# but writes only to tables actually mutated by application SQL. Audit tables
# receive INSERT only where application triggers write append-only history;
# migration ledgers stay outside every write allowlist. The listed sequences
# are consumed by application INSERTs and those same audit triggers.
docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
  -U "$admin_user" -d "$source_db" -c "REVOKE TEMPORARY ON DATABASE ${source_db} FROM PUBLIC; CREATE ROLE ${app_user} LOGIN PASSWORD '${app_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; GRANT CONNECT ON DATABASE ${source_db} TO ${app_user}; GRANT USAGE ON SCHEMA public, customer_auth TO ${app_user}; GRANT SELECT ON ALL TABLES IN SCHEMA public, customer_auth TO ${app_user};" \
  >/dev/null 2>&1 || fail "least-privilege synthetic application role setup failed"

for table in \
  client_invitation_preparations client_project_publications consultations contact_inquiries conversion_events crm_proposals \
  customer_enrollment_challenges customer_enrollment_limits customer_identities customer_invitation_projects customer_invitations \
  customer_mail_custody customer_mail_events customer_mail_jobs customer_mail_suppressions customer_project_grants \
  customer_recovery_challenges customer_tenant_memberships customer_tenant_projects customer_tenants \
  customer_provisioning_audit customer_mail_audit client_access_admin_audit client_project_publication_audit \
  document_approval_requests document_audit_events document_registry document_versions marketing_workspaces morning_briefings opportunity_evidence \
  opportunity_history opportunity_interviews portal_release_audit portal_release_evidence portal_release_reviews push_subscriptions research_opportunities \
  system_directory_entries system_directory_audit workspace_snapshots workspaces; do
  docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
    -U "$admin_user" -d "$source_db" -c "GRANT INSERT ON TABLE public.${table} TO ${app_user}" \
    >/dev/null 2>&1 || fail "least-privilege synthetic application INSERT grant failed for ${table}"
done
for table in \
  client_project_publications consultations contact_inquiries crm_proposals customer_enrollment_challenges customer_invitations \
  customer_enrollment_limits customer_mail_jobs customer_project_grants customer_recovery_challenges customer_tenant_memberships customer_tenant_projects \
  customer_tenants document_approval_requests document_registry marketing_workspaces morning_briefings opportunity_interviews \
  portal_release_reviews research_opportunities system_directory_entries workspaces; do
  docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
    -U "$admin_user" -d "$source_db" -c "GRANT UPDATE ON TABLE public.${table} TO ${app_user}" \
    >/dev/null 2>&1 || fail "least-privilege synthetic application UPDATE grant failed for ${table}"
done
for table in consultations contact_inquiries conversion_events customer_mail_custody morning_briefings push_subscriptions research_opportunities workspace_snapshots; do
  docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
    -U "$admin_user" -d "$source_db" -c "GRANT DELETE ON TABLE public.${table} TO ${app_user}" \
    >/dev/null 2>&1 || fail "least-privilege synthetic application DELETE grant failed"
done
for table in '"user"' '"account"' '"session"' '"verification"'; do
  docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
    -U "$admin_user" -d "$source_db" -c "GRANT INSERT, UPDATE, DELETE ON TABLE customer_auth.${table} TO ${app_user}" \
    >/dev/null 2>&1 || fail "least-privilege synthetic authentication grant failed"
done
for table in '"user"' '"account"' '"session"' '"verification"'; do
  docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
    -U "$admin_user" -d "$source_db" -c "GRANT INSERT, UPDATE, DELETE ON TABLE public.${table} TO ${app_user}" \
    >/dev/null 2>&1 || fail "least-privilege synthetic owner-authentication grant failed"
done
for sequence in workspace_snapshots_id_seq contact_inquiries_id_seq conversion_events_id_seq opportunity_history_id_seq portal_release_evidence_id_seq \
  client_project_publication_audit_id_seq client_access_admin_audit_id_seq document_audit_events_id_seq portal_release_audit_id_seq \
  system_directory_audit_id_seq customer_mail_audit_id_seq; do
  docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
    -U "$admin_user" -d "$source_db" -c "GRANT USAGE ON SEQUENCE public.${sequence} TO ${app_user}" \
    >/dev/null 2>&1 || fail "least-privilege synthetic sequence grant failed"
done

runtime_role_ok="$(docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -At -v ON_ERROR_STOP=1 \
  -U "$admin_user" -d "$source_db" -c "SELECT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolcreatedb AND NOT r.rolcreaterole AND NOT r.rolreplication AND NOT r.rolbypassrls AND NOT has_database_privilege(r.rolname, current_database(), 'CREATE') AND NOT has_database_privilege(r.rolname, current_database(), 'TEMPORARY') AND has_database_privilege(r.rolname, current_database(), 'CONNECT') AND (SELECT d.datdba <> r.oid FROM pg_database d WHERE d.datname=current_database()) AND has_schema_privilege(r.rolname, 'public', 'USAGE') AND NOT has_schema_privilege(r.rolname, 'public', 'CREATE') AND has_schema_privilege(r.rolname, 'customer_auth', 'USAGE') AND NOT has_schema_privilege(r.rolname, 'customer_auth', 'CREATE') AND NOT EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('public','customer_auth') AND n.nspowner=r.oid) AND has_table_privilege(r.rolname, 'public.application_migrations', 'SELECT') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'INSERT') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'UPDATE') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'DELETE') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'TRUNCATE') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'REFERENCES') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'TRIGGER') AND (SELECT c.relowner <> r.oid FROM pg_class c WHERE c.oid='public.application_migrations'::regclass) AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relkind IN ('r','p','v','m','S') AND c.relnamespace NOT IN ('pg_catalog'::regnamespace, 'information_schema'::regnamespace) AND c.relowner=r.oid) AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AND NOT pg_has_role(r.rolname, '${admin_user}', 'MEMBER') AND NOT has_table_privilege(r.rolname, 'public.application_migrations', 'SELECT WITH GRANT OPTION') AND NOT has_sequence_privilege(r.rolname, 'public.workspace_snapshots_id_seq', 'USAGE WITH GRANT OPTION') FROM pg_roles r WHERE r.rolname = '${app_user}'")"
[[ "$runtime_role_ok" == t ]] || fail "least-privilege synthetic application role verification failed"

runtime_identity="$(docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -At -v ON_ERROR_STOP=1 \
  -U "$app_user" -d "$source_db" -c "SELECT current_user = '${app_user}' AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls FROM pg_roles WHERE rolname = current_user")"
[[ "$runtime_identity" == t ]] || fail "synthetic application login is not a non-superuser runtime role"

# Assert that no non-allowlisted relation receives DML and no sequence receives
# UPDATE. A fresh administrator-owned probe sequence provides a real denied
# nextval check without touching application data.
dml_allowlist="'client_access_admin_audit','client_invitation_preparations','client_project_publication_audit','client_project_publications','consultations','contact_inquiries','conversion_events','crm_proposals','customer_enrollment_challenges','customer_enrollment_limits','customer_identities','customer_invitation_projects','customer_invitations','customer_mail_audit','customer_mail_custody','customer_mail_events','customer_mail_jobs','customer_mail_suppressions','customer_project_grants','customer_provisioning_audit','customer_recovery_challenges','customer_tenant_memberships','customer_tenant_projects','customer_tenants','document_approval_requests','document_audit_events','document_registry','document_versions','marketing_workspaces','morning_briefings','opportunity_evidence','opportunity_history','opportunity_interviews','portal_release_audit','portal_release_evidence','portal_release_reviews','push_subscriptions','research_opportunities','system_directory_audit','system_directory_entries','workspace_snapshots','workspaces','account','session','user','verification'"
grant_audit="$(docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -At -v ON_ERROR_STOP=1 \
  -U "$admin_user" -d "$source_db" -c "SELECT NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']::text[]) p(priv) WHERE c.relkind IN ('r','p','v','m') AND n.nspname IN ('public','customer_auth') AND has_table_privilege('${app_user}', c.oid, p.priv) AND NOT (n.nspname='public' AND c.relname IN (${dml_allowlist}) AND ((p.priv='INSERT') OR (p.priv='UPDATE' AND c.relname IN ('client_project_publications','consultations','contact_inquiries','crm_proposals','customer_enrollment_challenges','customer_enrollment_limits','customer_invitations','customer_mail_jobs','customer_project_grants','customer_recovery_challenges','customer_tenant_memberships','customer_tenant_projects','customer_tenants','document_approval_requests','document_registry','marketing_workspaces','morning_briefings','opportunity_interviews','portal_release_reviews','research_opportunities','system_directory_entries','workspaces','account','session','user','verification')) OR (p.priv='DELETE' AND c.relname IN ('consultations','contact_inquiries','conversion_events','customer_mail_custody','morning_briefings','push_subscriptions','research_opportunities','workspace_snapshots','account','session','user','verification')))) AND NOT (n.nspname='customer_auth' AND c.relname IN ('account','session','user','verification') AND p.priv IN ('INSERT','UPDATE','DELETE'))) AND NOT EXISTS (SELECT 1 FROM pg_sequences s WHERE s.schemaname IN ('public','customer_auth') AND has_sequence_privilege('${app_user}', format('%I.%I',s.schemaname,s.sequencename), 'UPDATE'))")"
[[ "$grant_audit" == t ]] || fail "synthetic application role has an unapproved table or sequence privilege"
sequence_audit="$(docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -At -v ON_ERROR_STOP=1 \
  -U "$admin_user" -d "$source_db" -c "SELECT NOT EXISTS (SELECT 1 FROM pg_sequences s WHERE s.schemaname IN ('public','customer_auth') AND (has_sequence_privilege('${app_user}',format('%I.%I',s.schemaname,s.sequencename),'SELECT') OR (has_sequence_privilege('${app_user}',format('%I.%I',s.schemaname,s.sequencename),'USAGE') AND NOT (s.schemaname='public' AND s.sequencename IN ('workspace_snapshots_id_seq','contact_inquiries_id_seq','conversion_events_id_seq','opportunity_history_id_seq','portal_release_evidence_id_seq','client_project_publication_audit_id_seq','client_access_admin_audit_id_seq','document_audit_events_id_seq','portal_release_audit_id_seq','system_directory_audit_id_seq','customer_mail_audit_id_seq'))))) AND NOT EXISTS (SELECT 1 FROM unnest(ARRAY['workspace_snapshots_id_seq','contact_inquiries_id_seq','conversion_events_id_seq','opportunity_history_id_seq','portal_release_evidence_id_seq','client_project_publication_audit_id_seq','client_access_admin_audit_id_seq','document_audit_events_id_seq','portal_release_audit_id_seq','system_directory_audit_id_seq','customer_mail_audit_id_seq']) s(name) WHERE NOT has_sequence_privilege('${app_user}',format('public.%I',s.name),'USAGE'))")"
[[ "$sequence_audit" == t ]] || fail "synthetic application sequence privileges differ from the application INSERT allowlist"
grant_option_audit="$(docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -At -v ON_ERROR_STOP=1 \
  -U "$admin_user" -d "$source_db" -c "SELECT NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']::text[]) p(priv) WHERE c.relkind IN ('r','p','v','m') AND n.nspname IN ('public','customer_auth') AND has_table_privilege('${app_user}',c.oid,p.priv || ' WITH GRANT OPTION')) AND NOT EXISTS (SELECT 1 FROM pg_sequences s CROSS JOIN LATERAL unnest(ARRAY['USAGE','SELECT','UPDATE']::text[]) p(priv) WHERE s.schemaname IN ('public','customer_auth') AND has_sequence_privilege('${app_user}',format('%I.%I',s.schemaname,s.sequencename),p.priv || ' WITH GRANT OPTION'))")"
[[ "$grant_option_audit" == t ]] || fail "synthetic application role has an unexpected grant option"

probe_sequence="ys_sys_001_runtime_denied_${run_tag}"
docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$admin_user" -d "$source_db" \
  -c "CREATE SEQUENCE public.${probe_sequence}" >/dev/null 2>&1 || fail "synthetic sequence denial probe setup failed"
for control in create_schema alter_schema create_role set_admin_role; do
  case "$control" in
    create_schema) operation="BEGIN; CREATE SCHEMA ys_sys_001_runtime_schema_probe; ROLLBACK" ;;
    alter_schema) operation="BEGIN; ALTER SCHEMA public RENAME TO ys_sys_001_runtime_schema_probe; ROLLBACK" ;;
    create_role) operation="BEGIN; CREATE ROLE ys_sys_001_runtime_role_probe; ROLLBACK" ;;
    set_admin_role) operation="BEGIN; SET ROLE ${admin_user}; ROLLBACK" ;;
  esac
  if docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$app_user" -d "$source_db" -c "$operation" >/dev/null 2>&1; then
    fail "synthetic application role passed the denied ${control} privilege check"
  fi
done
self_grant_result="$(docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -qAt -v ON_ERROR_STOP=1 \
  -U "$app_user" -d "$source_db" -c "BEGIN; GRANT INSERT ON public.application_migrations TO ${app_user}; SELECT has_table_privilege(current_user, 'public.application_migrations', 'INSERT'); ROLLBACK" 2>/dev/null || true)"
[[ "$self_grant_result" != t ]] || fail "synthetic application role granted itself INSERT on the migration ledger"
for operation in \
  "BEGIN; INSERT INTO public.application_migrations(version,name,checksum) VALUES('9999','privilege_probe',repeat('0',64)); ROLLBACK" \
  "BEGIN; UPDATE public.application_migrations SET name=name WHERE false; ROLLBACK" \
  "BEGIN; DELETE FROM public.application_migrations WHERE false; ROLLBACK" \
  "BEGIN; TRUNCATE public.application_migrations; ROLLBACK"; do
  if docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$app_user" -d "$source_db" -c "$operation" >/dev/null 2>&1; then
    fail "synthetic application role unexpectedly modified migration history"
  fi
done
if docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$app_user" -d "$source_db" \
  -c "SELECT nextval('public.${probe_sequence}'::regclass)" >/dev/null 2>&1; then
  fail "synthetic application role unexpectedly used an unauthorized sequence"
fi
if docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$app_user" -d "$source_db" \
  -c "SELECT setval('public.workspace_snapshots_id_seq', 1)" >/dev/null 2>&1; then
  fail "synthetic application role unexpectedly updated an application sequence"
fi
docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$app_user" -d "$source_db" \
  -c "SELECT nextval('public.workspace_snapshots_id_seq')" >/dev/null 2>&1 \
  || fail "synthetic application role cannot use a sequence required by an application INSERT"
docker exec -e PGPASSWORD="$admin_password" "$target_container" psql -X -v ON_ERROR_STOP=1 -U "$admin_user" -d "$source_db" \
  -c "DROP SEQUENCE public.${probe_sequence}" >/dev/null 2>&1 || fail "synthetic sequence denial probe cleanup failed"
if docker exec -e PGPASSWORD="$app_password" "$target_container" psql -X -v ON_ERROR_STOP=1 \
  -U "$app_user" -d "$source_db" -c 'CREATE TABLE public.ys_sys_001_runtime_privilege_probe(id integer)' >/dev/null 2>&1; then
  fail "synthetic application role unexpectedly has schema creation privilege"
fi
app_url="postgresql://${app_user}:${app_password}@ys-app-recovery-target:5432/${source_db}"
target_url="postgresql://${app_user}:${app_password}@${target_ip}:${target_port}/${source_db}"

docker build --quiet --file scripts/recovery/application.Dockerfile --tag "$app_image" . >"$workspace/build.log" 2>&1 \
  || fail "production application image build failed"

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout "$workspace/key.pem" -out "$workspace/cert.pem" \
  -subj '/CN=recovery.test' -addext 'subjectAltName=DNS:recovery.test' >/dev/null 2>&1
chmod 0600 "$workspace/key.pem" "$workspace/cert.pem"
cp scripts/recovery/application-proxy.conf.template "$workspace/default.conf"
chmod 0644 "$workspace/default.conf"
# This disposable, self-signed key stays inside the mode-0700 workspace and is
# mounted only into the no-egress proxy; readable mode is needed with all caps dropped.
chmod 0644 "$workspace/key.pem" "$workspace/cert.pem"
openssl x509 -in "$workspace/cert.pem" -noout -checkhost recovery.test >/dev/null 2>&1 \
  || fail "synthetic TLS certificate hostname validation failed"
openssl pkey -in "$workspace/key.pem" -noout -check >/dev/null 2>&1 \
  || fail "synthetic TLS private key validation failed"
cert_public_key="$(openssl x509 -in "$workspace/cert.pem" -pubkey -noout | openssl pkey -pubin -outform DER 2>/dev/null | sha256sum | cut -d' ' -f1)"
key_public_key="$(openssl pkey -in "$workspace/key.pem" -pubout -outform DER 2>/dev/null | sha256sum | cut -d' ' -f1)"
[[ "$cert_public_key" == "$key_public_key" ]] || fail "synthetic TLS certificate and key do not match"

app_started_epoch="$(date -u +%s)"
app_started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker run -d --rm --name "$app_container" --network "$runtime_network" --network-alias ys-app-recovery-web \
  --read-only --user 10001:10001 --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777 \
  --tmpfs /app/.next/cache:rw,noexec,nosuid,nodev,size=128m,mode=700,uid=10001,gid=10001 \
  --log-driver=none \
  -e NODE_ENV=production -e DATABASE_URL="$app_url" \
  -e BETTER_AUTH_URL=https://recovery.test -e OWNER_EMAIL=owner@recovery.test -e PASSKEY_RP_ID=recovery.test \
  -e BETTER_AUTH_SECRET="$auth_secret" -e OWNER_BOOTSTRAP_TOKEN="$owner_bootstrap" \
  -e NEXT_PUBLIC_FIRST_PARTY_ANALYTICS=disabled -e YS_SYS_001_ENABLED=false -e NEXT_TELEMETRY_DISABLED=1 \
  -e HOSTNAME=0.0.0.0 -e PORT=3000 "$app_image" >/dev/null

# Probe egress from the actual application container on its independently
# inspected Docker-internal network. Using a one-off probe container here can
# leave a transient fifth endpoint attached during the exact-membership check.
egress_result="$(docker exec "$app_container" bun -e '
  const net = require("node:net");
  const socket = net.createConnection({ host: "1.1.1.1", port: 443 });
  const timer = setTimeout(() => { socket.destroy(); process.stdout.write("BLOCKED\n"); process.exit(0); }, 2500);
  socket.once("connect", () => { clearTimeout(timer); socket.destroy(); process.stderr.write("Unexpected external egress\n"); process.exit(1); });
  socket.once("error", () => { clearTimeout(timer); process.stdout.write("BLOCKED\n"); process.exit(0); });
' 2>/dev/null)" || fail "egress boundary probe errored"
[[ "$egress_result" == BLOCKED ]] || fail "the application container reached an external address"

if ! docker run --rm --network "$runtime_network" --read-only --user 101:101 --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /var/cache/nginx:rw,noexec,nosuid,nodev,size=16m,uid=101,gid=101,mode=755 \
  --tmpfs /var/run:rw,noexec,nosuid,nodev,size=2m,uid=101,gid=101,mode=755 \
  --volume "$workspace/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  --volume "$workspace/cert.pem:/etc/nginx/cert.pem:ro" --volume "$workspace/key.pem:/etc/nginx/key.pem:ro" \
  --log-driver=none nginx:1.27-alpine nginx -t >"$workspace/nginx-config-test.log" 2>&1; then
  if grep -q 'cannot load certificate\|BIO_new_file' "$workspace/nginx-config-test.log"; then
    proxy_config_failure="certificate file access"
  elif grep -q 'SSL_CTX_use_PrivateKey' "$workspace/nginx-config-test.log"; then
    proxy_config_failure="certificate/key pairing"
  elif grep -q 'host not found in upstream\|could not be resolved' "$workspace/nginx-config-test.log"; then
    proxy_config_failure="internal app DNS"
  elif grep -q 'Permission denied\|mkdir()' "$workspace/nginx-config-test.log"; then
    proxy_config_failure="container filesystem permissions"
  elif grep -q 'unknown directive\|directive is not allowed here\|unexpected' "$workspace/nginx-config-test.log"; then
    proxy_config_failure="proxy configuration syntax"
  else
    proxy_config_failure="unclassified proxy configuration"
  fi
  proxy_diagnostic="$(python3 - "$workspace/nginx-config-test.log" <<'PY'
import re
import sys

lines = open(sys.argv[1], encoding="utf-8", errors="replace").read().splitlines()
line = next((item for item in lines if "[emerg]" in item or "[alert]" in item), "Nginx rejected its proxy configuration")
line = re.sub(r'"[^"\n]*"', '"<path>"', line)
line = re.sub(r'(?<![A-Za-z0-9])/(?:[^\s:(),]+)', "<path>", line)
line = re.sub(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "<ip>", line)
line = re.sub(r"recovery\.test|ys-app-recovery-[A-Za-z0-9-]+", "<synthetic-name>", line)
line = re.sub(r"\b\d+#\d+\b", "<worker>", line)
print(line[:180])
PY
)"
  fail "synthetic HTTPS proxy validation failed ($proxy_config_failure; $proxy_diagnostic)"
fi

docker run -d --name "$proxy_container" --network "$runtime_network" --network-alias recovery.test \
  --read-only --user 101:101 --cap-drop=ALL --cap-add=NET_BIND_SERVICE --security-opt=no-new-privileges \
  --tmpfs /var/cache/nginx:rw,noexec,nosuid,nodev,size=16m,uid=101,gid=101,mode=755 \
  --tmpfs /var/run:rw,noexec,nosuid,nodev,size=2m,uid=101,gid=101,mode=755 \
  --volume "$workspace/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  --volume "$workspace/cert.pem:/etc/nginx/cert.pem:ro" --volume "$workspace/key.pem:/etc/nginx/key.pem:ro" \
  --log-driver=none nginx:1.27-alpine >/dev/null

docker run -d --rm --name "$browser_container" --network "$runtime_network" \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=128m,mode=1777 \
  --volume "$GITHUB_WORKSPACE:/workspace:ro" --workdir /workspace \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  --log-driver=none mcr.microsoft.com/playwright:v1.62.1-noble sleep infinity >/dev/null

code=000
for attempt in $(seq 1 90); do
  code="$(docker exec "$browser_container" node -e 'const https=require("node:https");let done=false;const out=(s)=>{if(!done){done=true;process.stdout.write(s)}};const req=https.get({hostname:"recovery.test",path:"/api/health",rejectUnauthorized:false,timeout:1500},res=>{out(String(res.statusCode));res.resume()});req.on("timeout",()=>{req.destroy();out("TIMEOUT")});req.on("error",e=>out(["ENOTFOUND","EAI_AGAIN"].includes(e.code)?"DNS_UNAVAILABLE":["ECONNREFUSED","EHOSTUNREACH","ENETUNREACH"].includes(e.code)?"TCP_UNAVAILABLE":String(e.code||"").startsWith("CERT_")?"TLS_ERROR":"PROBE_ERROR"))' 2>/dev/null || true)"
  code="${code:-000}"
  if [[ "$code" == 200 ]]; then ready_epoch="$(date -u +%s)"; ready_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; break; fi
  if [[ $attempt -eq 90 ]]; then
    app_health="$(docker exec "$app_container" bun -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>{process.stdout.write(String(r.status));process.exit(r.status===200?0:1)}).catch(()=>{process.stdout.write("unavailable");process.exit(1)})' 2>/dev/null || true)"
    app_health="${app_health:-unavailable}"
    proxy_state="$(docker inspect -f '{{.State.Status}}/{{.State.ExitCode}}' "$proxy_container" 2>/dev/null || printf missing)"
    browser_state="$(docker inspect -f '{{.State.Status}}/{{.State.ExitCode}}' "$browser_container" 2>/dev/null || printf missing)"
    fail "application readiness failed (direct HTTP ${app_health}; internal proxy ${code}; proxy container ${proxy_state}; browser container ${browser_state})"
  fi
  sleep 1
done

expected_attached="$(printf '%s\n' "$app_container" "$browser_container" "$proxy_container" "$target_container" | sort)"
attached=''
for attempt in $(seq 1 10); do
  attached="$(docker network inspect -f '{{range $id, $container := .Containers}}{{println $container.Name}}{{end}}' "$runtime_network" | sed '/^$/d' | sort)"
  [[ "$attached" == "$expected_attached" ]] && break
  sleep 1
done
if [[ "$attached" != "$expected_attached" ]]; then
  actual_count="$(printf '%s\n' "$attached" | sed '/^$/d' | wc -l | tr -d ' ' )"
  has_app=false; has_browser=false; has_proxy=false; has_target=false
  grep -Fxq "$app_container" <<<"$attached" && has_app=true
  grep -Fxq "$browser_container" <<<"$attached" && has_browser=true
  grep -Fxq "$proxy_container" <<<"$attached" && has_proxy=true
  grep -Fxq "$target_container" <<<"$attached" && has_target=true
  fail "runtime network membership mismatch (4 required; ${actual_count} attached; app=${has_app}, browser=${has_browser}, proxy=${has_proxy}, target=${has_target})"
fi
[[ "$(docker network inspect -f '{{.Internal}}' "$runtime_network")" == true \
  && "$(docker network inspect -f '{{.Internal}}' "$source_network")" == true ]] || fail "a rehearsal network is not internal"

tests_started_epoch="$(date -u +%s)"
tests_started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker exec -e CI=true -e YS_APP_RECOVERY_BASE_URL=https://recovery.test \
  -e YS_APP_RECOVERY_OWNER_EMAIL=owner@recovery.test -e YS_APP_RECOVERY_OWNER_PASSWORD="$owner_password" \
  -e YS_APP_RECOVERY_BOOTSTRAP_TOKEN="$owner_bootstrap" "$browser_container" \
  node /workspace/node_modules/@playwright/test/cli.js test -c playwright.ys-sys-001-recovery.config.ts \
  --reporter=json --output=/tmp/ys-app-recovery-playwright >"$workspace/playwright.json" 2>"$workspace/playwright.stderr" || {
    browser_stage="$(python3 - "$workspace/playwright.json" <<'PY'
import json
import re
import sys

try:
    report = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    print("report unavailable")
    raise SystemExit

def failed_steps(steps):
    for step in steps or []:
        if step.get("error") or step.get("status") in ("failed", "timedOut"):
            title = step.get("title", "")
            if title in {
                "restored schema supports synthetic owner authentication and legacy read workflows",
                "application health", "health endpoint", "synthetic owner registration",
                "synthetic owner sign-in", "owner authorization", "owner dashboard read",
                "legacy Directory read", "tenant selector denial", "anonymous Directory denial",
            } or re.fullmatch(r"synthetic owner (?:registration|sign-in) HTTP [1-5][0-9]{2}", title):
                yield title
        yield from failed_steps(step.get("steps"))

def walk(node):
    if isinstance(node, dict):
        yield from failed_steps(node.get("steps"))
        for key in ("suites", "specs", "tests", "results"):
            yield from walk(node.get(key))
    elif isinstance(node, list):
        for item in node:
            yield from walk(item)

found = list(walk(report.get("suites", [])))
print(", ".join(dict.fromkeys(found)) if found else "readiness assertion")
PY
    )"
    fail "synthetic owner/browser readiness failed at ${browser_stage}; private details suppressed"
  }
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=test TEST_DATABASE_URL="$target_url" \
  bun test tests/client-project-data-database.test.ts --reporter=junit --reporter-outfile="$workspace/tenant-tests.junit.xml" \
  >"$workspace/tenant-tests.log" 2>&1 || {
    failed_test_line="$(python3 - "$workspace/tenant-tests.junit.xml" <<'PY'
import sys
import re
import xml.etree.ElementTree as ET

try:
    root = ET.parse(sys.argv[1]).getroot()
except Exception:
    print("unavailable")
    raise SystemExit

lines = [
    re.findall(r"tests/client-project-data-database\.test\.ts:(\d+)", "".join(case.find("failure").itertext()))
    or [case.get("line", "")]
    for case in root.iter("testcase")
    if case.find("failure") is not None and case.get("file") == "tests/client-project-data-database.test.ts"
]
flat = list(dict.fromkeys(line for group in lines for line in group))
if flat and all(line.isdigit() for line in flat[:5]):
    print(",".join(flat[:5]))
else:
    print("unavailable")
PY
    )"
    printf 'Sanitized tenant integration failure test definition line(s): %s\n' "$failed_test_line" >&2
    fail "synthetic cross-tenant integration tests failed; private details suppressed"
  }
tests_finished_epoch="$(date -u +%s)"
tests_finished_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

env -i PATH="$PATH" HOME="$HOME" CI=true GITHUB_ACTIONS=true YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 YS_APP_RECOVERY_PHASE=after \
  YS_APP_RECOVERY_DB_HOST="$target_ip" YS_APP_RECOVERY_DB_PORT="$target_port" \
  YS_APP_RECOVERY_DB_USER="$admin_user" YS_APP_RECOVERY_DB_PASSWORD="$admin_password" \
  YS_APP_RECOVERY_DB_NAME="$source_db" bun scripts/recovery/verify-application-db.ts >"$workspace/after.json" \
  || fail "restored database postflight failed"

before_integrity="$(jq -c 'del(.phase)' "$workspace/before.json")"
after_integrity="$(jq -c 'del(.phase)' "$workspace/after.json")"
[[ "$before_integrity" == "$after_integrity" ]] || fail "database integrity summary changed during readiness tests"

ended_epoch="$(date -u +%s)"
ended_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
startup_seconds=$((ready_epoch-app_started_epoch))
test_seconds=$((tests_finished_epoch-ready_epoch))
schema_seconds=$((schema_finished_epoch-schema_started_epoch))
restore_seconds=$((restore_finished_epoch-restore_started_epoch))
total_seconds=$((ended_epoch-started_epoch))
mkdir -p "${GITHUB_WORKSPACE:-.}/artifacts"
report_path="${GITHUB_WORKSPACE:-.}/artifacts/ys-sys-001-application-recovery.json"
jq -n \
  --arg startedAt "$started_utc" --arg endedAt "$ended_utc" --arg appStartedAt "$app_started_utc" --arg readyAt "$ready_utc" \
  --arg testsStartedAt "$tests_started_utc" --arg testsFinishedAt "$tests_finished_utc" \
  --argjson schemaSeconds "$schema_seconds" --argjson restoreSeconds "$restore_seconds" \
  --argjson startupSeconds "$startup_seconds" --argjson testSeconds "$test_seconds" --argjson totalSeconds "$total_seconds" \
  --argjson before "$(cat "$workspace/before.json")" --argjson after "$(cat "$workspace/after.json")" \
  '{format:"ys-sys-001-application-recovery-v1",dataClass:"synthetic-only",startedAt:$startedAt,appStartedAt:$appStartedAt,readyAt:$readyAt,testsStartedAt:$testsStartedAt,testsFinishedAt:$testsFinishedAt,endedAt:$endedAt,postgres18Restore:"PASS",internalDockerNetworks:{syntheticSource:"internal",restoredRuntime:"internal",runtimeMembership:"PASS",externalTcpProbe:"BLOCKED"},databaseRoles:{administration:"synthetic-only",runtimeNonSuperuser:"PASS",runtimeNoDatabaseOrSchemaCreation:"PASS"},productionAppStartup:"PASS",syntheticOwnerAuth:"PASS",ownerAuthorization:"PASS",dashboardRead:"PASS",legacyDirectoryRead:"PASS",anonymousDirectoryDenied:"PASS",tenantIsolation:"PASS",registryFeatureFlag:"OFF",externalSideEffects:"disabled-or-unreachable",migrations0023And0024:"NOT APPLIED",databaseIntegrityBefore:$before,databaseIntegrityAfter:$after,durationsSeconds:{schemaPreparation:$schemaSeconds,archiveAndRestore:$restoreSeconds,appStartupToReady:$startupSeconds,readinessChecks:$testSeconds,totalSyntheticRehearsal:$totalSeconds},fullProductionRto:"NOT DEMONSTRATED"}' \
  >"$report_path"
chmod 0600 "$report_path"

printf 'Synthetic app recovery: PASS; PostgreSQL 18 restore, non-superuser application role, owner dashboard, tenant denial, and egress isolation verified.\n'
printf 'Readiness report: artifacts/ys-sys-001-application-recovery.json (aggregate data only).\n'
printf 'Elapsed synthetic rehearsal seconds: %s. Full Production-derived 60-minute RTO: NOT DEMONSTRATED.\n' "$total_seconds"
