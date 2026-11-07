import { readFile, readdir } from "node:fs/promises";
import { isIPv4 } from "node:net";
import { resolve } from "node:path";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";

const expectedMode = "synthetic-internal-docker-v1";
const versionLimit = "0022";
const host = process.env.YS_APP_RECOVERY_DB_HOST ?? "";
const port = process.env.YS_APP_RECOVERY_DB_PORT ?? "";
const user = process.env.YS_APP_RECOVERY_DB_USER ?? "";
const password = process.env.YS_APP_RECOVERY_DB_PASSWORD ?? "";
const database = process.env.YS_APP_RECOVERY_DB_NAME ?? "";
function isPrivateIPv4(value: string) {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function requireDisposableInputs() {
  if (process.env.CI !== "true" || process.env.GITHUB_ACTIONS !== "true") throw new Error("dedicated CI rehearsal context required");
  if (process.env.YS_APP_RECOVERY_MODE !== expectedMode) throw new Error("synthetic recovery mode required");
  const validHost = isPrivateIPv4(host);
  const validPort = /^\d{1,5}$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;
  if (!validHost || !validPort) throw new Error("private synthetic source service required");
  if (!/^recovery_[a-f0-9]{24}$/.test(database)) throw new Error("generated synthetic database required");
  if (!/^recovery_[a-f0-9]{16}$/.test(user) || !/^[a-f0-9]{64}$/.test(password)) throw new Error("generated synthetic database credentials required");
}

requireDisposableInputs();
const pool = new Pool({
  host,
  port: Number(port),
  user,
  password,
  database,
  connectionTimeoutMillis: 5_000,
  max: 2,
  application_name: "ys_sys_001_synthetic_recovery_schema_prep",
});

let phase = "initial connection";
let migrationVersion: string | undefined;
try {
  phase = "empty source verification";
  const existing = await pool.query<{ count: string }>(`SELECT count(*)::text AS count
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p','v','m','S')
      AND n.nspname NOT IN ('pg_catalog','information_schema')
      AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp_%'`);
  if (Number(existing.rows[0]?.count) !== 0) throw new Error("source database must be empty");

  const migrationDirectory = resolve(import.meta.dir, "../../migrations");
  const filenames = (await readdir(migrationDirectory)).filter((filename) => /^\d{4}_[a-z0-9-]+\.sql$/.test(filename)).sort();
  const migrations = [];
  for (const filename of filenames) {
    if (filename.slice(0, 4) > versionLimit) continue;
    migrations.push(parseMigration(filename, await readFile(resolve(migrationDirectory, filename), "utf8")));
  }
  phase = "repository migration range verification";
  if (migrations.length !== 22 || migrations[0]?.version !== "0001" || migrations.at(-1)?.version !== versionLimit) {
    throw new Error("repository migration range through 0022 is not complete");
  }

  phase = "synthetic ledger creation";
  await pool.query(`CREATE TABLE application_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL CHECK (char_length(checksum)=64),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  for (const migration of migrations) {
    migrationVersion = migration.version;
    phase = "synthetic migration application";
    await pool.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      for (const statement of migration.statements) await pool.query(statement);
      await pool.query("INSERT INTO application_migrations(version,name,checksum) VALUES($1,$2,$3)", [migration.version, migration.name, migration.checksum]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  phase = "canonical migration ledger verification";
  migrationVersion = undefined;
  const ledger = await pool.query<{ version: string; checksum: string }>("SELECT version,checksum FROM application_migrations ORDER BY version");
  if (ledger.rows.length !== 22 || ledger.rows.at(-1)?.version !== versionLimit) throw new Error("migration ledger verification failed");
  for (let index = 0; index < migrations.length; index += 1) {
    const actual = ledger.rows[index];
    const expected = migrations[index];
    if (!actual || !expected || actual.version !== expected.version || actual.checksum !== expected.checksum) throw new Error("canonical migration checksum verification failed");
  }
  process.stdout.write("Synthetic database schema prepared and checksummed through 0022.\n");
} catch (error) {
  const candidate = error as { code?: unknown };
  const safeCode = typeof candidate?.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)
    ? `; SQLSTATE ${candidate.code}`
    : "";
  const safeMigration = migrationVersion ? `; migration ${migrationVersion}` : "";
  process.stderr.write(`Synthetic application database preparation failed during ${phase}${safeMigration}${safeCode}; private details suppressed.\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
