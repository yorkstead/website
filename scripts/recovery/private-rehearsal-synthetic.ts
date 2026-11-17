import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { privateRecoveryMode } from "./private-rehearsal-policy";

if (process.env.CI !== "true" || process.env.GITHUB_ACTIONS !== "true" || process.env.YS_APP_RECOVERY_SYNTHETIC_VALIDATION !== "true") {
  throw new Error("synthetic GitHub Actions validation context is required");
}
const adminUrl = process.env.YS_PRIVATE_TEST_ADMIN_URL ?? "";
const parsedAdmin = new URL(adminUrl);
if (parsedAdmin.protocol !== "postgresql:" || parsedAdmin.hostname !== "127.0.0.1" || parsedAdmin.port !== "5432"
  || parsedAdmin.username !== "postgres" || parsedAdmin.pathname !== "/postgres" || parsedAdmin.search || parsedAdmin.hash) {
  throw new Error("synthetic local PostgreSQL service is required");
}

const targetId = randomBytes(12).toString("hex");
const setupRole = `ys_sys_setup_${targetId.slice(0, 12)}`;
const runtimeRole = `ys_sys_runtime_${targetId.slice(0, 12)}`;
const database = `ys_sys_001_${targetId}`;
const setupPassword = randomBytes(32).toString("hex");
const runtimePassword = randomBytes(32).toString("hex");
const ownerPassword = randomBytes(24).toString("hex");
const authSecret = randomBytes(32).toString("hex");
for (const value of [setupPassword, runtimePassword, ownerPassword, authSecret]) process.stdout.write(`::add-mask::${value}\n`);
const setupUrl = `postgresql://${setupRole}:${setupPassword}@127.0.0.1:5432/${database}`;
const runtimeUrl = `postgresql://${runtimeRole}:${runtimePassword}@127.0.0.1:5432/${database}`;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
let createdRole = false;
let createdDatabase = false;

function runBun(script: string, extra: Record<string, string | undefined>) {
  const result = spawnSync("bun", [script], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? "/tmp",
      NODE_ENV: "development",
      CI: "true",
      GITHUB_ACTIONS: "true",
      YS_APP_RECOVERY_SYNTHETIC_VALIDATION: "true",
      YS_APP_RECOVERY_MODE: privateRecoveryMode,
      YS_APP_RECOVERY_TARGET_ID: targetId,
      YS_APP_RECOVERY_SETUP_ROLE: setupRole,
      YS_APP_RECOVERY_SETUP_DATABASE_URL: setupUrl,
      YS_APP_RECOVERY_RUNTIME_DATABASE_URL: runtimeUrl,
      YS_APP_RECOVERY_RUNTIME_PASSWORD: runtimePassword,
      YS_APP_RECOVERY_OWNER_PASSWORD: ownerPassword,
      OWNER_EMAIL: "owner@recovery.test",
      BETTER_AUTH_SECRET: authSecret,
      BETTER_AUTH_URL: "https://recovery.test",
      PASSKEY_RP_ID: "recovery.test",
      ...extra,
    },
    stdio: "ignore",
  });
  if (result.error || result.status !== 0) throw new Error("synthetic rehearsal validation step failed");
}

async function applyMigrations() {
  const pool = new Pool({ connectionString: setupUrl, max: 1 });
  try {
    const directory = resolve(import.meta.dir, "../../migrations");
    const filenames = (await readdir(directory)).filter((name) => /^\d{4}_[a-z0-9-]+\.sql$/.test(name) && name.slice(0, 4) <= "0022").sort();
    const migrations = await Promise.all(filenames.map(async (name) => parseMigration(name, await readFile(resolve(directory, name), "utf8"))));
    if (migrations.length !== 22 || migrations[0]?.version !== "0001" || migrations.at(-1)?.version !== "0022") throw new Error("synthetic migration range failed");
    await pool.query(`CREATE TABLE public.application_migrations (
      version TEXT PRIMARY KEY,name TEXT NOT NULL,checksum TEXT NOT NULL CHECK(char_length(checksum)=64),applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    for (const migration of migrations) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        for (const statement of migration.statements) await client.query(statement);
        await client.query("INSERT INTO public.application_migrations(version,name,checksum) VALUES($1,$2,$3)", [migration.version, migration.name, migration.checksum]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

try {
  await admin.query(`CREATE ROLE "${setupRole}" LOGIN NOSUPERUSER NOCREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${setupPassword}'`);
  createdRole = true;
  await admin.query(`CREATE DATABASE "${database}" OWNER "${setupRole}"`);
  createdDatabase = true;
  await admin.query(`COMMENT ON DATABASE "${database}" IS 'ys-sys-001-disposable:${targetId}'`);
  const version = await admin.query<{ version: string }>("SELECT current_setting('server_version_num') AS version");
  if (version.rows[0]?.version !== "180006") throw new Error("synthetic PostgreSQL service is not 18.6");
  await applyMigrations();
  const authMigrate = spawnSync("bun", ["run", "auth:migrate"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? "/tmp",
      NODE_ENV: "development",
      DATABASE_URL: setupUrl,
      BETTER_AUTH_URL: "https://recovery.test",
      OWNER_EMAIL: "owner@recovery.test",
      PASSKEY_RP_ID: "recovery.test",
      BETTER_AUTH_SECRET: authSecret,
    },
    stdio: "ignore",
  });
  if (authMigrate.error || authMigrate.status !== 0) throw new Error("synthetic Better Auth schema preparation failed");
  runBun("scripts/recovery/prepare-private-rehearsal.ts", {});
  runBun("scripts/recovery/verify-private-auth-synthetic.ts", { YS_APP_RECOVERY_RUNTIME_DATABASE_URL: runtimeUrl });
  runBun("scripts/recovery/verify-private-runtime.ts", { YS_APP_RECOVERY_RUNTIME_DATABASE_URL: runtimeUrl });
  process.stdout.write("Synthetic PostgreSQL 18.6 setup-role, Better Auth, RLS, runtime-privilege and tenant-isolation validation passed.\n");
} catch {
  process.stderr.write("Synthetic private-rehearsal integration failed; database diagnostics suppressed.\n");
  process.exitCode = 1;
} finally {
  try {
    await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()", [database]);
    if (createdDatabase) await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
    const setupMembership = await admin.query<{ exists: boolean }>(`SELECT EXISTS(
      SELECT 1 FROM pg_auth_members m JOIN pg_roles granted ON granted.oid=m.roleid JOIN pg_roles member ON member.oid=m.member
      WHERE granted.rolname=$1 AND member.rolname=$2) AS exists`, [runtimeRole, setupRole]);
    if (setupMembership.rows[0]?.exists) await admin.query(`REVOKE "${runtimeRole}" FROM "${setupRole}"`);
    if (createdRole) await admin.query(`DROP ROLE IF EXISTS "${setupRole}"`);
    const runtimeExists = await admin.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=$1) AS exists", [runtimeRole]);
    if (runtimeExists.rows[0]?.exists) await admin.query(`DROP ROLE "${runtimeRole}"`);
  } catch {
    process.stderr.write("Synthetic target-scoped cleanup failed; ephemeral GitHub service teardown remains required.\n");
    process.exitCode = 1;
  }
  await admin.end();
}
