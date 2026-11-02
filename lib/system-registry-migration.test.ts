import { afterAll, describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { createSystemDirectoryService } from "@/lib/system-directory-service";

const configured = process.env.TEST_DATABASE_URL;
let parsedURL: URL | null = null;
try { parsedURL = configured ? new URL(configured) : null; } catch { /* not a disposable URL */ }
const safeDatabase = Boolean(
  parsedURL &&
  ["postgres:", "postgresql:"].includes(parsedURL.protocol) &&
  ["localhost", "127.0.0.1", "[::1]"].includes(parsedURL.hostname) &&
  /(^|[_-])(test|disposable)([_-]|$)/i.test(parsedURL.pathname),
);
const databaseTest = safeDatabase ? test : test.skip;
const admin = safeDatabase ? new Pool({ connectionString: configured }) : null;
const legacyColumns = `id,tenant_id,revision,name,category,provider,purpose,dashboard_url,documentation_url,
  account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,
  cost_confirmation,renewal_date,pinned,archived_at,manual_health,manual_health_summary,
  manual_health_checked_at,created_at,updated_at`;
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const migration = async (client: { query: (sql: string) => Promise<unknown> }, fileName: string) => {
  const parsed = parseMigration(fileName, await readFile(`migrations/${fileName}`, "utf8"));
  for (const statement of parsed.statements) await client.query(statement);
};

afterAll(async () => { await admin?.end(); });

describe("YS-SYS-001 migration 0023 preservation and compatibility", () => {
  databaseTest("preserves seven synthetic legacy rows and eleven audit events while adding typed schema", async () => {
    const databaseName = `ys_sys_001_test_${randomUUID().replaceAll("-", "")}`;
    await admin!.query(`CREATE DATABASE ${databaseName}`);
    const databaseURL = new URL(configured!);
    databaseURL.pathname = `/${databaseName}`;
    const isolated = new Pool({ connectionString: databaseURL.toString() });
    const client = await isolated.connect();
    try {
      await client.query("BEGIN");
      const existingMigrations = (await readdir("migrations"))
        .filter((fileName) => fileName.endsWith(".sql") && fileName.slice(0, 4) <= "0022")
        .sort();
      expect(existingMigrations).toHaveLength(22);
      for (const fileName of existingMigrations) await migration(client, fileName);

      await client.query("SELECT set_config('yorkstead.system_directory_actor','ys-sys-001-fixture',true)");
      for (let i = 1; i <= 7; i++) {
        const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
        await client.query(`INSERT INTO system_directory_entries
          (id,tenant_id,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,
           billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,
           renewal_date,pinned,manual_health,manual_health_summary,manual_health_checked_at)
          VALUES ($1,'yorkstead-owner',$2,'other','Synthetic Provider',$3,'https://provider.example.test',
            'https://docs.example.test','synthetic-owner@example.test','Synthetic Yorkstead','Synthetic note',
            '[{"kind":"fixture","name":"synthetic"}]'::jsonb,'monthly','USD',$4,'actual','confirmed',
            '2027-01-15',false,'not_monitored','',null)`,
        [id, `Synthetic legacy ${i}`, `Synthetic purpose ${i}`, i * 10]);
      }
      for (let i = 1; i <= 4; i++) {
        await client.query("UPDATE system_directory_entries SET purpose=$1 WHERE id=$2", [
          `Synthetic revised purpose ${i}`,
          `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        ]);
      }
      const rowsBefore = (await client.query(`SELECT ${legacyColumns} FROM system_directory_entries ORDER BY id`)).rows;
      const auditsBefore = (await client.query(`SELECT id::text,tenant_id,entry_id::text,revision,action,actor_id,
        before_state,after_state,created_at FROM system_directory_audit ORDER BY id`)).rows;
      expect(rowsBefore).toHaveLength(7);
      expect(auditsBefore).toHaveLength(11);
      const entryFingerprintsBefore = new Map(rowsBefore.map((row: { id: string }) => [row.id, fingerprint(row)]));
      const auditFingerprintsBefore = new Map(auditsBefore.map((row: { entry_id: string }, index: number) => [`${row.entry_id}:${index}`, fingerprint(row)]));
      const auditCountsBefore = new Map<string, number>();
      for (const row of auditsBefore as Array<{ entry_id: string }>) auditCountsBefore.set(row.entry_id, (auditCountsBefore.get(row.entry_id) ?? 0) + 1);
      let savepointNumber = 0;
      const expectDatabaseError = async (query: () => Promise<unknown>, code: string) => {
        const savepoint = `expected_failure_${savepointNumber++}`;
        await client.query(`SAVEPOINT ${savepoint}`);
        await expect(query()).rejects.toMatchObject({ code });
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      };

      const service = createSystemDirectoryService(client as unknown as Pool);
      const preMigrationView = await service.list(true);
      expect(preMigrationView).toHaveLength(7);
      expect(preMigrationView.every((entry) => !("entityClass" in entry) && !("verificationState" in entry))).toBe(true);

      await migration(client, "0023_systems-registry-foundation.sql");

      const rowsAfter = (await client.query(`SELECT ${legacyColumns} FROM system_directory_entries ORDER BY id`)).rows;
      const auditsAfter = (await client.query(`SELECT id::text,tenant_id,entry_id::text,revision,action,actor_id,
        before_state,after_state,created_at FROM system_directory_audit ORDER BY id`)).rows;
      expect(rowsAfter).toEqual(rowsBefore);
      expect(auditsAfter).toEqual(auditsBefore);
      expect(rowsAfter.map((row: { id: string }) => [row.id, fingerprint(row)])).toEqual([...entryFingerprintsBefore]);
      expect(auditsAfter.map((row: { entry_id: string }, index: number) => [`${row.entry_id}:${index}`, fingerprint(row)])).toEqual([...auditFingerprintsBefore]);
      const auditCountsAfter = new Map<string, number>();
      for (const row of auditsAfter as Array<{ entry_id: string }>) auditCountsAfter.set(row.entry_id, (auditCountsAfter.get(row.entry_id) ?? 0) + 1);
      expect(auditCountsAfter).toEqual(auditCountsBefore);
      expect((await client.query("SELECT count(*)::int AS count FROM system_directory_entries WHERE entity_class='provider_service' AND verification_state='unknown' AND provenance_kind='legacy'")).rows[0].count).toBe(7);
      expect((await client.query("SELECT count(*)::int AS count FROM system_directory_audit")).rows[0].count).toBe(11);

      const classes = ["provider_service", "provider_account", "subscription", "application_workload", "infrastructure_asset", "stack_component"];
      for (const [index, entityClass] of classes.entries()) {
        await client.query(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,entity_class)
          VALUES($1,'yorkstead-owner',$2,'other','Synthetic Provider',$3)`, [randomUUID(), `Synthetic class ${index}`, entityClass]);
      }
      await expectDatabaseError(() => client.query(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,entity_class)
        VALUES($1,'yorkstead-owner','Invalid class','other','Synthetic Provider','unknown_class')`, [randomUUID()]), "23514");

      const parentIds = rowsBefore.slice(0, 2).map((row: { id: string }) => row.id);
      const relationshipId = randomUUID();
      await client.query(`INSERT INTO system_directory_relationships(id,tenant_id,source_entry_id,target_entry_id,relationship_kind)
        VALUES($1,'yorkstead-owner',$2,$3,'depends_on')`, [relationshipId, parentIds[0], parentIds[1]]);
      expect((await client.query("SELECT count(*)::int AS count FROM system_directory_relationship_audit WHERE relationship_id=$1", [relationshipId])).rows[0].count).toBe(1);
      await expectDatabaseError(() => client.query(`INSERT INTO system_directory_relationships(id,tenant_id,source_entry_id,target_entry_id,relationship_kind)
        VALUES($1,'yorkstead-owner',$2,$2,'depends_on')`, [randomUUID(), parentIds[0]]), "23514");
      await expectDatabaseError(() => client.query(`INSERT INTO system_directory_relationships(id,tenant_id,source_entry_id,target_entry_id,relationship_kind)
        VALUES($1,'yorkstead-owner',$2,$3,'depends_on')`, [randomUUID(), parentIds[0], randomUUID()]), "23503");

      await expectDatabaseError(() => client.query("UPDATE system_directory_audit SET action='updated' WHERE id=1"), "23514");
      await expectDatabaseError(() => client.query("DELETE FROM system_directory_audit WHERE id=1"), "23514");
      await expectDatabaseError(() => client.query("TRUNCATE system_directory_audit"), "23514");
      await expectDatabaseError(() => client.query("DELETE FROM system_directory_relationships WHERE id=$1", [relationshipId]), "23514");

      const legacyView = await service.list(true);
      expect(legacyView).toHaveLength(8);
      expect(legacyView.every((entry) => !("entityClass" in entry) && !("verificationState" in entry))).toBe(true);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await isolated.end();
      await admin!.query(`DROP DATABASE ${databaseName} WITH (FORCE)`);
    }
  }, 60000);

  test("migration 0023 is the next ordered migration and remains additive", async () => {
    const migrationFiles = (await readdir("migrations")).filter((fileName) => fileName.endsWith(".sql")).sort();
    expect(migrationFiles.at(-1)).toBe("0023_systems-registry-foundation.sql");
    const source = await readFile("migrations/0023_systems-registry-foundation.sql", "utf8");
    expect(source).not.toMatch(/\b(UPDATE|DELETE)\s+system_directory_entries\b/i);
    expect(source).not.toMatch(/\b(DROP|TRUNCATE)\s+(TABLE|system_directory_)/i);
    expect(source).toContain("REFERENCES system_directory_entries(id) ON DELETE RESTRICT");
  });
});
