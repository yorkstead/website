import { neon } from "@neondatabase/serverless";
import { createPagination } from "@/lib/pagination";
import { disposablePostgresQueryFunction, isLoopbackDisposableDatabase } from "@/lib/contact-database";
import type { WorkflowAuditIntake } from "@/lib/workflow-audit";
import type { ProductInquiryIntake } from "@/lib/product-inquiry";

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost" | "archived";
export type NotificationStatus = "not_configured" | "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed";

export type LeadSummary = {
  open: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  won: number;
};

export type FollowUpFilter = "overdue" | "today" | "upcoming";

export type CommandCenterLead = Pick<ContactInquiry, "id" | "name" | "company" | "projectType" | "status" | "followUpAt" | "updatedAt" | "nextStep">;
export type CommandCenterCrmSnapshot = {
  stageCounts: Record<Extract<LeadStatus, "new" | "contacted" | "qualified" | "proposal">, number>;
  dueFollowUps: CommandCenterLead[];
  stalledOpportunities: CommandCenterLead[];
  pendingProposalCount: number;
  pipelineValueCents: number;
  wonValueCents: number;
  conversionRate: number | null;
  proposalNextActions: Array<{ leadId: number; name: string; company: string | null; state: string; nextAction: string; nextActionAt: string | null }>;
};

export function buildCommandCenterQueries() {
  const active = `NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)
    AND status NOT IN ('won', 'lost', 'archived')`;
  return {
    stages: {
      text: `SELECT status, COUNT(*)::int AS count FROM contact_inquiries WHERE ${active} GROUP BY status`,
      params: [],
    },
    due: {
      text: `SELECT id, name, company, project_type, status, follow_up_at, updated_at, next_step
        FROM contact_inquiries WHERE ${active}
          AND follow_up_at IS NOT NULL
          AND (follow_up_at AT TIME ZONE 'America/Denver')::date <= (NOW() AT TIME ZONE 'America/Denver')::date
        ORDER BY follow_up_at ASC, id ASC LIMIT 8`,
      params: [],
    },
    stalled: {
      text: `SELECT id, name, company, project_type, status, follow_up_at, updated_at, next_step
        FROM contact_inquiries WHERE ${active}
          AND status IN ('qualified', 'proposal')
          AND follow_up_at IS NULL
          AND updated_at < NOW() - INTERVAL '14 days'
        ORDER BY updated_at ASC, id ASC LIMIT 5`,
      params: [],
    },
    sales: {
      text: `SELECT COUNT(*) FILTER (WHERE p.state IN ('draft','sent') AND i.status NOT IN ('won','lost','archived'))::int AS pending_count,
        COALESCE(SUM(p.amount_cents) FILTER (WHERE p.state IN ('draft','sent') AND i.status NOT IN ('won','lost','archived')),0)::text AS pipeline_cents,
        COALESCE(SUM(p.amount_cents) FILTER (WHERE p.state='accepted' AND i.status='won'),0)::text AS won_cents,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status='won')::int AS won_count,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status='lost')::int AS lost_count
        FROM contact_inquiries i LEFT JOIN crm_proposals p ON p.lead_id=i.id
        WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)`, params: [],
    },
    proposalActions: {
      text: `SELECT i.id AS lead_id, i.name, i.company, p.state, p.next_action, p.next_action_at
        FROM crm_proposals p JOIN contact_inquiries i ON i.id=p.lead_id
        WHERE p.state IN ('draft','sent') AND i.status NOT IN ('won','lost','archived') AND p.next_action <> ''
          AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
        ORDER BY p.next_action_at ASC NULLS FIRST, p.updated_at ASC, p.id ASC LIMIT 5`, params: [],
    },
  };
}

export function normalizeCommandCenterCrmSnapshot(
  stageRows: Array<Record<string, unknown>>,
  dueRows: Array<Record<string, unknown>>,
  stalledRows: Array<Record<string, unknown>>,
  salesRow: Record<string, unknown> = {},
  proposalRows: Array<Record<string, unknown>> = [],
): CommandCenterCrmSnapshot {
  const stageCounts = { new: 0, contacted: 0, qualified: 0, proposal: 0 };
  for (const row of stageRows) {
    const status = String(row.status);
    if (status in stageCounts) stageCounts[status as keyof typeof stageCounts] = safeCount(row.count);
  }
  const map = (row: Record<string, unknown>): CommandCenterLead => ({
    id: Number(row.id),
    name: String(row.name ?? "Inquiry").slice(0, 120),
    company: row.company ? String(row.company).slice(0, 160) : null,
    projectType: row.project_type ? String(row.project_type).slice(0, 120) : null,
    status: row.status as LeadStatus,
    followUpAt: row.follow_up_at ? new Date(String(row.follow_up_at)).toISOString() : null,
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    nextStep: String(row.next_step ?? "").slice(0, 500),
  });
  return {
    stageCounts,
    dueFollowUps: dueRows.filter((row) => Number.isSafeInteger(Number(row.id)) && !Number.isNaN(Date.parse(String(row.updated_at)))).map(map),
    stalledOpportunities: stalledRows.filter((row) => Number.isSafeInteger(Number(row.id)) && !Number.isNaN(Date.parse(String(row.updated_at)))).map(map),
    pendingProposalCount: safeCount(salesRow.pending_count),
    pipelineValueCents: safeCount(salesRow.pipeline_cents),
    wonValueCents: safeCount(salesRow.won_cents),
    conversionRate: safeCount(salesRow.won_count) + safeCount(salesRow.lost_count) ? Math.round(safeCount(salesRow.won_count) / (safeCount(salesRow.won_count) + safeCount(salesRow.lost_count)) * 100) : null,
    proposalNextActions: proposalRows.filter((row) => Number.isSafeInteger(Number(row.lead_id)) && String(row.next_action ?? "").trim()).map((row) => ({
      leadId: Number(row.lead_id), name: String(row.name ?? "Inquiry").slice(0, 120), company: row.company ? String(row.company).slice(0, 160) : null,
      state: String(row.state ?? "").slice(0, 20), nextAction: String(row.next_action).slice(0, 300), nextActionAt: row.next_action_at ? new Date(String(row.next_action_at)).toISOString() : null,
    })),
  };
}

function safeCount(value: unknown) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

export async function getCommandCenterCrmSnapshot(): Promise<CommandCenterCrmSnapshot> {
  const sql = await contactDatabase();
  const queries = buildCommandCenterQueries();
  const [stages, due, stalled, sales, proposalActions] = await Promise.all([
    sql.query(queries.stages.text, queries.stages.params),
    sql.query(queries.due.text, queries.due.params),
    sql.query(queries.stalled.text, queries.stalled.params),
    sql.query(queries.sales.text, queries.sales.params),
    sql.query(queries.proposalActions.text, queries.proposalActions.params),
  ]);
  return normalizeCommandCenterCrmSnapshot(stages, due, stalled, sales[0] ?? {}, proposalActions);
}

export type ContactInquiryIntake = Partial<WorkflowAuditIntake> & Partial<ProductInquiryIntake> & Record<string, unknown>;

export type ContactInquiry = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  projectType: string | null;
  budget: string | null;
  message: string;
  description: string | null;
  problemAreas: string[];
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  landingPage: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  status: LeadStatus;
  qualificationStatus: string | null;
  industry: string;
  pain: string;
  companySize: string;
  urgency: string;
  decisionMaker: string;
  budgetIndication: string;
  nextStep: string;
  wonReason: string;
  lostReason: string;
  notes: string;
  followUpAt: string | null;
  convertedProjectId: string | null;
  notificationId: string | null;
  notificationStatus: NotificationStatus;
  intake: ContactInquiryIntake | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function contactDatabase() {
  const databaseURL = process.env.DATABASE_URL;
  if (!databaseURL || databaseURL === "[SENSITIVE]") throw new Error("DATABASE_URL is not configured");
  if (isLoopbackDisposableDatabase(databaseURL)) return disposablePostgresQueryFunction(databaseURL);
  return neon(databaseURL);
}

export const LEAD_PAGE_SIZE = 20;

type InquiryPageQueryOptions = { status?: LeadStatus; followUp?: FollowUpFilter; page?: number; pageSize?: number };

export function buildContactInquiryPageQueries({ status, followUp, page = 1, pageSize = LEAD_PAGE_SIZE }: InquiryPageQueryOptions) {
  const conditions = ["NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)"];
  const countParams: unknown[] = [];
  if (followUp) {
    const operator = followUp === "overdue" ? "<" : followUp === "today" ? "=" : ">";
    conditions.push(`follow_up_at IS NOT NULL AND (follow_up_at AT TIME ZONE 'America/Denver')::date ${operator} (NOW() AT TIME ZONE 'America/Denver')::date`);
    conditions.push("status NOT IN ('won', 'lost', 'archived')");
  } else if (status) {
    countParams.push(status);
    conditions.push(`status = $${countParams.length}`);
  }
  const where = conditions.join(" AND ");
  const ordering = followUp ? "follow_up_at ASC, id ASC" : "created_at DESC, id DESC";
  const pageParams = [...countParams, pageSize, (Math.max(1, page) - 1) * pageSize];
  const limitPosition = countParams.length + 1;
  const offsetPosition = countParams.length + 2;
  return {
    count: { text: `SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE ${where}`, params: countParams },
    records: {
      text: `SELECT * FROM contact_inquiries WHERE ${where} ORDER BY ${ordering} LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
      params: pageParams,
    },
  };
}

export async function listContactInquiryPage({ status, due = false, followUp, page = 1 }: { status?: LeadStatus; due?: boolean; followUp?: FollowUpFilter; page?: number } = {}) {
  const sql = await contactDatabase();
  const followUpView = followUp ?? (due ? "today" : undefined);
  const queries = buildContactInquiryPageQueries({ status: followUpView ? undefined : status, followUp: followUpView, page, pageSize: LEAD_PAGE_SIZE });
  const countRows = await sql.query(queries.count.text, queries.count.params);
  const pagination = createPagination(countRows[0]?.count, page, LEAD_PAGE_SIZE);
  const offset = (pagination.page - 1) * pagination.pageSize;
  const pageQueries = buildContactInquiryPageQueries({ status: followUpView ? undefined : status, followUp: followUpView, page: pagination.page, pageSize: pagination.pageSize });
  const rows = await sql.query(pageQueries.records.text, [...pageQueries.records.params.slice(0, -2), pagination.pageSize, offset]);
  return { records: rows.map(mapInquiry) satisfies ContactInquiry[], pagination };
}

export async function getContactInquiry(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const sql = await contactDatabase();
  const rows = await sql`SELECT * FROM contact_inquiries WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id) AND id = ${id} LIMIT 1`;
  return rows.length ? mapInquiry(rows[0]) : null;
}

export async function countDueFollowUps() {
  const sql = await contactDatabase();
  const rows = await sql`SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id) AND follow_up_at IS NOT NULL AND (follow_up_at AT TIME ZONE 'America/Denver')::date = (NOW() AT TIME ZONE 'America/Denver')::date AND status NOT IN ('won', 'lost', 'archived')`;
  return Number(rows[0]?.count ?? 0);
}

export async function countOverdueFollowUps() {
  const sql = await contactDatabase();
  const rows = await sql`SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id) AND follow_up_at IS NOT NULL AND (follow_up_at AT TIME ZONE 'America/Denver')::date < (NOW() AT TIME ZONE 'America/Denver')::date AND status NOT IN ('won', 'lost', 'archived')`;
  return Number(rows[0]?.count ?? 0);
}

export async function getLeadSummary() {
  const sql = await contactDatabase();
  const rows = await sql`SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('won', 'lost', 'archived'))::int AS open_count,
    COUNT(*) FILTER (
      WHERE follow_up_at IS NOT NULL AND (follow_up_at AT TIME ZONE 'America/Denver')::date < (NOW() AT TIME ZONE 'America/Denver')::date
        AND status NOT IN ('won', 'lost', 'archived')
    )::int AS overdue_count,
    COUNT(*) FILTER (
      WHERE follow_up_at IS NOT NULL AND (follow_up_at AT TIME ZONE 'America/Denver')::date = (NOW() AT TIME ZONE 'America/Denver')::date
        AND status NOT IN ('won', 'lost', 'archived')
    )::int AS due_today_count,
    COUNT(*) FILTER (
      WHERE follow_up_at IS NOT NULL AND (follow_up_at AT TIME ZONE 'America/Denver')::date > (NOW() AT TIME ZONE 'America/Denver')::date
        AND status NOT IN ('won', 'lost', 'archived')
    )::int AS upcoming_count,
    COUNT(*) FILTER (WHERE status = 'won')::int AS won_count
    FROM contact_inquiries WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)`;
  return normalizeLeadSummary(rows[0] ?? {});
}

export function normalizeLeadSummary(row: Record<string, unknown>): LeadSummary {
  return {
    open: normalizeCount(row.open_count),
    overdue: normalizeCount(row.overdue_count),
    dueToday: normalizeCount(row.due_today_count),
    upcoming: normalizeCount(row.upcoming_count),
    won: normalizeCount(row.won_count),
  };
}

function normalizeCount(value: unknown) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

function mapInquiry(row: Record<string, unknown>): ContactInquiry {
  const problemAreas = Array.isArray(row.problem_areas)
    ? row.problem_areas.filter((item): item is string => typeof item === "string")
    : typeof row.problem_areas === "string"
      ? row.problem_areas.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    id: Number(row.id), name: String(row.name), email: String(row.email),
    company: row.company ? String(row.company) : null,
    phone: row.phone ? String(row.phone) : null,
    projectType: row.project_type ? String(row.project_type) : null,
    budget: row.budget ? String(row.budget) : null,
    message: String(row.message ?? ""),
    description: row.description ? String(row.description) : null,
    problemAreas,
    source: row.source ? String(row.source) : null,
    medium: row.medium ? String(row.medium) : null,
    campaign: row.campaign ? String(row.campaign) : null,
    content: row.content ? String(row.content) : null,
    term: row.term ? String(row.term) : null,
    landingPage: row.landing_page ? String(row.landing_page) : null,
    referrer: row.referrer ? String(row.referrer) : null,
    utmSource: row.utm_source ? String(row.utm_source) : null,
    utmMedium: row.utm_medium ? String(row.utm_medium) : null,
    utmCampaign: row.utm_campaign ? String(row.utm_campaign) : null,
    utmContent: row.utm_content ? String(row.utm_content) : null,
    utmTerm: row.utm_term ? String(row.utm_term) : null,
    status: row.status as LeadStatus,
    qualificationStatus: row.qualification_status ? String(row.qualification_status) : null,
    industry: String(row.industry ?? ""), pain: String(row.pain ?? ""), companySize: String(row.company_size ?? ""),
    urgency: String(row.urgency ?? ""), decisionMaker: String(row.decision_maker ?? ""), budgetIndication: String(row.budget_indication ?? ""),
    nextStep: String(row.next_step ?? ""), wonReason: String(row.won_reason ?? ""), lostReason: String(row.lost_reason ?? ""),
    notes: String(row.notes ?? ""),
    followUpAt: row.follow_up_at ? new Date(String(row.follow_up_at)).toISOString() : null,
    convertedProjectId: row.converted_project_id ? String(row.converted_project_id) : null,
    notificationId: row.notification_id ? String(row.notification_id) : null,
    notificationStatus: String(row.notification_status ?? "not_configured") as NotificationStatus,
    intake: row.intake && typeof row.intake === "object" ? row.intake as WorkflowAuditIntake : null,
    archivedAt: row.archived_at ? new Date(String(row.archived_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}
