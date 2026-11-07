import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";
import { archivedInquiryPurgeQuery } from "@/lib/data-retention";

const databaseURL = disposableTestDatabaseURL();
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;
const token = randomUUID();
const emails = ["linked", "unrelated", "active", "recent"].map((label) => `marketing-retention-${label}-${token}@example.test`);
const workspaceId = `marketing-retention-${token}`;

afterAll(async () => {
  if (!pool) return;
  await pool.query("DELETE FROM marketing_workspaces WHERE id=$1", [workspaceId]);
  await pool.query("DELETE FROM contact_inquiries WHERE email=ANY($1::text[])", [emails]);
  await pool.end();
});

describe("Marketing inquiry retention in disposable PostgreSQL", () => {
  databaseTest("retains only linked archived inquiries and resumes normal purge after unlink", async () => {
    const linked = await pool!.query<{ id: string }>(
      "INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,archived_at) VALUES('Marketing retention linked',$1,'Linked company','Synthetic retention test',$2,'archived','2020-01-01') RETURNING id",
      [emails[0], token],
    );
    const unrelated = await pool!.query<{ id: string }>(
      "INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,archived_at) VALUES('Marketing retention unrelated',$1,'Unrelated company','Synthetic retention test',$2,'archived','2020-01-01') RETURNING id",
      [emails[1], token],
    );
    const active = await pool!.query<{ id: string }>(
      "INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status) VALUES('Marketing retention active',$1,'Active company','Synthetic retention test',$2,'qualified') RETURNING id",
      [emails[2], token],
    );
    const recent = await pool!.query<{ id: string }>(
      "INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,archived_at) VALUES('Marketing retention recent',$1,'Recent company','Synthetic retention test',$2,'archived',NOW()-interval '30 days') RETURNING id",
      [emails[3], token],
    );
    const linkedId = linked.rows[0]!.id;
    const unrelatedId = unrelated.rows[0]!.id;
    const activeId = active.rows[0]!.id;
    const recentId = recent.rows[0]!.id;

    await pool!.query(
      "INSERT INTO marketing_workspaces(id,data) VALUES($1,jsonb_build_object('prospects',jsonb_build_array(jsonb_build_object('crmLeadId',$2::bigint))))",
      [workspaceId, linkedId],
    );
    const firstPurge = await pool!.query<{ id: string }>(archivedInquiryPurgeQuery, ["2025-01-01T00:00:00Z"]);
    expect(firstPurge.rows.map((row) => row.id)).toContain(unrelatedId);
    expect(firstPurge.rows.map((row) => row.id)).not.toContain(linkedId);
    expect(firstPurge.rows.map((row) => row.id)).not.toContain(activeId);
    expect(firstPurge.rows.map((row) => row.id)).not.toContain(recentId);
    expect((await pool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1", [linkedId])).rowCount).toBe(1);
    expect((await pool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1", [activeId])).rowCount).toBe(1);
    expect((await pool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1", [recentId])).rowCount).toBe(1);

    await pool!.query("UPDATE marketing_workspaces SET data=jsonb_build_object('prospects','[]'::jsonb) WHERE id=$1", [workspaceId]);
    const afterUnlinkPurge = await pool!.query<{ id: string }>(archivedInquiryPurgeQuery, ["2025-01-01T00:00:00Z"]);
    expect(afterUnlinkPurge.rows.map((row) => row.id)).toContain(linkedId);
    expect(afterUnlinkPurge.rows.map((row) => row.id)).not.toContain(recentId);
    expect((await pool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1", [linkedId])).rowCount).toBe(0);
    expect((await pool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1", [activeId])).rowCount).toBe(1);
    expect((await pool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1", [recentId])).rowCount).toBe(1);
  });
});
