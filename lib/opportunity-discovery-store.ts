import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { createPagination } from "@/lib/pagination";
import { isValidDateKey } from "@/lib/date-time";
import { isValidEmailAddress } from "@/lib/semantic-validation";
import {
  assessQualification,
  emptyQualification,
  isAllowedResearchTransition,
  normalizeBusinessName,
  outreachStatuses,
  parseEvidenceInput,
  parseOpportunityInput,
  parseQualification,
  qualificationCriteria,
  researchStatuses,
  type EvidenceType,
  type OpportunityQualification,
  type OutreachStatus,
  type ResearchStatus,
} from "@/lib/opportunity-discovery";

const pageSize = 20;
const historyPageSize = 50;
const noteKeys = ["workflowToday", "participants", "toolsHandoffs", "manualWork", "errorsExceptions", "volumeFrequency", "delaysBottlenecks", "workaroundCost", "inactionConsequences", "decisionAuthority", "budgetUrgency", "desiredOutcome", "willingnessToChange", "nextAgreedAction", "additionalNotes"] as const;
export type InterviewNotes = Record<typeof noteKeys[number], string>;

type QueryClient = Pick<PoolClient, "query">;
export type OpportunitySearch = { query?: string; researchStatus?: ResearchStatus; industry?: string; outreachStatus?: OutreachStatus; page?: number };

export class OpportunityOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpportunityOperationError";
  }
}

let databasePool: Pool | undefined;
function pool() {
  const url = process.env.DATABASE_URL;
  if (!url || url === "[SENSITIVE]") throw new OpportunityOperationError("Opportunity storage unavailable");
  databasePool ??= new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  return databasePool;
}

export async function closeOpportunityStorePool() {
  await databasePool?.end();
  databasePool = undefined;
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function safeDate(value: unknown) { return value ? new Date(String(value)).toISOString() : null; }
function mapOpportunity(row: Record<string, unknown>) {
  const qualification = parseQualification(row.qualification) ?? emptyQualification();
  return {
    id: String(row.id), businessName: String(row.business_name), industry: String(row.industry),
    geographicMarket: String(row.geographic_market ?? ""), workflow: String(row.workflow ?? ""), suspectedProblem: String(row.suspected_problem ?? ""),
    observedOn: row.observed_on ? new Date(String(row.observed_on)).toISOString().slice(0, 10) : "",
    lastVerifiedOn: row.last_verified_on ? new Date(String(row.last_verified_on)).toISOString().slice(0, 10) : "",
    evidenceConfidence: String(row.evidence_confidence), currentWorkaround: String(row.current_workaround ?? ""),
    likelyFrequency: String(row.likely_frequency ?? ""), likelySeverity: String(row.likely_severity ?? ""),
    operationalImpact: String(row.operational_impact ?? ""), potentialSoftwareApproach: String(row.potential_software_approach ?? ""),
    openQuestions: String(row.open_questions ?? ""), researchStatus: String(row.research_status) as ResearchStatus,
    outreachStatus: String(row.outreach_status) as OutreachStatus, commercialPermissionAt: safeDate(row.commercial_permission_at),
    nextAction: String(row.next_action ?? ""), nextActionAt: row.next_action_at ? new Date(String(row.next_action_at)).toISOString().slice(0, 10) : "",
    qualification, qualificationAssessment: assessQualification(qualification), manualPriority: row.manual_priority === null ? null : Number(row.manual_priority),
    manualPriorityReason: String(row.manual_priority_reason ?? ""), crmLeadId: row.crm_lead_id === null ? null : Number(row.crm_lead_id),
    archivedAt: safeDate(row.archived_at), createdAt: safeDate(row.created_at), updatedAt: safeDate(row.updated_at),
  };
}

export function parseInterviewNotes(value: unknown): InterviewNotes | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const notes = Object.fromEntries(noteKeys.map((key) => [key, typeof input[key] === "string" ? input[key].trim().slice(0, 3000) : ""])) as InterviewNotes;
  if (Object.values(notes).reduce((sum, note) => sum + note.length, 0) > 16000) return null;
  return notes;
}

export function parseInterviewInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const participantRole = typeof input.participantRole === "string" ? input.participantRole.trim().slice(0, 160) : "";
  const interviewOn = typeof input.interviewOn === "string" ? input.interviewOn : "";
  const interviewStatus = typeof input.interviewStatus === "string" ? input.interviewStatus : "completed";
  const consultationId = typeof input.consultationId === "string" ? input.consultationId.trim().slice(0, 80) : "";
  const notes = parseInterviewNotes(input.notes);
  if ((interviewStatus !== "scheduled" && interviewStatus !== "completed") || (interviewStatus === "completed" && !participantRole) || !isValidDateKey(interviewOn) || !notes) return null;
  return { participantRole, interviewOn, interviewStatus: interviewStatus as "scheduled" | "completed", consultationId: consultationId || null, notes };
}

async function appendHistory(client: QueryClient, opportunityId: string, actorId: string, eventType: string, fromValue: string | null = null, toValue: string | null = null, detail: Record<string, unknown> = {}) {
  await client.query("INSERT INTO opportunity_history(opportunity_id,actor_id,event_type,from_value,to_value,detail) VALUES($1,$2,$3,$4,$5,$6::jsonb)", [opportunityId, actorId, eventType, fromValue, toValue, JSON.stringify(detail)]);
}

function validateUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export const opportunityStore = {
  async list(options: OpportunitySearch = {}) {
    const page = Math.max(1, Math.min(10000, Math.floor(options.page ?? 1)));
    const params: unknown[] = [];
    const conditions = [options.researchStatus === "archived" ? "o.archived_at IS NOT NULL" : "o.archived_at IS NULL"];
    if (options.researchStatus && (researchStatuses as readonly string[]).includes(options.researchStatus)) { params.push(options.researchStatus); conditions.push(`o.research_status=$${params.length}`); }
    if (options.outreachStatus && (outreachStatuses as readonly string[]).includes(options.outreachStatus)) { params.push(options.outreachStatus); conditions.push(`o.outreach_status=$${params.length}`); }
    if (options.industry?.trim()) { params.push(options.industry.trim().slice(0, 100)); conditions.push(`o.industry=$${params.length}`); }
    const query = options.query?.trim().slice(0, 100);
    if (query) {
      const escaped = query.replace(/[\\%_]/g, "\\$&");
      params.push(`%${escaped}%`);
      const index = params.length;
      conditions.push(`(o.business_name ILIKE $${index} ESCAPE '\\' OR o.workflow ILIKE $${index} ESCAPE '\\' OR o.suspected_problem ILIKE $${index} ESCAPE '\\' OR o.industry ILIKE $${index} ESCAPE '\\')`);
    }
    const where = conditions.join(" AND ");
    const count = await pool().query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM research_opportunities o WHERE ${where}`, params);
    const pagination = createPagination(count.rows[0]?.count, page, pageSize);
    const rows = await pool().query(`SELECT o.*, (SELECT COUNT(*)::int FROM opportunity_evidence e WHERE e.opportunity_id=o.id) AS evidence_count,
      (SELECT COUNT(*)::int FROM opportunity_interviews i WHERE i.opportunity_id=o.id) AS interview_count
      FROM research_opportunities o WHERE ${where}
      ORDER BY (o.manual_priority IS NULL),o.manual_priority ASC,o.next_action_at ASC NULLS LAST,o.updated_at DESC,o.id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, (pagination.page - 1) * pageSize]);
    return { opportunities: rows.rows.map((row) => ({ ...mapOpportunity(row), evidenceCount: Number(row.evidence_count), interviewCount: Number(row.interview_count) })), pagination };
  },

  async get(id: string) {
    if (!validateUuid(id)) return null;
    const client = await pool().connect();
    try {
      const opportunity = (await client.query("SELECT * FROM research_opportunities WHERE id=$1", [id])).rows[0];
      if (!opportunity) return null;
      const [evidence, interviews, history] = await Promise.all([
        client.query("SELECT * FROM opportunity_evidence WHERE opportunity_id=$1 ORDER BY observed_on DESC,id DESC LIMIT 100", [id]),
        client.query("SELECT * FROM opportunity_interviews WHERE opportunity_id=$1 ORDER BY interview_on DESC,id DESC LIMIT 50", [id]),
        client.query("SELECT * FROM opportunity_history WHERE opportunity_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2", [id, historyPageSize]),
      ]);
      return { ...mapOpportunity(opportunity), evidence: evidence.rows.map((row) => ({ id: String(row.id), evidenceType: row.evidence_type as EvidenceType, summary: String(row.summary), sourceReference: String(row.source_reference), observedOn: new Date(String(row.observed_on)).toISOString().slice(0, 10), ownerNote: String(row.owner_note ?? ""), createdAt: safeDate(row.created_at) })), interviews: interviews.rows.map((row) => ({ id: String(row.id), consultationId: row.consultation_id ? String(row.consultation_id) : null, participantRole: String(row.participant_role), interviewOn: new Date(String(row.interview_on)).toISOString().slice(0, 10), interviewStatus: String(row.interview_status), notes: parseInterviewNotes(row.notes), commercialPermission: String(row.commercial_permission), createdAt: safeDate(row.created_at), updatedAt: safeDate(row.updated_at) })), history: history.rows.map((row) => ({ id: String(row.id), eventType: String(row.event_type), fromValue: row.from_value ? String(row.from_value) : null, toValue: row.to_value ? String(row.to_value) : null, createdAt: safeDate(row.created_at) })) };
    } finally { client.release(); }
  },

  async create(value: unknown, actorId: string) {
    const input = parseOpportunityInput(value);
    if (!input) throw new OpportunityOperationError("Enter a business, industry, and valid observation date.");
    const id = randomUUID();
    return withTransaction(async (client) => {
      const rows = await client.query("INSERT INTO research_opportunities(id,business_name,industry,geographic_market,workflow,suspected_problem,observed_on,last_verified_on,evidence_confidence,current_workaround,likely_frequency,likely_severity,operational_impact,potential_software_approach,open_questions,next_action,next_action_at) VALUES($1,$2,$3,$4,$5,$6,$7::date,$8::date,$9,$10,$11,$12,$13,$14,$15,$16,$17::date) RETURNING *", [id,input.businessName,input.industry,input.geographicMarket,input.workflow,input.suspectedProblem,input.observedOn,input.lastVerifiedOn || null,input.evidenceConfidence,input.currentWorkaround,input.likelyFrequency,input.likelySeverity,input.operationalImpact,input.potentialSoftwareApproach,input.openQuestions,input.nextAction,input.nextActionAt || null]);
      await appendHistory(client,id,actorId,"created",null,"hypothesis");
      return mapOpportunity(rows.rows[0]);
    });
  },

  async update(id: string, value: unknown, actorId: string) {
    if (!validateUuid(id)) throw new OpportunityOperationError("Opportunity not found.");
    const input = parseOpportunityInput(value);
    if (!input) throw new OpportunityOperationError("Opportunity details are invalid.");
    return withTransaction(async (client) => {
      const locked = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!locked || locked.research_status === "archived") throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      const updated = await client.query("UPDATE research_opportunities SET business_name=$2,industry=$3,geographic_market=$4,workflow=$5,suspected_problem=$6,observed_on=$7::date,last_verified_on=$8::date,evidence_confidence=$9,current_workaround=$10,likely_frequency=$11,likely_severity=$12,operational_impact=$13,potential_software_approach=$14,open_questions=$15,next_action=$16,next_action_at=$17::date,updated_at=NOW() WHERE id=$1 RETURNING *", [id,input.businessName,input.industry,input.geographicMarket,input.workflow,input.suspectedProblem,input.observedOn,input.lastVerifiedOn || null,input.evidenceConfidence,input.currentWorkaround,input.likelyFrequency,input.likelySeverity,input.operationalImpact,input.potentialSoftwareApproach,input.openQuestions,input.nextAction,input.nextActionAt || null]);
      await appendHistory(client,id,actorId,"updated");
      return mapOpportunity(updated.rows[0]);
    });
  },

  async addEvidence(id: string, value: unknown, actorId: string) {
    const evidence = parseEvidenceInput(value);
    if (!validateUuid(id) || !evidence) throw new OpportunityOperationError("Evidence details or source reference are invalid.");
    const evidenceId = randomUUID();
    return withTransaction(async (client) => {
      const opportunity = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!opportunity || opportunity.research_status === "archived") throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      await client.query("INSERT INTO opportunity_evidence(id,opportunity_id,evidence_type,summary,source_reference,observed_on,owner_note) VALUES($1,$2,$3,$4,$5,$6::date,$7)", [evidenceId,id,evidence.evidenceType,evidence.summary,evidence.sourceReference,evidence.observedOn,evidence.ownerNote]);
      await client.query("UPDATE research_opportunities SET updated_at=NOW() WHERE id=$1", [id]);
      await appendHistory(client,id,actorId,"evidence_added",null,evidence.evidenceType,{ evidenceId });
      return evidenceId;
    });
  },

  async addInterview(id: string, value: unknown, actorId: string) {
    const input = parseInterviewInput(value);
    if (!validateUuid(id) || !input) throw new OpportunityOperationError("Interview notes are invalid.");
    const interviewId = randomUUID();
    return withTransaction(async (client) => {
      const opportunity = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!opportunity || opportunity.research_status === "archived") throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      if (input.consultationId) {
        const consultation = await client.query("SELECT id FROM consultations WHERE id=$1", [input.consultationId]);
        if (!consultation.rowCount) throw new OpportunityOperationError("The linked consultation was not found.");
      }
      await client.query("INSERT INTO opportunity_interviews(id,opportunity_id,consultation_id,participant_role,interview_on,interview_status,notes) VALUES($1,$2,$3,$4,$5::date,$6,$7::jsonb)", [interviewId,id,input.consultationId,input.participantRole,input.interviewOn,input.interviewStatus,JSON.stringify(input.notes)]);
      await client.query("UPDATE research_opportunities SET updated_at=NOW() WHERE id=$1", [id]);
      await appendHistory(client,id,actorId,"interview_added",null,input.interviewOn,{ interviewId, interviewStatus: input.interviewStatus, consultationLinked: Boolean(input.consultationId) });
      return interviewId;
    });
  },

  async updateScheduledInterview(id: string, interviewId: string, value: unknown, actorId: string) {
    const input = parseInterviewInput(value);
    if (!validateUuid(id) || !validateUuid(interviewId) || !input || input.interviewStatus !== "completed") throw new OpportunityOperationError("Completed discovery notes are invalid.");
    return withTransaction(async (client) => {
      const opportunity = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [id])).rows[0];
      if (!opportunity) throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      const current = (await client.query("SELECT interview_on,interview_status FROM opportunity_interviews WHERE id=$1 AND opportunity_id=$2 FOR UPDATE", [interviewId,id])).rows[0];
      if (!current || current.interview_status !== "scheduled") throw new OpportunityOperationError("Only a scheduled conversation can be completed here.");
      if (input.consultationId) {
        const consultation = await client.query("SELECT id FROM consultations WHERE id=$1", [input.consultationId]);
        if (!consultation.rowCount) throw new OpportunityOperationError("The linked consultation was not found.");
      }
      await client.query("UPDATE opportunity_interviews SET participant_role=$3,interview_on=$4::date,interview_status='completed',consultation_id=$5,notes=$6::jsonb,updated_at=NOW() WHERE id=$1 AND opportunity_id=$2", [interviewId,id,input.participantRole,input.interviewOn,input.consultationId,JSON.stringify(input.notes)]);
      await client.query("UPDATE research_opportunities SET updated_at=NOW() WHERE id=$1", [id]);
      await appendHistory(client,id,actorId,"interview_updated",String(current.interview_status),"completed",{ interviewId });
    });
  },

  async setInterviewPermission(id: string, interviewId: string, permission: "research_only" | "granted" | "declined", actorId: string) {
    if (!validateUuid(id) || !validateUuid(interviewId) || !["research_only","granted","declined"].includes(permission)) throw new OpportunityOperationError("Permission update is invalid.");
    return withTransaction(async (client) => {
      const opportunity = (await client.query("SELECT outreach_status FROM research_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [id])).rows[0];
      if (!opportunity) throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      const interview = (await client.query("SELECT commercial_permission FROM opportunity_interviews WHERE id=$1 AND opportunity_id=$2 FOR UPDATE", [interviewId,id])).rows[0];
      if (!interview) throw new OpportunityOperationError("Interview not found.");
      await client.query("UPDATE opportunity_interviews SET commercial_permission=$3,updated_at=NOW() WHERE id=$1 AND opportunity_id=$2", [interviewId,id,permission]);
      const remainingPermission = await client.query("SELECT 1 FROM opportunity_interviews WHERE opportunity_id=$1 AND commercial_permission='granted' LIMIT 1", [id]);
      const globalStatus: OutreachStatus = remainingPermission.rowCount ? "permission_granted" : permission === "declined" ? "declined" : "research_only";
      await client.query("UPDATE research_opportunities SET outreach_status=$2,commercial_permission_at=CASE WHEN $2='permission_granted' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1", [id,globalStatus]);
      await appendHistory(client,id,actorId,"permission_changed",String(interview.commercial_permission),permission,{ interviewId });
      return globalStatus;
    });
  },

  async setOutreachStatus(id: string, status: "preparing" | "permission_requested", actorId: string) {
    if (!validateUuid(id) || !["preparing","permission_requested"].includes(status)) throw new OpportunityOperationError("Outreach state is invalid.");
    return withTransaction(async (client) => {
      const opportunity = (await client.query("SELECT outreach_status FROM research_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [id])).rows[0];
      if (!opportunity) throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      if (opportunity.outreach_status === "declined" || opportunity.outreach_status === "permission_granted") throw new OpportunityOperationError("Permission state cannot be overwritten here.");
      await client.query("UPDATE research_opportunities SET outreach_status=$2,updated_at=NOW() WHERE id=$1", [id,status]);
      await appendHistory(client,id,actorId,"permission_changed",String(opportunity.outreach_status),status);
      return status;
    });
  },

  async saveQualification(id: string, value: unknown, actorId: string) {
    const qualification = parseQualification(value);
    if (!validateUuid(id) || !qualification) throw new OpportunityOperationError("Qualification inputs are invalid.");
    return withTransaction(async (client) => {
      const row = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [id])).rows[0];
      if (!row) throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      await client.query("UPDATE research_opportunities SET qualification=$2::jsonb,updated_at=NOW() WHERE id=$1", [id,JSON.stringify(qualification)]);
      if (row.research_status === "validated" && assessQualification(qualification).complete) {
        // Qualified is a distinct research judgment; the owner still changes status explicitly.
      }
      await appendHistory(client,id,actorId,"updated",null,null,{ qualificationAnswered: assessQualification(qualification).answered, qualificationComplete: assessQualification(qualification).complete });
      return assessQualification(qualification);
    });
  },

  async setPriority(id: string, priority: number | null, reason: string, actorId: string) {
    if (!validateUuid(id) || (priority !== null && (!Number.isInteger(priority) || priority < 1 || priority > 5)) || reason.length > 500 || (priority !== null && !reason.trim())) throw new OpportunityOperationError("Manual queue order needs a priority and a short reason.");
    return withTransaction(async (client) => {
      const row = (await client.query("SELECT manual_priority FROM research_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE", [id])).rows[0];
      if (!row) throw new OpportunityOperationError("This opportunity is archived or unavailable.");
      await client.query("UPDATE research_opportunities SET manual_priority=$2,manual_priority_reason=$3,updated_at=NOW() WHERE id=$1", [id,priority,reason.trim()]);
      await appendHistory(client,id,actorId,"priority_changed",row.manual_priority === null ? null : String(row.manual_priority),priority === null ? null : String(priority),{ reason: reason.trim() });
    });
  },

  async setResearchStatus(id: string, to: ResearchStatus, actorId: string) {
    if (!validateUuid(id) || !(researchStatuses as readonly string[]).includes(to)) throw new OpportunityOperationError("Research status is invalid.");
    return withTransaction(async (client) => {
      const row = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!row) throw new OpportunityOperationError("Opportunity not found.");
      const from = row.research_status as ResearchStatus;
      if (!isAllowedResearchTransition(from,to)) throw new OpportunityOperationError(`Cannot move research from ${from} to ${to}.`);
      if (to === "validated" || to === "qualified") {
        const evidence = await client.query("SELECT 1 FROM opportunity_evidence WHERE opportunity_id=$1 AND evidence_type IN ('verified_fact','business_statement') LIMIT 1", [id]);
        const interviews = await client.query("SELECT 1 FROM opportunity_interviews WHERE opportunity_id=$1 AND interview_status='completed' LIMIT 1", [id]);
        if (!evidence.rowCount || !interviews.rowCount) throw new OpportunityOperationError("Validation requires a business statement or verified fact and at least one discovery interview.");
      }
      if (to === "qualified") {
        const qualification = (await client.query("SELECT qualification FROM research_opportunities WHERE id=$1", [id])).rows[0]?.qualification;
        const assessed = assessQualification(parseQualification(qualification) ?? emptyQualification());
        if (!assessed.complete) throw new OpportunityOperationError("Complete all explicit qualification criteria before marking this opportunity qualified.");
      }
      await client.query("UPDATE research_opportunities SET research_status=$2,archived_at=CASE WHEN $2='archived' THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1", [id,to]);
      await appendHistory(client,id,actorId,to === "archived" ? "archived" : from === "archived" ? "restored" : "status_changed",from,to);
      return to;
    });
  },

  async duplicateLeads(businessName: string, email?: string) {
    const company = businessName.trim().slice(0, 200);
    const emailValue = typeof email === "string" ? email.trim().toLowerCase().slice(0, 254) : "";
    if (company.length < 2 && !emailValue) return [];
    const rows = await pool().query(`SELECT i.id,i.name,i.email,i.company,i.status,i.follow_up_at,i.next_step,i.converted_project_id
      FROM contact_inquiries i WHERE NOT EXISTS(SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
      AND ((regexp_replace(lower($1),'[^[:alnum:]]','','g')<>'' AND regexp_replace(lower(COALESCE(i.company,'')),'[^[:alnum:]]','','g')=regexp_replace(lower($1),'[^[:alnum:]]','','g'))
        OR ($2<>'' AND lower(i.email)=$2))
      ORDER BY i.updated_at DESC,i.id DESC LIMIT 20`, [company,emailValue]);
    return rows.rows.map((row) => ({ id: Number(row.id), name: String(row.name), email: String(row.email), company: row.company ? String(row.company) : null, status: String(row.status), followUpAt: safeDate(row.follow_up_at), nextStep: String(row.next_step ?? ""), projectId: row.converted_project_id ? String(row.converted_project_id) : null }));
  },

  async promote(id: string, input: { confirm: boolean; existingLeadId?: number | null; name?: string; email?: string; company?: string }, actorId: string) {
    if (!validateUuid(id) || input.confirm !== true) throw new OpportunityOperationError("Confirm the CRM promotion explicitly.");
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const name = typeof input.name === "string" ? input.name.trim().slice(0, 160) : "";
    const company = typeof input.company === "string" ? input.company.trim().slice(0, 200) : "";
    const linkingExisting = input.existingLeadId !== undefined && input.existingLeadId !== null;
    if (!linkingExisting && (!name || !isValidEmailAddress(email) || !company)) throw new OpportunityOperationError("A new CRM lead needs a real contact name, valid email, and company.");
    return withTransaction(async (client) => {
      const opportunity = (await client.query("SELECT * FROM research_opportunities WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!opportunity) throw new OpportunityOperationError("Opportunity not found.");
      if (opportunity.crm_lead_id !== null) return { kind: "existing" as const, leadId: Number(opportunity.crm_lead_id) };
      if (opportunity.archived_at || !["validated","qualified"].includes(String(opportunity.research_status))) throw new OpportunityOperationError("Only validated, active research can be promoted.");
      if (opportunity.outreach_status !== "permission_granted" || !opportunity.commercial_permission_at) throw new OpportunityOperationError("The participant must explicitly authorize commercial discussions before promotion.");
      let leadId: number;
      let eventType: "crm_linked" | "crm_created";
      if (linkingExisting) {
        const selectedLeadId = input.existingLeadId;
        if (typeof selectedLeadId !== "number" || !Number.isSafeInteger(selectedLeadId) || selectedLeadId < 1) throw new OpportunityOperationError("Choose a valid existing lead.");
        const existing = (await client.query("SELECT id,company,name FROM contact_inquiries i WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id) FOR UPDATE", [selectedLeadId])).rows[0];
        if (!existing) throw new OpportunityOperationError("The selected lead is unavailable or retired.");
        const researchName = normalizeBusinessName(String(opportunity.business_name));
        const existingNames = [existing.company,existing.name].filter(Boolean).map((value) => normalizeBusinessName(String(value)));
        if (!existingNames.includes(researchName)) throw new OpportunityOperationError("The selected lead does not match this research business. Refresh duplicate candidates.");
        leadId = Number(existing.id);
        eventType = "crm_linked";
      } else {
        const identity = (await client.query<{ company_key: string }>("SELECT regexp_replace(lower($1),'[^[:alnum:]]','','g') AS company_key", [company])).rows[0]?.company_key;
        if (!identity) throw new OpportunityOperationError("A company name with letters or numbers is required.");
        // Every promotion takes these independent identity locks in the same
        // order, including when only one identity overlaps another promotion.
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`opportunity-promotion:company:${identity}`]);
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`opportunity-promotion:email:${email}`]);
        const matches = await client.query("SELECT id FROM contact_inquiries i WHERE NOT EXISTS(SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id) AND (lower(i.email)=$1 OR regexp_replace(lower(COALESCE(i.company,'')),'[^[:alnum:]]','','g')=$2) FOR UPDATE", [email,identity]);
        if (matches.rowCount) throw new OpportunityOperationError("A matching CRM lead already exists. Review it and link the existing record.");
        const inserted = await client.query(`INSERT INTO contact_inquiries(name,email,company,project_type,message,ip_hash,status,intake)
          VALUES($1,$2,$3,'Opportunity research validation',$4,'owner-research-'||$5,'new',jsonb_build_object('source','owner-research','opportunityId',$5)) RETURNING id`, [name,email,company,String(opportunity.suspected_problem || opportunity.workflow || "Validated operational workflow research").slice(0,5000),id]);
        leadId = Number(inserted.rows[0].id);
        eventType = "crm_created";
      }
      await client.query("UPDATE research_opportunities SET crm_lead_id=$2,updated_at=NOW() WHERE id=$1", [id,leadId]);
      await appendHistory(client,id,actorId,eventType,null,String(leadId),{ leadId });
      return { kind: eventType === "crm_created" ? "created" as const : "linked" as const, leadId };
    });
  },

  async reports() {
    const client = await pool().connect();
    try {
      const [industries, workflows, problems, stages, calendar, overdue, unpromoted, outcomes] = await Promise.all([
        client.query("SELECT industry,COUNT(*)::int AS count FROM research_opportunities WHERE archived_at IS NULL GROUP BY industry ORDER BY count DESC,industry LIMIT 30"),
        client.query("SELECT industry,workflow,COUNT(*)::int AS count,array_agg(id::text ORDER BY updated_at DESC) AS opportunity_ids FROM research_opportunities WHERE archived_at IS NULL AND workflow<>'' GROUP BY industry,workflow HAVING COUNT(*)>1 ORDER BY count DESC,industry,workflow LIMIT 30"),
        client.query("SELECT industry,suspected_problem,COUNT(*)::int AS count,array_agg(id::text ORDER BY updated_at DESC) AS opportunity_ids FROM research_opportunities WHERE archived_at IS NULL AND suspected_problem<>'' GROUP BY industry,suspected_problem HAVING COUNT(*)>1 ORDER BY count DESC,industry,suspected_problem LIMIT 30"),
        client.query("SELECT research_status,COUNT(*)::int AS count FROM research_opportunities WHERE archived_at IS NULL GROUP BY research_status"),
        client.query("SELECT o.id,o.business_name,o.industry,i.interview_on::text AS interview_date,i.participant_role FROM opportunity_interviews i JOIN research_opportunities o ON o.id=i.opportunity_id WHERE o.archived_at IS NULL AND i.interview_status='scheduled' AND i.interview_on BETWEEN CURRENT_DATE AND CURRENT_DATE+30 ORDER BY i.interview_on,o.id LIMIT 25"),
        client.query("SELECT id,business_name,industry,next_action,next_action_at::text AS next_action_at FROM research_opportunities WHERE archived_at IS NULL AND next_action_at<CURRENT_DATE ORDER BY next_action_at,id LIMIT 25"),
        client.query("SELECT id,business_name,industry,research_status,updated_at FROM research_opportunities WHERE archived_at IS NULL AND crm_lead_id IS NULL AND research_status IN ('validated','qualified') ORDER BY manual_priority ASC NULLS LAST,next_action_at ASC NULLS LAST,updated_at DESC LIMIT 50"),
        client.query("SELECT o.id,o.business_name,o.industry,o.research_status,o.crm_lead_id,i.status AS crm_status,i.converted_project_id,(SELECT COUNT(*)::int FROM crm_proposals p WHERE p.lead_id=i.id) AS proposal_count,(SELECT COUNT(*)::int FROM crm_proposals p WHERE p.lead_id=i.id AND p.state='accepted') AS accepted_count FROM research_opportunities o LEFT JOIN contact_inquiries i ON i.id=o.crm_lead_id WHERE o.crm_lead_id IS NOT NULL ORDER BY o.updated_at DESC,o.id LIMIT 100"),
      ]);
      const rows = (value: typeof industries) => value.rows;
      return { industries: rows(industries), recurringWorkflows: rows(workflows).map((row) => ({ ...row, opportunityIds: row.opportunity_ids as string[] })), recurringProblems: rows(problems).map((row) => ({ ...row, opportunityIds: row.opportunity_ids as string[] })), stages: rows(stages), upcomingInterviews: rows(calendar).map((row) => ({ ...row, id: String(row.id), date: String(row.interview_date) })), overdueActions: rows(overdue).map((row) => ({ ...row, id: String(row.id), next_action_at: String(row.next_action_at) })), validatedUnpromoted: rows(unpromoted).map((row) => ({ ...row, id: String(row.id) })), promotions: rows(outcomes).map((row) => ({ ...row, id: String(row.id), crmLeadId: Number(row.crm_lead_id), projectId: row.converted_project_id ? String(row.converted_project_id) : null, proposalCount: Number(row.proposal_count), acceptedProposalCount: Number(row.accepted_count) })) };
    } finally { client.release(); }
  },

  async deleteArchived(id: string, confirmation: string, actorId: string) {
    if (!validateUuid(id) || confirmation !== `DELETE ${id}`) throw new OpportunityOperationError("Type DELETE and the opportunity ID to erase archived research.");
    return withTransaction(async (client) => {
      const row = (await client.query("SELECT research_status FROM research_opportunities WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!row || row.research_status !== "archived") throw new OpportunityOperationError("Only archived research can be erased.");
      await appendHistory(client,id,actorId,"erased","archived","erased");
      const deleted = await client.query("DELETE FROM research_opportunities WHERE id=$1 RETURNING crm_lead_id", [id]);
      return { deleted: Boolean(deleted.rowCount), linkedLeadPreserved: deleted.rows[0]?.crm_lead_id !== null };
    });
  },

  async consultations() {
    const result = await pool().query("SELECT id,service_slug,client_name,business,consultation_date,status FROM consultations WHERE status<>'archived' ORDER BY updated_at DESC LIMIT 100");
    return result.rows.map((row) => ({ id: String(row.id), label: `${String(row.business || row.client_name || "Consultation")} · ${String(row.service_slug)} · ${row.consultation_date ? new Date(String(row.consultation_date)).toISOString().slice(0,10) : "undated"}` }));
  },

  qualificationFields: qualificationCriteria,
};

export function qualificationForForm(value: unknown): OpportunityQualification {
  return parseQualification(value) ?? emptyQualification();
}
