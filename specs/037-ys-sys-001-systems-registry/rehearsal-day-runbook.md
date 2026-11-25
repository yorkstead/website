# Rehearsal day — Production-derived application readiness

**Status:** procedure, not authorization. Running any step requires the owner's operation-specific approval. The existing `scripts/recovery/application-readiness.sh` is a **synthetic** CI harness; this document is the manual counterpart for a restored Production artifact and says plainly where it is not yet automated.

**Purpose:** prove the application can serve from a restored Production-derived database with outbound effects blocked, and measure the full incident-to-ready interval against the 60-minute target.

## Inputs the owner brings

| Input | Where it lives | Notes |
|---|---|---|
| Encrypted archive (`*.dump.age`) | Private R2; downloaded to the isolated host | Never committed, never in a synced folder |
| age identity file | Owner-held, offline or encrypted media | Mode 0600, regular file |
| Ciphertext SHA-256 | Owner-held record | Compared before decryption |
| Source PostgreSQL version | Owner-confirmed | Must be 18.x; client must be ≥ server major |
| Approved commit SHA | Operation approval | The pinned source for the application image |
| Restore role inventory | Private notes | From `pg_restore -l`; see role mapping |

## RTO clock

Start at **incident declaration**, not at restore. Stop at the declared-ready decision. Every failed attempt stays inside the clock. Suggested phase budget against 60 minutes:

| Phase | Budget |
|---|---:|
| Retrieve and decrypt artifact | 5 min |
| Validate archive | 3 min |
| Prepare target and roles | 7 min |
| Restore | 10 min |
| Configure and start application | 10 min |
| Read-only smoke and isolation proof | 15 min |
| Decision and documentation | 10 min |

## Host

One isolated machine or disposable VM, not the production network:

- Docker 24+ and Compose; no Docker socket mounted into any application container.
- Disk ≥ 2× uncompressed archive plus ~6 GB for images, on an encrypted volume.
- No route to the Production database or the internet. If the host cannot be firewalled, Docker `--internal` networks provide the runtime block; still keep the host off untrusted networks.
- No Production credentials, no `.env` files, no cloud CLI sessions, no provider keys on the host.
- A working directory mode 0700 that is deleted at the end.

## Phase 0 — record start and confirm scope

1. Record UTC start time and the approved commit SHA.
2. Confirm the host has no Production credentials: `env | grep -E 'DATABASE_URL|NEON_|AWS_|R2_|VERCEL_'` must return nothing.
3. Confirm Docker networking works and the internal-network capability is available.

## Phase 1 — artifact custody

```bash
umask 077
mkdir -p "$WORK"            # encrypted volume, not synced
sha256sum "$ARTIFACT" | awk '{print $1}'   # compare with the recorded ciphertext hash
age --decrypt --identity "$AGE_IDENTITY" "$ARTIFACT" > "$WORK/neondb.dump"
pg_restore --list "$WORK/neondb.dump" > "$WORK/archive.toc"
```

Stop if the ciphertext hash differs, decryption fails, the TOC is empty, or the archive is not custom format. Keep `archive.toc` private; it lists object names but not row data.

From `archive.toc`, privately record:

- referenced owner roles (`Owner:` lines),
- ACL entries,
- extensions,
- database and schema objects.

## Phase 2 — target database

```bash
docker network create --internal rto-db
docker run -d --name rto-pg --network rto-db \
  -e POSTGRES_PASSWORD="$PG_ADMIN_PASSWORD" postgres:18-alpine
```

No published ports. No source database on this network — the archive is the only source.

## Phase 3 — roles and restore

A database archive does not contain cluster-global roles. The first recorded attempt failed exactly here on `neon_superuser`.

1. Compare `Owner:` and ACL roles in `archive.toc` with roles present in `rto-pg`.
2. For each missing role, create a **login-disabled, unprivileged placeholder** only if the approved role mapping says so:

```sql
CREATE ROLE "<role>" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
```

3. **Stop** if faithful ownership or ACLs cannot be restored without superuser, `BYPASSRLS`, or broad cluster administration. Do not emulate `neon_superuser` with elevated attributes and do not use `--no-owner`/`--no-acl` to force a pass.
4. Restore:

```bash
docker exec -i -e PGPASSWORD="$PG_ADMIN_PASSWORD" rto-pg \
  pg_restore --create --exit-on-error -U postgres -d postgres < "$WORK/neondb.dump"
```

5. Verify immediately: migration ledger version and checksums, the row counts recorded for the baseline, extension presence, and that revision/audit triggers exist.

## Phase 4 — application

Build the application image from the pinned commit:

```bash
git checkout --detach "$APPROVED_COMMIT"
docker build -f scripts/recovery/application.Dockerfile -t rto-app:"$APPROVED_COMMIT" .
```

Runtime network contains only the database, the app, the TLS proxy, and a browser container:

```bash
docker network create --internal rto-runtime
docker network connect rto-runtime rto-pg
```

Start the app with a **secondary least-privilege role**, not the restore owner:

- `DATABASE_URL` pointing at `rto-pg` on `rto-runtime`, using the generated app role.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_EMAIL`, `OWNER_BOOTSTRAP_TOKEN`, `PASSKEY_RP_ID` — all generated for this rehearsal.
- `YS_SYS_001_ENABLED` **unset or false**.
- No `RESEND_*`, analytics, payment, webhook, R2, or cloud credentials.
- No cron scheduler, queue worker, or integration worker started.

TLS proxy follows `scripts/recovery/application-proxy.conf.template` on port 443, because production auth validation rejects custom ports.

## Phase 5 — smoke and isolation proof

Run these against the proxy, not the app directly:

1. **Boot compatibility** — app starts with no migration execution, no schema repair, and no writes. Check logs for a migration attempt or a Production connection.
2. **Authentication** — synthetic owner completes Better Auth sign-in.
3. **Owner reads** — dashboard renders; legacy Systems Directory loads in its actual restored state (`0023/0024` applied, registry feature flag **off**).
4. **Denial** — anonymous and non-owner requests are rejected; a forged tenant selector is refused.
5. **Tenant isolation** — two synthetic tenants cannot read each other's records.
6. **Egress block** — from inside `rto-runtime`:

```bash
docker run --rm --network rto-runtime curlimages/curl -sS --max-time 5 https://example.com
# must fail; any success fails the rehearsal
```

7. **Integrity** — ledger and counts unchanged after the smoke tests; any test writes exist only in disposable fixtures.

Record each check PASS / FAIL / NOT RUN, with UTC timestamps. A skipped check is not a pass.

## Phase 6 — teardown and evidence

```bash
docker rm -f rto-app rto-proxy rto-browser rto-pg
docker network rm rto-runtime rto-db
docker image rm rto-app:"$APPROVED_COMMIT"
shred -u "$WORK/neondb.dump" 2>/dev/null || rm -f "$WORK/neondb.dump"
```

Produce a sanitized report: application and repository revisions, PostgreSQL version, network controls, per-phase UTC times, total elapsed, PASS/FAIL per acceptance criterion. No row values, hostnames, connection strings, keys, or logs. Raw evidence stays private.

Declare **READY** only if every acceptance criterion passes and the measured total is ≤ 60 minutes, including failed attempts.

## Known gaps in this procedure

- The synthetic CI harness cannot be pointed at a real archive today; this runbook is manual. Automating Phases 2–5 behind an `YS_APP_RECOVERY_ARCHIVE` input is a separate reviewable change.
- The role-mapping step is judgment-based. That is deliberate: silently remapping ownership or ACLs would make the rehearsal lie about what the restore preserves.
- Registry activation is a later, separate gate. This rehearsal runs with `YS_SYS_001_ENABLED` off.
