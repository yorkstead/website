import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { insertContactInquiry } from "@/lib/contact-inquiry-persistence";

const databaseURL = process.env.TEST_DATABASE_URL;
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;

afterAll(async () => { await pool?.end(); });

describe("contact inquiry persistence against the migrated PostgreSQL schema", () => {
  databaseTest("persists a new inquiry and treats the same submission key as a duplicate", async () => {
    const connection = await pool!.connect();
    await connection.query("BEGIN");
    try {
      const index = await connection.query<{ indexdef: string }>(
        "SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'contact_inquiries_submission_key_idx'",
      );
      expect(index.rows[0]?.indexdef).toContain("WHERE (submission_key IS NOT NULL)");

      const key = `contact-${randomUUID()}`;
      const values = {
        name: "Synthetic Contact Test",
        email: `contact-${randomUUID()}@example.test`,
        company: "Synthetic Fixture",
        projectType: "General inquiry",
        budget: null,
        message: "Testing migration-backed contact persistence.",
        intake: { inquiryType: "general" },
        attribution: { landingPath: "/contact" },
      };
      const client = { query: (query: string, params?: unknown[]) => connection.query(query, params) };

      const insertedId = await insertContactInquiry(client, values, randomUUID(), key);
      expect(insertedId).toBeGreaterThan(0);
      const persisted = await connection.query<{ name: string; email: string; submission_key: string; intake: { inquiryType: string } }>(
        "SELECT name,email,submission_key,intake FROM contact_inquiries WHERE id=$1",
        [insertedId],
      );
      expect(persisted.rows).toEqual([{
        name: values.name,
        email: values.email,
        submission_key: key,
        intake: values.intake,
      }]);

      expect(await insertContactInquiry(client, { ...values, name: "Changed duplicate payload" }, randomUUID(), key)).toBeNull();
      const duplicateCount = await connection.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE submission_key=$1",
        [key],
      );
      expect(duplicateCount.rows[0]?.count).toBe(1);
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
    }
  });
});
