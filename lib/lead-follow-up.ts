export type LeadFollowUpQueryClient = {
  query: (query: string, params?: unknown[]) => Promise<unknown>;
};

export type EditableLeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost" | "archived";

function resultRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

export async function saveLeadDetailsRecord(client: LeadFollowUpQueryClient, id: number, notes: string, followUpAt: string | null) {
  if (!Number.isSafeInteger(id) || id < 1) return false;
  const result = await client.query(`
    UPDATE contact_inquiries
    SET notes = $2,
      follow_up_at = CASE WHEN status NOT IN ('won', 'lost', 'archived') THEN $3::timestamptz ELSE NULL END,
      updated_at = NOW()
    WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)
    RETURNING id
  `, [id, notes, followUpAt]);
  return resultRows(result).length > 0;
}

export async function updateLeadStatusRecord(client: LeadFollowUpQueryClient, id: number, status: EditableLeadStatus) {
  if (!Number.isSafeInteger(id) || id < 1) return false;
  const result = await client.query(`
    UPDATE contact_inquiries
    SET status = $2,
      archived_at = CASE WHEN $2 = 'archived' THEN COALESCE(archived_at, NOW()) ELSE NULL END,
      follow_up_at = CASE WHEN $2 IN ('won', 'lost', 'archived') THEN NULL ELSE follow_up_at END,
      updated_at = NOW()
    WHERE id = $1
      AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)
    RETURNING id
  `, [id, status]);
  return resultRows(result).length > 0;
}

export async function completeLeadFollowUpRecord(client: LeadFollowUpQueryClient, id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return false;
  const result = await client.query(`
    UPDATE contact_inquiries
    SET follow_up_at = NULL, updated_at = NOW()
    WHERE id = $1 AND follow_up_at IS NOT NULL AND status NOT IN ('won', 'lost', 'archived')
      AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)
    RETURNING id
  `, [id]);
  return resultRows(result).length > 0;
}
