import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { convertLeadRecord } from "@/lib/lead-conversion";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";

const databaseURL = disposableTestDatabaseURL();
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;

afterAll(async () => {
  await pool?.end();
});

describe("lead conversion persistence", () => {
  databaseTest("returns the original project and appends it only once across repeated conversion", async () => {
    const connection = await pool!.connect();
    await connection.query("BEGIN");
    const email = `conversion-${randomUUID()}@example.test`;
    try {
      const inserted = await connection.query<{ id: string }>(
        "INSERT INTO contact_inquiries (name, email, company, message, ip_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        ["Conversion Test", email, "Conversion Test Company", "Test project", randomUUID()],
      );
      const leadId = Number(inserted.rows[0]!.id);
      expect(Number.isSafeInteger(leadId)).toBe(true);
      const firstProjectId = randomUUID();
      const secondProjectId = randomUUID();
      const firstActivityId = randomUUID();
      const client = { query: (query: string, params?: unknown[]) => connection.query(query, params) };

      const first = await convertLeadRecord(client, leadId, { projectId: firstProjectId, activityId: firstActivityId, now: "2026-10-22T18:00:00.000Z" });
      const second = await convertLeadRecord(client, leadId, { projectId: secondProjectId, activityId: randomUUID(), now: "2026-10-22T18:01:00.000Z" });
      expect(first).toBe(firstProjectId);
      expect(second).toBe(firstProjectId);

      const workspace = await connection.query<{ data: { projects: Array<{ id: string }>; activity: Array<{ id: string }> } }>("SELECT data FROM workspaces WHERE id = 'primary'");
      expect(workspace.rows[0]?.data.projects.filter((project) => project.id === firstProjectId).map((project) => project.id)).toEqual([firstProjectId]);
      expect(workspace.rows[0]?.data.activity.filter((item) => item.id === firstActivityId)).toHaveLength(1);
      const lead = await connection.query<{ status: string; converted_project_id: string }>("SELECT status, converted_project_id FROM contact_inquiries WHERE id = $1", [leadId]);
      expect(lead.rows[0]).toEqual({ status: "won", converted_project_id: firstProjectId });
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
    }
  });

  databaseTest("does not convert archived inquiries or inquiries with a retirement tombstone", async () => {
    const clientConnection = await pool!.connect();
    const archivedEmail = `archived-conversion-${randomUUID()}@example.test`;
    const retiredEmail = `retired-conversion-${randomUUID()}@example.test`;
    await clientConnection.query("BEGIN");
    try {
      const archived = await clientConnection.query<{ id: string }>(
        "INSERT INTO contact_inquiries (name,email,message,status,archived_at,ip_hash) VALUES ('Synthetic archived',$1,'Expired inquiry','archived',NOW(),$2) RETURNING id",
        [archivedEmail, randomUUID()],
      );
      const retired = await clientConnection.query<{ id: string }>(
        "INSERT INTO contact_inquiries (name,email,message,ip_hash) VALUES ('Synthetic retired',$1,'Retained inquiry',$2) RETURNING id",
        [retiredEmail, randomUUID()],
      );
      const archivedId = Number(archived.rows[0]!.id);
      const retiredId = Number(retired.rows[0]!.id);
      expect(Number.isSafeInteger(archivedId)).toBe(true);
      expect(Number.isSafeInteger(retiredId)).toBe(true);
      const digest = await clientConnection.query<{ digest: string }>("SELECT inquiry_retirement_digest($1) AS digest", [retiredId]);
      await clientConnection.query("SELECT retire_inquiry($1,$2,$3,$4)", [retiredId, digest.rows[0]!.digest, randomUUID(), "CC-015 test"]);
      const transactionClient = { query: (query: string, params?: unknown[]) => clientConnection.query(query, params) };
      const archivedProjectId = randomUUID();
      const retiredProjectId = randomUUID();

      await expect(convertLeadRecord(transactionClient, archivedId, { projectId: archivedProjectId, activityId: randomUUID(), now: new Date().toISOString() })).rejects.toThrow("Restore this archived inquiry");
      await expect(convertLeadRecord(transactionClient, retiredId, { projectId: retiredProjectId, activityId: randomUUID(), now: new Date().toISOString() })).rejects.toThrow("retired and cannot be converted");

      const projects = await clientConnection.query<{ id: string }>("SELECT value->>'id' AS id FROM workspaces, jsonb_array_elements(data->'projects') value WHERE value->>'id' IN ($1,$2)", [archivedProjectId, retiredProjectId]);
      expect(projects.rows).toEqual([]);
    } finally {
      await clientConnection.query("ROLLBACK");
      clientConnection.release();
    }
  });
});
