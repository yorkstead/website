import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";

const databaseURL = disposableTestDatabaseURL();
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;
afterAll(async () => { await pool?.end(); });

describe("CRM sales schema in disposable PostgreSQL", () => {
  databaseTest("persists qualification and explicit proposal amounts and enforces supported states", async () => {
    const connection = await pool!.connect();
    await connection.query("BEGIN");
    try {
      const inserted = await connection.query<{ id: string }>(`INSERT INTO contact_inquiries(name,email,company,message,ip_hash,budget)
        VALUES ('CC-019 disposable', $1, 'Disposable Works', 'Synthetic test only', $2, '$80,000 indicated') RETURNING id`, [`crm-${randomUUID()}@example.test`, randomUUID()]);
      const leadId = Number(inserted.rows[0]!.id);
      await connection.query(`UPDATE contact_inquiries SET industry='manufacturing',pain='Inventory reconciliation',company_size='120 employees',urgency='Peak season',decision_maker='Operations director',budget_indication='Unconfirmed $80,000',next_step='Schedule mapping',lost_reason='Timing' WHERE id=$1`, [leadId]);
      await connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state,next_action) VALUES ($1,$2,'sprint',250000,'draft','Review scope')`, [randomUUID(), leadId]);
      const summary = await connection.query<{ amount_cents: string; budget: string; state: string; industry: string }>(`SELECT p.amount_cents,i.budget,p.state,i.industry FROM crm_proposals p JOIN contact_inquiries i ON i.id=p.lead_id WHERE i.id=$1`, [leadId]);
      expect(summary.rows[0]).toEqual({ amount_cents: "250000", budget: "$80,000 indicated", state: "draft", industry: "manufacturing" });
      const pipeline = await connection.query<{ cents: string }>(`SELECT COALESCE(SUM(p.amount_cents) FILTER (WHERE p.state IN ('draft','sent')),0)::text AS cents FROM crm_proposals p JOIN contact_inquiries i ON i.id=p.lead_id WHERE i.id=$1`, [leadId]);
      expect(pipeline.rows[0]?.cents).toBe("250000");
      await expect(connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state) VALUES ($1,$2,'sprint',1,'pending')`, [randomUUID(), leadId])).rejects.toThrow();
      await expect(connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state) VALUES ($1,$2,'custom',-1,'draft')`, [randomUUID(), leadId])).rejects.toThrow();
      await expect(connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state) VALUES ($1,$2,'custom',0,'draft')`, [randomUUID(), leadId])).rejects.toThrow();
    } finally { await connection.query("ROLLBACK"); connection.release(); }
  });
});
