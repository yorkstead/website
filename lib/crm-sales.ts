import { randomUUID } from "node:crypto";
import { contactDatabase } from "@/lib/contact-inquiries";
import { isValidDateKey } from "@/lib/date-time";

export const proposalStates = ["draft", "sent", "accepted", "declined"] as const;
export type ProposalState = typeof proposalStates[number];
export const engagementTypes = ["audit", "sprint", "system", "custom"] as const;
export type EngagementType = typeof engagementTypes[number];

export type LeadQualification = {
  industry: string;
  pain: string;
  companySize: string;
  urgency: string;
  decisionMaker: string;
  budgetIndication: string;
  nextStep: string;
  wonReason: string;
  lostReason: string;
};

export type CrmProposal = {
  id: string;
  leadId: number;
  engagementType: EngagementType;
  amountCents: number;
  state: ProposalState;
  sentAt: string | null;
  decidedAt: string | null;
  nextAction: string;
  nextActionAt: string | null;
};

export type CrmSalesQueryClient = {
  query: (query: string, params?: unknown[]) => Promise<unknown>;
};

function resultRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

const fields: Array<[keyof LeadQualification, string]> = [
  ["industry", "industry"], ["pain", "pain"], ["companySize", "company_size"], ["urgency", "urgency"],
  ["decisionMaker", "decision_maker"], ["budgetIndication", "budget_indication"], ["nextStep", "next_step"],
  ["wonReason", "won_reason"], ["lostReason", "lost_reason"],
];

export function parseLeadQualification(value: unknown): LeadQualification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.industry !== undefined && source.industry !== "" && !["manufacturing", "logistics", "restaurant", "other"].includes(String(source.industry))) return null;
  if (source.industry !== undefined && typeof source.industry !== "string") return null;
  const result = Object.fromEntries(fields.map(([key]) => [key, typeof source[key] === "string" ? source[key].trim().slice(0, key === "pain" || key === "nextStep" ? 2000 : 500) : ""])) as LeadQualification;
  return result;
}

export function parseProposalInput(value: Record<string, unknown>) {
  const leadId = Number(value.leadId);
  const amount = String(value.amount ?? "").trim();
  const engagementType = String(value.engagementType ?? "");
  const state = String(value.state ?? "draft");
  const nextAction = typeof value.nextAction === "string" ? value.nextAction.trim().slice(0, 1000) : "";
  const dateKey = typeof value.nextActionAt === "string" ? value.nextActionAt : "";
  const nextActionAt = dateKey ? isValidDateKey(dateKey) ? new Date(`${dateKey}T12:00:00Z`) : null : null;
  if (!Number.isSafeInteger(leadId) || leadId < 1 || !engagementTypes.includes(engagementType as EngagementType) || !proposalStates.includes(state as ProposalState)) return null;
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(amount)) return null;
  const [wholeDollars, fractionalDollars = ""] = amount.split(".");
  const amountCents = Number(wholeDollars) * 100 + Number(fractionalDollars.padEnd(2, "0"));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100000000000) return null;
  if (dateKey && (!nextActionAt || !Number.isFinite(nextActionAt.getTime()))) return null;
  return { leadId, engagementType: engagementType as EngagementType, state: state as ProposalState, amountCents, nextAction, nextActionAt: nextActionAt?.toISOString() ?? null };
}

export function parseProposalUpdateInput(value: Record<string, unknown>) {
  const leadId = Number(value.leadId);
  const proposalId = String(value.proposalId ?? "");
  const amount = String(value.amount ?? "").trim();
  const engagementType = String(value.engagementType ?? "");
  const nextAction = typeof value.nextAction === "string" ? value.nextAction.trim() : "";
  const dateKey = typeof value.nextActionAt === "string" ? value.nextActionAt : "";
  const nextActionAt = dateKey ? isValidDateKey(dateKey) ? new Date(`${dateKey}T12:00:00Z`) : null : null;
  if (!Number.isSafeInteger(leadId) || leadId < 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proposalId)) return null;
  if (!engagementTypes.includes(engagementType as EngagementType) || !/^\d{1,9}(?:\.\d{1,2})?$/.test(amount)) return null;
  if (nextAction.length > 1000) return null;
  const [wholeDollars, fractionalDollars = ""] = amount.split(".");
  const amountCents = Number(wholeDollars) * 100 + Number(fractionalDollars.padEnd(2, "0"));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100000000000) return null;
  if (dateKey && (!nextActionAt || !Number.isFinite(nextActionAt.getTime()))) return null;
  return { leadId, proposalId, engagementType: engagementType as EngagementType, amountCents, nextAction, nextActionAt: nextActionAt?.toISOString() ?? null };
}

export async function saveLeadQualification(leadId: number, qualification: LeadQualification) {
  const sql = await contactDatabase();
  const values = fields.map(([key]) => qualification[key]);
  const assignments = fields.map(([, column], index) => `${column} = $${index + 2}`).join(", ");
  const rows = await sql.query(`UPDATE contact_inquiries SET ${assignments}, updated_at=NOW() WHERE id=$1 AND status NOT IN ('archived') AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id) RETURNING id`, [leadId, ...values]);
  return rows.length > 0;
}

export async function saveProposal(input: NonNullable<ReturnType<typeof parseProposalInput>>) {
  const sql = await contactDatabase();
  const id = randomUUID();
  const rows = await sql.query(`WITH inserted AS (
    INSERT INTO crm_proposals (id, lead_id, engagement_type, amount_cents, state, sent_at, decided_at, next_action, next_action_at)
      SELECT $1, i.id, $3, $4, $5, CASE WHEN $5 IN ('sent','accepted','declined') THEN NOW() ELSE NULL END,
        CASE WHEN $5 IN ('accepted','declined') THEN NOW() ELSE NULL END, $6, $7::timestamptz
      FROM contact_inquiries i WHERE i.id=$2 AND i.status NOT IN ('won','lost','archived')
        AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id) RETURNING id,lead_id,state
  ), touched AS (
    UPDATE contact_inquiries i SET status=CASE WHEN p.state='accepted' THEN 'won' WHEN i.status IN ('new','contacted','qualified') THEN 'proposal' ELSE i.status END,
      follow_up_at=CASE WHEN p.state='accepted' THEN NULL ELSE i.follow_up_at END, updated_at=NOW()
    FROM inserted p WHERE i.id=p.lead_id RETURNING i.id
  ) SELECT p.id FROM inserted p JOIN touched t ON t.id=p.lead_id`,
  [id, input.leadId, input.engagementType, input.amountCents, input.state, input.nextAction, input.nextActionAt]);
  return rows.length ? id : null;
}

export async function updateProposalState(leadId: number, proposalId: string, state: ProposalState) {
  if (!Number.isSafeInteger(leadId) || leadId < 1 || !/^[0-9a-f-]{36}$/i.test(proposalId) || !proposalStates.includes(state)) return false;
  const sql = await contactDatabase();
  const rows = await sql.query(`WITH changed AS (
    UPDATE crm_proposals p SET state=$3,
      sent_at=CASE WHEN $3 IN ('sent','accepted','declined') THEN COALESCE(sent_at,NOW()) ELSE NULL END,
      decided_at=CASE WHEN $3 IN ('accepted','declined') THEN COALESCE(decided_at,NOW()) ELSE NULL END,
      updated_at=NOW() FROM contact_inquiries i WHERE p.id=$2 AND p.lead_id=$1 AND i.id=p.lead_id AND i.status NOT IN ('archived','lost')
      AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id) RETURNING p.id,p.lead_id,p.state
  ), touched AS (
    UPDATE contact_inquiries i SET status=CASE WHEN p.state='accepted' THEN 'won' ELSE i.status END,
      follow_up_at=CASE WHEN p.state='accepted' THEN NULL ELSE i.follow_up_at END, updated_at=NOW()
    FROM changed p WHERE i.id=p.lead_id RETURNING i.id
  ) SELECT p.id FROM changed p JOIN touched t ON t.id=p.lead_id`, [leadId, proposalId, state]);
  return rows.length > 0;
}

export async function updateProposal(input: NonNullable<ReturnType<typeof parseProposalUpdateInput>>, client?: CrmSalesQueryClient) {
  const sql = client ?? await contactDatabase();
  const result = await sql.query(`UPDATE crm_proposals p SET engagement_type=$3, amount_cents=$4,
      next_action=$5, next_action_at=$6::timestamptz, updated_at=NOW()
    FROM contact_inquiries i
    WHERE p.id=$2 AND p.lead_id=$1 AND i.id=p.lead_id AND i.status <> 'archived'
      AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
    RETURNING p.id`, [input.leadId, input.proposalId, input.engagementType, input.amountCents, input.nextAction, input.nextActionAt]);
  return resultRows(result).length > 0;
}

export async function listLeadProposals(leadId: number): Promise<CrmProposal[]> {
  const sql = await contactDatabase();
  const rows = await sql.query(`SELECT p.* FROM crm_proposals p JOIN contact_inquiries i ON i.id=p.lead_id
    WHERE p.lead_id=$1 AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
    ORDER BY p.updated_at DESC, p.id DESC`, [leadId]);
  return rows.map((row) => ({ id: String(row.id), leadId: Number(row.lead_id), engagementType: row.engagement_type as EngagementType,
    amountCents: Number(row.amount_cents), state: row.state as ProposalState, sentAt: row.sent_at ? new Date(String(row.sent_at)).toISOString() : null,
    decidedAt: row.decided_at ? new Date(String(row.decided_at)).toISOString() : null, nextAction: String(row.next_action ?? ""),
    nextActionAt: row.next_action_at ? new Date(String(row.next_action_at)).toISOString() : null }));
}
