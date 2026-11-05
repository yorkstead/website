#!/usr/bin/env bash
set -euo pipefail
umask 077

fail() { printf 'Synthetic owner-preflight test failed: %s\n' "$1" >&2; exit 1; }
pass() { printf 'PASS: %s\n' "$1"; }
phase=environment-preflight

[[ "${GITHUB_ACTIONS:-}" == true && "${CI:-}" == true ]] || fail 'must run inside the isolated GitHub Actions job'
for name in $(compgen -e); do
  case "$name" in
    PG*|DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|POSTGRESQL_URL|DIRECT_URL|DB_URL|*_DATABASE_URL|*_DB_URL|*_CONNECTION_STRING|VERCEL_*|NEON_*|AWS_*|GOOGLE_*|CLOUDSDK_*|AZURE_CLIENT_*|AZURE_TENANT_ID|AZURE_SUBSCRIPTION_ID|AZURE_CREDENTIALS|AZURE_FEDERATED_TOKEN_FILE|AZURE_CONFIG_DIR|ARM_*|DOCKER_*|CONTAINER_HOST|*_TOKEN|*_SECRET|*_PRIVATE_KEY|*_CREDENTIALS)
      fail "external database/cloud environment is not accepted: $name" ;;
  esac
done

for command_name in docker openssl psql bun python3; do
  command -v "$command_name" >/dev/null 2>&1 || fail "required synthetic test tool is unavailable: $command_name"
done

phase=initialize-workspace
repo_root="$(git rev-parse --show-toplevel)"
work_dir="$(mktemp -d /tmp/ys-owner-preflight.XXXXXXXXXX)"
chmod 700 "$work_dir"
image_dir="$work_dir/image"
mkdir -m 700 "$image_dir"
database_name=ys_owner_preflight_synthetic
wrong_database=ys_owner_wrong_target
missing_database=ys_owner_missing_schema
operator_role=ys_owner_preflight_operator
container_name="ys-owner-preflight-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
network_name="ys-owner-preflight-net-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
image_tag="ys-owner-preflight:${GITHUB_RUN_ID:-local}"
database_password="$(openssl rand -hex 32)"
operator_password="$(openssl rand -hex 32)"
wrong_password="$(openssl rand -hex 32)"
container_started=false

docker_local() { env -i PATH="$PATH" HOME="$work_dir" docker "$@"; }

cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$status" -ne 0 ]]; then printf 'Synthetic owner-preflight test stopped during %s (exit %s).\n' "$phase" "$status" >&2; fi
  if [[ "$container_started" == true ]]; then docker_local rm -f "$container_name" >/dev/null 2>&1 || true; fi
  docker_local network rm "$network_name" >/dev/null 2>&1 || true
  docker_local image rm "$image_tag" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
  return "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

phase=generate-synthetic-tls
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$image_dir/server.key" -out "$image_dir/server.crt" \
  -days 1 -subj '/CN=127.0.0.1' \
  -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost' \
  >"$work_dir/openssl.out" 2>"$work_dir/openssl.err"
chmod 600 "$image_dir/server.key"
chmod 644 "$image_dir/server.crt"

cat >"$image_dir/Dockerfile" <<'DOCKERFILE'
FROM postgres:18-alpine
USER root
RUN mkdir -p /ys-tls
COPY server.crt /ys-tls/server.crt
COPY server.key /ys-tls/server.key
RUN chown postgres:postgres /ys-tls/server.crt /ys-tls/server.key \
    && chmod 644 /ys-tls/server.crt \
    && chmod 600 /ys-tls/server.key
USER postgres
CMD ["postgres", "-c", "ssl=on", "-c", "ssl_cert_file=/ys-tls/server.crt", "-c", "ssl_key_file=/ys-tls/server.key"]
DOCKERFILE

phase=build-synthetic-postgres-image
docker_local build --quiet --file "$image_dir/Dockerfile" --tag "$image_tag" "$image_dir" >"$work_dir/docker-build.out" 2>"$work_dir/docker-build.err" ||
  fail 'could not build the disposable TLS PostgreSQL image'

cat >"$work_dir/postgres.env" <<EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$database_password
POSTGRES_DB=$database_name
EOF
chmod 600 "$work_dir/postgres.env"

phase=start-synthetic-postgres
docker_local network create --driver bridge --internal "$network_name" >"$work_dir/network-id.out" 2>"$work_dir/network-create.err" ||
  fail 'could not create isolated disposable database network'

docker_local run --detach --rm --name "$container_name" --network "$network_name" --env-file "$work_dir/postgres.env" \
  --publish 127.0.0.1::5432 "$image_tag" >"$work_dir/container-id.out" 2>"$work_dir/container-start.err" ||
  fail 'could not start the disposable TLS PostgreSQL container'
container_started=true

for attempt in $(seq 1 40); do
  if docker_local exec "$container_name" pg_isready -U postgres -d "$database_name" >/dev/null 2>&1; then break; fi
  [[ "$attempt" -lt 40 ]] || fail 'disposable PostgreSQL did not become ready'
  sleep 1
done

published_port="$(docker_local port "$container_name" 5432/tcp 2>"$work_dir/docker-port.err" | sed -n 's/.*://p')"
[[ "$published_port" =~ ^[0-9]+$ ]] || fail 'disposable PostgreSQL did not publish a local port'

admin_psql() {
  env -i PATH="$PATH" HOME="$work_dir" \
    PGHOST=127.0.0.1 PGPORT="$published_port" PGUSER=postgres PGDATABASE="$database_name" \
    PGPASSWORD="$database_password" PGPASSFILE=/dev/null \
    PGSSLMODE=verify-full PGSSLROOTCERT="$image_dir/server.crt" \
    psql -X -q -v ON_ERROR_STOP=1 "$@"
}

phase=apply-synthetic-schema
admin_psql -f "$repo_root/scripts/ys-sys-001-readonly-role/synthetic-fixture.sql" \
  >"$work_dir/fixture.out" 2>"$work_dir/fixture.err" ||
  fail 'synthetic baseline fixture failed'

canonical_checksum() {
  local migration_file="$1"
  (cd "$repo_root" && MIGRATION_FILE="$migration_file" bun -e '
    import { readFile } from "node:fs/promises";
    import { parseMigration } from "./scripts/migration-plan.ts";
    const path = process.env.MIGRATION_FILE;
    if (!path) process.exit(2);
    console.log(parseMigration(path.split("/").at(-1), await readFile(path, "utf8")).checksum);
  ')
}

phase=verify-canonical-lf-checksum
bun -e '
  import { parseMigration } from "./scripts/migration-plan.ts";
  const lf = parseMigration("0001_synthetic.sql", "SELECT 1;\n");
  const crlf = parseMigration("0001_synthetic.sql", "SELECT 1;\r\n");
  if (lf.checksum !== crlf.checksum) process.exit(1);
' >"$work_dir/checksum-normalization.out" 2>"$work_dir/checksum-normalization.err" ||
  fail 'repository migration checksum calculation is not LF-canonical'

expected_ledger="$work_dir/expected-ledger.txt"
actual_ledger="$work_dir/actual-ledger.txt"
: >"$expected_ledger"
chmod 600 "$expected_ledger"

for migration_path in "$repo_root"/migrations/*.sql; do
  migration="${migration_path##*/}"
  version="${migration:0:4}"
  case "$version" in
    0020|0023|0024) ;;
    *) continue ;;
  esac
  admin_psql -f "$migration_path" >"$work_dir/migration-$version.out" 2>"$work_dir/migration-$version.err" ||
    fail "synthetic migration $version failed"
  migration_name="${migration#????_}"
  migration_name="${migration_name%.sql}"
  checksum="$(canonical_checksum "$migration_path")"
  admin_psql -c "INSERT INTO public.application_migrations(version,name,checksum) VALUES ('$version','$migration_name','$checksum')" \
    >"$work_dir/ledger-insert-$version.out" 2>"$work_dir/ledger-insert-$version.err" ||
    fail "synthetic migration ledger insert $version failed"
  printf '%s|%s\n' "$version" "$checksum" >>"$expected_ledger"
  if [[ "$version" == 0024 ]]; then
    admin_psql -f "$repo_root/scripts/ys-sys-001-readonly-role/synthetic-data.sql" \
      >"$work_dir/synthetic-data.out" 2>"$work_dir/synthetic-data.err" ||
      fail 'synthetic Registry data fixture failed'
  fi
done

admin_psql -At -F '|' -c \
  "SELECT version, checksum FROM public.application_migrations WHERE version IN ('0020','0023','0024') ORDER BY version" \
  >"$actual_ledger" 2>"$work_dir/ledger-check.err" ||
  fail 'could not read the synthetic migration ledger'
diff -u "$expected_ledger" "$actual_ledger" >"$work_dir/ledger-diff.out" 2>"$work_dir/ledger-diff.err" ||
  fail 'synthetic ledger checksums did not match the repository canonical calculation'

admin_psql -d postgres -c "CREATE DATABASE $wrong_database" >"$work_dir/wrong-db-create.out" 2>"$work_dir/wrong-db-create.err" ||
  fail 'could not create synthetic wrong-target database'
admin_psql -d postgres -c "CREATE DATABASE $missing_database" >"$work_dir/missing-db-create.out" 2>"$work_dir/missing-db-create.err" ||
  fail 'could not create synthetic missing-schema database'

cat >"$work_dir/create-operator.sql" <<EOF
CREATE ROLE $operator_role LOGIN PASSWORD '$operator_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE $database_name TO $operator_role;
GRANT CONNECT ON DATABASE $wrong_database TO $operator_role;
GRANT CONNECT ON DATABASE $missing_database TO $operator_role;
GRANT USAGE ON SCHEMA public TO $operator_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $operator_role;
EOF
chmod 600 "$work_dir/create-operator.sql"
admin_psql -f "$work_dir/create-operator.sql" >"$work_dir/operator-create.out" 2>"$work_dir/operator-create.err" ||
  fail 'could not provision the synthetic pre-existing operator role'
rm -f "$work_dir/create-operator.sql"

cat >"$work_dir/operator.pgpass" <<EOF
127.0.0.1:$published_port:$database_name:$operator_role:$operator_password
EOF
chmod 600 "$work_dir/operator.pgpass"

cat >"$work_dir/pg_service.conf" <<EOF
[owner-preflight]
host=127.0.0.1
port=$published_port
dbname=$database_name
user=$operator_role
sslmode=verify-full
sslrootcert=$image_dir/server.crt

[wrong-target]
host=127.0.0.1
port=$published_port
dbname=$wrong_database
user=$operator_role
sslmode=verify-full
sslrootcert=$image_dir/server.crt

[wrong-host]
host=wrong.invalid
hostaddr=127.0.0.1
port=$published_port
dbname=$database_name
user=$operator_role
sslmode=verify-full
sslrootcert=$image_dir/server.crt

[missing-schema]
host=127.0.0.1
port=$published_port
dbname=$missing_database
user=$operator_role
sslmode=verify-full
sslrootcert=$image_dir/server.crt
EOF
chmod 600 "$work_dir/pg_service.conf"

owner_psql() {
  local service="$1" expected_database="$2" password="$3" output_file="$4" error_file="$5" sql_file="$6"
  printf '%s\n' "$password" |
    env -i PATH="$PATH" HOME="$work_dir" \
      PGSERVICEFILE="$work_dir/pg_service.conf" PGPASSFILE=/dev/null \
      PGOPTIONS='-c search_path=pg_catalog' \
      psql -X -W "service=$service" \
        -v ON_ERROR_STOP=1 -v expected_database="$expected_database" \
        -A -t -F '|' -f "$sql_file" \
        >"$output_file" 2>"$error_file"
}

private_file() {
  [[ -f "$1" ]] || fail "expected private file is absent: $2"
  [[ "$(stat -c '%a' "$1")" == 600 ]] || fail "private file mode is not 0600: $2"
}

phase=verify-reviewed-source-blobs
preflight_sql="$repo_root/scripts/ys-sys-001-readonly-role/preflight-readonly.sql"
assert_blob() {
  local path="$1" expected="$2" label="$3" actual
  actual="$(git -C "$repo_root" hash-object "$repo_root/$path")"
  [[ "$actual" == "$expected" ]] || fail "$label does not match the reviewed repository blob"
}
assert_blob scripts/ys-sys-001-readonly-role/preflight-readonly.sql 9c177c02cccfe56f57a5dbe2942cc80df170a237 'fixed preflight SQL'
assert_blob migrations/0020_systems-directory.sql cb9cfec877d9f65f7cf6c0d2a392ccd3da38d470 'migration 0020'
assert_blob migrations/0023_systems-registry-foundation.sql 798a61b6f20065f2205066569dc7beb185208d7c 'migration 0023'
assert_blob migrations/0024_registry-evidence-billing-monitoring.sql 13103175ba00072c20aa02a8e709d632f5e888f0 'migration 0024'

success_out="$work_dir/preflight.out"
success_err="$work_dir/preflight.err"
phase=execute-owner-style-preflight
owner_psql owner-preflight "$database_name" "$operator_password" "$success_out" "$success_err" "$preflight_sql" ||
  fail 'owner-operated psql invocation failed against the disposable TLS database'

private_file "$work_dir/pg_service.conf" 'libpq service file'
private_file "$work_dir/operator.pgpass" 'synthetic operator password file'
private_file "$work_dir/postgres.env" 'synthetic database environment file'
private_file "$image_dir/server.key" 'synthetic TLS private key'
private_file "$success_out" 'preflight output'
private_file "$success_err" 'preflight errors'
grep -Fq "$database_name|$operator_role|t" "$success_out" ||
  fail 'preflight did not confirm the expected database, operator, and READ ONLY transaction'
grep -Fq '2|2|0|1' "$success_out" ||
  fail 'preflight did not return the synthetic entry aggregate'
grep -Fq 'SYNTHETIC PRIVATE SENTINEL' "$success_out" && fail 'preflight output leaked synthetic business-record content'
grep -Fq 'SYNTHETIC-BILLING-SENTINEL' "$success_out" && fail 'preflight output leaked synthetic billing content'
grep -Fq "$operator_password" "$success_out" "$success_err" && fail 'preflight output leaked an operator credential'
grep -Fq "$database_password" "$success_out" "$success_err" && fail 'preflight output leaked a database credential'
grep -Fq '127.0.0.1' "$success_out" "$success_err" && fail 'preflight output leaked a connection host'

expect_failure() {
  local label="$1" service="$2" expected_database="$3" password="$4" sql_file="$5" pattern="$6"
  local output_file="$work_dir/failure-$label.out" error_file="$work_dir/failure-$label.err"
  if owner_psql "$service" "$expected_database" "$password" "$output_file" "$error_file" "$sql_file"; then
    fail "unsafe or invalid preflight was accepted: $label"
  fi
  private_file "$output_file" "$label output"
  private_file "$error_file" "$label errors"
  if [[ -n "$pattern" ]] && ! grep -Eiq "$pattern" "$error_file"; then
    fail "failure did not identify the expected category: $label"
  fi
  grep -Fq "$operator_password" "$output_file" "$error_file" && fail "$label exposed the operator credential"
  grep -Fq "$database_password" "$output_file" "$error_file" && fail "$label exposed the database credential"
  pass "rejects $label with private output"
}

phase=exercise-failure-cases
expect_failure wrong-host wrong-host "$database_name" "$operator_password" "$preflight_sql" 'certificate|verify|SSL'
expect_failure wrong-target wrong-target "$database_name" "$operator_password" "$preflight_sql" 'division by zero'
expect_failure missing-service missing-service "$database_name" "$operator_password" "$preflight_sql" 'service'
expect_failure authentication owner-preflight "$database_name" "$wrong_password" "$preflight_sql" 'password|authentication'
expect_failure missing-schema missing-schema "$missing_database" "$operator_password" "$preflight_sql" 'does not exist|relation'

cat >"$work_dir/sql-error.sql" <<EOF
SELECT 1 / 0;
EOF
chmod 600 "$work_dir/sql-error.sql"
expect_failure sql-error owner-preflight "$database_name" "$operator_password" "$work_dir/sql-error.sql" 'division by zero'

# A hostile inherited libpq override must not reach psql: the owner invocation
# uses env -i and sets only the reviewed service file and safe client options.
phase=verify-sanitized-environment
if env PGHOST=invalid.invalid DATABASE_URL=synthetic-invalid-target \
  bash -c 'env -i PATH="$PATH" HOME="$1" PGSERVICEFILE="$2" PGPASSFILE="$3" PGOPTIONS="-c search_path=pg_catalog" psql -X -w "service=owner-preflight" -At -c "SELECT current_database()" ' \
  _ "$work_dir" "$work_dir/pg_service.conf" "$work_dir/operator.pgpass" \
  >"$work_dir/sanitized-env.out" 2>"$work_dir/sanitized-env.err"; then
  [[ "$(cat "$work_dir/sanitized-env.out")" == "$database_name" ]] ||
    fail 'sanitized invocation did not use the fixed service entry'
else
  fail 'sanitized invocation depended on inherited environment state'
fi
private_file "$work_dir/sanitized-env.out" 'sanitized environment output'
private_file "$work_dir/sanitized-env.err" 'sanitized environment errors'
grep -Eiq 'invalid\.invalid|synthetic-invalid-target' \
  "$work_dir/sanitized-env.out" "$work_dir/sanitized-env.err" &&
  fail 'inherited connection override leaked into output'

phase=complete
pass 'TLS verify-full, private libpq service file, isolated operator credentials, same sanitized psql invocation, read-only repeatable snapshot, expected-target guard, schema/auth/SQL failure handling, output permissions/redaction, and LF-canonical migration checksums'

