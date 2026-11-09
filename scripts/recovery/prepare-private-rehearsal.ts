import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { inspectMigrationRoutineManifest, migrationRoutineNamesThrough0022, privateDatabaseTables, privateRecoveryMode, privateSessionWriteTables, validatePrivateRecoveryEnvironment } from "./private-rehearsal-policy";

const config = validatePrivateRecoveryEnvironment(process.env);
const setupUrl = process.env.YS_APP_RECOVERY_SETUP_DATABASE_URL!;
const ownerPassword = process.env.YS_APP_RECOVERY_OWNER_PASSWORD ?? "";
const authSecret = process.env.BETTER_AUTH_SECRET ?? "";
const ownerEmail = process.env.OWNER_EMAIL ?? "";
if (ownerEmail !== "owner@recovery.test" || ownerPassword.length < 24 || !/^[a-f0-9]{64}$/.test(authSecret)) {
  throw new Error("generated synthetic owner credentials and private auth secret are required");
}

const pool = new Pool({ connectionString: setupUrl, max: 2, connectionTimeoutMillis: 5_000, application_name: "ys-sys-001-private-recovery-setup" });
const targetComment = `ys-sys-001-disposable:${config.targetId}`;
const runtimeRole = config.runtimeRole;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const quotedRole = `"${runtimeRole}"`;
const ownerId = `ys-sys-001-owner-${config.targetId}`;
const tenantFixtures = ["a", "b"].map((side) => ({
  tenantId: `ys-sys-001-${config.targetId}-tenant-${side}`,
  projectId: `ys-sys-001-${config.targetId}-project-${side}`,
  identityId: `ys-sys-001-${config.targetId}-identity-${side}`,
  subject: `ys-sys-001-${config.targetId}-subject-${side}`,
  email: `synthetic-${side}-${config.targetId}@recovery.test`,
}));

async function assertDisposableTarget() {
  const result = await pool.query<{ db: string; role: string; isSuperuser: boolean; canLogin: boolean; isCreateDb: boolean; isCreateRole: boolean; isReplication: boolean; bypassRls: boolean; inherits: boolean; version: number; comment: string | null; databaseOwner: boolean; hasMembership: boolean }>(`
    SELECT current_database() AS db, current_user AS role, r.rolsuper AS "isSuperuser",
      r.rolcanlogin AS "canLogin", r.rolcreatedb AS "isCreateDb", r.rolcreaterole AS "isCreateRole",
      r.rolreplication AS "isReplication", r.rolbypassrls AS "bypassRls", r.rolinherit AS inherits,
      current_setting('server_version_num')::int AS version,
      shobj_description(d.oid,'pg_database') AS comment, d.datdba=r.oid AS "databaseOwner",
      EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS "hasMembership"
    FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user`);
  const row = result.rows[0];
  if (!row || row.db !== config.database || row.role !== config.setupRole || row.comment !== targetComment
    || row.isSuperuser || !row.canLogin || row.isCreateDb || !row.isCreateRole || row.isReplication || row.bypassRls || row.inherits
    || !row.databaseOwner || row.hasMembership || row.version !== 180006) {
    throw new Error("connection is not the marked PostgreSQL 18 disposable target and setup role");
  }
}

async function assertMigrationsAndRoutines() {
  const migrationFiles = (await readdir(resolve(import.meta.dir, "../../migrations"))).filter((name) => /^\d{4}_[a-z0-9-]+\.sql$/.test(name) && name.slice(0, 4) <= "0022").sort();
  const expectedMigrations = await Promise.all(migrationFiles.map(async (filename) => parseMigration(filename, await readFile(resolve(import.meta.dir, `../../migrations/${filename}`), "utf8"))));
  const ledger = await pool.query<{ version: string; checksum: string }>("SELECT version,checksum FROM public.application_migrations ORDER BY version");
  if (expectedMigrations.length !== 22 || ledger.rows.length !== 22 || ledger.rows.some((row, index) => row.version !== expectedMigrations[index]?.version || row.checksum !== expectedMigrations[index]?.checksum)) throw new Error("target migration ledger does not match repository versions 0001 through 0022");
  const future = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM public.application_migrations WHERE version IN ('0023','0024')");
  if (future.rows[0]?.count !== 0) throw new Error("target contains excluded migration ledger entries");

  const { bodies: expectedBodies, triggers: expectedTriggers } = await inspectMigrationRoutineManifest();
  const actual = await pool.query<{ name: string; source: string; language: string; securityDefiner: boolean }>(`
    SELECT p.proname AS name, p.prosrc AS source, l.lanname AS language, p.prosecdef AS "securityDefiner"
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname IN ('public','customer_auth') AND p.prokind IN ('f','p') ORDER BY p.proname`);
  const actualNames = actual.rows.map((row) => row.name).sort();
  const expectedNames = [...migrationRoutineNamesThrough0022].sort();
  if (actual.rows.length !== expectedNames.length || JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) throw new Error("target routine inventory differs from the reviewed migration 0022 manifest");
  for (const routine of actual.rows) {
    const expected = expectedBodies.get(routine.name);
    if (!expected || routine.securityDefiner || !["plpgsql", "sql"].includes(routine.language) || createHash("sha256").update(routine.source).digest("hex") !== createHash("sha256").update(expected).digest("hex")) {
      throw new Error("target routine definition differs from reviewed migration source");
    }
  }
  const actualTriggers = await pool.query<{ name: string; table: string; routine: string; enabled: string }>(`
    SELECT t.tgname AS name,c.relname AS table,p.proname AS routine,t.tgenabled AS enabled
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY t.tgname,c.relname,p.proname`);
  const actualTriggerKeys = actualTriggers.rows.map((trigger) => `${trigger.name}|${trigger.table}|${trigger.routine}`).sort();
  if (actualTriggerKeys.length !== expectedTriggers.size || actualTriggerKeys.some((key, index) => key !== [...expectedTriggers].sort()[index]) || actualTriggers.rows.some((trigger) => trigger.enabled !== "O")) {
    throw new Error("target trigger inventory or enabled state differs from reviewed migrations");
  }
}

async function seedSyntheticOwner() {
  const existing = await pool.query<{ found: boolean }>('SELECT EXISTS(SELECT 1 FROM public."user" WHERE email=$1) AS found', [ownerEmail]);
  if (existing.rows[0]?.found) throw new Error("reserved synthetic owner identity already exists; refusing to modify it");
  const auth = betterAuth({ baseURL: "https://recovery.test", secret: authSecret, database: pool, emailAndPassword: { enabled: true } });
  const passwordHash = await (await auth.$context).password.hash(ownerPassword);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('INSERT INTO public."user"("id","name","email","emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,true,clock_timestamp(),clock_timestamp())', [ownerId, "Synthetic Recovery Owner", ownerEmail]);
    await client.query('INSERT INTO public."account"("id","userId","accountId","providerId","password","createdAt","updatedAt") VALUES($1,$2,$2,\'credential\',$3,clock_timestamp(),clock_timestamp())', [`${ownerId}-credential`, ownerId, passwordHash]);
    const hiddenId = `ys-sys-001-hidden-${config.targetId}`;
    await client.query('INSERT INTO public."user"("id","name","email","emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,clock_timestamp(),clock_timestamp())', [hiddenId, "Synthetic Isolation Control", `hidden-${config.targetId}@recovery.test`]);
    await client.query('INSERT INTO public."account"("id","userId","accountId","providerId","password","createdAt","updatedAt") VALUES($1,$2,$2,\'synthetic-isolation-control\',NULL,clock_timestamp(),clock_timestamp())', [`${hiddenId}-account`, hiddenId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function seedSyntheticTenantChecks() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [index, fixture] of tenantFixtures.entries()) {
      await client.query("INSERT INTO public.customer_tenants(id,name,status) VALUES($1,$2,'active')", [fixture.tenantId, `Synthetic Recovery Tenant ${index + 1}`]);
      await client.query("INSERT INTO public.customer_tenant_projects(tenant_id,project_id,status) VALUES($1,$2,'active')", [fixture.tenantId, fixture.projectId]);
      await client.query("INSERT INTO public.customer_identities(id,auth_provider,auth_subject,email,status) VALUES($1,$2,$3,$4,'active')", [fixture.identityId, "yorkstead-customer-auth", fixture.subject, fixture.email]);
      await client.query("INSERT INTO public.customer_tenant_memberships(tenant_id,identity_id,role,status) VALUES($1,$2,'member','active')", [fixture.tenantId, fixture.identityId]);
      await client.query("INSERT INTO public.customer_project_grants(tenant_id,project_id,identity_id,permission,status) VALUES($1,$2,$3,'view','active')", [fixture.tenantId, fixture.projectId, fixture.identityId]);
    }
    const hidden = `ys-sys-001-hidden-${config.targetId}`;
    await client.query("INSERT INTO public.customer_tenants(id,name,status) VALUES($1,'Synthetic isolation control','active')", [`${hidden}-tenant`]);
    await client.query("INSERT INTO public.customer_tenant_projects(tenant_id,project_id,status) VALUES($1,$2,'active')", [`${hidden}-tenant`, `${hidden}-project`]);
    await client.query("INSERT INTO public.customer_identities(id,auth_provider,auth_subject,email,status) VALUES($1,'synthetic-isolation-control',$2,$3,'active')", [`${hidden}-identity`, `${hidden}-subject`, `hidden-${config.targetId}@recovery.test`]);
    await client.query("INSERT INTO public.customer_tenant_memberships(tenant_id,identity_id,role,status) VALUES($1,$2,'member','active')", [`${hidden}-tenant`, `${hidden}-identity`]);
    await client.query("INSERT INTO public.customer_project_grants(tenant_id,project_id,identity_id,permission,status) VALUES($1,$2,$3,'view','active')", [`${hidden}-tenant`, `${hidden}-project`, `${hidden}-identity`]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function installRuntimeRowPolicies() {
  const authTables = ["user", "account", "session"];
  const identityTables = ["customer_identities", "customer_tenants", "customer_tenant_memberships", "customer_tenant_projects", "customer_project_grants"];
  const names = [...authTables, ...identityTables];
  const existing = await pool.query<{ count: number }>(`
    SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND (c.relrowsecurity OR EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid))`, [names]);
  if (existing.rows[0]?.count !== 0) throw new Error("target authentication or tenant relations already have row-security configuration");

  const ownerLiteral = literal(ownerId);
  const tenantPrefix = literal(`ys-sys-001-${config.targetId}-tenant-%`);
  const identityPrefix = literal(`ys-sys-001-${config.targetId}-identity-%`);
  for (const table of authTables) await pool.query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);
  await pool.query(`CREATE POLICY ys_sys_001_runtime_owner_read ON public."user" FOR SELECT TO ${quotedRole} USING (id=${ownerLiteral})`);
  await pool.query(`CREATE POLICY ys_sys_001_runtime_owner_read ON public."account" FOR SELECT TO ${quotedRole} USING ("userId"=${ownerLiteral})`);
  await pool.query(`CREATE POLICY ys_sys_001_runtime_owner_read ON public."session" FOR SELECT TO ${quotedRole} USING ("userId"=${ownerLiteral})`);
  await pool.query(`CREATE POLICY ys_sys_001_runtime_owner_session_insert ON public."session" FOR INSERT TO ${quotedRole} WITH CHECK ("userId"=${ownerLiteral})`);

  const predicates: Record<string, string> = {
    customer_identities: `id LIKE ${literal(`ys-sys-001-${config.targetId}-identity-%`)}`,
    customer_tenants: `id LIKE ${tenantPrefix}`,
    customer_tenant_memberships: `tenant_id LIKE ${tenantPrefix} AND identity_id LIKE ${identityPrefix}`,
    customer_tenant_projects: `tenant_id LIKE ${tenantPrefix}`,
    customer_project_grants: `tenant_id LIKE ${tenantPrefix} AND identity_id LIKE ${identityPrefix}`,
  };
  for (const table of identityTables) {
    await pool.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    await pool.query(`CREATE POLICY ys_sys_001_runtime_synthetic_rows ON public.${table} FOR SELECT TO ${quotedRole} USING (${predicates[table]})`);
  }

  const configured = await pool.query<{ count: number; enabled: number }>(`
    SELECT count(DISTINCT c.oid)::int AS count,count(DISTINCT c.oid) FILTER (WHERE c.relrowsecurity)::int AS enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[])`, [names]);
  const policies = await pool.query<{ count: number }>(`
    SELECT count(*)::int AS count FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND $2::oid=ANY(p.polroles)`, [names, (await pool.query<{ oid: string }>("SELECT oid FROM pg_roles WHERE rolname=$1", [runtimeRole])).rows[0]?.oid]);
  if (configured.rows[0]?.count !== names.length || configured.rows[0]?.enabled !== names.length || policies.rows[0]?.count !== 9) {
    throw new Error("target runtime row policies are incomplete");
  }
}

async function configureRuntime() {
  const roleExists = await pool.query<{ found: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=$1) AS found", [runtimeRole]);
  if (roleExists.rows[0]?.found) throw new Error("generated runtime role already exists; refusing to alter it");
  await pool.query(`CREATE ROLE ${quotedRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${literal(config.runtimePassword)}`);
  await pool.query(`REVOKE CONNECT, CREATE, TEMPORARY ON DATABASE ${JSON.stringify(config.database)} FROM PUBLIC`);
  await pool.query(`GRANT CONNECT ON DATABASE ${JSON.stringify(config.database)} TO ${quotedRole}`);
  await pool.query("REVOKE CREATE, USAGE ON SCHEMA public, customer_auth FROM PUBLIC");
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${quotedRole}`);
  await pool.query("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public, customer_auth FROM PUBLIC");
  await pool.query("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public, customer_auth FROM PUBLIC");
  await pool.query("REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public, customer_auth FROM PUBLIC");
  for (const table of privateDatabaseTables) await pool.query(`GRANT SELECT ON TABLE ${table} TO ${quotedRole}`);
  for (const table of privateSessionWriteTables) await pool.query(`GRANT INSERT ON TABLE ${table} TO ${quotedRole}`);
  await installRuntimeRowPolicies();

  const defaults = await pool.query<{ count: number }>(`
    SELECT count(*)::int AS count FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(COALESCE(d.defaclacl,acldefault(d.defaclobjtype,d.defaclrole))) a
    WHERE a.grantee IN (0,(SELECT oid FROM pg_roles WHERE rolname=$1))
      AND ((d.defaclobjtype IN ('f','p') AND a.privilege_type='EXECUTE') OR a.grantee=(SELECT oid FROM pg_roles WHERE rolname=$1))`, [runtimeRole]);
  if ((defaults.rows[0]?.count ?? 0) > 0) throw new Error("target default privileges expose routines or grant runtime rights");
  const publicRoutineExec = await pool.query<{ count: number }>(`
    SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE n.nspname IN ('public','customer_auth') AND a.grantee=0 AND a.privilege_type='EXECUTE'`);
  if ((publicRoutineExec.rows[0]?.count ?? 0) !== 0) throw new Error("PUBLIC can still execute an application routine");
  const bad = await pool.query<{ ok: boolean }>(`
    SELECT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolcreatedb AND NOT r.rolcreaterole
      AND NOT r.rolreplication AND NOT r.rolbypassrls AND NOT r.rolinherit
      AND has_database_privilege(r.rolname,current_database(),'CONNECT')
      AND NOT has_database_privilege(r.rolname,current_database(),'CREATE')
      AND NOT has_database_privilege(r.rolname,current_database(),'TEMPORARY')
      AND has_schema_privilege(r.rolname,'public','USAGE') AND NOT has_schema_privilege(r.rolname,'public','CREATE')
      AND NOT has_schema_privilege(r.rolname,'customer_auth','USAGE')
      AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid)
      AND (SELECT d.datdba<>r.oid FROM pg_database d WHERE d.datname=current_database())
      AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
        AND n.nspname<>'public' AND has_schema_privilege(r.rolname,n.oid,'USAGE'))
      AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
        AND has_schema_privilege(r.rolname,n.oid,'CREATE'))
      AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','customer_auth') AND c.relkind IN ('r','p','v','m') AND (
          c.relowner=r.oid OR
          has_table_privilege(r.rolname,c.oid,'INSERT') AND NOT (n.nspname='public' AND c.relname='session') OR
          has_table_privilege(r.rolname,c.oid,'UPDATE') OR has_table_privilege(r.rolname,c.oid,'DELETE') OR
          has_table_privilege(r.rolname,c.oid,'TRUNCATE') OR has_table_privilege(r.rolname,c.oid,'REFERENCES') OR
          has_table_privilege(r.rolname,c.oid,'TRIGGER') OR
          has_table_privilege(r.rolname,c.oid,'INSERT WITH GRANT OPTION') OR
          has_table_privilege(r.rolname,c.oid,'UPDATE WITH GRANT OPTION') OR
          has_table_privilege(r.rolname,c.oid,'DELETE WITH GRANT OPTION') OR
          has_table_privilege(r.rolname,c.oid,'TRUNCATE WITH GRANT OPTION') OR
          has_table_privilege(r.rolname,c.oid,'REFERENCES WITH GRANT OPTION') OR
          has_table_privilege(r.rolname,c.oid,'TRIGGER WITH GRANT OPTION') OR
          has_table_privilege(r.rolname,c.oid,'SELECT WITH GRANT OPTION')))
      AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','customer_auth') AND c.relkind IN ('r','p','v','m')
          AND has_table_privilege(r.rolname,c.oid,'SELECT')
          AND n.nspname||'.'||c.relname <> ALL($2::text[]))
      AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','customer_auth') AND c.relkind='S'
          AND (c.relowner=r.oid OR has_sequence_privilege(r.rolname,c.oid,'USAGE') OR has_sequence_privilege(r.rolname,c.oid,'SELECT') OR has_sequence_privilege(r.rolname,c.oid,'UPDATE')))
      AND NOT EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='session' AND NOT t.tgisinternal)
      AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault(CASE WHEN p.prokind='p' THEN 'p'::\"char\" ELSE 'f'::\"char\" END,p.proowner))) a
        WHERE n.nspname IN ('public','customer_auth') AND a.grantee IN (0,r.oid) AND a.privilege_type='EXECUTE') AS ok
    FROM pg_roles r WHERE r.rolname=$1`, [runtimeRole, privateDatabaseTables.map((name) => name.replaceAll('"', ""))]);
  if (bad.rows[0]?.ok !== true) throw new Error("effective runtime privileges exceed the private rehearsal allowlist");
}

try {
  if (process.env.YS_APP_RECOVERY_MODE !== privateRecoveryMode) throw new Error("private recovery mode required");
  await assertDisposableTarget();
  await assertMigrationsAndRoutines();
  await seedSyntheticOwner();
  await seedSyntheticTenantChecks();
  await configureRuntime();
  process.stdout.write("Private rehearsal target prepared: migration 0022, synthetic auth and tenant fixtures, restricted runtime role; no identifiers emitted.\n");
} catch {
  process.stderr.write("Private rehearsal target preparation failed; private database diagnostics suppressed.\n");
  process.exitCode = 1;
} finally {
  await pool.end();
}
