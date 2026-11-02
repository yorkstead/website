import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { createSystemDirectoryService } from "@/lib/system-directory-service";

const host = process.env.RECOVERY_TEST_HOST;
const safe = Boolean(host && process.env.RECOVERY_TEST_PORT && process.env.RECOVERY_TEST_USER && process.env.RECOVERY_TEST_PASSWORD
  && process.env.RECOVERY_TEST_DB
  && spawnSync("age", ["--version"], { stdio: "ignore" }).status === 0
  && spawnSync("age-keygen", ["--version"], { stdio: "ignore" }).status === 0);
if (!safe) throw new Error("recovery rehearsal requires the isolated entry point");
const disposableTest = test;
const admin = new Pool({ host, port: Number(process.env.RECOVERY_TEST_PORT), user: process.env.RECOVERY_TEST_USER, password: process.env.RECOVERY_TEST_PASSWORD, database: process.env.RECOVERY_TEST_DB });
const script = resolve(import.meta.dir, "disposable.sh");
afterAll(async () => { await admin?.end(); });

function command(args: string[], env: Record<string, string> = {}) {
  const isolatedEnv: Record<string, string> = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    RECOVERY_TEST_HOST: process.env.RECOVERY_TEST_HOST!,
    RECOVERY_TEST_PORT: process.env.RECOVERY_TEST_PORT!,
    RECOVERY_TEST_USER: process.env.RECOVERY_TEST_USER!,
    RECOVERY_TEST_PASSWORD: process.env.RECOVERY_TEST_PASSWORD!,
    RECOVERY_TEST_DB: process.env.RECOVERY_TEST_DB!,
    RECOVERY_WORKSPACE: process.env.RECOVERY_WORKSPACE!,
    YS_RECOVERY_BOUNDARY: process.env.YS_RECOVERY_BOUNDARY!,
    ...env,
  };
  return spawnSync(args[0], args.slice(1), { encoding: "utf8", timeout: 60_000, env: isolatedEnv as NodeJS.ProcessEnv });
}

disposableTest("encrypts, verifies, uploads locally, and restores a synthetic seven/eleven baseline", async () => {
  const caseName = `case-${randomUUID()}`;
  const workspace = resolve(process.env.RECOVERY_WORKSPACE!, caseName);
  const sourceName = `ys_sys_001_test_source_${randomUUID().replaceAll("-", "")}`;
  const targetName = `ys_sys_001_test_target_${randomUUID().replaceAll("-", "")}`;
  const output = resolve(workspace, "output");
  const store = resolve(workspace, "private-store");
  const key = resolve(workspace, "identity.txt");
  let source: Pool | undefined;
  let target: Pool | undefined;
  try {
    await mkdir(workspace, { mode: 0o700 });
    await mkdir(store, { mode: 0o700 });
    await chmod(store, 0o700);
    const generated = command(["age-keygen", "-o", key]);
    expect(generated.status).toBe(0);
    const recipient = command(["age-keygen", "-y", key]);
    expect(recipient.status).toBe(0);
    const publicRecipient = recipient.stdout.trim();
    expect(publicRecipient.startsWith("age1")).toBe(true);

    await admin!.query(`CREATE DATABASE ${sourceName}`);
    source = new Pool({ host, port: Number(process.env.RECOVERY_TEST_PORT), user: process.env.RECOVERY_TEST_USER, password: process.env.RECOVERY_TEST_PASSWORD, database: sourceName });
    const migration = parseMigration("0020_systems-directory.sql", await readFile(resolve(import.meta.dir, "../../migrations/0020_systems-directory.sql"), "utf8"));
    for (const statement of migration.statements) await source.query(statement);
    await source.query(`CREATE TABLE application_migrations(version TEXT PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await source.query("INSERT INTO application_migrations(version,name,checksum) VALUES('0020',$1,$2)", [migration.name, migration.checksum]);
    const writer = await source.connect();
    try {
      await writer.query("BEGIN");
      await writer.query("SELECT set_config('yorkstead.system_directory_actor','synthetic-test',true)");
      for (let i = 1; i <= 7; i++) {
        await writer.query(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,account_identity)
          VALUES($1,'yorkstead-owner',$2,'other','Synthetic Provider','synthetic@example.test')`,
        [`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, `Synthetic service ${i}`]);
      }
      for (let i = 1; i <= 4; i++) {
        await writer.query("UPDATE system_directory_entries SET purpose=$1 WHERE id=$2", [
          `Synthetic revision ${i}`, `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        ]);
      }
      await writer.query("COMMIT");
    } finally { writer.release(); }
    const entriesBefore = (await source.query("SELECT id,tenant_id,revision,account_identity,archived_at FROM system_directory_entries ORDER BY id")).rows;
    const auditBefore = (await source.query("SELECT id,entry_id,revision,action,before_state,after_state FROM system_directory_audit ORDER BY id")).rows;
    expect(entriesBefore).toHaveLength(7);
    expect(auditBefore).toHaveLength(11);

    const sourceEnv = { RECOVERY_CASE_NAME: caseName, RECOVERY_SOURCE_DB: sourceName, RECOVERY_TARGET_DB: targetName, BACKUP_RECIPIENT: publicRecipient,
      BACKUP_KEY_ID: "synthetic_key", BACKUP_SOURCE_TOKEN: "synthetic_source" };
    const backup = command(["bash", script, "backup"], sourceEnv);
    if (backup.status !== 0) {
      throw new Error(`synthetic backup exited ${backup.status}: ${backup.stderr.replaceAll(sourceName, "[synthetic-db]").slice(0, 500)}`);
    }
    expect((await readdir(output)).sort()).toEqual(["backup.dump.age", "manifest.txt"]);
    const manifest = await readFile(resolve(output, "manifest.txt"), "utf8");
    expect(manifest).toContain("migration_version=0020");
    expect(manifest).toContain("retention_starts_at_utc=");
    expect(manifest).toContain("expires_at_utc=");
    expect(manifest).toMatch(/encrypted_sha256=[0-9a-f]{64}/);
    const start = new Date(manifest.match(/retention_starts_at_utc=(.*)/)![1]).getTime();
    const expiry = new Date(manifest.match(/expires_at_utc=(.*)/)![1]).getTime();
    expect(expiry - start).toBe(30 * 24 * 60 * 60 * 1000);

    expect(command(["bash", script, "upload-local"], { ...sourceEnv, RECOVERY_TEST_FAIL_AFTER_COPY: "1" }).status).not.toBe(0);
    expect(await readdir(store)).toEqual([]);
    expect(command(["bash", script, "upload-local"], sourceEnv).status).toBe(0);
    expect((await readdir(store)).sort()).toEqual(["backup.dump.age", "manifest.txt"]);
    expect(await readFile(resolve(store, "backup.dump.age"))).toEqual(await readFile(resolve(output, "backup.dump.age")));

    await admin!.query(`CREATE DATABASE ${targetName}`);
    target = new Pool({ host, port: Number(process.env.RECOVERY_TEST_PORT), user: process.env.RECOVERY_TEST_USER, password: process.env.RECOVERY_TEST_PASSWORD, database: targetName });
    const restoreEnv = sourceEnv;
    const wrongKey = resolve(workspace, "wrong-identity.txt");
    expect(command(["age-keygen", "-o", wrongKey]).status).toBe(0);
    const originalKey = await readFile(key);
    await writeFile(key, await readFile(wrongKey));
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
    await writeFile(key, originalKey);
    await copyFile(resolve(store, "backup.dump.age"), resolve(store, "backup.dump.age.saved"));
    await writeFile(resolve(store, "backup.dump.age"), "corrupted synthetic archive");
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
    await rm(resolve(store, "backup.dump.age"));
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
    await copyFile(resolve(store, "backup.dump.age.saved"), resolve(store, "backup.dump.age"));
    await rm(resolve(store, "backup.dump.age.saved"));
    expect((await target.query("SELECT count(*)::int AS n FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace")).rows[0].n).toBe(0);
    expect(command(["bash", script, "restore"], restoreEnv).status).toBe(0);
    expect((await target.query("SELECT id,tenant_id,revision,account_identity,archived_at FROM system_directory_entries ORDER BY id")).rows).toEqual(entriesBefore);
    expect((await target.query("SELECT id,entry_id,revision,action,before_state,after_state FROM system_directory_audit ORDER BY id")).rows).toEqual(auditBefore);
    expect((await target.query("SELECT count(*)::int AS n FROM system_directory_entries WHERE archived_at IS NOT NULL")).rows[0].n).toBe(0);
    const perEntry = (await target.query("SELECT entry_id,count(*)::int AS n FROM system_directory_audit GROUP BY entry_id ORDER BY entry_id")).rows;
    expect(perEntry.map((row) => row.n)).toEqual([2, 2, 2, 2, 1, 1, 1]);
    const triggers = (await target.query("SELECT tgname,tgenabled FROM pg_trigger WHERE tgrelid IN ('system_directory_entries'::regclass,'system_directory_audit'::regclass) AND NOT tgisinternal ORDER BY tgname")).rows;
    expect(triggers.map((row) => row.tgname)).toEqual(["system_directory_audit_entry", "system_directory_audit_immutable", "system_directory_revision"]);
    expect(triggers.every((row) => row.tgenabled === "O")).toBe(true);
    await expect(target.query("UPDATE system_directory_audit SET action='updated' WHERE id=1")).rejects.toMatchObject({ code: "23514" });
    expect((await createSystemDirectoryService(target).list(true)).length).toBe(7);
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
  } finally {
    await source?.end();
    await target?.end();
    await admin!.query(`DROP DATABASE IF EXISTS ${sourceName} WITH (FORCE)`).catch(() => undefined);
    await admin!.query(`DROP DATABASE IF EXISTS ${targetName} WITH (FORCE)`).catch(() => undefined);
    await rm(workspace, { recursive: true, force: true });
  }
}, 120_000);
