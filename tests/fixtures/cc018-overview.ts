import { Pool } from "pg";
import { cc016Owner, disposeCc016Inquiry, setupCc016Owner } from "./cc016-owner";
import { dateKeyInTimeZone } from "../../lib/date-time";
import { followUpTimestamp } from "../../lib/lead-rules";

const databaseURL = process.env.TEST_DATABASE_URL;
if (!databaseURL || databaseURL !== process.env.DATABASE_URL || process.env.NODE_ENV === "production") throw new Error("CC-018 requires identical disposable database URLs outside production");
const parsedURL = new URL(databaseURL);
if (!/(^|[_-])(test|disposable)([_-]|$)/i.test(parsedURL.pathname) || !["127.0.0.1", "localhost", "[::1]"].includes(parsedURL.hostname)) throw new Error("CC-018 requires a loopback disposable database");

export const cc018Owner = cc016Owner;
export const cc018LeadEmail = `cc018-overview-${crypto.randomUUID()}@example.test`;
export const cc018TodayLeadEmail = `cc018-today-${crypto.randomUUID()}@example.test`;
export const cc018StalledLeadEmail = `cc018-stalled-${crypto.randomUUID()}@example.test`;
export const cc019LeadEmail = `cc019-sales-${crypto.randomUUID()}@example.test`;
export const cc018ProjectId = `cc018-project-${crypto.randomUUID()}`;
export const cc018TaskId = `cc018-task-${crypto.randomUUID()}`;
export const cc018Company = `CC-018 Example ${crypto.randomUUID().slice(0, 8)}`;

export function offsetDateKey(offset: number) {
  const today = dateKeyInTimeZone(new Date(), "America/Denver");
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export async function setupCc018Overview() {
  const owner = await setupCc016Owner();
  const pool = new Pool({ connectionString: databaseURL });
  try {
    const snapshot = await pool.query<{ data: Record<string, unknown>; updated_at: Date }>("SELECT data,updated_at FROM workspaces WHERE id='primary'");
    const current = snapshot.rows[0]?.data ?? { projects: [], tasks: [], activity: [] };
    const project = { id: cc018ProjectId, name: "CC-018 Active Project", eyebrow: "Software", description: "Synthetic browser fixture", status: "Active", kind: "Software", stack: [], updatedAt: new Date(Date.now() - 21 * 86_400_000).toISOString(), updatedLabel: "", note: "Review the saved implementation plan", progress: 35, accent: "cyan" };
    const task = { id: cc018TaskId, title: "CC-018 Complete workspace task", projectId: cc018ProjectId, priority: "High", dueDate: offsetDateKey(-1), done: false, createdAt: new Date().toISOString() };
    const fixtureWorkspace = {
      ...current,
      projects: [project],
      tasks: [task],
      activity: [{ id: "cc018-persisted-activity", message: "CC-018 saved workspace activity", createdAt: new Date().toISOString() }],
    };
    await pool.query("INSERT INTO workspaces(id,data,updated_at) VALUES('primary',$1::jsonb,NOW()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=EXCLUDED.updated_at", [JSON.stringify(fixtureWorkspace)]);
    const ip = () => crypto.randomUUID();
    await pool.query(`
      INSERT INTO contact_inquiries(name,email,company,message,status,ip_hash,follow_up_at)
      VALUES
        ('CC-018 Overdue Follow-up',$1,$4,'Synthetic owner-only test inquiry','new',$5,$6),
        ('CC-018 Due Today',$2,$4,'Synthetic owner-only test inquiry','proposal',$7,$8),
        ('CC-018 Stalled Opportunity',$3,$4,'Synthetic owner-only test inquiry','qualified',$9,NULL),
        ('CC-019 Sales Workflow',$10,$4,'Synthetic owner-only test inquiry with budget context $5000+','new',$11,NULL)
    `, [cc018LeadEmail, cc018TodayLeadEmail, cc018StalledLeadEmail, cc018Company, ip(), followUpTimestamp(offsetDateKey(-1)), ip(), followUpTimestamp(offsetDateKey(0)), ip(), cc019LeadEmail, ip()]);
    const crmLead = await pool.query<{ id: string }>("SELECT id FROM contact_inquiries WHERE email=$1", [cc019LeadEmail]);
    await pool.query(`INSERT INTO consultations(id,lead_id,service_slug,client_name,business,email,status,responses)
      VALUES ($1,$2,'workflow-automation','CC-019 Sales Workflow', $3, $4, 'scoped', $5::jsonb)`, [crypto.randomUUID(), crmLead.rows[0]!.id, cc018Company, cc019LeadEmail, JSON.stringify({ industry: "manufacturing", trigger: "Inventory reconciliation takes two days each week.", outcome: "Reduce manual reconciliation" })]);
    await pool.query("UPDATE contact_inquiries SET updated_at=NOW()-INTERVAL '21 days' WHERE email=$1", [cc018StalledLeadEmail]);
    return { workspace: owner.workspace, workspaceSnapshot: snapshot.rows[0] ?? null };
  } finally { await pool.end(); }
}

export async function disposeCc018Overview(workspace: { data: Record<string, unknown>; updated_at: Date } | null) {
  const pool = new Pool({ connectionString: databaseURL });
  try {
    await pool.query("DELETE FROM consultations WHERE lead_id IN (SELECT id FROM contact_inquiries WHERE email=ANY($1::text[]))", [[cc018LeadEmail, cc018TodayLeadEmail, cc018StalledLeadEmail, cc019LeadEmail]]);
    await pool.query("DELETE FROM contact_inquiries WHERE email = ANY($1::text[])", [[cc018LeadEmail, cc018TodayLeadEmail, cc018StalledLeadEmail, cc019LeadEmail]]);
  } finally { await pool.end(); }
  await disposeCc016Inquiry("cc018-fixture-cleanup@example.test", workspace);
}
