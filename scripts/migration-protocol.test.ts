import { afterAll, describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { parseMigration, statementBreakpoint } from "@/scripts/migration-plan";

const databaseTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = process.env.TEST_DATABASE_URL ? new Pool({ connectionString: process.env.TEST_DATABASE_URL }) : null;
const directory = resolve(import.meta.dir, "../migrations");
afterAll(async () => { await pool?.end(); });

describe("migration prepared-query protocol", () => {
  databaseTest("reproduces the production failure for the historic compound trigger block", async () => {
    const source = await readFile(resolve(directory, "0011_document-approval-foundation.sql"), "utf8");
    const compound = source.split(statementBreakpoint).find(sql => sql.trim().startsWith("CREATE TRIGGER document_guard"))!;
    // A query name forces the extended/prepared protocol even without values,
    // matching Neon's one-command-per-prepared-query restriction.
    await expect(pool!.query({ name: "cc005b_compound_reproduction", text: compound })).rejects.toMatchObject({
      code: "42601", message: "cannot insert multiple commands into a prepared statement",
    });
  });

  databaseTest("applies every historical migration through prepared queries including all 17 document triggers", async () => {
    const client = await pool!.connect();
    const schema = `protocol_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      let statementNumber = 0;
      for (const file of (await readdir(directory)).filter(file => file.endsWith(".sql")).sort()) {
        const migration = parseMigration(file, await readFile(resolve(directory, file), "utf8"));
        for (const statement of migration.statements) {
          await client.query({ name: `cc005b_prepared_${statementNumber++}`, text: statement });
        }
      }
      const triggers = await client.query<{ count: number }>(`SELECT count(*)::int AS count
        FROM pg_trigger trigger JOIN pg_class relation ON relation.oid = trigger.tgrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = $1 AND NOT trigger.tgisinternal
          AND relation.relname IN ('document_registry','document_versions','document_approval_requests','document_audit_events')`, [schema]);
      expect(triggers.rows[0].count).toBe(17);
      expect((await client.query("SELECT count(*)::int AS count FROM document_registry")).rows[0].count).toBe(0);
    } finally {
      // All schema creation is confined to this disposable transaction.
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
