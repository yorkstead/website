import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { getAuth } from "../../lib/auth";
import { normalizeMarketingWorkspace, type MarketingWorkspace } from "../../lib/marketing-workspace";

const owner = { email: "cc038-marketing-owner@example.test", password: "Fictional-cc038-owner-85317642" };
const token = randomUUID();
const ownerId = "cc038-marketing-owner";
const workspaceProspectId = `cc038-prospect-${token}`;
const company = `CC-038 Marketing ${token.slice(0, 8)}`;
const secondCompany = `${company} second`;
const crmEmail = `cc038-crm-${token}@example.test`;
let pool: Pool | null = null;
let leadId: number | null = null;
let workspaceSnapshot: { data: unknown; updated_at: Date } | null = null;
let workspaceExisted = false;
let workspaceSnapshotCaptured = false;

function requireDisposableDatabase() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || process.env.NODE_ENV === "production" || value !== process.env.DATABASE_URL) {
    throw new Error("CC-038 browser flow requires identical disposable DATABASE_URL and TEST_DATABASE_URL values");
  }
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/(^|[_-])(test|disposable)([_-]|$)/i.test(url.pathname)) {
    throw new Error("CC-038 browser flow requires a loopback test/disposable database");
  }
  return value;
}

async function seedOwnerAndData() {
  pool = new Pool({ connectionString: requireDisposableDatabase() });
  for (const table of ["user", "session", "account", "verification"]) {
    await pool.query(`CREATE TABLE IF NOT EXISTS public."${table}" (LIKE customer_auth."${table}" INCLUDING ALL)`);
  }
  const priorWorkspace = await pool.query<{ data: unknown; updated_at: Date }>("SELECT data,updated_at FROM marketing_workspaces WHERE id='primary'");
  workspaceExisted = priorWorkspace.rowCount === 1;
  workspaceSnapshot = priorWorkspace.rows[0] ?? null;
  workspaceSnapshotCaptured = true;
  const passwordHash = await (await getAuth().$context).password.hash(owner.password);
  await pool.query('DELETE FROM public."session" WHERE "userId"=$1', [ownerId]);
  await pool.query('DELETE FROM public."account" WHERE "userId"=$1', [ownerId]);
  await pool.query('DELETE FROM public."user" WHERE id=$1', [ownerId]);
  await pool.query('INSERT INTO public."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [ownerId, "Fictional Marketing owner", owner.email]);
  await pool.query('INSERT INTO public."account"(id,"userId","accountId","providerId",password,"updatedAt") VALUES($1,$1,$1,\'credential\',$2,now())', [ownerId, passwordHash]);
  const inquiry = await pool.query<{ id: string }>(
    "INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,next_step,follow_up_at) VALUES('CC-038 CRM owner test',$1,$2,'Synthetic browser test',$3,'qualified','Send the CRM proposal',DATE '2026-12-10') RETURNING id",
    [crmEmail, company, token],
  );
  leadId = Number(inquiry.rows[0]!.id);
  const now = new Date().toISOString();
  const workspace: MarketingWorkspace = {
    campaignStart: "2026-01-01",
    prospects: [
      { id: workspaceProspectId, crmLeadId: null, company, website: "", contactName: "Marketing contact", contactTitle: "Owner", email: "", phone: "", location: "Front Range", segment: "other", stage: "conversation", source: "direct-outreach", operationalSignals: "Synthetic operational signal", fitScore: 4, nextAction: "Legacy Marketing reminder", nextActionAt: "2026-12-01", notes: "Existing prospect notes", createdAt: now, updatedAt: now },
      { id: `${workspaceProspectId}-second`, crmLeadId: null, company: secondCompany, website: "", contactName: "Second contact", contactTitle: "Manager", email: "", phone: "", location: "Front Range", segment: "other", stage: "target", source: "direct-outreach", operationalSignals: "Second synthetic prospect", fitScore: 3, nextAction: "Research account", nextActionAt: "2026-12-15", notes: "Second prospect notes", createdAt: now, updatedAt: now },
    ],
    activities: [{ id: `${workspaceProspectId}-activity`, prospectId: workspaceProspectId, type: "email", outcome: "Earlier outreach history to preserve", value: 0, createdAt: now }],
    content: [{ id: `${workspaceProspectId}-content`, week: 1, title: "Existing campaign content to preserve", format: "linkedin-post", status: "idea", asset: "Existing campaign asset note", cta: "Book a fit call", result: "", publishAt: "", createdAt: now, updatedAt: now }],
  };
  await pool.query(
    "INSERT INTO marketing_workspaces(id,data,updated_at) VALUES('primary',$1::jsonb,now()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=EXCLUDED.updated_at",
    [JSON.stringify(workspace)],
  );
}

async function restoreFixture() {
  if (!pool) return;
  if (workspaceSnapshotCaptured) {
    if (workspaceExisted && workspaceSnapshot) {
      await pool.query("UPDATE marketing_workspaces SET data=$1::jsonb,updated_at=$2 WHERE id='primary'", [JSON.stringify(workspaceSnapshot.data), workspaceSnapshot.updated_at]);
    } else {
      await pool.query("DELETE FROM marketing_workspaces WHERE id='primary'");
    }
  }
  await pool.query("DELETE FROM contact_inquiries WHERE email=$1", [crmEmail]);
  await pool.query('DELETE FROM public."session" WHERE "userId"=$1', [ownerId]);
  await pool.query('DELETE FROM public."account" WHERE "userId"=$1', [ownerId]);
  await pool.query('DELETE FROM public."user" WHERE id=$1', [ownerId]);
  await pool.end();
  pool = null;
}

test.beforeAll(seedOwnerAndData);
test.afterAll(restoreFixture);

test("owner links a prospect to CRM without losing Marketing history or duplicating sales fields", async ({ page, context, baseURL }) => {
  const openPipeline = () => page.getByRole("navigation", { name: "Marketing views" }).getByRole("button", { name: "Pipeline", exact: true });
  await page.goto("/dashboard/marketing");
  await expect(page).toHaveURL(/\/login\?next=\/dashboard\/marketing/);
  const signIn = await context.request.post("/api/auth/sign-in/email", { headers: { origin: baseURL! }, data: owner });
  expect(signIn.status()).toBe(200);
  await page.goto("/dashboard/marketing");
  await expect(page.getByRole("heading", { name: "Marketing Operations" })).toBeVisible();
  await openPipeline().click();

  const prospectCard = (name: string) => page.getByRole("heading", { name, exact: true }).locator("xpath=../../../..");
  await expect(prospectCard(company).getByRole("button", { name: "Edit" })).toBeVisible();
  await prospectCard(company).getByRole("button", { name: "Edit" }).click();
  const editor = page.getByRole("dialog", { name: "Prospect details" });
  const crmPicker = editor.getByLabel("Link existing CRM inquiry");
  await crmPicker.selectOption(String(leadId));
  await expect(editor.getByText("Canonical CRM record")).toBeVisible();
  await expect(editor.getByText("qualified", { exact: true })).toBeVisible();
  await expect(editor.getByText("Next step: Send the CRM proposal · follow-up 2026-12-10")).toBeVisible();
  await expect(editor.getByRole("link", { name: `Open CRM inquiry #${leadId}` })).toHaveAttribute("href", `/dashboard/leads?lead=${leadId}`);
  await expect(editor.getByLabel("Stage", { exact: true })).toHaveCount(0);
  await expect(editor.getByLabel("Next-action date", { exact: true })).toHaveCount(0);
  await expect(editor.getByLabel("Next action", { exact: true })).toHaveCount(0);
  await editor.getByRole("button", { name: "Save prospect" }).click();
  await expect(page.getByText("Cloud saved", { exact: true })).toBeVisible();

  const linkedCard = prospectCard(company);
  await expect(linkedCard.getByText("CRM · qualified", { exact: true })).toBeVisible();
  await expect(linkedCard.getByText("Send the CRM proposal", { exact: true })).toBeVisible();
  await expect(linkedCard.getByText("Follow-up 2026-12-10", { exact: true })).toBeVisible();
  await expect(linkedCard.getByText("Legacy Marketing reminder", { exact: true })).toHaveCount(0);
  await expect(linkedCard.getByRole("link", { name: `Open CRM inquiry #${leadId}` })).toHaveAttribute("href", `/dashboard/leads?lead=${leadId}`);
  await linkedCard.getByRole("link", { name: `Open CRM inquiry #${leadId}` }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/leads\\?lead=${leadId}`));
  await expect(page.locator(`#lead-${leadId}`)).toContainText("qualified");
  await page.goto("/dashboard/marketing");
  await openPipeline().click();

  const savedResponse = await context.request.get("/api/marketing-workspace");
  expect(savedResponse.status()).toBe(200);
  const savedPayload = await savedResponse.json() as { workspace: MarketingWorkspace };
  const saved = normalizeMarketingWorkspace(savedPayload.workspace)!;
  const savedProspect = saved.prospects.find((item) => item.id === workspaceProspectId);
  expect(savedProspect).toMatchObject({ crmLeadId: leadId, stage: "conversation", nextAction: "Legacy Marketing reminder", nextActionAt: "2026-12-01", notes: "Existing prospect notes" });
  expect(saved.activities).toHaveLength(1);
  expect(saved.activities[0]?.outcome).toBe("Earlier outreach history to preserve");
  expect(saved.content).toHaveLength(1);
  expect(saved.content[0]?.title).toBe("Existing campaign content to preserve");
  expect(saved.campaignStart).toBe("2026-01-01");

  await expect(prospectCard(secondCompany).getByRole("button", { name: "Edit" })).toBeVisible();
  await prospectCard(secondCompany).getByRole("button", { name: "Edit" }).click();
  const duplicateEditor = page.getByRole("dialog", { name: "Prospect details" });
  const duplicatePicker = duplicateEditor.getByLabel("Link existing CRM inquiry");
  await expect(duplicatePicker.locator(`option[value="${leadId}"]`)).toHaveAttribute("disabled", "");
  await duplicateEditor.getByRole("button", { name: "Cancel" }).click();

  const duplicateWorkspace = normalizeMarketingWorkspace(savedPayload.workspace)!;
  duplicateWorkspace.prospects.find((item) => item.id === `${workspaceProspectId}-second`)!.crmLeadId = leadId;
  const duplicateResponse = await context.request.put("/api/marketing-workspace", { data: duplicateWorkspace });
  expect(duplicateResponse.status()).toBe(409);
  expect(await duplicateResponse.json()).toMatchObject({ error: "CRM inquiry is already linked to another Marketing prospect" });

  await pool!.query("UPDATE contact_inquiries SET status='archived',archived_at=NOW() WHERE id=$1", [leadId]);
  await page.goto("/dashboard/marketing");
  await openPipeline().click();
  await expect(prospectCard(company).getByText("CRM · archived", { exact: true })).toBeVisible();
  await prospectCard(company).getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("dialog", { name: "Prospect details" }).getByText(/This inquiry is archived in CRM/)).toBeVisible();
});
