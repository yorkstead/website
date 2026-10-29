import { randomUUID } from "node:crypto";
import { contactDatabase } from "@/lib/contact-inquiries";
import { consultationStatuses, type ConsultationInput, type ConsultationRecord, type ConsultationStatus } from "@/lib/consultation-model";
import { consultationIndustryResponseKey, getConsultationPlaybook } from "@/lib/consultation-playbooks";
import { isValidDateKey } from "@/lib/date-time";
import { createPagination, normalizeCount } from "@/lib/pagination";
import { isValidEmailAddress } from "@/lib/semantic-validation";
import type { ServiceSlug } from "@/lib/services";

export { consultationStatuses } from "@/lib/consultation-model";
export type { ConsultationInput, ConsultationRecord, ConsultationStatus } from "@/lib/consultation-model";

function shortText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseConsultationInput(value: unknown): ConsultationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const rawResponses = candidate.responses;
  if (!rawResponses || typeof rawResponses !== "object" || Array.isArray(rawResponses)) return null;
  const responseValues = rawResponses as Record<string, unknown>;
  const playbook = getConsultationPlaybook(
    shortText(candidate.serviceSlug, 80),
    shortText(responseValues[consultationIndustryResponseKey], 80) || null,
  );
  if (!playbook) return null;
  const allowedFields = new Set([
    consultationIndustryResponseKey,
    ...playbook.sections.flatMap((section) => section.fields.map((field) => field.id)),
  ]);
  const responses: Record<string, string> = {};
  for (const [key, answer] of Object.entries(responseValues)) {
    if (allowedFields.has(key) && typeof answer === "string") responses[key] = answer.trim().slice(0, 10000);
  }
  const status = shortText(candidate.status, 20);
  const consultationDate = shortText(candidate.consultationDate, 10);
  const clientName = shortText(candidate.clientName, 160);
  const business = shortText(candidate.business, 200);
  const email = typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const leadId = candidate.leadId === null || candidate.leadId === undefined ? null : Number(candidate.leadId);
  if (!consultationStatuses.includes(status as ConsultationStatus)) return null;
  if (consultationDate && !isValidDateKey(consultationDate)) return null;
  if (!clientName && !business) return null;
  if (email && !isValidEmailAddress(email)) return null;
  if (leadId !== null && (!Number.isSafeInteger(leadId) || leadId < 1)) return null;
  return {
    leadId,
    serviceSlug: playbook.serviceSlug,
    clientName,
    business,
    email,
    consultationDate,
    status: status as ConsultationStatus,
    responses,
  };
}

export const CONSULTATION_PAGE_SIZE = 12;

export async function listConsultationsPage(page = 1) {
  const sql = await contactDatabase();
  const countRows = await sql`SELECT COUNT(*)::int AS total_count, COUNT(*) FILTER (WHERE status <> 'archived')::int AS active_count FROM consultations`;
  const pagination = createPagination(countRows[0]?.total_count, page, CONSULTATION_PAGE_SIZE);
  const offset = (pagination.page - 1) * pagination.pageSize;
  const rows = await sql`SELECT * FROM consultations ORDER BY updated_at DESC, id DESC LIMIT ${pagination.pageSize} OFFSET ${offset}`;
  return {
    records: rows.map(mapConsultation) satisfies ConsultationRecord[],
    activeTotal: normalizeCount(countRows[0]?.active_count),
    pagination,
  };
}

export async function createConsultation(input: ConsultationInput) {
  const sql = await contactDatabase();
  const id = randomUUID();
  const responses = JSON.stringify(input.responses);
  const rows = await sql`
    INSERT INTO consultations (id, lead_id, service_slug, client_name, business, email, consultation_date, status, responses)
    VALUES (${id}, ${input.leadId}, ${input.serviceSlug}, ${input.clientName}, ${input.business}, ${input.email}, ${input.consultationDate || null}, ${input.status}, ${responses}::jsonb)
    RETURNING *
  `;
  return mapConsultation(rows[0]);
}

export async function updateConsultation(id: string, input: ConsultationInput) {
  const sql = await contactDatabase();
  const responses = JSON.stringify(input.responses);
  const rows = await sql`
    UPDATE consultations SET
      lead_id = ${input.leadId}, service_slug = ${input.serviceSlug}, client_name = ${input.clientName},
      business = ${input.business}, email = ${input.email}, consultation_date = ${input.consultationDate || null},
      status = ${input.status}, responses = ${responses}::jsonb, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length ? mapConsultation(rows[0]) : null;
}

export async function deleteConsultation(id: string) {
  const sql = await contactDatabase();
  const rows = await sql`DELETE FROM consultations WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function getLeadConsultation(leadId: number, consultationId: string) {
  if (!Number.isSafeInteger(leadId) || leadId < 1 || !consultationId) return null;
  const sql = await contactDatabase();
  const rows = await sql`SELECT c.* FROM consultations c JOIN contact_inquiries i ON i.id=c.lead_id
    WHERE c.id=${consultationId} AND c.lead_id=${leadId}
      AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id) LIMIT 1`;
  return rows.length ? mapConsultation(rows[0]) : null;
}

export async function listLeadConsultationSummaries(leadId: number) {
  if (!Number.isSafeInteger(leadId) || leadId < 1) return [];
  const sql = await contactDatabase();
  const rows = await sql`SELECT id, service_slug, consultation_date, status, responses, updated_at FROM consultations WHERE lead_id = ${leadId} AND status <> 'archived' AND EXISTS (SELECT 1 FROM contact_inquiries i WHERE i.id=consultations.lead_id AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)) ORDER BY updated_at DESC LIMIT 8`;
  return rows.map((row) => {
    const responses = row.responses && typeof row.responses === "object" ? row.responses as Record<string, unknown> : {};
    return { id: String(row.id), serviceSlug: String(row.service_slug), date: row.consultation_date ? new Date(String(row.consultation_date)).toISOString().slice(0, 10) : "", status: String(row.status), requirementCount: Object.keys(responses).length,
      requirements: Object.entries(responses).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1].trim())).slice(0, 5).map(([key, value]) => `${key}: ${value.trim().slice(0, 180)}`) };
  });
}

function mapConsultation(row: Record<string, unknown>): ConsultationRecord {
  return {
    id: String(row.id),
    leadId: row.lead_id === null || row.lead_id === undefined ? null : Number(row.lead_id),
    serviceSlug: String(row.service_slug) as ServiceSlug,
    clientName: String(row.client_name ?? ""),
    business: String(row.business ?? ""),
    email: String(row.email ?? ""),
    consultationDate: row.consultation_date ? new Date(String(row.consultation_date)).toISOString().slice(0, 10) : "",
    status: String(row.status) as ConsultationStatus,
    responses: row.responses && typeof row.responses === "object" ? row.responses as Record<string, string> : {},
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}
