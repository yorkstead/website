#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
set +x

fail() { printf 'Private rehearsal failed: %s\n' "$1" >&2; exit 1; }
[[ $# == 1 && -f $1 && ! -L $1 ]] || fail 'one private config file is required'
config=$(realpath -e -- "$1")
[[ $(stat -c '%a:%u' "$config") == "600:$(id -u)" ]] || fail 'config must be owned by the operator and mode 0600'
script_path=$(realpath -e -- "$0")
# Trusted owner-authored config; never source an archive-provided file.
source "$config"
set -Eeuo pipefail
set +x
umask 077
for key in YS_PRIVATE_DOCKER_CONTEXT YS_PRIVATE_WORKSPACE_ROOT YS_PRIVATE_ARTIFACT YS_PRIVATE_AGE_IDENTITY YS_PRIVATE_POSTGRES_IMAGE YS_PRIVATE_NGINX_IMAGE YS_PRIVATE_APP_REPOSITORY YS_PRIVATE_APP_REVISION YS_PRIVATE_OWNER_CONFIRM; do
  [[ -n ${!key:-} ]] || fail "missing config value: $key"
done
fault=${YS_PRIVATE_TEST_FAULT:-}
if [[ -n $fault ]]; then
  [[ ${YS_PRIVATE_SYNTHETIC_FIXTURE:-} == true && $(basename "$YS_PRIVATE_ARTIFACT") == ys-sys-001-synthetic-* ]] || fail 'fault injection is allowed only with an explicitly synthetic fixture'
  [[ $fault =~ ^(restore|preparation|application-startup|browser|integrity|interrupt-int|interrupt-term|cleanup)$ ]] || fail 'unknown synthetic fault injection stage'
fi
[[ $YS_PRIVATE_APP_REVISION == 6fba1dd297067f7c3af219d2ffdec18006274c53 ]] || fail 'application revision must be the approved SHA'
[[ $YS_PRIVATE_POSTGRES_IMAGE =~ ^postgres:18\.6-alpine@sha256:[a-f0-9]{64}$ ]] || fail 'PostgreSQL 18.6 image digest is required'
if [[ ${YS_PRIVATE_TEST_ALLOW_NON_WSL:-} == true ]]; then
  [[ ${CI:-} == true && ${GITHUB_ACTIONS:-} == true && ${YS_PRIVATE_SYNTHETIC_FIXTURE:-} == true \
    && $(basename "$YS_PRIVATE_ARTIFACT") == ys-sys-001-synthetic-* ]] \
    || fail 'non-WSL execution is restricted to the isolated synthetic GitHub Actions fixture'
else
  [[ $(uname -s) == Linux ]] && grep -qiE '(microsoft|wsl)' /proc/version || fail 'ThinkPad WSL is required'
fi
for tool in docker age git openssl python3 sha256sum bun realpath; do command -v "$tool" >/dev/null || fail "missing tool: $tool"; done
[[ $YS_PRIVATE_APP_REVISION == 6fba1dd297067f7c3af219d2ffdec18006274c53 ]] || fail 'application revision must be the approved SHA'
[[ $YS_PRIVATE_POSTGRES_IMAGE =~ ^postgres:18\.6-alpine@sha256:[a-f0-9]{64}$ ]] || fail 'PostgreSQL 18.6 image digest is required'
[[ $YS_PRIVATE_NGINX_IMAGE =~ ^nginx:alpine@sha256:[a-f0-9]{64}$ ]] || fail 'pinned TLS proxy image digest is required'
[[ $YS_PRIVATE_OWNER_CONFIRM == 'YS-SYS-001 APPROVE PRIVATE DISPOSABLE REHEARSAL' ]] || fail 'explicit owner confirmation is required'
[[ $(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" context show) == "$YS_PRIVATE_DOCKER_CONTEXT" ]] || fail 'Docker context mismatch'
docker_endpoint=$(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" context inspect --format '{{ (index .Endpoints "docker").Host }}' "$YS_PRIVATE_DOCKER_CONTEXT") || fail 'explicit Docker context could not be inspected'
[[ $docker_endpoint == unix://* ]] || fail 'local Unix-socket Docker context is required to keep artifact bytes on this WSL host'
[[ $(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" info --format '{{.OSType}}') == linux ]] || fail 'Linux Docker daemon is required'
[[ -d $YS_PRIVATE_WORKSPACE_ROOT && ! -L $YS_PRIVATE_WORKSPACE_ROOT && $(stat -c '%a:%u' "$YS_PRIVATE_WORKSPACE_ROOT") == "700:$(id -u)" ]] || fail 'owner-designated private workspace root must be operator-owned and mode 0700'
docker --context "$YS_PRIVATE_DOCKER_CONTEXT" image inspect "$YS_PRIVATE_POSTGRES_IMAGE" >/dev/null 2>&1 || fail 'pinned PostgreSQL image must already be present locally'
docker --context "$YS_PRIVATE_DOCKER_CONTEXT" image inspect "$YS_PRIVATE_NGINX_IMAGE" >/dev/null 2>&1 || fail 'pinned proxy image must already be present locally'
repo=$(git -C "$(dirname "$script_path")/../.." rev-parse --show-toplevel)
repo=$(realpath -e -- "$repo")
case "$config/" in "$repo/"*) fail 'private rehearsal config must remain outside the repository' ;; esac
YS_PRIVATE_WORKSPACE_ROOT=$(realpath -e -- "$YS_PRIVATE_WORKSPACE_ROOT")
case "$YS_PRIVATE_WORKSPACE_ROOT/" in "$repo/"*) fail 'private workspace must remain outside the repository' ;; esac
[[ -z $(git -C "$repo" status --porcelain --untracked-files=all) ]] || fail 'reviewed recovery worktree must be clean before the run'
recovery_revision=$(git -C "$repo" rev-parse HEAD)
git -C "$YS_PRIVATE_APP_REPOSITORY" cat-file -e "$YS_PRIVATE_APP_REVISION^{commit}" 2>/dev/null || fail 'pinned app commit is unavailable locally'
app_remote=$(git -C "$YS_PRIVATE_APP_REPOSITORY" remote get-url origin 2>/dev/null || true)
[[ $app_remote == https://github.com/yorkstead/website.git || $app_remote == git@github.com:yorkstead/website.git ]] || fail 'application repository origin is not the approved Yorkstead website'

target_id=$(openssl rand -hex 12)
prefix="ys-sys-001-${target_id}-"
net="${prefix}network"; vol="${prefix}volume"; db_container="${prefix}postgres"
app_container="${prefix}app"; proxy_container="${prefix}proxy"; browser_container="${prefix}browser"
db_name="ys_sys_001_${target_id}"; setup_role="ys_sys_setup_${target_id:0:12}"; runtime_role="ys_sys_runtime_${target_id:0:12}"
for kind in containers networks volumes images; do
  case "$kind" in
    containers) existing=$(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" ps -aq --filter "label=ys-sys-001.target=$target_id") || fail 'Docker container inventory failed' ;;
    networks) existing=$(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" network ls -q --filter "label=ys-sys-001.target=$target_id") || fail 'Docker network inventory failed' ;;
    volumes) existing=$(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" volume ls -q --filter "label=ys-sys-001.target=$target_id") || fail 'Docker volume inventory failed' ;;
    images) existing=$(docker --context "$YS_PRIVATE_DOCKER_CONTEXT" image ls -q --filter "label=ys-sys-001.target=$target_id") || fail 'Docker image inventory failed' ;;
  esac
  [[ -z $existing ]] || fail 'generated target ID already labels a Docker resource'
done
admin_password=$(openssl rand -hex 32); setup_password=$(openssl rand -hex 32); runtime_password=$(openssl rand -hex 32)
owner_password=$(openssl rand -hex 24); auth_secret=$(openssl rand -hex 32)
for secret in "$admin_password" "$setup_password" "$runtime_password" "$owner_password" "$auth_secret"; do printf '::add-mask::%s\n' "$secret"; done
workspace=$(mktemp -d "$YS_PRIVATE_WORKSPACE_ROOT/ys-sys-001-${target_id}.XXXXXXXX"); chmod 700 "$workspace"
mkdir -m 700 "$workspace/plaintext" "$workspace/secrets" "$workspace/tls" "$workspace/app-source" "$workspace/runner-source"
trap 'status=$?; rm -rf -- "$workspace/plaintext" "$workspace/secrets" "$workspace/tls" "$workspace/app-source" "$workspace/runner-source"; exit "$status"' EXIT
printf 'Private rehearsal workspace: %s\n' "$workspace"

state="$workspace/rto.json"
report="$workspace/verification.json"
artifact_recorded=0
ready=0
artifact_sha_expected=${YS_PRIVATE_ARTIFACT_SHA256:-}
[[ $artifact_sha_expected =~ ^[a-f0-9]{64}$ ]] || fail 'owner-approved artifact SHA-256 is required in the private config'
[[ -n ${YS_PRIVATE_NGINX_IMAGE:-} && $YS_PRIVATE_NGINX_IMAGE =~ ^nginx:alpine@sha256:[a-f0-9]{64}$ ]] || fail 'pinned TLS proxy image digest is required'
[[ -n ${YS_PRIVATE_ARTIFACT_FORMAT:-} && $YS_PRIVATE_ARTIFACT_FORMAT == custom ]] || fail 'approved custom-format PostgreSQL archive must be configured'
# T0 precedes hashing or reading any artifact bytes.
python3 "$repo/scripts/recovery/private-rehearsal-clock.py" start --state "$state" >"$workspace/t0.json"
[[ -f $YS_PRIVATE_ARTIFACT && ! -L $YS_PRIVATE_ARTIFACT && -f $YS_PRIVATE_AGE_IDENTITY && ! -L $YS_PRIVATE_AGE_IDENTITY ]] || fail 'artifact and identity must be regular local files'
YS_PRIVATE_ARTIFACT=$(realpath -e -- "$YS_PRIVATE_ARTIFACT")
YS_PRIVATE_AGE_IDENTITY=$(realpath -e -- "$YS_PRIVATE_AGE_IDENTITY")
case "$YS_PRIVATE_ARTIFACT/" in "$repo/"*) fail 'approved encrypted artifact must remain outside the repository' ;; esac
case "$YS_PRIVATE_AGE_IDENTITY/" in "$repo/"*) fail 'age identity must remain outside the repository' ;; esac
for path in "$YS_PRIVATE_ARTIFACT" "$YS_PRIVATE_AGE_IDENTITY"; do
  [[ $(stat -c '%u' "$path") == "$(id -u)" ]] || fail 'artifact and identity must be owned by the operator'
  [[ $(stat -c '%a' "$path") == 400 || $(stat -c '%a' "$path") == 600 ]] || fail 'artifact and identity must be owner-only (mode 0400 or 0600)'
done
artifact_before=$(sha256sum -- "$YS_PRIVATE_ARTIFACT" | cut -d' ' -f1)
[[ $artifact_before == "$artifact_sha_expected" ]] || fail 'artifact fingerprint differs from owner-approved local fingerprint'
python3 "$repo/scripts/recovery/private-rehearsal-cleanup.py" record-artifact --target-id "$target_id" --workspace "$workspace" --artifact "$YS_PRIVATE_ARTIFACT" >/dev/null
artifact_recorded=1

log_step() { printf '%s\n' "$1" >>"$workspace/private-steps.log"; }
docker_target() { docker --context "$YS_PRIVATE_DOCKER_CONTEXT" "$@"; }
inject_fault() { [[ -z $fault || $fault != "$1" ]] || fail "synthetic fault injection at $1"; }
unrelated_resource_fingerprint() {
  {
    docker_target ps -aq | sed 's/^/container:/'
    docker_target network ls -q | sed 's/^/network:/'
    docker_target volume ls -q | sed 's/^/volume:/'
  } | sort | sha256sum | cut -d' ' -f1
}
unrelated_before=''
cleanup() {
  local status=$?
  local execution_status=$status cleanup_failure=0
  trap - EXIT INT TERM HUP
  if (( artifact_recorded )); then
    if [[ $fault == cleanup ]]; then
      python3 "$repo/scripts/recovery/private-rehearsal-cleanup.py" cleanup --target-id "$target_id" --workspace "$workspace" --artifact "$YS_PRIVATE_ARTIFACT" --docker-context '__fault-injected-context-mismatch__' >>"$workspace/cleanup.log" 2>&1 || true
      cleanup_failure=1
      printf '%s\n' 'Synthetic cleanup fault injected; target retained for explicit scoped recovery.' >>"$workspace/cleanup.log"
    elif python3 "$repo/scripts/recovery/private-rehearsal-cleanup.py" cleanup --target-id "$target_id" --workspace "$workspace" --artifact "$YS_PRIVATE_ARTIFACT" --docker-context "$YS_PRIVATE_DOCKER_CONTEXT" >>"$workspace/cleanup.log" 2>&1; then
      clock_cleanup=$(python3 "$repo/scripts/recovery/private-rehearsal-clock.py" cleanup-verified --state "$state") || cleanup_failure=1
      printf '%s\n' "$clock_cleanup" >>"$workspace/cleanup.log"
    else
      printf '%s\n' 'Target-scoped cleanup failed; preserve workspace and inspect exact target labels.' >>"$workspace/cleanup.log"
      cleanup_failure=1
    fi
    if [[ -n $unrelated_before ]]; then
      unrelated_after=$(unrelated_resource_fingerprint) || cleanup_failure=1
      [[ $unrelated_before == "$unrelated_after" ]] || { printf '%s\n' 'Unrelated Docker resource inventory changed during scoped cleanup.' >>"$workspace/cleanup.log"; cleanup_failure=1; }
    fi
    if [[ -f $report ]]; then
      python3 - "$report" "$execution_status" "$cleanup_failure" "$workspace/cleanup.log" <<'PY' || cleanup_failure=1
import json, pathlib, sys
path=pathlib.Path(sys.argv[1]); report=json.loads(path.read_text())
execution_failed=int(sys.argv[2]) != 0; cleanup_failed=int(sys.argv[3]) != 0
if not cleanup_failed:
    log=pathlib.Path(sys.argv[4]).read_text() if pathlib.Path(sys.argv[4]).exists() else ""
    for line in log.splitlines():
        try:
            item=json.loads(line)
            if item.get("cleanup") == "VERIFIED": report.setdefault("timing", {})["cleanup"] = item
        except (ValueError, TypeError): pass
report["cleanup"]="FAILED" if cleanup_failed else "VERIFIED"
report["result"]="FAIL_READINESS_AND_CLEANUP" if execution_failed and cleanup_failed else ("FAIL_READINESS" if execution_failed else ("FAIL_CLEANUP" if cleanup_failed else "PASS"))
path.write_text(json.dumps(report,separators=(",",":"))+"\n"); path.chmod(0o600)
PY
    fi
    if (( cleanup_failure != 0 )); then status=1; fi
  else
    rm -rf -- "$workspace/plaintext" "$workspace/secrets" "$workspace/tls" "$workspace/app-source" "$workspace/runner-source"
  fi
  if (( status != 0 )); then printf 'Private rehearsal failed; diagnostics retained in private workspace: %s\n' "$workspace" >&2; fi
  exit "$status"
}
on_signal() { printf 'interrupted\n' >>"$workspace/private-steps.log"; exit 130; }
trap cleanup EXIT
trap on_signal INT TERM HUP
printf '{"schemaVersion":1,"result":"RUNNING","target":"disposable","recoveryCode":"%s","cleanup":"PENDING"}\n' "$recovery_revision" >"$report"
chmod 600 "$report"

# All resources have both an exact target name and the required target label.
unrelated_before=$(unrelated_resource_fingerprint) || fail 'could not snapshot unrelated Docker resources'
docker_target network create --internal --label "ys-sys-001.target=$target_id" "$net" >/dev/null
docker_target volume create --label "ys-sys-001.target=$target_id" "$vol" >/dev/null
admin_password_file="$workspace/secrets/postgres-admin"
setup_password_file="$workspace/secrets/setup-role"
runtime_password_file="$workspace/secrets/runtime-role"
owner_password_file="$workspace/secrets/synthetic-owner"
auth_secret_file="$workspace/secrets/auth-secret"
printf '%s' "$admin_password" >"$admin_password_file"; chmod 600 "$admin_password_file"
printf '127.0.0.1:5432:%s:%s:%s\n' "$db_name" "$setup_role" "$setup_password" >"$setup_password_file"; chmod 600 "$setup_password_file"
printf '%s' "$runtime_password" >"$runtime_password_file"; chmod 600 "$runtime_password_file"
printf '%s' "$owner_password" >"$owner_password_file"; chmod 600 "$owner_password_file"
printf '%s' "$auth_secret" >"$auth_secret_file"; chmod 600 "$auth_secret_file"
docker_target run -d --name "$db_container" --label "ys-sys-001.target=$target_id" \
  --network "$net" --network-alias postgres --mount "type=volume,src=$vol,dst=/var/lib/postgresql" \
  --mount "type=bind,src=$admin_password_file,dst=/run/secrets/postgres-admin,readonly" \
  --mount "type=bind,src=$setup_password_file,dst=/run/secrets/setup-pgpass,readonly" \
  --env POSTGRES_USER=postgres --env POSTGRES_PASSWORD_FILE=/run/secrets/postgres-admin \
  --env POSTGRES_DB=postgres --health-cmd 'pg_isready -U postgres -d postgres' --health-interval 2s --health-timeout 2s --health-retries 60 \
  "$YS_PRIVATE_POSTGRES_IMAGE" >/dev/null
[[ $(docker_target inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql"}}{{.Name}}{{end}}{{end}}' "$db_container") == "$vol" ]] \
  || fail 'PostgreSQL data is not on the labeled target volume'

for attempt in $(seq 1 90); do
  [[ $(docker_target inspect -f '{{.State.Health.Status}}' "$db_container" 2>/dev/null || true) == healthy ]] && break
  (( attempt < 90 )) || fail 'PostgreSQL target did not become healthy'
  sleep 1
done
[[ -z $(docker_target inspect -f '{{range .NetworkSettings.Ports}}{{range .}}{{.HostPort}}{{end}}{{end}}' "$db_container") ]] || fail 'database container unexpectedly publishes ports'
[[ $(docker_target network inspect -f '{{.Internal}}' "$net") == true ]] || fail 'target network is not internal'
db_ip=$(docker_target inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" "$db_container")
db_subnet=$(docker_target network inspect -f '{{(index .IPAM.Config 0).Subnet}}' "$net")
python3 -c 'import ipaddress,sys; n=ipaddress.ip_network(sys.argv[2]); assert n.is_private and ipaddress.ip_address(sys.argv[1]) in n' "$db_ip" "$db_subnet" || fail 'database IP is outside its private target subnet'
docker_target exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null <<SQL
CREATE ROLE "$setup_role" LOGIN NOSUPERUSER NOCREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '$setup_password';
CREATE DATABASE "$db_name" OWNER "$setup_role";
COMMENT ON DATABASE "$db_name" IS 'ys-sys-001-disposable:$target_id';
SQL
if [[ $fault == interrupt-int ]]; then kill -INT "$$"; fi
if [[ $fault == interrupt-term ]]; then kill -TERM "$$"; fi

# Resolve and build the application and browser images before any archive
# bytes are decrypted or restored into the target database.
git -C "$YS_PRIVATE_APP_REPOSITORY" archive --format=tar "$YS_PRIVATE_APP_REVISION" | tar -xf - -C "$workspace/app-source"
docker_target build --label "ys-sys-001.target=$target_id" --tag "ys-sys-001-rehearsal-app:$target_id" \
  --file "$repo/scripts/recovery/application.Dockerfile" "$workspace/app-source" >"$workspace/app-build.private.log" 2>&1 || fail 'pinned application image build failed'
mkdir -p "$workspace/runner-source/scripts/recovery" "$workspace/runner-source/tests/e2e-ys-sys-001-private-recovery"
cp -- "$repo/package.json" "$repo/bun.lock" "$workspace/runner-source/"
cp -- "$repo/scripts/recovery/private-rehearsal.playwright.config.ts" "$workspace/runner-source/scripts/recovery/"
cp -- "$repo/tests/e2e-ys-sys-001-private-recovery/private-recovery.e2e.ts" "$workspace/runner-source/tests/e2e-ys-sys-001-private-recovery/"
docker_target build --label "ys-sys-001.target=$target_id" --tag "ys-sys-001-rehearsal-runner:$target_id" \
  --file "$repo/scripts/recovery/private-rehearsal-runner.Dockerfile" "$workspace/runner-source" >"$workspace/runner-build.private.log" 2>&1 || fail 'private Playwright runner image build failed'

plaintext="$workspace/plaintext/restored.dump"
age -d -i "$YS_PRIVATE_AGE_IDENTITY" -o "$plaintext" "$YS_PRIVATE_ARTIFACT" 2>"$workspace/decrypt.private.log" || fail 'local artifact decryption failed'
chmod 600 "$plaintext"
[[ -s $plaintext ]] || fail 'decrypted archive is empty'
docker_target exec -i "$db_container" pg_restore --list <"$plaintext" >"$workspace/archive-list.private.log" 2>&1 || fail 'decrypted artifact is not a valid PostgreSQL custom-format archive'
if [[ $fault == restore ]]; then printf 'synthetic invalid archive fault\n' >"$plaintext"; fi
docker_target exec -i -e PGPASSFILE=/run/secrets/setup-pgpass "$db_container" pg_restore --no-owner --no-acl --exit-on-error \
  -h 127.0.0.1 -U "$setup_role" -d "$db_name" <"$plaintext" >"$workspace/restore.private.log" 2>&1 || fail 'normalized restore failed'
rm -f -- "$plaintext"

setup_url="postgresql://${setup_role}:${setup_password}@${db_ip}:5432/${db_name}"
runtime_url="postgresql://${runtime_role}:${runtime_password}@${db_ip}:5432/${db_name}"
prep_env="$workspace/secrets/preparation.env"
printf '%s\n' \
  'NODE_ENV=development' \
  'YS_APP_RECOVERY_MODE=production-derived-private-v1' \
  "YS_APP_RECOVERY_TARGET_ID=$target_id" \
  "YS_APP_RECOVERY_SETUP_ROLE=$setup_role" \
  "YS_APP_RECOVERY_SETUP_DATABASE_URL=$setup_url" \
  "YS_APP_RECOVERY_RUNTIME_DATABASE_URL=$runtime_url" \
  "YS_APP_RECOVERY_RUNTIME_PASSWORD=$runtime_password" \
  "YS_APP_RECOVERY_OWNER_PASSWORD=$owner_password" \
  'OWNER_EMAIL=owner@recovery.test' \
  'BETTER_AUTH_URL=https://recovery.test' \
  "BETTER_AUTH_SECRET=$auth_secret" \
  'PASSKEY_RP_ID=recovery.test' >"$prep_env"
chmod 600 "$prep_env"
run_private_bun() {
  local script=$1
  env -i "PATH=$PATH" "HOME=$HOME" bash --noprofile --norc -c 'cd "$2"; set -a; . "$1"; shift 2; exec bun "$@"' _ "$prep_env" "$repo" "$script"
}
inject_fault preparation
run_private_bun scripts/recovery/prepare-private-rehearsal.ts >"$workspace/preparation.private.log" 2>&1 || fail 'synthetic owner, tenant, RLS, or runtime role preparation failed'
run_private_bun scripts/recovery/verify-private-auth-synthetic.ts >"$workspace/auth-check.private.log" 2>&1 || fail 'synthetic Better Auth preparation verification failed'
log_step 'restore-and-runtime-preparation-passed'

# Snapshot only the reviewed business relations; Better Auth session activity is
# deliberately outside this comparison. Data and digest remain private.
business_tables=(application_migrations workspaces workspace_snapshots system_directory_entries contact_inquiries inquiry_retirements crm_proposals conversion_events research_opportunities user account customer_identities customer_tenants customer_tenant_memberships customer_tenant_projects customer_project_grants)
snapshot_business_data() {
  local output=$1 table_args=()
  for table in "${business_tables[@]}"; do table_args+=(--table="public.$table"); done
  docker_target exec "$db_container" pg_dump -U postgres -d "$db_name" --data-only --no-owner --no-acl "${table_args[@]}" 2>/dev/null | sha256sum | cut -d' ' -f1 >"$output"
  [[ -s $output ]] || fail 'business-data integrity snapshot failed'
}
snapshot_business_data "$workspace/integrity-before.sha256"

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=recovery.test' \
  -keyout "$workspace/tls/key.pem" -out "$workspace/tls/cert.pem" >"$workspace/tls-build.private.log" 2>&1 || fail 'private TLS certificate generation failed'
chmod 750 "$workspace/tls"
chmod 640 "$workspace/tls/key.pem"; chmod 644 "$workspace/tls/cert.pem"
cat >"$workspace/nginx.conf" <<'NGINX'
events {}
http {
  server {
    listen 443 ssl;
    server_name recovery.test;
    ssl_certificate /run/tls/cert.pem;
    ssl_certificate_key /run/tls/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    location = / { limit_except GET HEAD { deny all; } proxy_pass http://ys-sys-001-app:3000; }
    location = /dashboard { limit_except GET HEAD { deny all; } proxy_pass http://ys-sys-001-app:3000; }
    location = /api/workspace { limit_except GET HEAD { deny all; } proxy_pass http://ys-sys-001-app:3000; }
    location = /api/systems-directory { limit_except GET HEAD { deny all; } proxy_pass http://ys-sys-001-app:3000; }
    location = /api/auth/owner-session-status { limit_except GET HEAD { deny all; } proxy_pass http://ys-sys-001-app:3000; }
    location = /api/auth/sign-in/email { limit_except POST { deny all; } proxy_pass http://ys-sys-001-app:3000; }
    location / { return 403; }
  }
}
NGINX
chmod 640 "$workspace/nginx.conf"
if [[ $fault == application-startup ]]; then
  docker_target run -d --name "$app_container" --label "ys-sys-001.target=$target_id" \
    --network "$net" --network-alias ys-sys-001-app --read-only --cap-drop ALL --security-opt no-new-privileges \
    --entrypoint /bin/false "ys-sys-001-rehearsal-app:$target_id" >/dev/null
  sleep 1
  fail 'synthetic application startup failure injected'
else
  app_env="$workspace/secrets/application.env"
  printf '%s\n' "DATABASE_URL=$runtime_url" "BETTER_AUTH_SECRET=$auth_secret" \
    'BETTER_AUTH_URL=https://recovery.test' 'OWNER_EMAIL=owner@recovery.test' \
    'PASSKEY_RP_ID=recovery.test' 'NEXT_PUBLIC_FIRST_PARTY_ANALYTICS=disabled' 'NODE_ENV=production' >"$app_env"
  chmod 600 "$app_env"
  docker_target run -d --name "$app_container" --label "ys-sys-001.target=$target_id" \
    --network "$net" --network-alias ys-sys-001-app --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    --tmpfs /app/.next/cache:rw,noexec,nosuid,size=64m \
    --cap-drop ALL --security-opt no-new-privileges --env-file "$app_env" \
    "ys-sys-001-rehearsal-app:$target_id" >/dev/null
fi
docker_target run -d --name "$proxy_container" --label "ys-sys-001.target=$target_id" \
  --network "$net" --network-alias recovery.test --read-only --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=8m \
  --tmpfs /var/run:rw,noexec,nosuid,size=2m --cap-drop ALL --cap-add NET_BIND_SERVICE --cap-add SETUID --cap-add SETGID --cap-add CHOWN --group-add "$(id -g)" --security-opt no-new-privileges \
  --mount "type=bind,src=$workspace/nginx.conf,dst=/etc/nginx/nginx.conf,readonly" \
  --mount "type=bind,src=$workspace/tls,dst=/run/tls,readonly" "$YS_PRIVATE_NGINX_IMAGE" >/dev/null
fail_proxy_exit() {
  local proxy_log fatal_log
  docker_target logs "$proxy_container" >"$workspace/proxy.private.log" 2>&1 || true
  [[ $(docker_target inspect -f '{{.State.Running}}' "$app_container" 2>/dev/null || true) == true ]] \
    || fail 'pinned application container exited before proxy readiness'
  proxy_log=$(cat "$workspace/proxy.private.log")
  fatal_log=$(printf '%s\n' "$proxy_log" | grep -E '\[(emerg|crit|alert)\]' || true)
  [[ -n $fatal_log ]] || fatal_log=$proxy_log
  if [[ $fatal_log == *'Permission denied'* || $fatal_log == *'permission denied'* ]]; then
    if [[ $fatal_log == *'/etc/nginx/nginx.conf'* ]]; then fail 'internal TLS proxy config access denied'; fi
    if [[ $fatal_log == *'/run/tls/'* ]]; then fail 'internal TLS proxy key access denied'; fi
    if [[ $fatal_log == *'/var/cache/nginx/'* ]]; then fail 'internal TLS proxy cache access denied'; fi
    fail 'internal TLS proxy filesystem access denied'
  fi
  if [[ $fatal_log == *'Read-only file system'* || $fatal_log == *'read-only file system'* ]]; then
    if [[ $fatal_log == *'/var/run/nginx.pid'* || $fatal_log == *'/run/nginx.pid'* ]]; then fail 'internal TLS proxy pid path is read only'; fi
    if [[ $fatal_log == *'/var/cache/nginx/'* ]]; then fail 'internal TLS proxy cache path is read only'; fi
    if [[ $fatal_log == *'/etc/nginx/'* ]]; then fail 'internal TLS proxy config path is read only'; fi
    if [[ $fatal_log == *'/tmp/'* ]]; then fail 'internal TLS proxy temporary path is read only'; fi
    fail 'internal TLS proxy needs an unwritable path'
  fi
  if [[ $fatal_log == *'host not found in upstream'* ]]; then fail 'internal TLS proxy upstream DNS unavailable'; fi
  if [[ $fatal_log == *'cannot load certificate'* ]]; then fail 'internal TLS proxy certificate load failed'; fi
  if [[ $fatal_log == *'SSL_CTX_use_PrivateKey_file'* ]]; then fail 'internal TLS proxy key load failed'; fi
  if [[ $fatal_log == *'invalid number of arguments'* || $fatal_log == *'unknown directive'* || $fatal_log == *'directive is not allowed here'* ]]; then
    fail 'internal TLS proxy configuration syntax rejected'
  fi
  if [[ $fatal_log == *'bind()'* ]]; then fail 'internal TLS proxy socket bind failed'; fi
  if [[ $fatal_log == *'No such file or directory'* || $fatal_log == *'no such file or directory'* ]]; then fail 'internal TLS proxy required path is missing'; fi
  if [[ ${CI:-} == true && ${GITHUB_ACTIONS:-} == true && ${YS_PRIVATE_SYNTHETIC_FIXTURE:-} == true ]]; then
    local synthetic_detail
    synthetic_detail=$(python3 - "$workspace/proxy.private.log" <<'PY'
import pathlib,re,sys
lines=pathlib.Path(sys.argv[1]).read_text(errors="replace").splitlines()
fatal=[line for line in lines if re.search(r"\[(?:emerg|crit|alert)\]",line)]
line=(fatal or lines or [""])[-1]
line=re.sub(r"\"[^\"]*\"|'[^']*'", " path ", line)
line=re.sub(r"/(?:[A-Za-z0-9._-]+/)*[A-Za-z0-9._-]+", " path ", line)
line=re.sub(r"[A-Za-z0-9_+-]{20,}", " token ", line)
line=re.sub(r"[^A-Za-z0-9 ,:.-]", " ", line)
print(re.sub(r"\s+", " ", line).strip()[:100] or "no startup log")
PY
)
    fail "internal TLS proxy synthetic startup: $synthetic_detail"
  fi
  fail 'internal TLS proxy container exited'
}
proxy_config_ok=0
for attempt in $(seq 1 10); do
  if docker_target exec "$proxy_container" nginx -t >/dev/null 2>&1; then proxy_config_ok=1; break; fi
  [[ $(docker_target inspect -f '{{.State.Running}}' "$proxy_container") == true ]] || fail_proxy_exit
  sleep 1
done
(( proxy_config_ok == 1 )) || fail 'internal TLS proxy configuration check failed'
app_ready=0
for attempt in $(seq 1 60); do
  if docker_target exec "$proxy_container" wget -q --no-check-certificate -O /dev/null https://recovery.test/ >/dev/null 2>&1; then app_ready=1; break; fi
  [[ $(docker_target inspect -f '{{.State.Running}}' "$proxy_container") == true ]] || fail_proxy_exit
  [[ $(docker_target inspect -f '{{.State.Running}}' "$app_container") == true ]] || fail 'pinned application container exited before proxy readiness'
  sleep 1
done
(( app_ready == 1 )) || fail 'internal TLS proxy could not reach the pinned application'
browser_fault_env=()
browser_env="$workspace/secrets/browser.env"
printf '%s\n' 'YS_APP_RECOVERY_PRIVATE_REHEARSAL=true' 'YS_APP_RECOVERY_BASE_URL=https://recovery.test' \
  'OWNER_EMAIL=owner@recovery.test' "YS_APP_RECOVERY_OWNER_PASSWORD=$owner_password" >"$browser_env"
if [[ $fault == browser ]]; then printf '%s\n' 'YS_PRIVATE_TEST_BROWSER_FAIL=true' 'YS_PRIVATE_SYNTHETIC_FIXTURE=true' >>"$browser_env"; fi
chmod 600 "$browser_env"
docker_target run -d --name "$browser_container" --label "ys-sys-001.target=$target_id" \
  --network "$net" --read-only --tmpfs /tmp:rw,noexec,nosuid,size=256m \
  --shm-size=512m --cap-drop ALL --security-opt no-new-privileges --env HOME=/tmp --env-file "$browser_env" \
  "ys-sys-001-rehearsal-runner:$target_id" x playwright test --config scripts/recovery/private-rehearsal.playwright.config.ts \
  >/dev/null
expected_browser_members=$(printf '%s\n' "$app_container" "$browser_container" "$db_container" "$proxy_container" | sort)
browser_members=$(docker_target network inspect -f '{{range $id,$c := .Containers}}{{println $c.Name}}{{end}}' "$net" | sed '/^$/d' | sort)
[[ $browser_members == "$expected_browser_members" ]] || fail 'browser did not join the exact isolated target network'
browser_exit=$(docker_target wait "$browser_container") || fail 'private browser container wait failed'
docker_target logs "$browser_container" >"$workspace/browser.private.log" 2>&1
if [[ $browser_exit != 0 ]]; then
  browser_failure=$(python3 - "$workspace/browser.private.log" <<'PY'
import pathlib,re,sys
log=pathlib.Path(sys.argv[1]).read_text(errors="replace")
lines=[int(line) for line in re.findall(r"private-recovery\.e2e\.ts:(\d+):\d+",log)]
if lines:
    print(f"assertion line {lines[-1]}")
elif "browserType.launch" in log:
    print("browser launch")
elif "No tests found" in log:
    print("test discovery")
else:
    error_lines=[line for line in log.splitlines() if re.search(r"\b(?:error|failed|denied|not found|ENOENT|EACCES)\b",line,re.I)]
    line=(error_lines or log.splitlines() or [""])[-1]
    line=re.sub(r"\"[^\"]*\"|'[^']*'", " value ", line)
    line=re.sub(r"/(?:[A-Za-z0-9._-]+/)*[A-Za-z0-9._-]+", " path ", line)
    line=re.sub(r"[A-Za-z0-9_+-]{20,}", " token ", line)
    line=re.sub(r"[^A-Za-z0-9 ,:.-]", " ", line)
    print("synthetic " + (re.sub(r"\s+", " ", line).strip()[:100] or "unclassified"))
PY
)
  fail "authenticated browser verification failed: $browser_failure"
fi
run_private_bun scripts/recovery/verify-private-runtime.ts >"$workspace/runtime-check.private.log" 2>&1 || fail 'tenant isolation or restricted runtime verification failed'

# App and proxy are the only runtime services; the internal network must reject
# public egress from the app itself. No external service credentials are set.
if docker_target exec "$app_container" bun -e 'await fetch("https://example.com", {signal: AbortSignal.timeout(3000)}); process.exit(1)' >/dev/null 2>&1; then
  fail 'application-originated external egress unexpectedly succeeded'
fi
members=$(docker_target network inspect -f '{{range $id,$c := .Containers}}{{println $c.Name}}{{end}}' "$net" | sed '/^$/d' | sort)
expected_members=$(printf '%s\n' "$app_container" "$db_container" "$proxy_container" | sort)
[[ $members == "$expected_members" ]] || fail 'target network has an unexpected member'
for container in "$db_container" "$app_container" "$proxy_container" "$browser_container"; do
  ports=$(docker_target inspect -f '{{range .NetworkSettings.Ports}}{{range .}}{{.HostPort}}{{end}}{{end}}' "$container")
  [[ -z $ports ]] || fail 'a rehearsal service unexpectedly publishes a host port'
done

snapshot_business_data "$workspace/integrity-after.sha256"
if [[ $fault == integrity ]]; then printf 'synthetic integrity mismatch\n' >"$workspace/integrity-after.sha256"; fi
cmp -s "$workspace/integrity-before.sha256" "$workspace/integrity-after.sha256" || fail 'business-data integrity changed during read-only app tests'
artifact_after=$(sha256sum -- "$YS_PRIVATE_ARTIFACT" | cut -d' ' -f1)
[[ $artifact_before == "$artifact_after" ]] || fail 'original encrypted artifact changed during rehearsal'
python3 "$repo/scripts/recovery/private-rehearsal-clock.py" ready --state "$state" >"$workspace/t-ready.json" || fail 'RTO exceeded 60 minutes or T-ready clock failed'
ready=1
cat >"$report" <<JSON
{"schemaVersion":1,"result":"PASS","target":"disposable","application":"$YS_PRIVATE_APP_REVISION","recoveryCode":"$recovery_revision","migrationCeiling":"0022","restoreOwnershipAcl":"normalized","checks":{"restore":"PASS","routineInventory":"PASS","runtimePrivileges":"PASS","ownerSignIn":"PASS","dashboard":"PASS","directory":"PASS","tenantIsolation":"PASS","businessIntegrity":"PASS","egressDenied":"PASS","externalSideEffects":"none"},"timing":$(cat "$workspace/t-ready.json" | tr -d '\n')}
JSON
chmod 600 "$report"
printf 'Synthetic/private rehearsal acceptance checks passed; sanitized report: %s\n' "$report"
