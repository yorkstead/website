import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";
import { parseProposalUpdateInput, updateProposal } from "@/lib/crm-sales";

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
      const proposalId = randomUUID();
      await connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state,next_action) VALUES ($1,$2,'sprint',250000,'draft','Review scope')`, [proposalId, leadId]);
      const summary = await connection.query<{ amount_cents: string; budget: string; state: string; industry: string }>(`SELECT p.amount_cents,i.budget,p.state,i.industry FROM crm_proposals p JOIN contact_inquiries i ON i.id=p.lead_id WHERE i.id=$1`, [leadId]);
      expect(summary.rows[0]).toEqual({ amount_cents: "250000", budget: "$80,000 indicated", state: "draft", industry: "manufacturing" });
      const pipeline = await connection.query<{ cents: string }>(`SELECT COALESCE(SUM(p.amount_cents) FILTER (WHERE p.state IN ('draft','sent')),0)::text AS cents FROM crm_proposals p JOIN contact_inquiries i ON i.id=p.lead_id WHERE i.id=$1`, [leadId]);
      expect(pipeline.rows[0]?.cents).toBe("250000");

      const edit = parseProposalUpdateInput({ leadId, proposalId, engagementType: "system", amount: "3250.75", nextAction: "Review revised system scope", nextActionAt: "2026-11-05" });
      expect(edit).not.toBeNull();
      expect(await updateProposal(edit!, connection)).toBe(true);
      const revised = await connection.query<{ id: string; engagement_type: string; amount_cents: string; next_action: string; next_action_at: Date }>("SELECT id,engagement_type,amount_cents,next_action,next_action_at FROM crm_proposals WHERE lead_id=$1", [leadId]);
      expect(revised.rows).toHaveLength(1);
      expect(revised.rows[0]).toMatchObject({ id: proposalId, engagement_type: "system", amount_cents: "325075", next_action: "Review revised system scope" });
      expect(revised.rows[0]?.next_action_at.toISOString()).toBe("2026-11-05T12:00:00.000Z");
      const revisedTotal = await connection.query<{ cents: string }>(`SELECT COALESCE(SUM(amount_cents) FILTER (WHERE state IN ('draft','sent')),0)::text AS cents FROM crm_proposals WHERE lead_id=$1`, [leadId]);
      expect(revisedTotal.rows[0]?.cents).toBe("325075");

      const clearAction = parseProposalUpdateInput({ leadId, proposalId, engagementType: "system", amount: "3250.75", nextAction: "", nextActionAt: "" });
      expect(clearAction).not.toBeNull();
      expect(await updateProposal(clearAction!, connection)).toBe(true);
      const cleared = await connection.query<{ next_action: string; next_action_at: Date | null }>("SELECT next_action,next_action_at FROM crm_proposals WHERE id=$1", [proposalId]);
      expect(cleared.rows[0]).toEqual({ next_action: "", next_action_at: null });
      const clearedTotal = await connection.query<{ cents: string }>(`SELECT COALESCE(SUM(amount_cents) FILTER (WHERE state IN ('draft','sent')),0)::text AS cents FROM crm_proposals WHERE lead_id=$1`, [leadId]);
      expect(clearedTotal.rows[0]?.cents).toBe("325075");

      await connection.query("INSERT INTO inquiry_retirements(inquiry_id,operation_id,actor,expected_digest) VALUES ($1,$2,'test owner',inquiry_retirement_digest($1))", [leadId, randomUUID()]);
      expect(await updateProposal(clearAction!, connection)).toBe(false);
      await expect(connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state) VALUES ($1,$2,'sprint',1,'pending')`, [randomUUID(), leadId])).rejects.toThrow();
      await expect(connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state) VALUES ($1,$2,'custom',-1,'draft')`, [randomUUID(), leadId])).rejects.toThrow();
      await expect(connection.query(`INSERT INTO crm_proposals(id,lead_id,engagement_type,amount_cents,state) VALUES ($1,$2,'custom',0,'draft')`, [randomUUID(), leadId])).rejects.toThrow();
    } finally { await connection.query("ROLLBACK"); connection.release(); }
  });
});
