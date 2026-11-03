import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { parseMigration, validateMigrationPlan } from "@/scripts/migration-plan";
import { captureSystemDirectoryBaseline, type RepositoryMigration } from "@/scripts/ys-sys-001-preservation/capture";
import { encryptUploadRetrieveVerify, type PrivateObjectStore } from "@/scripts/ys-sys-001-preservation/pipeline";
import { SAFE_SYSTEM_PATH, validateExecutionBoundary } from "@/scripts/ys-sys-001-preservation/guards";
import { canonicalize, canonicalFingerprint } from "@/scripts/ys-sys-001-preservation/canonical";

const host = process.env.RECOVERY_TEST_HOST;
const port = Number(process.env.RECOVERY_TEST_PORT);
const adminUser = process.env.RECOVERY_TEST_USER;
const adminPassword = process.env.RECOVERY_TEST_PASSWORD;
const adminDatabase = process.env.RECOVERY_TEST_DB;
if (!host || !port || !adminUser || !adminPassword || !adminDatabase) throw new Error("isolated disposable PostgreSQL entry point is required");

const admin = new Pool({ host, port, user: adminUser, password: adminPassword, database: adminDatabase, max: 2 });
const testDatabase = `ys_sys_001_baseline_${randomUUID().replaceAll("-", "")}`;
const rolePassword = randomBytes(48).toString("hex");
const reader = new Pool({ host, port, user: "ys_sys_001_baseline_reader", password: rolePassword, database: testDatabase, max: 1, ssl: false });
const workRoot = await mkdtemp(join(tmpdir(), "ys-sys-001-baseline-test-"));
await chmod(workRoot, 0o700);
const keyPath = join(workRoot, "synthetic.agekey");
const wrongKeyPath = join(workRoot, "wrong.agekey");
const migrationsDirectory = resolve(import.meta.dir, "../../migrations");
let migrations: RepositoryMigration[] = [];
let recipient = "";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 });
  if (result.error || result.status !== 0) throw new Error(`synthetic test helper failed: ${command}`);
  return result.stdout;
}

class SyntheticObjectStore implements PrivateObjectStore {
  objects = new Map<string, Buffer>();
  mode: "ok" | "interrupt-after-put" | "tamper-get" = "ok";
  async put(key: string, filePath: string) {
    const bytes = await readFile(filePath);
    if (!bytes.toString("utf8", 0, 21).startsWith("age-encryption.org/v1")) throw new Error("plaintext upload rejected");
    this.objects.set(key, bytes);
    if (this.mode === "interrupt-after-put") throw new Error("simulated transfer interruption");
  }
  async get(key: string, filePath: string) {
    const bytes = this.objects.get(key);
    if (!bytes) throw new Error("object missing");
    const copy = Buffer.from(bytes);
    if (this.mode === "tamper-get") copy[copy.length - 1] ^= 1;
    await writeFile(filePath, copy, { mode: 0o600 });
  }
  async remove(key: string) { this.objects.delete(key); }
}

const source = {
  provider: "neon" as const,
  project: "website" as const,
  branch: "production" as const,
  endpointId: "ep-synthetic-only",
  hostname: host!,
  database: testDatabase,
  deploymentSha: "0".repeat(40),
  verifiedAtUtc: new Date().toISOString(),
};

beforeAll(async () => {
  const filenames = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
  const parsed = await Promise.all(filenames.map(async (name) => parseMigration(name, await readFile(resolve(migrationsDirectory, name), "utf8"))));
  validateMigrationPlan(parsed);
  migrations = parsed.map(({ version, name, checksum }) => ({ version, name, checksum }));
  if (migrations.length !== 23 || migrations.at(-1)?.version !== "0023") throw new Error("repository migration fixture must contain migration 0023");

  await admin.query(`CREATE DATABASE ${testDatabase}`);
  const owner = new Pool({ host, port, user: adminUser, password: adminPassword, database: testDatabase, max: 1 });
  try {
    await owner.query(`CREATE TABLE application_migrations (
      version TEXT PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL CHECK (char_length(checksum)=64), applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    for (const migration of parsed.filter((migration) => migration.version !== "0023")) {
      await owner.query("BEGIN");
      try {
        for (const statement of migration.statements) await owner.query(statement);
        await owner.query("INSERT INTO application_migrations(version,name,checksum) VALUES($1,$2,$3)", [migration.version, migration.name, migration.checksum]);
        await owner.query("COMMIT");
      } catch (error) {
        await owner.query("ROLLBACK");
        throw error;
      }
    }
    await owner.query("BEGIN");
    await owner.query("SELECT set_config('yorkstead.system_directory_actor','synthetic-fixture',true)");
    for (let index = 1; index <= 7; index += 1) {
      await owner.query(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,account_identity,billing_cadence,amount,amount_basis,archived_at)
        VALUES($1,'yorkstead-owner',$2,'other','Synthetic provider',$3,'monthly',$4,'actual',NULL)`, [
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        `Synthetic system ${index}`,
        `synthetic-account-${index}`,
        (index * 125).toFixed(2),
      ]);
    }
    for (let index = 1; index <= 4; index += 1) {
      await owner.query("UPDATE system_directory_entries SET purpose=$1 WHERE id=$2", [
        `Synthetic revision ${index}`,
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      ]);
    }
    await owner.query("COMMIT");

    await owner.query(`CREATE ROLE ys_sys_001_baseline_reader LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await owner.query(`GRANT CONNECT ON DATABASE ${testDatabase} TO ys_sys_001_baseline_reader`);
    await owner.query("GRANT USAGE ON SCHEMA public TO ys_sys_001_baseline_reader");
    await owner.query("GRANT SELECT ON public.system_directory_entries, public.system_directory_audit, public.application_migrations TO ys_sys_001_baseline_reader");
  } finally { await owner.end(); }

  run("age-keygen", ["-o", keyPath]);
  run("age-keygen", ["-o", wrongKeyPath]);
  recipient = run("age-keygen", ["-y", keyPath]).trim();
});

afterAll(async () => {
  await reader.end().catch(() => undefined);
  await admin.query(`DROP DATABASE IF EXISTS ${testDatabase} WITH (FORCE)`).catch(() => undefined);
  await admin.query("DROP ROLE IF EXISTS ys_sys_001_baseline_reader").catch(() => undefined);
  await admin.end();
  await rm(workRoot, { recursive: true, force: true });
});

async function capture() {
  return captureSystemDirectoryBaseline({
    pool: reader,
    migrations,
    source,
    connectedHostname: host!,
    capturedAtUtc: new Date().toISOString(),
    operatorLabel: "synthetic-test",
  });
}

test("captures seven synthetic entries and eleven audit events, then encrypts, uploads, retrieves, decrypts and verifies", async () => {
  const result = await capture();
  const evidence = result.evidence as {
    migrationState: { appliedCount: number; latestVersion: string; migration0023Applied: boolean };
    preservation: { entryCount: number; auditEventCount: number; orphanAuditCount: number; entries: { auditCount: number }[]; audits: unknown[] };
    protectionTriggers: { name: string }[];
    roleVerification: { writePrivileges: boolean };
    [key: string]: unknown;
  };
  expect(evidence.migrationState.appliedCount).toBe(22);
  expect(evidence.migrationState.latestVersion).toBe("0022");
  expect(evidence.migrationState.migration0023Applied).toBe(false);
  expect(evidence.preservation.entryCount).toBe(7);
  expect(evidence.preservation.auditEventCount).toBe(11);
  expect(evidence.preservation.orphanAuditCount).toBe(0);
  expect(evidence.preservation.entries.map((row) => row.auditCount)).toEqual([2, 2, 2, 2, 1, 1, 1]);
  expect(evidence.protectionTriggers.map((trigger) => trigger.name)).toEqual([
    "system_directory_audit_entry", "system_directory_revision", "system_directory_audit_immutable",
  ]);
  expect(evidence.roleVerification.writePrivileges).toBe(false);
  expect(canonicalize({ z: 1, a: { d: true, c: null } })).toBe('{"a":{"c":null,"d":true},"z":1}');
  expect(canonicalFingerprint({ a: 1, b: 2 })).toBe(canonicalFingerprint({ b: 2, a: 1 }));

  const store = new SyntheticObjectStore();
  const directory = join(workRoot, "good-store");
  await (await import("node:fs/promises")).mkdir(directory, { mode: 0o700 });
  const uploaded = await encryptUploadRetrieveVerify({
    evidence: evidence,
    privateDirectory: directory,
    objectKey: `ys-sys-001/preservation-baseline/v1/synthetic-${randomUUID()}.json.age`,
    recipient,
    identityPath: keyPath,
    store,
  });
  expect(uploaded.report.status).toBe("PASS");
  expect(uploaded.report.counts).toMatchObject({ entries: 7, auditEvents: 11, orphanAudits: 0, migrations: 22, latestMigration: "0022", migration0023Applied: false });
  expect(uploaded.report.integrity).toEqual({ localCiphertext: "PASS", independentRetrieval: "PASS", decryption: "PASS", evidenceFingerprint: "PASS", triggerProtections: "PASS" });
  expect([...store.objects.values()][0].toString("utf8", 0, 21)).toStartWith("age-encryption.org/v1");
  const decryptedPath = join(workRoot, "inspect.json");
  run("age", ["--decrypt", "--identity", keyPath, "--output", decryptedPath, uploaded.encryptedPath]);
  const decrypted = JSON.parse(await readFile(decryptedPath, "utf8"));
  expect(decrypted.preservation.entries).toHaveLength(7);
  expect(decrypted.preservation.audits).toHaveLength(11);
  const files = await readdir(directory);
  expect(files).toHaveLength(1);
  expect(files[0]).toEndWith(".json.age");
});

test("fails closed on source mismatch, ledger mismatch, missing grants, and extra write privileges", async () => {
  await expect(captureSystemDirectoryBaseline({ pool: reader, migrations, source: { ...source, hostname: "wrong.synthetic.invalid" }, connectedHostname: host!, capturedAtUtc: new Date().toISOString(), operatorLabel: "synthetic" })).rejects.toMatchObject({ code: "source_identity_unverified" });
  const owner = new Pool({ host, port, user: adminUser, password: adminPassword, database: testDatabase });
  try {
    await owner.query("UPDATE application_migrations SET checksum = repeat('0',64) WHERE version='0022'");
    await expect(capture()).rejects.toMatchObject({ code: "migration_ledger_mismatch" });
    const migration = migrations.find((entry) => entry.version === "0022")!;
    await owner.query("UPDATE application_migrations SET checksum=$1 WHERE version='0022'", [migration.checksum]);
    await owner.query("REVOKE SELECT ON public.system_directory_audit FROM ys_sys_001_baseline_reader");
    await expect(capture()).rejects.toMatchObject({ code: "read_only_role_missing_scope" });
    await owner.query("GRANT SELECT ON public.system_directory_audit TO ys_sys_001_baseline_reader");
    await owner.query("GRANT INSERT ON public.system_directory_entries TO ys_sys_001_baseline_reader");
    await expect(capture()).rejects.toMatchObject({ code: "read_only_role_overprivileged" });
    await owner.query("REVOKE INSERT ON public.system_directory_entries FROM ys_sys_001_baseline_reader");
    await owner.query("CREATE TABLE public.synthetic_unapproved_relation (id integer)");
    await owner.query("GRANT SELECT ON public.synthetic_unapproved_relation TO ys_sys_001_baseline_reader");
    await expect(capture()).rejects.toMatchObject({ code: "read_only_role_scope_expanded" });
    await owner.query("REVOKE SELECT ON public.synthetic_unapproved_relation FROM ys_sys_001_baseline_reader");
    await owner.query("DROP TABLE public.synthetic_unapproved_relation");
  } finally { await owner.end(); }
});

test("removes interrupted, tampered, and wrong-key synthetic uploads", async () => {
  const { evidence } = await capture();
  const caseDir = join(workRoot, "failure-store");
  await (await import("node:fs/promises")).mkdir(caseDir, { mode: 0o700 });
  for (const mode of ["interrupt-after-put", "tamper-get"] as const) {
    const store = new SyntheticObjectStore();
    store.mode = mode;
    await expect(encryptUploadRetrieveVerify({ evidence: evidence as Record<string, unknown>, privateDirectory: caseDir, objectKey: `ys-sys-001/preservation-baseline/v1/${mode}-${randomUUID()}.json.age`, recipient, identityPath: keyPath, store })).rejects.toBeDefined();
    expect(store.objects.size).toBe(0);
  }
  const wrongKeyStore = new SyntheticObjectStore();
  await expect(encryptUploadRetrieveVerify({ evidence: evidence as Record<string, unknown>, privateDirectory: caseDir, objectKey: `ys-sys-001/preservation-baseline/v1/wrong-key-${randomUUID()}.json.age`, recipient, identityPath: wrongKeyPath, store: wrongKeyStore })).rejects.toBeDefined();
  expect(wrongKeyStore.objects.size).toBe(0);
  expect((await readdir(caseDir)).some((name) => name.endsWith(".partial"))).toBe(false);
});

test("rejects external URLs, inherited credentials, alternate paths, and execution outside owner WSL", () => {
  const base = { platform: "linux", wslDistro: "Ubuntu", isInteractive: true, argvCount: 0, environment: { PATH: SAFE_SYSTEM_PATH, HOME: "/tmp", WSL_DISTRO_NAME: "Ubuntu" } };
  for (const variable of ["DATABASE_URL", "POSTGRES_URL", "DIRECT_URL", "PGHOST", "PGSERVICEFILE", "AWS_PROFILE", "AWS_ACCESS_KEY_ID", "NEON_API_KEY", "VERCEL_ENV", "YS_SYS_001_STORAGE_PATH", "RECOVERY_OUTPUT_DIR"]) {
    expect(() => validateExecutionBoundary({ ...base, environment: { ...base.environment, [variable]: "rejected" } })).toThrow();
  }
  expect(() => validateExecutionBoundary({ ...base, platform: "darwin" })).toThrow("approved_ubuntu_wsl_required");
  expect(() => validateExecutionBoundary({ ...base, wslDistro: undefined })).toThrow("approved_ubuntu_wsl_required");
  expect(() => validateExecutionBoundary({ ...base, isInteractive: false })).toThrow("interactive_owner_session_required");
  expect(() => validateExecutionBoundary({ ...base, argvCount: 1 })).toThrow("no_cli_options_are_supported");
  expect(() => validateExecutionBoundary({ ...base, ci: true })).toThrow("ci_execution_rejected");
});
