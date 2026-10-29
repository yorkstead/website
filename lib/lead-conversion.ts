export type LeadConversionQueryClient = {
  query: (query: string, params?: unknown[]) => Promise<unknown>;
};

export class LeadConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadConversionError";
  }
}

type ConversionIds = {
  projectId: string;
  activityId: string;
  now: string;
};

const claimLeadConversionQuery = `
WITH claimed AS (
  UPDATE contact_inquiries
  SET status = 'won', archived_at = NULL, follow_up_at = NULL, converted_project_id = $2, updated_at = NOW()
  WHERE id = $1 AND converted_project_id IS NULL
    AND status <> 'archived'
    AND NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id)
  RETURNING name, email, company, message
), project_data AS (
  SELECT jsonb_build_object(
    'id', $2::text, 'name', COALESCE(company, name), 'eyebrow', 'Client project',
    'description', message, 'status', 'Planning', 'kind', 'Business', 'stack', '[]'::jsonb,
    'updatedAt', $3::text, 'updatedLabel', 'Just converted', 'note', 'Lead ' || $1::text || ' · ' || email,
    'progress', 5, 'accent', 'cyan', 'pinned', true
  ) AS project,
  jsonb_build_object('id', $4::text, 'message', 'Converted ' || name || ' into a client project', 'createdAt', $3::text) AS activity
  FROM claimed
)
INSERT INTO workspaces (id, data, updated_at)
SELECT 'primary', jsonb_build_object('projects', jsonb_build_array(project), 'tasks', '[]'::jsonb, 'activity', jsonb_build_array(activity)), NOW()
FROM project_data
ON CONFLICT (id) DO UPDATE SET
  data = workspaces.data || jsonb_build_object(
    'projects', COALESCE(workspaces.data->'projects', '[]'::jsonb) || COALESCE(EXCLUDED.data->'projects', '[]'::jsonb),
    'tasks', COALESCE(workspaces.data->'tasks', '[]'::jsonb),
    'activity', COALESCE(EXCLUDED.data->'activity', '[]'::jsonb) || COALESCE(workspaces.data->'activity', '[]'::jsonb)
  ),
  updated_at = NOW()
`;

function resultRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

export async function convertLeadRecord(client: LeadConversionQueryClient, leadId: number, ids: ConversionIds) {
  await client.query(claimLeadConversionQuery, [leadId, ids.projectId, ids.now, ids.activityId]);
  const result = await client.query(`
    SELECT i.converted_project_id, i.status, (r.inquiry_id IS NOT NULL) AS retired
    FROM contact_inquiries i
    LEFT JOIN inquiry_retirements r ON r.inquiry_id = i.id
    WHERE i.id = $1
    LIMIT 1
  `, [leadId]);
  const record = resultRows(result)[0];
  const destinationId = record?.converted_project_id;
  if (!record) throw new LeadConversionError("This inquiry was not found or has expired.");
  if (record.retired === true) throw new LeadConversionError("This inquiry is retired and cannot be converted.");
  if (record.status === "archived" && (typeof destinationId !== "string" || !destinationId)) throw new LeadConversionError("Restore this archived inquiry to an active stage before converting it.");
  if (typeof destinationId !== "string" || !destinationId) throw new LeadConversionError("Project conversion could not be confirmed. Refresh the inquiry before retrying.");
  return destinationId;
}
