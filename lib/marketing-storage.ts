import { contactDatabase } from "@/lib/contact-inquiries";
import { emptyMarketingWorkspace, normalizeMarketingWorkspace, type MarketingCrmInquiry, type MarketingWorkspace } from "@/lib/marketing-workspace";
import { defaultTimeZone, normalizeTimeZone } from "@/lib/date-time";

const workspaceId = "primary";

export async function getMarketingWorkspace() {
  const sql = await contactDatabase();
  const rows = await sql`SELECT data, updated_at::text AS version FROM marketing_workspaces WHERE id = ${workspaceId} LIMIT 1`;
  if (!rows.length) return { workspace: emptyMarketingWorkspace, updatedAt: null };
  return { workspace: normalizeMarketingWorkspace(rows[0].data) ?? emptyMarketingWorkspace, updatedAt: String(rows[0].version) };
}

export async function getWorkspaceTimeZone() {
  const sql = await contactDatabase();
  const rows = await sql`SELECT data->'settings'->>'timezone' AS timezone FROM workspaces WHERE id = 'primary' LIMIT 1`;
  return normalizeTimeZone(rows[0]?.timezone, defaultTimeZone);
}

export async function getMarketingCrmInquiries(linkedLeadIds: number[] = []): Promise<MarketingCrmInquiry[]> {
  const sql = await contactDatabase();
  const rows = await sql.query(`SELECT i.id, i.name, i.company, i.status, i.next_step, i.follow_up_at
    FROM contact_inquiries i
    WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
      AND (i.status <> 'archived' OR i.id = ANY($1::bigint[]))
    ORDER BY (i.id = ANY($1::bigint[])) DESC, i.created_at DESC, i.id DESC LIMIT 500`, [linkedLeadIds]);
  return rows.map((row) => ({
    id: Number(row.id), name: String(row.name ?? "Inquiry").slice(0, 120), company: String(row.company ?? "").slice(0, 160),
    status: String(row.status ?? "new"), nextStep: String(row.next_step ?? "").slice(0, 500),
    followUpAt: row.follow_up_at ? new Date(String(row.follow_up_at)).toISOString() : null,
  }));
}

export async function validateMarketingCrmLinks(workspace: MarketingWorkspace, previous: MarketingWorkspace): Promise<boolean> {
  const previousLinks = new Map(previous.prospects.map((prospect) => [prospect.id, prospect.crmLeadId]));
  const newLinks = workspace.prospects.flatMap((prospect) => prospect.crmLeadId === null ? [] : [prospect.crmLeadId]);
  const additions = workspace.prospects.filter((prospect) => prospect.crmLeadId !== null && previousLinks.get(prospect.id) !== prospect.crmLeadId);
  if (!additions.length) return true;
  const sql = await contactDatabase();
  const ids = additions.map((prospect) => prospect.crmLeadId as number);
  const rows = await sql.query(`SELECT i.id FROM contact_inquiries i
    WHERE i.id = ANY($1::bigint[]) AND i.status <> 'archived'
      AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)`, [ids]);
  const valid = new Set(rows.map((row) => Number(row.id)));
  return ids.every((id) => valid.has(id)) && new Set(newLinks).size === newLinks.length;
}

export async function saveMarketingWorkspace(workspace: MarketingWorkspace, expectedVersion: string | null) {
  const sql = await contactDatabase();
  const data = JSON.stringify(workspace);
  if (expectedVersion) {
    const rows = await sql`
      UPDATE marketing_workspaces SET data = ${data}::jsonb, updated_at = NOW()
      WHERE id = ${workspaceId} AND updated_at = ${expectedVersion}::timestamptz
      RETURNING updated_at::text AS version
    `;
    return rows.length ? String(rows[0].version) : null;
  }
  const rows = await sql`
    INSERT INTO marketing_workspaces (id, data, updated_at) VALUES (${workspaceId}, ${data}::jsonb, NOW())
    ON CONFLICT (id) DO NOTHING
    RETURNING updated_at::text AS version
  `;
  return rows.length ? String(rows[0].version) : null;
}
