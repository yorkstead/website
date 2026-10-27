import { neon } from "@neondatabase/serverless";
import type { BriefingOpportunity, SourceResult } from "@/lib/morning-briefing/types";

function mapOpportunity(row: Record<string, unknown>): BriefingOpportunity {
  return {
    id: Number(row.id),
    name: String(row.name ?? "Opportunity"),
    company: row.company ? String(row.company) : null,
    projectType: row.project_type ? String(row.project_type) : null,
    status: String(row.status ?? "new"),
    qualificationStatus: row.qualification_status ? String(row.qualification_status) : null,
    followUpAt: row.follow_up_at ? new Date(String(row.follow_up_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function loadOpportunitySource(): Promise<SourceResult<BriefingOpportunity[]>> {
  const databaseURL = process.env.DATABASE_URL;
  if (!databaseURL || databaseURL === "[SENSITIVE]") return { status: "not_configured", value: [] };
  try {
    const sql = neon(databaseURL);
    const rows = await sql`
      SELECT id, name, company, project_type, status, qualification_status, follow_up_at, created_at
      FROM contact_inquiries
      WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)
        AND status NOT IN ('won', 'lost', 'archived')
        AND (
          status IN ('qualified', 'proposal')
          OR qualification_status = 'qualified'
          OR follow_up_at <= NOW() + INTERVAL '1 day'
        )
      ORDER BY
        CASE status WHEN 'proposal' THEN 0 WHEN 'qualified' THEN 1 ELSE 2 END,
        follow_up_at ASC NULLS LAST,
        created_at DESC
      LIMIT 8
    `;
    return { status: "ok", value: rows.map((row) => mapOpportunity(row)) };
  } catch {
    return { status: "unavailable", value: [] };
  }
}
