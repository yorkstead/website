import { afterAll, expect, test } from "bun:test";
import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { parseMigration } from "@/scripts/migration-plan";
const dbTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
afterAll(() => pool.end());

dbTest("prepared-protocol 0013 to 0014 upgrade preserves legacy private source and authorization", async () => {
  const client = await pool.connect();
  const schema = `cc008_upgrade_${crypto.randomUUID().replaceAll('-','')}`;
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    const files = (await readdir('migrations')).filter(f => f.endsWith('.sql')).sort();
    let number = 0;
    for (const file of files.filter(f => f < '0014')) {
      for (const statement of parseMigration(file, await readFile(`migrations/${file}`,'utf8')).statements) await client.query({ name: `cc008_upgrade_${number++}`, text: statement });
    }
    await client.query("INSERT INTO workspaces(id,data) VALUES ('primary','{\"projects\":[],\"internalSecret\":\"fictional-private-legacy\"}')");
    await client.query("INSERT INTO customer_tenants(id,name,status) VALUES ('cc008-upgrade','Fictional legacy tenant','active')");
    await client.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ('cc008-upgrade','cc008-upgrade-project','active')");
    const legacy = (await client.query("SELECT data FROM workspaces WHERE id='primary'")).rows[0];
    const target = files.find(f => f.startsWith('0014'))!;
    const next = parseMigration(target,await readFile(`migrations/${target}`,'utf8'));
    for (const statement of next.statements) await client.query({ name: `cc008_upgrade_${number++}`, text: statement });
    expect((await client.query("SELECT data FROM workspaces WHERE id='primary'")).rows[0]).toEqual(legacy);
    expect((await client.query("SELECT status FROM customer_tenant_projects WHERE project_id='cc008-upgrade-project'")).rows[0].status).toBe('active');
    expect((await client.query("SELECT count(*)::int n FROM client_project_publications")).rows[0].n).toBe(0);
    expect((await client.query("SELECT count(*)::int n FROM client_project_publication_audit")).rows[0].n).toBe(0);
  } finally { await client.query('ROLLBACK'); client.release(); }
});
