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

for utility in docker bun curl openssl jq; do command -v "$utility" >/dev/null || fail "required utility is unavailable"; done
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
app_image="ys-app-recovery:${run_tag}"
source_db="recovery_$(openssl rand -hex 12)"
db_user="recovery_$(openssl rand -hex 8)"
db_password="$(openssl rand -hex 32)"
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

for secret in "$db_user" "$db_password" "$owner_password" "$owner_bootstrap" "$auth_secret"; do printf '::add-mask::%s\n' "$secret"; done

cleanup() {
  status=$?
  set +e
  docker rm -f "$proxy_container" "$app_container" "$target_container" "$source_container" >/dev/null 2>&1
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
docker network create --internal "$source_network" >/dev/null
docker network create --internal "$runtime_network" >/dev/null
[[ "$(docker network inspect -f '{{.Internal}}' "$source_network")" == true \
  && "$(docker network inspect -f '{{.Internal}}' "$runtime_network")" == true ]] \
  || fail "Docker did not create both internal-only networks"

docker run -d --rm --name "$source_container" --network "$source_network" --network-alias ys-app-recovery-source \
  --publish 127.0.0.1::5432 --health-cmd="pg_isready -U $db_user -d $source_db" \
  --health-interval=2s --health-timeout=2s --health-retries=30 \
  -e POSTGRES_USER="$db_user" -e POSTGRES_PASSWORD="$db_password" -e POSTGRES_DB="$source_db" \
  --log-driver=none postgres:18-alpine >/dev/null
docker run -d --rm --name "$target_container" --network "$runtime_network" --network-alias ys-app-recovery-target \
  --publish 127.0.0.1::5432 --health-cmd="pg_isready -U $db_user -d postgres" \
  --health-interval=2s --health-timeout=2s --health-retries=30 \
  -e POSTGRES_USER="$db_user" -e POSTGRES_PASSWORD="$db_password" -e POSTGRES_DB=postgres \
  --log-driver=none postgres:18-alpine >/dev/null

source_attached="$(docker network inspect -f '{{range $id, $container := .Containers}}{{println $container.Name}}{{end}}' "$source_network")"
[[ "$source_attached" == "$source_container" ]] || fail "synthetic source network contains an unexpected container"

for attempt in $(seq 1 60); do
  if docker exec "$source_container" pg_isready -U "$db_user" -d "$source_db" >/dev/null 2>&1 \
    && docker exec "$target_container" pg_isready -U "$db_user" -d postgres >/dev/null 2>&1; then break; fi
  [[ $attempt -lt 60 ]] || fail "disposable PostgreSQL 18 did not become ready"
  sleep 1
done
source_port="$(docker port "$source_container" 5432/tcp | awk -F: 'END {print $NF}')"
target_port="$(docker port "$target_container" 5432/tcp | awk -F: 'END {print $NF}')"
[[ "$source_port" =~ ^[0-9]+$ && "$target_port" =~ ^[0-9]+$ ]] || fail "loopback-only database access could not be established"

schema_started_epoch="$(date -u +%s)"
env -i PATH="$PATH" HOME="$HOME" YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 \
  YS_APP_RECOVERY_DB_HOST=127.0.0.1 YS_APP_RECOVERY_DB_PORT="$source_port" \
  YS_APP_RECOVERY_DB_USER="$db_user" YS_APP_RECOVERY_DB_PASSWORD="$db_password" \
  YS_APP_RECOVERY_DB_NAME="$source_db" bun scripts/recovery/prepare-application-db.ts >/dev/null \
  || fail "synthetic source schema preparation failed"

source_url="postgresql://${db_user}:${db_password}@127.0.0.1:${source_port}/${source_db}"
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=development DATABASE_URL="$source_url" bun run auth:migrate \
  >"$workspace/auth-migrate.log" 2>&1 || fail "synthetic Better Auth schema preparation failed"
unset source_url
schema_finished_epoch="$(date -u +%s)"

archive="$workspace/synthetic-source.dump"
restore_started_epoch="$(date -u +%s)"
docker exec -e PGPASSWORD="$db_password" "$source_container" pg_dump -w -U "$db_user" -d "$source_db" -Fc \
  >"$archive" 2>"$workspace/pg-dump.log" || fail "synthetic custom-format archive creation failed"
[[ -s "$archive" ]] || fail "synthetic archive is empty"
chmod 0600 "$archive"
docker exec -i -e PGPASSWORD="$db_password" "$target_container" pg_restore --create --exit-on-error -w -U "$db_user" -d postgres \
  <"$archive" >"$workspace/pg-restore.log" 2>&1 || fail "synthetic restore to fresh PostgreSQL 18 failed"
rm -f -- "$archive" "$workspace/pg-dump.log" "$workspace/pg-restore.log" "$workspace/auth-migrate.log"
restore_finished_epoch="$(date -u +%s)"

target_port="$(docker port "$target_container" 5432/tcp | awk -F: 'END {print $NF}')"
target_url="postgresql://${db_user}:${db_password}@127.0.0.1:${target_port}/${source_db}"
env -i PATH="$PATH" HOME="$HOME" YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 YS_APP_RECOVERY_PHASE=before \
  YS_APP_RECOVERY_DB_HOST=127.0.0.1 YS_APP_RECOVERY_DB_PORT="$target_port" \
  YS_APP_RECOVERY_DB_USER="$db_user" YS_APP_RECOVERY_DB_PASSWORD="$db_password" \
  YS_APP_RECOVERY_DB_NAME="$source_db" bun scripts/recovery/verify-application-db.ts >"$workspace/before.json" \
  || fail "restored database preflight failed"

docker build --quiet --file scripts/recovery/application.Dockerfile --tag "$app_image" . >"$workspace/build.log" 2>&1 \
  || fail "production application image build failed"

egress_result="$(docker run --rm --network "$runtime_network" --entrypoint bun "$app_image" -e '
  const net = require("node:net");
  const socket = net.createConnection({ host: "1.1.1.1", port: 443 });
  const timer = setTimeout(() => { socket.destroy(); process.stdout.write("BLOCKED\n"); process.exit(0); }, 2500);
  socket.once("connect", () => { clearTimeout(timer); socket.destroy(); process.stderr.write("Unexpected external egress\n"); process.exit(1); });
  socket.once("error", () => { clearTimeout(timer); process.stdout.write("BLOCKED\n"); process.exit(0); });
')" || fail "egress boundary probe errored"
[[ "$egress_result" == BLOCKED ]] || fail "an internal-network container reached an external address"

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout "$workspace/key.pem" -out "$workspace/cert.pem" \
  -subj '/CN=recovery.test' -addext 'subjectAltName=DNS:recovery.test' >/dev/null 2>&1
chmod 0600 "$workspace/key.pem" "$workspace/cert.pem"
cp scripts/recovery/application-proxy.conf.template "$workspace/default.conf"

app_started_epoch="$(date -u +%s)"
app_started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker run -d --rm --name "$app_container" --network "$runtime_network" --network-alias ys-app-recovery-web \
  --read-only --user 10001:10001 --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777 \
  --tmpfs /app/.next/cache:rw,noexec,nosuid,nodev,size=128m,mode=700,uid=10001,gid=10001 \
  --log-driver=none \
  -e NODE_ENV=production -e DATABASE_URL="postgresql://${db_user}:${db_password}@ys-app-recovery-target:5432/${source_db}" \
  -e BETTER_AUTH_URL=https://recovery.test -e OWNER_EMAIL=owner@recovery.test -e PASSKEY_RP_ID=recovery.test \
  -e BETTER_AUTH_SECRET="$auth_secret" -e OWNER_BOOTSTRAP_TOKEN="$owner_bootstrap" \
  -e NEXT_PUBLIC_FIRST_PARTY_ANALYTICS=disabled -e YS_SYS_001_ENABLED=false -e NEXT_TELEMETRY_DISABLED=1 \
  -e HOSTNAME=0.0.0.0 -e PORT=3000 "$app_image" >/dev/null

docker run -d --rm --name "$proxy_container" --network "$runtime_network" --network-alias recovery.test \
  --publish 127.0.0.1:443:8443 --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /var/cache/nginx:rw,noexec,nosuid,nodev,size=16m \
  --tmpfs /var/run:rw,noexec,nosuid,nodev,size=2m \
  --volume "$workspace/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  --volume "$workspace/cert.pem:/etc/nginx/cert.pem:ro" --volume "$workspace/key.pem:/etc/nginx/key.pem:ro" \
  --log-driver=none nginx:1.27-alpine >/dev/null

for attempt in $(seq 1 90); do
  code="$(curl --resolve recovery.test:443:127.0.0.1 -kfsS --connect-timeout 1 --max-time 2 -o /dev/null -w '%{http_code}' https://recovery.test/api/health 2>/dev/null || true)"
  if [[ "$code" == 200 ]]; then ready_epoch="$(date -u +%s)"; ready_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; break; fi
  [[ $attempt -lt 90 ]] || fail "production app did not become ready through the internal proxy"
  sleep 1
done

attached="$(docker network inspect -f '{{range $id, $container := .Containers}}{{println $container.Name}}{{end}}' "$runtime_network" | sort)"
expected_attached="$(printf '%s\n' "$app_container" "$proxy_container" "$target_container" | sort)"
[[ "$attached" == "$expected_attached" ]] || fail "runtime network membership differs from the three approved containers"
[[ "$(docker network inspect -f '{{.Internal}}' "$runtime_network")" == true \
  && "$(docker network inspect -f '{{.Internal}}' "$source_network")" == true ]] || fail "a rehearsal network is not internal"

tests_started_epoch="$(date -u +%s)"
tests_started_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
env -i PATH="$PATH" HOME="$HOME" CI=true YS_APP_RECOVERY_BASE_URL=https://recovery.test \
  YS_APP_RECOVERY_OWNER_EMAIL=owner@recovery.test YS_APP_RECOVERY_OWNER_PASSWORD="$owner_password" \
  YS_APP_RECOVERY_BOOTSTRAP_TOKEN="$owner_bootstrap" \
  bunx playwright test -c playwright.ys-sys-001-recovery.config.ts >"$workspace/playwright.log" 2>&1 \
  || fail "synthetic owner/browser readiness checks failed"
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=test TEST_DATABASE_URL="$target_url" \
  bun test tests/client-project-data-database.test.ts >"$workspace/tenant-tests.log" 2>&1 \
  || fail "synthetic cross-tenant integration tests failed"
tests_finished_epoch="$(date -u +%s)"
tests_finished_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

env -i PATH="$PATH" HOME="$HOME" YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 YS_APP_RECOVERY_PHASE=after \
  YS_APP_RECOVERY_DB_HOST=127.0.0.1 YS_APP_RECOVERY_DB_PORT="$target_port" \
  YS_APP_RECOVERY_DB_USER="$db_user" YS_APP_RECOVERY_DB_PASSWORD="$db_password" \
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
  '{format:"ys-sys-001-application-recovery-v1",dataClass:"synthetic-only",startedAt:$startedAt,appStartedAt:$appStartedAt,readyAt:$readyAt,testsStartedAt:$testsStartedAt,testsFinishedAt:$testsFinishedAt,endedAt:$endedAt,postgres18Restore:"PASS",internalDockerNetworks:{syntheticSource:"internal",restoredRuntime:"internal",runtimeMembership:"PASS",externalTcpProbe:"BLOCKED"},productionAppStartup:"PASS",syntheticOwnerAuth:"PASS",ownerAuthorization:"PASS",dashboardRead:"PASS",legacyDirectoryRead:"PASS",anonymousDirectoryDenied:"PASS",tenantIsolation:"PASS",registryFeatureFlag:"OFF",externalSideEffects:"disabled-or-unreachable",migrations0023And0024:"NOT APPLIED",databaseIntegrityBefore:$before,databaseIntegrityAfter:$after,durationsSeconds:{schemaPreparation:$schemaSeconds,archiveAndRestore:$restoreSeconds,appStartupToReady:$startupSeconds,readinessChecks:$testSeconds,totalSyntheticRehearsal:$totalSeconds},fullProductionRto:"NOT DEMONSTRATED"}' \
  >"$report_path"
chmod 0600 "$report_path"

printf 'Synthetic app recovery: PASS; PostgreSQL 18 restore, owner workflows, tenant denial, and egress isolation verified.\n'
printf 'Readiness report: artifacts/ys-sys-001-application-recovery.json (aggregate data only).\n'
printf 'Elapsed synthetic rehearsal seconds: %s. Full Production-derived 60-minute RTO: NOT DEMONSTRATED.\n' "$total_seconds"
