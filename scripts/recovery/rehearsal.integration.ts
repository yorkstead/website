import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, readdir, rm, truncate, writeFile } from "node:fs/promises";
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

disposableTest("backs up and restores the current 0022 empty Directory state and unrelated synthetic application data", async () => {
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
    await source.query(`CREATE TABLE application_migrations(version TEXT PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const migrationDir = resolve(import.meta.dir, "../../migrations");
    const migrationFiles = (await readdir(migrationDir)).filter((file) => /^00(?:0[1-9]|1[0-9]|2[0-2])_.*\.sql$/.test(file)).sort();
    expect(migrationFiles).toHaveLength(22);
    for (const file of migrationFiles) {
      const migration = parseMigration(file, await readFile(resolve(migrationDir, file), "utf8"));
      await source.query("BEGIN");
      try {
        for (const statement of migration.statements) await source.query(statement);
        await source.query("INSERT INTO application_migrations(version,name,checksum) VALUES($1,$2,$3)", [migration.version, migration.name, migration.checksum]);
        await source.query("COMMIT");
      } catch (error) {
        await source.query("ROLLBACK");
        throw error;
      }
    }
    await source.query("CREATE EXTENSION citext");
    await admin!.query("CREATE ROLE ys_backup_fixture_owner NOLOGIN");
    await admin!.query("CREATE ROLE ys_backup_fixture_reader NOLOGIN");
    await admin!.query(`ALTER DATABASE "${sourceName}" OWNER TO ys_backup_fixture_owner`);
    await admin!.query(`GRANT CONNECT ON DATABASE "${sourceName}" TO ys_backup_fixture_reader`);
    await source.query("CREATE SCHEMA backup_fixture AUTHORIZATION ys_backup_fixture_owner");
    await source.query("CREATE TABLE backup_fixture.records(id integer PRIMARY KEY, payload citext NOT NULL)");
    await source.query("ALTER TABLE backup_fixture.records OWNER TO ys_backup_fixture_owner");
    await source.query("GRANT USAGE ON SCHEMA backup_fixture TO ys_backup_fixture_reader");
    await source.query("GRANT SELECT ON backup_fixture.records TO ys_backup_fixture_reader");
    await source.query("INSERT INTO backup_fixture.records VALUES(1,'synthetic fixture only')");
    const entriesBefore = (await source.query("SELECT to_jsonb(e) AS row FROM system_directory_entries e ORDER BY id")).rows;
    const auditBefore = (await source.query("SELECT to_jsonb(a) AS row FROM system_directory_audit a ORDER BY id")).rows;
    const applicationDataBefore = (await source.query("SELECT * FROM backup_fixture.records ORDER BY id")).rows;
    const migrationLedgerBefore = (await source.query("SELECT version,name,checksum FROM application_migrations ORDER BY version")).rows;
    expect(entriesBefore).toHaveLength(0);
    expect(auditBefore).toHaveLength(0);
    expect(migrationLedgerBefore).toHaveLength(22);
    expect(migrationLedgerBefore.at(-1)?.version).toBe("0022");

    const sourceEnv = { RECOVERY_CASE_NAME: caseName, RECOVERY_SOURCE_DB: sourceName, RECOVERY_TARGET_DB: targetName, BACKUP_RECIPIENT: publicRecipient,
      BACKUP_KEY_ID: "synthetic_key", BACKUP_SOURCE_TOKEN: "synthetic_source" };
    const backup = command(["bash", script, "backup"], sourceEnv);
    if (backup.status !== 0) {
      throw new Error(`synthetic backup exited ${backup.status}: ${backup.stderr.replaceAll(sourceName, "[synthetic-db]").slice(0, 500)}`);
    }
    expect((await readdir(output)).sort()).toEqual(["backup.dump.age", "manifest.txt", "manifest.txt.age"]);
    expect((await readFile(resolve(output, "manifest.txt.age"))).toString("utf8", 0, 21)).toStartWith("age-encryption.org/v1");
    const manifest = await readFile(resolve(output, "manifest.txt"), "utf8");
    expect(manifest).toContain("migration_version=0022");
    expect(manifest).toContain("retention_starts_at_utc=");
    expect(manifest).toContain("expires_at_utc=");
    expect(manifest).toMatch(/encrypted_sha256=[0-9a-f]{64}/);
    const start = new Date(manifest.match(/retention_starts_at_utc=(.*)/)![1]).getTime();
    const expiry = new Date(manifest.match(/expires_at_utc=(.*)/)![1]).getTime();
    expect(expiry - start).toBe(30 * 24 * 60 * 60 * 1000);
    expect((await readdir(process.env.RECOVERY_WORKSPACE!)).filter((name) => name.startsWith("plain.") || name.startsWith("retrieve.")).sort()).toEqual([]);

    const interruptedCase = `${caseName}-interrupted`;
    await mkdir(resolve(workspace, interruptedCase, "output"), { recursive: true, mode: 0o700 });
    const interruptedBackup = command(["bash", script, "backup"], { ...sourceEnv, RECOVERY_CASE_NAME: interruptedCase, RECOVERY_TEST_FAIL_AFTER_DUMP: "1" });
    expect(interruptedBackup.status).not.toBe(0);
    expect((await readdir(resolve(workspace, interruptedCase, "output"))).length).toBe(0);
    const invalidRecipientCase = `${caseName}-bad-recipient`;
    await mkdir(resolve(workspace, invalidRecipientCase, "output"), { recursive: true, mode: 0o700 });
    const invalidRecipientBackup = command(["bash", script, "backup"], { ...sourceEnv, RECOVERY_CASE_NAME: invalidRecipientCase, BACKUP_RECIPIENT: "age1invalid" });
    expect(invalidRecipientBackup.status).not.toBe(0);
    expect((await readdir(resolve(workspace, invalidRecipientCase, "output"))).length).toBe(0);

    expect(command(["bash", script, "upload-local"], { ...sourceEnv, RECOVERY_TEST_FAIL_AFTER_COPY: "1" }).status).not.toBe(0);
    expect(await readdir(store)).toEqual([]);
    expect(command(["bash", script, "upload-local"], { ...sourceEnv, RECOVERY_TEST_FAIL_AFTER_FIRST_COMMIT: "1" }).status).not.toBe(0);
    expect((await readdir(store)).sort()).toEqual(["backup.dump.age"]);
    expect((await readdir(store)).some((name) => name.endsWith(".partial"))).toBe(false);
    await rm(store, { recursive: true, force: true });
    await mkdir(store, { mode: 0o700 });
    const originalEncryptedDump = await readFile(resolve(output, "backup.dump.age"));
    await truncate(resolve(output, "backup.dump.age"), 5 * 1024 ** 3 + 1);
    expect(command(["bash", script, "upload-local"], sourceEnv).status).not.toBe(0);
    expect(await readdir(store)).toEqual([]);
    await writeFile(resolve(output, "backup.dump.age"), originalEncryptedDump, { mode: 0o600 });
    expect(command(["bash", script, "upload-local"], sourceEnv).status).toBe(0);
    expect((await readdir(store)).sort()).toEqual(["backup.dump.age", "manifest.txt.age"]);
    expect(await readFile(resolve(store, "backup.dump.age"))).toEqual(await readFile(resolve(output, "backup.dump.age")));
    expect(await readFile(resolve(store, "manifest.txt.age"))).toEqual(await readFile(resolve(output, "manifest.txt.age")));
    const committedDump = await readFile(resolve(store, "backup.dump.age"));
    const committedManifest = await readFile(resolve(store, "manifest.txt.age"));
    expect(command(["bash", script, "upload-local"], sourceEnv).status).not.toBe(0);
    expect(await readFile(resolve(store, "backup.dump.age"))).toEqual(committedDump);
    expect(await readFile(resolve(store, "manifest.txt.age"))).toEqual(committedManifest);
    expect((await readdir(store)).some((name) => name.endsWith(".partial"))).toBe(false);

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
    const storedCiphertext = await readFile(resolve(store, "backup.dump.age"));
    await writeFile(resolve(store, "backup.dump.age"), storedCiphertext.subarray(0, 32));
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
    await rm(resolve(store, "backup.dump.age"));
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
    await copyFile(resolve(store, "backup.dump.age.saved"), resolve(store, "backup.dump.age"));
    await rm(resolve(store, "backup.dump.age.saved"));
    expect((await target.query("SELECT count(*)::int AS n FROM pg_class WHERE relkind IN ('r','p') AND relnamespace='public'::regnamespace")).rows[0].n).toBe(0);
    await source.end();
    source = undefined;
    await target.end();
    target = undefined;
    await admin!.query(`DROP DATABASE ${sourceName} WITH (FORCE)`);
    const restore = command(["bash", script, "restore"], restoreEnv);
    const actualTarget = new Pool({ host, port: Number(process.env.RECOVERY_TEST_PORT), user: process.env.RECOVERY_TEST_USER, password: process.env.RECOVERY_TEST_PASSWORD, database: sourceName });
    target = actualTarget;
    if (restore.status !== 0) {
      const details = `${restore.stderr}\n${restore.stdout}`.replaceAll(sourceName, "[synthetic-db]")
        .replaceAll(targetName, "[synthetic-db]").replaceAll(process.env.RECOVERY_TEST_USER!, "[synthetic-role]")
        .slice(0, 500);
      throw new Error(`synthetic restore exited ${restore.status}: ${details}`);
    }
    expect((await target.query("SELECT to_jsonb(e) AS row FROM system_directory_entries e ORDER BY id")).rows).toEqual(entriesBefore);
    expect((await target.query("SELECT to_jsonb(a) AS row FROM system_directory_audit a ORDER BY id")).rows).toEqual(auditBefore);
    expect((await target.query("SELECT * FROM backup_fixture.records ORDER BY id")).rows).toEqual(applicationDataBefore);
    expect((await target.query("SELECT extname FROM pg_extension WHERE extname='citext'")).rows).toEqual([{ extname: "citext" }]);
    expect((await target.query("SELECT payload = 'SYNTHETIC FIXTURE ONLY' AS equal FROM backup_fixture.records WHERE id=1")).rows[0]?.equal).toBe(true);
    expect((await target.query("SELECT version,name,checksum FROM application_migrations ORDER BY version")).rows).toEqual(migrationLedgerBefore);
    expect((await target.query("SELECT count(*)::int AS n FROM application_migrations WHERE version IN ('0023','0024')")).rows[0].n).toBe(0);
    expect((await target.query("SELECT pg_get_userbyid(c.relowner) AS owner FROM pg_class c WHERE c.oid='backup_fixture.records'::regclass")).rows[0].owner).toBe("ys_backup_fixture_owner");
    expect((await target.query("SELECT has_table_privilege('ys_backup_fixture_reader','backup_fixture.records','SELECT') AS allowed")).rows[0].allowed).toBe(true);
    expect((await target.query("SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database()")).rows[0].owner).toBe("ys_backup_fixture_owner");
    expect((await target.query("SELECT has_database_privilege('ys_backup_fixture_reader',current_database(),'CONNECT') AS allowed")).rows[0].allowed).toBe(true);
    const triggers = (await target.query("SELECT tgname,tgenabled FROM pg_trigger WHERE tgrelid IN ('system_directory_entries'::regclass,'system_directory_audit'::regclass) AND NOT tgisinternal ORDER BY tgname")).rows;
    expect(triggers.map((row) => row.tgname)).toEqual(["system_directory_audit_entry", "system_directory_audit_immutable", "system_directory_revision"]);
    expect(triggers.every((row) => row.tgenabled === "O")).toBe(true);
    await expect(target.query("TRUNCATE system_directory_audit")).rejects.toMatchObject({ code: "23514" });
    expect((await createSystemDirectoryService(target).list(true)).length).toBe(0);
    expect(command(["bash", script, "restore"], restoreEnv).status).not.toBe(0);
  } finally {
    await source?.end();
    await target?.end();
    await admin!.query(`DROP DATABASE IF EXISTS ${sourceName} WITH (FORCE)`).catch(() => undefined);
    await admin!.query(`DROP DATABASE IF EXISTS ${targetName} WITH (FORCE)`).catch(() => undefined);
    await admin!.query("DROP ROLE IF EXISTS ys_backup_fixture_reader").catch(() => undefined);
    await admin!.query("DROP ROLE IF EXISTS ys_backup_fixture_owner").catch(() => undefined);
    await rm(workspace, { recursive: true, force: true });
  }
}, 120_000);
