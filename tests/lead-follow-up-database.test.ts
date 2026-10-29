import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { buildContactInquiryPageQueries } from "@/lib/contact-inquiries";
import { completeLeadFollowUpRecord, saveLeadDetailsRecord } from "@/lib/lead-follow-up";
import { followUpTimestamp } from "@/lib/lead-rules";

const databaseURL = process.env.TEST_DATABASE_URL;
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;

afterAll(async () => { await pool?.end(); });

describe("lead follow-up lifecycle persistence", () => {
  databaseTest("lists disjoint overdue, today, and future records and moves them on reschedule or completion", async () => {
    const connection = await pool!.connect();
    await connection.query("BEGIN");
    try {
      const date = await connection.query<{ today: string }>("SELECT to_char(NOW() AT TIME ZONE 'America/Denver','YYYY-MM-DD') AS today");
      const today = date.rows[0]!.today;
      const dayKey = (offset: number) => {
        const value = new Date(`${today}T12:00:00Z`);
        value.setUTCDate(value.getUTCDate() + offset);
        return value.toISOString().slice(0, 10);
      };
      const created = await connection.query<{ id: string; status: string; name: string }>(`
        INSERT INTO contact_inquiries(name,email,message,status,ip_hash,follow_up_at)
        VALUES
          ('Synthetic overdue',$1,'Synthetic test','new',$4,$5),
          ('Synthetic today',$2,'Synthetic test','new',$4,$6),
          ('Synthetic future',$3,'Synthetic test','new',$4,$7),
          ('Synthetic closed','closed-' || $1,'Synthetic test','won',$4,$6)
        RETURNING id,status,name
      `, [`cc015-overdue-${randomUUID()}@example.test`, `cc015-today-${randomUUID()}@example.test`, `cc015-future-${randomUUID()}@example.test`, randomUUID(), followUpTimestamp(dayKey(-1)), followUpTimestamp(dayKey(0)), followUpTimestamp(dayKey(2))]);
      const ids = new Map(created.rows.map((row) => [row.name, Number(row.id)]));
      expect([...ids.values()].every(Number.isSafeInteger)).toBe(true);
      const closedId = Number(created.rows.find((row) => row.status === "won")!.id);
      expect(Number.isSafeInteger(closedId)).toBe(true);
      const retired = await connection.query<{ id: string }>("INSERT INTO contact_inquiries(name,email,message,ip_hash,follow_up_at) VALUES ('Synthetic retired',$1,'Synthetic test',$2,$3) RETURNING id", [`cc015-retired-${randomUUID()}@example.test`, randomUUID(), followUpTimestamp(dayKey(0))]);
      const retiredId = Number(retired.rows[0]!.id);
      expect(Number.isSafeInteger(retiredId)).toBe(true);
      const digest = await connection.query<{ digest: string }>("SELECT inquiry_retirement_digest($1) AS digest", [retiredId]);
      await connection.query("SELECT retire_inquiry($1,$2,$3,$4)", [retiredId, digest.rows[0]!.digest, randomUUID(), "CC-015 test"]);
      const queryClient = { query: (query: string, params?: unknown[]) => connection.query(query, params) };
      const list = async (followUp: "overdue" | "today" | "upcoming") => {
        const queries = buildContactInquiryPageQueries({ followUp, page: 1, pageSize: 100 });
        const count = await connection.query<{ count: number }>(queries.count.text, queries.count.params);
        const rows = await connection.query<{ id: string }>(queries.records.text, queries.records.params);
        expect(Number(count.rows[0]?.count ?? 0)).toBe(rows.rows.length);
        return rows.rows.map((row) => Number(row.id));
      };

      expect(await list("overdue")).toEqual([ids.get("Synthetic overdue")!]);
      expect(await list("today")).toEqual([ids.get("Synthetic today")!]);
      expect(await list("upcoming")).toEqual([ids.get("Synthetic future")!]);
      expect(await list("overdue")).not.toContain(closedId);
      expect(await list("today")).not.toContain(retiredId);
      expect(await completeLeadFollowUpRecord(queryClient, retiredId)).toBe(false);

      expect(await saveLeadDetailsRecord(queryClient, ids.get("Synthetic overdue")!, "private follow-up note", followUpTimestamp(dayKey(4)))).toBe(true);
      expect(await list("overdue")).toEqual([]);
      expect(await list("upcoming")).toEqual(expect.arrayContaining([ids.get("Synthetic future"), ids.get("Synthetic overdue")]));
      expect(await completeLeadFollowUpRecord(queryClient, ids.get("Synthetic today")!)).toBe(true);
      expect(await completeLeadFollowUpRecord(queryClient, ids.get("Synthetic today")!)).toBe(false);
      expect(await completeLeadFollowUpRecord(queryClient, closedId)).toBe(false);
      expect(await completeLeadFollowUpRecord(queryClient, 999999999)).toBe(false);
      expect(await list("today")).toEqual([]);
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
    }
  });
});
