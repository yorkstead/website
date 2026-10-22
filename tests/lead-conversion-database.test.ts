import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { convertLeadRecord } from "@/lib/lead-conversion";

const databaseURL = process.env.TEST_DATABASE_URL;
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;

afterAll(async () => {
  await pool?.end();
});

describe("lead conversion persistence", () => {
  databaseTest("returns the original project and appends it only once across repeated conversion", async () => {
    const email = `conversion-${randomUUID()}@example.com`;
    const inserted = await pool!.query<{ id: number }>(
      "INSERT INTO contact_inquiries (name, email, company, message, ip_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ["Conversion Test", email, "Conversion Test Company", "Test project", randomUUID()],
    );
    const leadId = inserted.rows[0]!.id;
    const firstProjectId = randomUUID();
    const secondProjectId = randomUUID();
    const client = { query: (query: string, params?: unknown[]) => pool!.query(query, params) };

    try {
      const first = await convertLeadRecord(client, leadId, { projectId: firstProjectId, activityId: randomUUID(), now: "2026-10-22T18:00:00.000Z" });
      const second = await convertLeadRecord(client, leadId, { projectId: secondProjectId, activityId: randomUUID(), now: "2026-10-22T18:01:00.000Z" });
      expect(first).toBe(firstProjectId);
      expect(second).toBe(firstProjectId);

      const workspace = await pool!.query<{ data: { projects: Array<{ id: string }> } }>("SELECT data FROM workspaces WHERE id = 'primary'");
      expect(workspace.rows[0]?.data.projects.map((project) => project.id)).toEqual([firstProjectId]);
      const lead = await pool!.query<{ status: string; converted_project_id: string }>("SELECT status, converted_project_id FROM contact_inquiries WHERE id = $1", [leadId]);
      expect(lead.rows[0]).toEqual({ status: "won", converted_project_id: firstProjectId });
    } finally {
      await pool!.query("DELETE FROM workspaces WHERE id = 'primary'");
      await pool!.query("DELETE FROM contact_inquiries WHERE id = $1", [leadId]);
    }
  });
});
