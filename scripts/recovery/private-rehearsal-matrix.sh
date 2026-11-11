#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077

fail() { printf 'Synthetic private-rehearsal matrix failed: %s\n' "$1" >&2; exit 1; }
[[ ${CI:-} == true && ${GITHUB_ACTIONS:-} == true && -n ${GITHUB_WORKSPACE:-} \
  && -n ${RUNNER_TEMP:-} && -n ${GITHUB_RUN_ID:-} && -n ${GITHUB_STEP_SUMMARY:-} ]] \
  || fail 'dedicated GitHub Actions context is required'
for utility in docker bun age-keygen age openssl python3 sha256sum; do
  command -v "$utility" >/dev/null || fail 'a required synthetic matrix utility is unavailable'
done
repo=$(realpath -e -- "$(dirname "$0")/../..")
[[ $(git -C "$repo" rev-parse --show-toplevel) == "$GITHUB_WORKSPACE" ]] || fail 'repository path mismatch'
[[ -z $(git -C "$repo" status --porcelain --untracked-files=all) ]] || fail 'synthetic matrix requires a clean checkout'
[[ $(docker --context default context show) == default ]] || fail 'the explicit default Docker context is required'
[[ $(docker --context default info --format '{{.OSType}}') == linux ]] || fail 'Linux Docker is required'

run_tag="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT:-1}-$(openssl rand -hex 4)"
private_root=$(mktemp -d "${RUNNER_TEMP}/ys-sys-001-matrix-${run_tag}.XXXXXXXX")
chmod 700 "$private_root"
workspace_root="$private_root/workspaces"
mkdir -m 700 "$workspace_root"
summary_path="${RUNNER_TEMP}/ys-sys-001-rehearsal-matrix-${GITHUB_RUN_ID}.json"
source_network="ys-sys-001-matrix-source-net-${run_tag}"
source_container="ys-sys-001-matrix-source-${run_tag}"
sentinel_container="ys-sys-001-matrix-sentinel-${run_tag}"
sentinel_network="ys-sys-001-matrix-sentinel-net-${run_tag}"
sentinel_volume="ys-sys-001-matrix-sentinel-volume-${run_tag}"
summary_rows="$private_root/summary-rows.jsonl"
artifact="$private_root/ys-sys-001-synthetic-${run_tag}.age"
identity="$private_root/age-identity.txt"
source_db="recovery_$(openssl rand -hex 12)"
source_user="recovery_$(openssl rand -hex 8)"
source_password="$(openssl rand -hex 32)"
for value in "$source_user" "$source_password"; do printf '::add-mask::%s\n' "$value"; done

cleanup_matrix() {
  status=$?
  trap - EXIT INT TERM HUP
  set +e
  if [[ -d $workspace_root && -f $artifact ]]; then
    shopt -s nullglob
    for run_workspace in "$workspace_root"/*; do
      [[ -f $run_workspace/.ys-sys-001-target-id ]] || continue
      run_target=$(cat "$run_workspace/.ys-sys-001-target-id" 2>/dev/null)
      [[ $run_target =~ ^[a-f0-9]{24}$ ]] || continue
      python3 "$repo/scripts/recovery/private-rehearsal-cleanup.py" cleanup \
        --target-id "$run_target" --workspace "$run_workspace" --artifact "$artifact" \
        --docker-context default >/dev/null 2>&1 || true
    done
  fi
  docker --context default rm -f "$source_container" "$sentinel_container" >/dev/null 2>&1
  docker --context default network rm "$source_network" "$sentinel_network" >/dev/null 2>&1
  docker --context default volume rm "$sentinel_volume" >/dev/null 2>&1
  rm -rf -- "$private_root"
  if (( status != 0 )); then rm -f -- "$summary_path"; fi
  exit "$status"
}
trap cleanup_matrix EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

# Every source row and key is generated in this job. No owner artifact, cloud
# credential, Production connection, or R2 resource is read.
docker --context default pull postgres:18.6-alpine >/dev/null
docker --context default pull nginx:alpine >/dev/null
docker --context default network create --internal "$source_network" >/dev/null
docker --context default network create "$sentinel_network" >/dev/null
docker --context default volume create "$sentinel_volume" >/dev/null
docker --context default create --name "$sentinel_container" postgres:18.6-alpine >/dev/null
sentinel_container_id=$(docker --context default inspect -f '{{.Id}}' "$sentinel_container")
sentinel_network_id=$(docker --context default network inspect -f '{{.Id}}' "$sentinel_network")
sentinel_volume_name=$(docker --context default volume inspect -f '{{.Name}}' "$sentinel_volume")
pg_image_id=$(docker --context default image inspect -f '{{.Id}}' postgres:18.6-alpine)
nginx_image_id=$(docker --context default image inspect -f '{{.Id}}' nginx:alpine)

docker --context default run -d --name "$source_container" --network "$source_network" \
  --network-alias synthetic-source --log-driver=none \
  --health-cmd="pg_isready -U $source_user -d $source_db" --health-interval=2s --health-timeout=2s --health-retries=60 \
  -e POSTGRES_USER="$source_user" -e POSTGRES_PASSWORD="$source_password" -e POSTGRES_DB="$source_db" \
  postgres:18.6-alpine >/dev/null
for attempt in $(seq 1 90); do
  if [[ $(docker --context default inspect -f '{{.State.Health.Status}}' "$source_container" 2>/dev/null || true) == healthy ]]; then break; fi
  (( attempt < 90 )) || fail 'synthetic PostgreSQL 18.6 source did not become ready'
  sleep 1
done
[[ -z $(docker --context default inspect -f '{{range .NetworkSettings.Ports}}{{range .}}{{.HostPort}}{{end}}{{end}}' "$source_container") ]] \
  || fail 'synthetic source unexpectedly publishes a port'
source_ip=$(docker --context default inspect -f "{{(index .NetworkSettings.Networks \"$source_network\").IPAddress}}" "$source_container")
python3 - "$source_ip" <<'PY'
import ipaddress,sys
if not ipaddress.ip_address(sys.argv[1]).is_private: raise SystemExit("synthetic source address is not private")
PY

env -i PATH="$PATH" HOME="$HOME" CI=true GITHUB_ACTIONS=true YS_APP_RECOVERY_MODE=synthetic-internal-docker-v1 \
  YS_APP_RECOVERY_DB_HOST="$source_ip" YS_APP_RECOVERY_DB_PORT=5432 YS_APP_RECOVERY_DB_USER="$source_user" \
  YS_APP_RECOVERY_DB_PASSWORD="$source_password" YS_APP_RECOVERY_DB_NAME="$source_db" \
  bun scripts/recovery/prepare-application-db.ts >/dev/null
source_url="postgresql://${source_user}:${source_password}@${source_ip}:5432/${source_db}"
env -i PATH="$PATH" HOME="$HOME" NODE_ENV=development DATABASE_URL="$source_url" bun run auth:migrate \
  >"$private_root/auth-migrate.private.log" 2>&1 || fail 'synthetic Better Auth schema setup failed'
unset source_url
docker --context default exec -e PGPASSWORD="$source_password" "$source_container" \
  pg_dump -w -Fc --no-owner --no-acl -U "$source_user" -d "$source_db" \
  >"$private_root/synthetic.dump" 2>"$private_root/pg-dump.private.log" || fail 'synthetic archive creation failed'
[[ -s "$private_root/synthetic.dump" ]] || fail 'synthetic archive is empty'
age-keygen -o "$identity" 2>/dev/null
chmod 600 "$identity"
recipient=$(age-keygen -y "$identity")
age -r "$recipient" -o "$artifact" "$private_root/synthetic.dump" 2>/dev/null
chmod 400 "$artifact" "$identity"
rm -f -- "$private_root/synthetic.dump" "$private_root/pg-dump.private.log" "$private_root/auth-migrate.private.log"
artifact_sha=$(sha256sum -- "$artifact" | cut -d' ' -f1)
pg_digest=$(docker --context default image inspect -f '{{range .RepoDigests}}{{println .}}{{end}}' postgres:18.6-alpine | sed -n '1p')
nginx_digest=$(docker --context default image inspect -f '{{range .RepoDigests}}{{println .}}{{end}}' nginx:alpine | sed -n '1p')
[[ $pg_digest == *@sha256:* && $nginx_digest == *@sha256:* ]] || fail 'pinned image digests are unavailable'
pg_image="postgres:18.6-alpine@${pg_digest##*@}"
nginx_image="nginx:alpine@${nginx_digest##*@}"

write_config() {
  local stage=$1 fault=$1 path
  [[ $stage != success ]] || fault=''
  path="$private_root/rehearsal-${stage}.env"
  cat >"$path" <<EOF
YS_PRIVATE_DOCKER_CONTEXT='default'
YS_PRIVATE_WORKSPACE_ROOT='$workspace_root'
YS_PRIVATE_ARTIFACT='$artifact'
YS_PRIVATE_ARTIFACT_SHA256='$artifact_sha'
YS_PRIVATE_ARTIFACT_FORMAT='custom'
YS_PRIVATE_AGE_IDENTITY='$identity'
YS_PRIVATE_POSTGRES_IMAGE='$pg_image'
YS_PRIVATE_NGINX_IMAGE='$nginx_image'
YS_PRIVATE_APP_REPOSITORY='$repo'
YS_PRIVATE_APP_REVISION='6fba1dd297067f7c3af219d2ffdec18006274c53'
YS_PRIVATE_OWNER_CONFIRM='YS-SYS-001 APPROVE PRIVATE DISPOSABLE REHEARSAL'
YS_PRIVATE_SYNTHETIC_FIXTURE='true'
YS_PRIVATE_TEST_ALLOW_NON_WSL='true'
YS_PRIVATE_TEST_FAULT='$fault'
EOF
  chmod 600 "$path"
  printf '%s' "$path"
}

assert_no_target_resources() {
  local target_id=$1 kind remaining
  for kind in containers networks volumes images; do
    case "$kind" in
      containers) remaining=$(docker --context default ps -aq --filter "label=ys-sys-001.target=$target_id") ;;
      networks) remaining=$(docker --context default network ls -q --filter "label=ys-sys-001.target=$target_id") ;;
      volumes) remaining=$(docker --context default volume ls -q --filter "label=ys-sys-001.target=$target_id") ;;
      images) remaining=$(docker --context default image ls -q --filter "label=ys-sys-001.target=$target_id") ;;
    esac
    [[ -z $remaining ]] || fail "target-scoped cleanup left labeled $kind"
  done
}
assert_unrelated_resources() {
  [[ $(docker --context default inspect -f '{{.Id}}' "$sentinel_container") == "$sentinel_container_id" \
    && $(docker --context default network inspect -f '{{.Id}}' "$sentinel_network") == "$sentinel_network_id" \
    && $(docker --context default volume inspect -f '{{.Name}}' "$sentinel_volume") == "$sentinel_volume_name" \
    && $(docker --context default image inspect -f '{{.Id}}' postgres:18.6-alpine) == "$pg_image_id" \
    && $(docker --context default image inspect -f '{{.Id}}' nginx:alpine) == "$nginx_image_id" ]] \
    || fail 'an unrelated container, network, volume, or base image changed'
}

run_case() {
  local stage=$1 expected=$2 config log rc workspace target_id report state before after readiness cleanup_status
  config=$(write_config "$stage")
  log="$private_root/${stage}.private.log"
  before=$(sha256sum -- "$artifact" | cut -d' ' -f1)
  if bash "$repo/scripts/recovery/run-private-rehearsal.sh" "$config" >"$log" 2>&1; then rc=0; else rc=$?; fi
  workspace=$(sed -n 's/^Private rehearsal workspace: //p' "$log" | head -n1)
  [[ -n $workspace && -d $workspace && ! -L $workspace ]] || fail "${stage}: private workspace was not retained"
  case "$workspace/" in "$workspace_root/"*) ;; *) fail "${stage}: workspace escaped the private synthetic root" ;; esac
  target_id=$(cat "$workspace/.ys-sys-001-target-id")
  [[ $target_id =~ ^[a-f0-9]{24}$ ]] || fail "${stage}: target label identifier is invalid"
  report="$workspace/verification.json"
  state="$workspace/rto.json"
  [[ -f $report && -f $state && $(stat -c '%a' "$report") == 600 && $(stat -c '%a' "$state") == 600 ]] \
    || fail "${stage}: sanitized report or private RTO state is missing or exposed"
  after=$(sha256sum -- "$artifact" | cut -d' ' -f1)
  [[ $before == "$artifact_sha" && $after == "$artifact_sha" ]] || fail "${stage}: original synthetic artifact changed"
  python3 - "$report" "$state" "$stage" "$expected" "$rc" "$log" <<'PY'
import json,pathlib,re,sys
report=json.loads(pathlib.Path(sys.argv[1]).read_text())
state=json.loads(pathlib.Path(sys.argv[2]).read_text())
stage,expected,rc=sys.argv[3],sys.argv[4],int(sys.argv[5])
if expected=="success":
    if not (rc==0 and report.get("result")=="PASS" and report.get("cleanup")=="VERIFIED"):
        log=pathlib.Path(sys.argv[6]).read_text(errors="replace")
        reasons=re.findall(r"(?m)^Private rehearsal failed: ([A-Za-z0-9 _.,:-]{1,120})$",log)
        reason=reasons[-1] if reasons else "unclassified"
        result=report.get("result") if report.get("result") in {"PASS","FAIL_READINESS","FAIL_CLEANUP","FAIL_READINESS_AND_CLEANUP"} else "UNKNOWN"
        cleanup=report.get("cleanup") if report.get("cleanup") in {"VERIFIED","FAILED","PENDING"} else "UNKNOWN"
        raise SystemExit(f"Synthetic success case failed: exit={rc}, result={result}, cleanup={cleanup}, category={reason}")
    timing=report.get("timing",{}); cleanup=timing.get("cleanup",{})
    assert timing.get("T0") and timing.get("TReady") and cleanup.get("TCleanupVerified")
    assert timing["TReady"] != cleanup["TCleanupVerified"]
    assert state.get("tReadyUtc") and state.get("tCleanupVerifiedUtc")
    assert state["tReadyUtc"] != state["tCleanupVerifiedUtc"]
elif stage=="cleanup":
    assert rc!=0 and report.get("result")=="FAIL_CLEANUP" and report.get("cleanup")=="FAILED"
    assert report.get("timing",{}).get("TReady") and "cleanup" not in report.get("timing",{})
    assert state.get("tReadyUtc") and not state.get("tCleanupVerifiedUtc")
else:
    assert rc!=0 and report.get("result")=="FAIL_READINESS" and report.get("cleanup")=="VERIFIED"
    assert not report.get("timing",{}).get("TReady")
    assert state.get("tCleanupVerifiedUtc") and not state.get("tReadyUtc")
    assert report.get("timing",{}).get("cleanup",{}).get("readiness")=="NOT_REACHED"
PY

  if [[ $stage == cleanup ]]; then
    for kind in containers networks volumes images; do
      case "$kind" in
        containers) found=$(docker --context default ps -aq --filter "label=ys-sys-001.target=$target_id") ;;
        networks) found=$(docker --context default network ls -q --filter "label=ys-sys-001.target=$target_id") ;;
        volumes) found=$(docker --context default volume ls -q --filter "label=ys-sys-001.target=$target_id") ;;
        images) found=$(docker --context default image ls -q --filter "label=ys-sys-001.target=$target_id") ;;
      esac
      [[ -n $found ]] || fail 'cleanup fault did not retain a labeled target resource'
    done
    # The runbook's scoped recovery command validates the context, every target
    # label/name, and the original synthetic artifact before removing resources.
    python3 "$repo/scripts/recovery/private-rehearsal-cleanup.py" cleanup \
      --target-id "$target_id" --workspace "$workspace" --artifact "$artifact" \
      --docker-context default >"$private_root/scoped-recovery.private.log" 2>&1 \
      || fail 'documented target-scoped recovery command failed'
    python3 "$repo/scripts/recovery/private-rehearsal-clock.py" cleanup-verified --state "$state" \
      >"$private_root/scoped-clock.private.log" 2>&1 || fail 'cleanup recovery timestamp could not be recorded'
    python3 - "$state" "$report" <<'PY'
import json,pathlib,sys
state=json.loads(pathlib.Path(sys.argv[1]).read_text()); report=json.loads(pathlib.Path(sys.argv[2]).read_text())
assert state.get("tCleanupVerifiedUtc") and state.get("tReadyUtc") and state["tCleanupVerifiedUtc"] != state["tReadyUtc"]
assert report.get("result")=="FAIL_CLEANUP" and report.get("cleanup")=="FAILED"
PY
  fi
  assert_no_target_resources "$target_id"
  assert_unrelated_resources
  after=$(sha256sum -- "$artifact" | cut -d' ' -f1)
  [[ $after == "$artifact_sha" ]] || fail "${stage}: original synthetic artifact changed after cleanup"
  python3 - "$report" "$state" "$stage" "$summary_rows" <<'PY'
import json,pathlib,sys
report=json.loads(pathlib.Path(sys.argv[1]).read_text()); state=json.loads(pathlib.Path(sys.argv[2]).read_text())
row={"stage":sys.argv[3],"result":report.get("result"),"cleanup":report.get("cleanup"),
     "readiness":"PASS" if state.get("tReadyUtc") else "NOT_REACHED",
     "cleanupUtcRecorded":bool(state.get("tCleanupVerifiedUtc"))}
if state.get("tReadyUtc"): row["tReadyUtc"]=state["tReadyUtc"]
if state.get("tCleanupVerifiedUtc"): row["tCleanupVerifiedUtc"]=state["tCleanupVerifiedUtc"]
with pathlib.Path(sys.argv[4]).open("a",encoding="utf-8") as stream: stream.write(json.dumps(row,separators=(",",":"))+"\n")
PY
  readiness=$(python3 -c 'import json,sys; print("PASS" if json.load(open(sys.argv[1])).get("tReadyUtc") else "NOT_REACHED")' "$state")
  cleanup_status=$(python3 -c 'import json,sys; print("VERIFIED" if json.load(open(sys.argv[1])).get("tCleanupVerifiedUtc") else "FAILED")' "$state")
  printf 'Synthetic case %s: verified (readiness=%s, cleanup=%s, artifact=preserved, unrelated=preserved).\n' \
    "$stage" "$readiness" "$cleanup_status"
}

: >"$summary_rows"
run_case success success
for stage in restore preparation application-startup browser integrity interrupt-int interrupt-term cleanup; do
  run_case "$stage" failure
done
python3 - "$summary_rows" "$summary_path" <<'PY'
import json,pathlib,sys
rows=[json.loads(line) for line in pathlib.Path(sys.argv[1]).read_text().splitlines() if line]
expected={"success","restore","preparation","application-startup","browser","integrity","interrupt-int","interrupt-term","cleanup"}
if {row["stage"] for row in rows}!=expected or len(rows)!=len(expected): raise SystemExit("synthetic lifecycle matrix is incomplete")
if rows[0]["result"]!="PASS" or rows[0]["cleanup"]!="VERIFIED": raise SystemExit("successful readiness/cleanup case did not pass")
for row in rows[1:-1]:
    if row["result"]!="FAIL_READINESS" or row["readiness"]!="NOT_REACHED" or row["cleanup"]!="VERIFIED": raise SystemExit("failed readiness case was reported as successful")
if rows[-1]["result"]!="FAIL_CLEANUP" or rows[-1]["cleanup"]!="FAILED" or rows[-1]["readiness"]!="PASS" or not rows[-1]["cleanupUtcRecorded"]:
    raise SystemExit("cleanup fault/recovery evidence is inconsistent")
payload={"format":"ys-sys-001-private-rehearsal-matrix-v1","dataClass":"synthetic-only","overall":"PASS",
         "cases":rows,"targetScopedCleanup":"PASS","unrelatedResourcesPreserved":"PASS",
         "syntheticEncryptedArtifactPreserved":"PASS","cleanupFaultRecovery":"PASS"}
path=pathlib.Path(sys.argv[2]); path.write_text(json.dumps(payload,separators=(",",":"))+"\n"); path.chmod(0o600)
PY
printf 'Synthetic private rehearsal matrix: PASS (success + 8 injected stages). Sanitized evidence: %s\n' "$summary_path"
cat "$summary_path" >>"$GITHUB_STEP_SUMMARY"
