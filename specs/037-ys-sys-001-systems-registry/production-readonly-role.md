# YS-SYS-001 — Production preflight reader role

**Status:** Development implementation prepared for isolated CI review; no Production role or credential has been created. Production inspection remains unauthorized.  
**Scope:** Fixed aggregate/schema preflight only. This role is not for the preservation runner, application use, backups, or general SQL access.

## Findings and boundary

Repository review found no existing dedicated PostgreSQL read-only role definition or grant script. That does not establish whether a similarly scoped role exists in Production; no Production role catalog was queried. The application migration runner records versions/checksums in `public.application_migrations`. The preflight needs the legacy `system_directory_entries` and `system_directory_audit` relations from migration 0020 and, when present, the relationships from 0023 and billing evidence/allocations/audit from 0024.

The prepared scripts grant column-level `SELECT` only for migration version/checksum/time, record and audit IDs/revisions/archive state, the Registry class/legacy markers used for grouped counts, and relationship keys needed to calculate aggregate and orphan counts. They do not grant access to account labels, names, notes, URLs, billing amounts/references, actor IDs, or audit JSON. PostgreSQL catalogs expose schema definitions, constraints, indexes, foreign keys, and trigger definitions without granting application-table content access.

`create-reader.sql` creates `ys_sys_001_preflight_reader` as a dedicated `NOLOGIN` role without a password, with `NOINHERIT`, no superuser/database/role/replication/RLS-bypass attributes, and conservative session defaults. PostgreSQL 16+ gives a non-superuser `CREATEROLE` creator an `ADMIN OPTION` membership in the role it creates; PostgreSQL records the bootstrap superuser as that membership's grantor, with `INHERIT FALSE` and `SET FALSE`. Setup and verification accept only this exact membership for the current non-superuser CREATEROLE operator. They reject the reader being a member of any role, any other administrator, a non-bootstrap grantor, or any membership with inheritance/SET enabled. The admin relationship lets the creator manage the reader role but does not give the reader the administrator's privileges. Setup grants only the fixed read columns and `CONNECT`/schema `USAGE`, with no grant options. The owner sets its password interactively and enables `LOGIN` only after reviewing the grants. Setup checks the expected database name, requires scoped objects to be base tables, and fails closed on effective sequence access, callable public routines, unsafe explicit default ACLs, RLS, or excessive table/column grants. On every unrelated public table, partitioned table, view, materialized view, or foreign table, it rejects effective table-level and column-level read/write/maintenance privileges, including `PUBLIC` grants and grant options. It also requires the database owner and current public-object owners to have an explicit default-privilege revocation for `PUBLIC EXECUTE`; otherwise setup stops. It does not revoke privileges from `PUBLIC` or change database-wide ACLs.

### PostgreSQL privilege limitation

PostgreSQL has no per-role `DENY` that overrides privileges inherited from `PUBLIC`. Setup and verification reject effective `CONNECT`, `CREATE`, or `TEMPORARY` on every other connectable database, whether direct or inherited from `PUBLIC`; no cross-database compatibility exception is made. `CONNECT` alone does not grant table access, but each database has separate schemas, relation grants, default privileges, and callable routines. A verifier connected to the target database cannot prove that another database contains no PUBLIC-readable objects or unsafe `SECURITY DEFINER` functions. Allowing the reader to connect there would exceed the fixed target-only inspection boundary. Other-database `TEMPORARY` by itself is session-local and does not expose persistent rows, but the observed cross-database CONNECT makes its operational/resource implications relevant too. Database `CREATE` remains prohibited everywhere outside the explicitly scoped target permissions.

The scripts accept database `TEMPORARY` only when inherited from the existing `PUBLIC` ACL on the target database; an explicit `TEMPORARY` grant to the reader is rejected. This is a documented target-database boundary exception: the reader can create and write its own session-local temporary objects after changing its session from the configured default read-only mode to read-write. The role's `default_transaction_read_only` is a convenience default, not an authorization boundary; the fixed preflight separately starts an explicit `READ ONLY` transaction. Permanent application-table writes remain blocked by missing DML privileges even when the session default is overridden. Temporary objects disappear when the session ends but can consume temporary storage while the session remains open; `temp_file_limit` does not cap explicit temporary-table storage. A temporary relation can shadow an unqualified relation name in `search_path`; the fixed preflight schema-qualifies application tables, and setup/verifier fail closed if callable public routines are present. Review any newly callable `SECURITY DEFINER` routine for a trusted `search_path` (with `pg_temp` last where appropriate) before using the reader. Use the credential only for the fixed preflight, one operator session at a time, and disable/revoke it immediately afterward. Do not revoke `CONNECT` or `TEMP` from `PUBLIC` to make setup pass: that changes database-wide behavior and requires a separate impact review and explicit owner approval.

The owner-reported aggregate shape (two other databases with PUBLIC CONNECT, no PUBLIC CREATE, one with PUBLIC TEMP) is reproduced in the disposable PostgreSQL 18 regression. It asserts setup and independent verification both fail closed and that failed setup leaves no reader role. The test changes only ephemeral CI database ACLs; it does not modify the Production scripts' security boundary or any Production ACL.

The reader cannot alter or drop existing objects because it is neither superuser nor owner, has no owner-role membership, and has no membership in another role. It cannot administer other roles because it has no `CREATEROLE` attribute or `ADMIN OPTION` memberships. The one permitted creator-admin membership is oriented the other way: the administrator is a member of the reader role, while the reader is not a member of the administrator. Its `INHERIT FALSE` and `SET FALSE` options prevent the reader from gaining or switching into the administrator's privileges. PostgreSQL allows a login role to manage its own password; this is credential self-service, not authority over other roles. The role does not bypass row-level security. Setup and preflight stop if RLS is enabled on a scoped relation, because counts could otherwise be incomplete. The scripts require an expected database name but cannot prove Neon project/branch identity; verify the direct endpoint, project, and branch privately through trusted provider metadata and TLS hostname verification before connecting. Rerun the verifier immediately before the fixed preflight and revoke the temporary credential immediately afterward; concurrent privileged DDL/default-privilege changes remain outside these SQL checks.

## Files

- `scripts/ys-sys-001-readonly-role/create-reader.sql` — owner-run role/grant setup; not yet run against Production.
- `scripts/ys-sys-001-readonly-role/verify-reader.sql` — independent effective-capability assertion; checks attributes, ownership, memberships, and allowed/prohibited privileges.
- `scripts/ys-sys-001-readonly-role/preflight-readonly.sql` — fixed repeatable-read, read-only aggregate and metadata queries; no row-level business fields.
- `scripts/ys-sys-001-readonly-role/revoke-reader.sql` — disable future logins, clear the password, and revoke only the exact column, schema, and current-database grants this setup creates; unrelated grants are preserved for review. Existing sessions must also be terminated.
- `scripts/ys-sys-001-readonly-role/test-synthetic.sh` and fixtures — disposable-cluster tests only; rejects inherited database URLs, cloud variables, and non-local PostgreSQL connections.

## Synthetic validation

The dedicated `.github/workflows/ci.yml` job provisions a fresh PostgreSQL 18 service container for each run. It has only `contents: read`, no repository secrets, no deployment permissions, and no shared database service with the application test job. The runner is CI-only, rejects caller-supplied PostgreSQL/database/cloud environment variables, and uses fixed loopback connection settings inside the job with generated synthetic reader credentials. It creates no external storage or provider connections.

The runner applies the actual YS schema migrations 0020, 0023, and 0024 to an empty synthetic database and only 0020 to a legacy-only synthetic database. It records SHA-256 checksums for each applied migration in the fixture ledger and inserts fictional Registry fixtures only into the 0024 database. It intentionally omits unrelated migrations 0021 and 0022, which have separate prerequisites and are outside this reader's schema scope. Role setup, effective privilege verification, fixed preflight execution, and revocation run against these databases. The PostgreSQL 18 suite also creates a non-superuser `CREATEROLE` operator with scoped grant options, verifies its automatic reader ADMIN membership, tests setup and verification rejection of unsafe membership flags and extra members/admins, and exercises password management and revocation through that same operator. Other coverage includes wrong database names, `PUBLIC` grants and grant options, unsafe default ACLs, executable routines, sequence privileges, actual password-authenticated reader connections, allowed aggregate/metadata reads, sensitive-column denial, write/DDL denial, idempotent setup, unrelated-grant preservation on revocation, and cleanup.

The runner is not a local/Production preflight command. Its target is determined by the isolated Actions service declared in the workflow, not by a user-supplied URL or hostname. It cannot be considered proof of Production ACLs, schema, role presence, database identity, or data contents.

Run only through the dedicated CI job:

```sh
scripts/ys-sys-001-readonly-role/test-synthetic.sh
```

The runner uses the actual migrations rather than a handcrafted Registry schema. It does not accept a database URL or access a remote service.

Local static checks do not constitute a PostgreSQL test pass. Exact-head Actions results must be reviewed before treating the synthetic role suite as validated. This environment has no local PostgreSQL server and its Docker API is unavailable, so the actual disposable database validation is delegated to the authorized Actions job.

The test schema is based on the ordered application migration files through 0024. Its ordinary synthetic baseline revokes `PUBLIC` database `CONNECT`/`TEMP`/`CREATE` and `public` schema privileges. A separate PostgreSQL 18 test restores `PUBLIC TEMP` on the target synthetic database to reproduce the owner-reported ACL, then verifies setup, independent verification, the fixed preflight, temporary-table behavior, protected-column denial, and permanent-table write denial. A direct `TEMP` grant to the reader remains rejected. Production may have different `PUBLIC`, inherited-role, database, schema, or RLS state; setup remains fail-closed on other unapproved effective privileges and does not alter any ACL.

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

1. After separate owner authorization, privately verify the direct Neon endpoint/project/production branch against trusted provider metadata. Confirm the `pg_service.conf` entry has the approved endpoint, `dbname=neondb`, and `sslmode=verify-full`; never infer the branch from the database name or migration count. Use the authorized non-superuser `CREATEROLE` role administrator consistently for setup and verification. PostgreSQL 16+ automatically creates one membership from this operator into the new reader, granted by a superuser, with `ADMIN OPTION TRUE`, `INHERIT FALSE`, and `SET FALSE`; the scripts match all these catalog properties and reject duplicate/other membership rows. Use `psql -X -W "service=ys-sys-001-admin" -v expected_database=neondb` over verified TLS and run `create-reader.sql`. The setup transaction fails closed on unexpected schema/ACL/role state. Do not apply a global `REVOKE` to make it pass.
2. The new role remains `NOLOGIN`. Set its password interactively with psql's `\password ys_sys_001_preflight_reader`; do not include the password in SQL, command arguments, environment output, or shell history. Use a unique high-entropy credential stored only in the owner's approved local secret manager. Then explicitly run `ALTER ROLE ys_sys_001_preflight_reader LOGIN` in that trusted administrator session.
3. Before opening the reader connection, run `verify-reader.sql` as the same authorized role administrator that created the reader; the verifier permits only that creator's exact ADMIN-only membership. Then open a fresh reader connection using `psql -X -W "service=ys-sys-001-reader"`. Confirm TLS verification and the effective user/database privately. If any check fails, stop and revoke/disable; do not query application records.
4. Run only `preflight-readonly.sql` in the approved transaction. Keep output private. This output contains migration checksums and aggregate counts; do not paste it into public issues, PRs, logs, or this conversation. Return only approved redacted counts/status.

Commands, after the private service file is configured:

```sh
psql -X -W "service=ys-sys-001-admin" -v expected_database=neondb -v ON_ERROR_STOP=1 \
  -f scripts/ys-sys-001-readonly-role/create-reader.sql
psql -X -W "service=ys-sys-001-admin"
# At the interactive psql prompt only: \password ys_sys_001_preflight_reader
psql -X -W "service=ys-sys-001-admin" -c 'ALTER ROLE ys_sys_001_preflight_reader LOGIN'
psql -X -W "service=ys-sys-001-admin" -v expected_database=neondb \
  -v ON_ERROR_STOP=1 -f scripts/ys-sys-001-readonly-role/verify-reader.sql
psql -X -W "service=ys-sys-001-reader" -v expected_database=neondb \
  -v ON_ERROR_STOP=1 -f scripts/ys-sys-001-readonly-role/preflight-readonly.sql
```

`-W` prompts without placing the password in an argument or environment variable. The password and query output stay in the owner's private terminal/secret manager.

### Effective privilege validation

The `create-reader.sql` transaction includes fail-closed effective privilege assertions. After setup, independently connect as the new login and confirm all of these conditions from that role's perspective:

- `rolcanlogin=true`; `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication`, `rolbypassrls`, and `rolinherit` are false.
- The reader is not a member of any role and cannot inherit or SET into the administrator. PostgreSQL 16+ has exactly one reverse membership: the creating administrator is a member of the reader role with `ADMIN OPTION`, `INHERIT FALSE`, and `SET FALSE`; no additional administrators or memberships are allowed. No ownership of database, schema, or scoped relations.
- Database `CONNECT` and `public` schema `USAGE` are effective; database `CREATE`, direct reader `TEMP`, schema `CREATE`, and table-level `SELECT` are not. If `TEMP` is inherited from `PUBLIC` on the target database, effective `TEMP` is expected and accepted; no direct reader `TEMP` ACL entry may exist.
- `SELECT` is effective only for the explicit allow-listed columns in `create-reader.sql`; `name`, billing/evidence text, actor IDs, and JSON state are not selectable.
- Effective `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` (PostgreSQL 17+), and column-level write privileges are false for every scoped relation and every unrelated public relation; unrelated relations also have no effective `SELECT` access.
- `BEGIN READ ONLY` succeeds; representative write and DDL attempts fail with permission errors in a disposable database. Do not test by attempting writes in Production.

These are capability checks, not role-name checks. Setup aborts if PUBLIC grants make any prohibited privilege effective; the only exception is the target database's inherited PUBLIC TEMPORARY privilege. The trusted CREATEROLE operator's unavoidable ADMIN OPTION can be used to alter or add memberships after setup, so run the verifier as that same operator immediately before preflight; the verifier rejects additional or changed rows and direct TEMP grants. Do not revoke TEMP from PUBLIC to make this reader pass: that affects every database role and needs a separate impact review and owner approval.

### Revocation and credential rotation

For emergency disablement or retirement, use the separately approved private operator connection and run `revoke-reader.sql`. It sets the role `NOLOGIN`, clears its password, and removes its direct schema/table/column/sequence grants. Then privately inspect `pg_stat_activity` for remaining reader sessions and terminate only those sessions with an authorized operator if termination permission is available. A password change or `NOLOGIN` does not terminate an already authenticated session. Verify fresh login is rejected and all live reader sessions are gone. Once no dependencies remain and ownership is confirmed absent, an authorized administrator may `DROP ROLE ys_sys_001_preflight_reader`; do not use `DROP OWNED` as a shortcut.

For planned credential rotation, disable new logins, terminate existing reader sessions, use psql's interactive `\password` prompt to install a new unique password, re-run effective privilege checks, and re-enable `LOGIN` only after the owner authorizes resumed access. Replace any local password-manager entry and securely remove stale local copies. Never rotate or set this Production credential without the separate authorization.

## Authorization request — Production role setup

**Not authorized by the current task.** Request separate explicit owner approval for one bounded Production operation: privately inspect whether an appropriate role already exists; if absent, execute the reviewed `create-reader.sql` as the authorized role administrator against the privately reconfirmed direct Production database; set the credential interactively; and run effective privilege checks only. Stop on any ACL/schema mismatch, inability to verify target/TLS, or need to change `PUBLIC` grants. This authorization would not allow running `preflight-readonly.sql`, reading migration rows/counts, creating backups, applying migrations 0023/0024, or enabling the Registry; those remain separate gates.
