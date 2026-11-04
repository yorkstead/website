# YS-SYS-001 — Production preflight reader role

**Status:** Development implementation prepared for isolated CI review; no Production role or credential has been created. Production inspection remains unauthorized.  
**Scope:** Fixed aggregate/schema preflight only. This role is not for the preservation runner, application use, backups, or general SQL access.

## Findings and boundary

Repository review found no existing dedicated PostgreSQL read-only role definition or grant script. That does not establish whether a similarly scoped role exists in Production; no Production role catalog was queried. The application migration runner records versions/checksums in `public.application_migrations`. The preflight needs the legacy `system_directory_entries` and `system_directory_audit` relations from migration 0020 and, when present, the relationships from 0023 and billing evidence/allocations/audit from 0024.

The prepared scripts grant column-level `SELECT` only for migration version/checksum/time, record and audit IDs/revisions/archive state, the Registry class/legacy markers used for grouped counts, and relationship keys needed to calculate aggregate and orphan counts. They do not grant access to account labels, names, notes, URLs, billing amounts/references, actor IDs, or audit JSON. PostgreSQL catalogs expose schema definitions, constraints, indexes, foreign keys, and trigger definitions without granting application-table content access.

`create-reader.sql` creates `ys_sys_001_preflight_reader` as a dedicated login role with no password, no role memberships, `NOINHERIT`, no superuser/database/role/replication/RLS-bypass attributes, and conservative session defaults. It grants only the fixed read columns and `CONNECT`/schema `USAGE`. It is idempotent for the expected role attributes and grants; if a same-named role has unexpected attributes or memberships, it stops without changing it. It does not create users, alter existing roles, revoke privileges from `PUBLIC`, or change database-wide ACLs.

### PostgreSQL privilege limitation

PostgreSQL has no per-role `DENY` that overrides privileges inherited from `PUBLIC`. The setup script checks effective rights and aborts if the reader effectively has database `CREATE` or `TEMP`, access to another database, schema `CREATE`, table-level `SELECT`, unapproved column reads, DML, `TRUNCATE`, `REFERENCES`, trigger/maintenance rights, ownership, or role memberships. In particular, many databases grant `CONNECT`/`TEMP` to `PUBLIC` by default. If those rights make another database accessible or permit temporary-object creation in Production, this plan deliberately stops rather than changing a database-wide grant. Any broader ACL change or relaxation of the no-`CREATE` requirement needs separate security review and owner authorization.

The role cannot alter or drop existing objects because it is neither superuser nor owner and has no owner-role membership. It cannot administer other roles because it has no `CREATEROLE` or role memberships. PostgreSQL allows a login role to manage its own password; this is credential self-service, not authority over other roles. The role does not bypass row-level security. Setup and preflight stop if RLS is enabled on a scoped relation, because counts could otherwise be incomplete. The role has no general-purpose application path and should be used only with the fixed SQL file below.

## Files

- `scripts/ys-sys-001-readonly-role/create-reader.sql` — owner-run role/grant setup; not yet run against Production.
- `scripts/ys-sys-001-readonly-role/verify-reader.sql` — independent effective-capability assertion; checks attributes, ownership, memberships, and allowed/prohibited privileges.
- `scripts/ys-sys-001-readonly-role/preflight-readonly.sql` — fixed repeatable-read, read-only aggregate and metadata queries; no row-level business fields.
- `scripts/ys-sys-001-readonly-role/revoke-reader.sql` — disable future logins and revoke the dedicated role's direct grants; existing sessions must also be terminated.
- `scripts/ys-sys-001-readonly-role/test-synthetic.sh` and fixtures — disposable-cluster tests only; rejects inherited database URLs, cloud variables, and non-local PostgreSQL connections.

## Synthetic validation

The dedicated `.github/workflows/ci.yml` job provisions a fresh PostgreSQL 18 service container for each run. It has only `contents: read`, no repository secrets, no deployment permissions, and no shared database service with the application test job. The runner is CI-only, rejects caller-supplied PostgreSQL/database/cloud environment variables, and uses fixed loopback connection settings inside the job with generated synthetic reader credentials. It creates no external storage or provider connections.

The runner applies the actual YS schema migrations 0020, 0023, and 0024 to an empty synthetic database and only 0020 to a legacy-only synthetic database. It records SHA-256 checksums for each applied migration in the fixture ledger and inserts fictional Registry fixtures only into the 0024 database. It intentionally omits unrelated migrations 0021 and 0022, which have separate prerequisites and are outside this reader's schema scope. Role setup, effective privilege verification, fixed preflight execution, and revocation run against these databases. The runner tests `PUBLIC` grants and role memberships that would widen privileges, actual password-authenticated reader connections, allowed aggregate/metadata reads, sensitive-column denial, write/DDL denial, idempotent setup, and revocation. The captured preflight output is checked for synthetic business labels, notes, actor data, and evidence-reference sentinels.

The runner is not a local/Production preflight command. Its target is determined by the isolated Actions service declared in the workflow, not by a user-supplied URL or hostname. It cannot be considered proof of Production ACLs, schema, role presence, database identity, or data contents.

Run only through the dedicated CI job:

```sh
scripts/ys-sys-001-readonly-role/test-synthetic.sh
```

The runner uses the actual migrations rather than a handcrafted Registry schema. It does not accept a database URL or access a remote service.

Local static checks do not constitute a PostgreSQL test pass. Exact-head Actions results must be reviewed before treating the synthetic role suite as validated. This environment has no local PostgreSQL server and its Docker API is unavailable, so the actual disposable database validation is delegated to the authorized Actions job.

The test schema is based on the ordered application migration files through 0024. It uses a synthetic-only schema ACL baseline that revokes `PUBLIC` database `CONNECT`/`TEMP`/`CREATE` and `public` schema privileges to model the intended boundary. Production may have different `PUBLIC`, inherited-role, database, schema, or RLS state; the owner-run setup deliberately fails closed if those effective privileges are broader than approved. The privilege boundary must still be confirmed against the actual Production catalog under separate authorization.

## Owner-operated Production procedure — only after separate approval

### Before setup

1. Confirm privately that the intended Production project/branch/endpoint/database identity still matches the owner-reported identity PASS. Do not use Preview credentials or pooled endpoints.
2. Use the owner's ThinkPad/Ubuntu WSL and a private, trusted shell with terminal recording disabled. Do not place a connection URL or password in source control, Vercel, GitHub, Codex, CI, shell history, process arguments, or logs.
3. Use the provider-approved authorized role administrator only for one-time role creation/grants. Do not use the application's routine runtime identity unless it is explicitly authorized to create roles.
4. Configure private `~/.pg_service.conf` entries for the confirmed direct endpoint/database: one for the authorized role administrator, one for `ys_sys_001_preflight_reader`. Set `sslmode=verify-full`; set the file mode to `0600`. Do not put a password in this file. Confirm CA verification works before connecting; do not downgrade to `sslmode=require` to bypass certificate errors.
5. Check the active terminal is not recording. Enter the role-administrator credential only using the approved secure method; never copy it into Codex/chat.

Template only; fill the host and administrator role privately on the owner's machine:

```ini
[ys-sys-001-admin]
host=<privately-confirmed-direct-endpoint>
port=5432
dbname=neondb
user=<authorized-role-administrator>
sslmode=verify-full

[ys-sys-001-reader]
host=<same-privately-confirmed-direct-endpoint>
port=5432
dbname=neondb
user=ys_sys_001_preflight_reader
sslmode=verify-full
```

If the local libpq requires an explicit CA, set a private `sslrootcert` path to the current official Neon CA bundle. Keep host, user and certificate paths out of public reports. Run `chmod 600 ~/.pg_service.conf`; do not add `password=` to either service.

### Create and validate the dedicated credential

1. After separate owner authorization, use `psql -X -W "service=ys-sys-001-admin"` over verified TLS as the authorized role administrator and run `scripts/ys-sys-001-readonly-role/create-reader.sql` with `ON_ERROR_STOP` enabled. The setup transaction fails closed on unexpected schema/ACL/role state. Do not apply a global `REVOKE` to make it pass.
2. Set the reader password interactively with psql's `\password ys_sys_001_preflight_reader`; do not include the password in SQL, command arguments, environment output, or shell history. Use a unique high-entropy credential stored only in the owner's approved local secret manager. The setup script itself never accepts or writes a password.
3. Open a fresh reader connection using `psql -X -W "service=ys-sys-001-reader"`. Confirm TLS verification and the effective user/database privately. Run `verify-reader.sql` as the authorized role administrator, then connect as the new login and recheck the role/database identity. If any check fails, stop and revoke/disable; do not query application records.
4. Run only `preflight-readonly.sql` in the approved transaction. Keep output private. This output contains migration checksums and aggregate counts; do not paste it into public issues, PRs, logs, or this conversation. Return only approved redacted counts/status.

Commands, after the private service file is configured:

```sh
psql -X -W "service=ys-sys-001-admin" -v ON_ERROR_STOP=1 \
  -f scripts/ys-sys-001-readonly-role/create-reader.sql
psql -X -W "service=ys-sys-001-admin"
# At the interactive psql prompt only: \password ys_sys_001_preflight_reader
psql -X -W "service=ys-sys-001-admin" \
  -v ON_ERROR_STOP=1 -f scripts/ys-sys-001-readonly-role/verify-reader.sql
psql -X -W "service=ys-sys-001-reader" \
  -v ON_ERROR_STOP=1 -f scripts/ys-sys-001-readonly-role/preflight-readonly.sql
```

`-W` prompts without placing the password in an argument or environment variable. The password and query output stay in the owner's private terminal/secret manager.

### Effective privilege validation

The `create-reader.sql` transaction includes fail-closed effective privilege assertions. After setup, independently connect as the new login and confirm all of these conditions from that role's perspective:

- `rolcanlogin=true`; `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication`, `rolbypassrls`, and `rolinherit` are false.
- No direct or inherited role membership; no ownership of database, schema, or scoped relations.
- Database `CONNECT` and `public` schema `USAGE` are effective; database `CREATE` and `TEMP`, schema `CREATE`, and table-level `SELECT` are not.
- `SELECT` is effective only for the explicit allow-listed columns in `create-reader.sql`; `name`, billing/evidence text, actor IDs, and JSON state are not selectable.
- Effective `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` (PostgreSQL 17+), and column-level write privileges are false for every scoped relation.
- `BEGIN READ ONLY` succeeds; representative write and DDL attempts fail with permission errors in a disposable database. Do not test by attempting writes in Production.

These are capability checks, not role-name checks. The setup aborts if PUBLIC grants make any prohibited privilege effective. A separate owner-approved ACL decision is required if an inherited privilege must be changed.

### Revocation and credential rotation

For emergency disablement or retirement, use the separately approved private operator connection and run `revoke-reader.sql`. It sets the role `NOLOGIN`, clears its password, and removes its direct schema/table/column/sequence grants. Then privately inspect `pg_stat_activity` for remaining reader sessions and terminate only those sessions with an authorized operator if termination permission is available. A password change or `NOLOGIN` does not terminate an already authenticated session. Verify fresh login is rejected and all live reader sessions are gone. Once no dependencies remain and ownership is confirmed absent, an authorized administrator may `DROP ROLE ys_sys_001_preflight_reader`; do not use `DROP OWNED` as a shortcut.

For planned credential rotation, disable new logins, terminate existing reader sessions, use psql's interactive `\password` prompt to install a new unique password, re-run effective privilege checks, and re-enable `LOGIN` only after the owner authorizes resumed access. Replace any local password-manager entry and securely remove stale local copies. Never rotate or set this Production credential without the separate authorization.

## Authorization request — Production role setup

**Not authorized by the current task.** Request separate explicit owner approval for one bounded Production operation: privately inspect whether an appropriate role already exists; if absent, execute the reviewed `create-reader.sql` as the authorized role administrator against the privately reconfirmed direct Production database; set the credential interactively; and run effective privilege checks only. Stop on any ACL/schema mismatch, inability to verify target/TLS, or need to change `PUBLIC` grants. This authorization would not allow running `preflight-readonly.sql`, reading migration rows/counts, creating backups, applying migrations 0023/0024, or enabling the Registry; those remain separate gates.
