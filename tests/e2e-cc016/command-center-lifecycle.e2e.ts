import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { cc016Owner, disposeCc016Inquiry, setupCc016Owner } from "../fixtures/cc016-owner";

const origin = "http://127.0.0.1:3108";
const email = `cc016-${crypto.randomUUID()}@example.test`;
const company = `CC-016 Synthetic ${crypto.randomUUID().slice(0, 8)}`;
const message = "Synthetic browser validation: connect inquiry intake to project delivery.";
let workspaceSnapshot: Awaited<ReturnType<typeof setupCc016Owner>>["workspace"] | null = null;
let fixtureInitialized = false;

test.afterAll(async () => {
  if (fixtureInitialized) await disposeCc016Inquiry(email, workspaceSnapshot);
});

test("public inquiry persists once and completes the owner CRM-to-project lifecycle", async ({ page, context }) => {
  workspaceSnapshot = (await setupCc016Owner()).workspace;
  fixtureInitialized = true;
  await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202 }));

  await page.goto("/#contact");
  const fillContactForm = async () => {
    await page.getByLabel("Name", { exact: true }).fill("CC-016 Synthetic Inquiry");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel(/Company/).fill(company);
    await page.getByLabel("What are we building?").selectOption({ label: "Prototype or consulting" });
    await page.getByLabel("What problem needs solving?").fill(message);
  };
  await fillContactForm();
  await page.getByRole("button", { name: "Send project brief" }).click();
  await expect(page.getByRole("status")).toContainText("Message received");

  await page.goto("/#contact");
  await fillContactForm();
  await page.getByRole("button", { name: "Send project brief" }).click();
  await expect(page.getByRole("status")).toContainText("already received");

  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let inquiry;
  try {
    inquiry = await pool.query<{ id: string; name: string; company: string; message: string; status: string; count: string }>(
      `SELECT id,name,company,message,status,
         (SELECT count(*) FROM contact_inquiries WHERE email=$1 AND project_type='Prototype or consulting')::text AS count
       FROM contact_inquiries WHERE email=$1 AND project_type='Prototype or consulting'`,
      [email],
    );
  } finally { await pool.end(); }
  expect(inquiry.rows).toHaveLength(1);
  expect(inquiry.rows[0]).toMatchObject({
    name: "CC-016 Synthetic Inquiry", company, message, status: "new", count: "1",
  });
  const leadId = Number(inquiry.rows[0]!.id);
  expect(Number.isSafeInteger(leadId)).toBe(true);

  await page.goto(`/dashboard/leads?lead=${leadId}`);
  await expect(page).toHaveURL(/\/login/);
  expect((await context.request.get("/api/dashboard/project-linkage?projectId=missing")).status()).toBe(401);
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);

  await page.goto("/dashboard/leads");
  const queue = page.getByRole("region", { name: "Unified follow-up queue" });
  const queueLead = queue.locator(`a[href="/dashboard/leads?lead=${leadId}"]`);
  await expect(queueLead).toBeVisible();
  await queueLead.click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/leads\\?lead=${leadId}`));

  const workspaceResponse = await context.request.get("/api/workspace");
  expect(workspaceResponse.status()).toBe(200);
  expect(await workspaceResponse.json()).toHaveProperty("workspace");

  await page.goto(`/dashboard/leads?lead=${leadId}`);
  const lead = page.locator(`#lead-${leadId}`);
  await expect(lead).toContainText("CC-016 Synthetic Inquiry");
  await expect(lead).toContainText(email);
  await expect(lead).toContainText(company);
  await expect(lead).toContainText(message);
  await page.getByRole("button", { name: "Qualified", exact: true }).click();
  await expect(lead.getByText("qualified", { exact: true })).toBeVisible();

  await lead.locator("textarea[name='notes']").fill("CC-016 private synthetic qualification note");
  const followUp = new Date();
  followUp.setUTCDate(followUp.getUTCDate() + 4);
  const followUpDate = followUp.toISOString().slice(0, 10);
  await lead.locator("input[name='followUpAt']").fill(followUpDate);
  await lead.getByRole("button", { name: "Save notes & follow-up" }).click();
  await expect(lead.locator("textarea[name='notes']")).toHaveValue("CC-016 private synthetic qualification note");
  await expect(lead.locator("input[name='followUpAt']")).toHaveValue(followUpDate);
  await page.reload();
  await expect(page.locator(`#lead-${leadId} textarea[name='notes']`)).toHaveValue("CC-016 private synthetic qualification note");

  await page.goto("/dashboard/leads?followUp=upcoming");
  await expect(page.locator(`#lead-${leadId}`)).toBeVisible();
  await page.locator(`#lead-${leadId}`).getByRole("button", { name: "Mark follow-up complete" }).click();
  await page.goto(`/dashboard/leads?lead=${leadId}`);
  await expect(page.getByLabel("Follow-up date", { exact: true })).toHaveValue("");
  const completed = await context.request.get(`/dashboard/leads?lead=${leadId}`);
  expect(completed.status()).toBe(200);

  const beforeInvalid = await context.request.get("/api/dashboard/project-linkage?projectId=");
  expect(beforeInvalid.status()).toBe(400);
  const conversionPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const eligible = await conversionPool.query<{ status: string; converted_project_id: string | null; follow_up_at: Date | null; retired: boolean }>(
      `SELECT status,converted_project_id,follow_up_at,
         EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id) AS retired
       FROM contact_inquiries WHERE id=$1`, [leadId],
    );
    expect(eligible.rows[0]).toEqual({ status: "qualified", converted_project_id: null, follow_up_at: null, retired: false });
  } finally { await conversionPool.end(); }
  await lead.getByRole("button", { name: "Convert to project" }).click();
  await expect.poll(async () => {
    if (/\/dashboard\?project=/.test(page.url())) return "converted";
    return (await page.getByRole("alert").allTextContents()).join(" | ") || "conversion pending";
  }, { timeout: 15_000 }).toBe("converted");
  const projectId = new URL(page.url()).searchParams.get("project");
  expect(projectId).toBeTruthy();
  const projectWorkspace = page.getByLabel("Project workspace");
  await expect(projectWorkspace.getByRole("heading", { name: company })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Project tasks" })).toBeVisible();
  await expect(page.getByText("No project tasks yet.")).toBeVisible();

  const taskTitle = "CC-016 synthetic first delivery task";
  const focus = page.locator("#focus");
  await page.getByPlaceholder("Add a project task…").fill(taskTitle);
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(focus.getByText(taskTitle, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit delivery" }).click();
  const milestoneSection = page.getByRole("heading", { name: "Milestones", exact: true }).locator("..");
  await milestoneSection.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Milestone title").fill("CC-016 synthetic milestone");
  const decisionSection = page.getByRole("heading", { name: "Client decisions", exact: true }).locator("..");
  await decisionSection.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Decision title").fill("CC-016 synthetic decision");
  await page.getByLabel("Decision notes").fill("Synthetic owner-only decision context");
  await page.getByRole("button", { name: "Save delivery" }).first().click();
  await expect(page.getByText("CC-016 synthetic milestone", { exact: true })).toBeVisible();
  await expect(page.getByText("CC-016 synthetic decision", { exact: true })).toBeVisible();

  await expect.poll(async () => {
    const response = await context.request.get("/api/workspace");
    if (!response.ok()) return false;
    const payload = await response.json() as { workspace?: { projects?: Array<{ id: string; delivery?: { milestones?: Array<{ title: string }>; decisions?: Array<{ title: string }> } }> } };
    const savedProject = payload.workspace?.projects?.find((project) => project.id === projectId);
    return Boolean(
      savedProject?.delivery?.milestones?.some((item) => item.title === "CC-016 synthetic milestone") &&
      savedProject.delivery.decisions?.some((item) => item.title === "CC-016 synthetic decision")
    );
  }, { timeout: 15_000 }).toBe(true);

  const projectRows = await context.request.get(`/api/dashboard/project-linkage?projectId=${encodeURIComponent(projectId!)}`);
  expect(projectRows.status()).toBe(200);
  await expect(page.getByRole("link", { name: `${company} · Open inquiry` })).toHaveAttribute("href", `/dashboard/leads?lead=${leadId}`);

  await page.reload();
  await expect(projectWorkspace.getByRole("heading", { name: company })).toBeVisible();
  await expect(page.locator("#focus").getByText(taskTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("CC-016 synthetic milestone", { exact: true })).toBeVisible();
  await expect(page.getByText("CC-016 synthetic decision", { exact: true })).toBeVisible();
  await page.goto("/dashboard/leads?lead=999999999");
  await expect(page.getByRole("heading", { name: "Inquiry unavailable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View all inquiries" })).toHaveAttribute("href", "/dashboard/leads");
  await page.goto("/dashboard?project=cc016-missing-project");
  await expect(page.getByRole("alert").filter({ hasText: "Project link not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review leads" })).toHaveAttribute("href", "/dashboard/leads");

  const verifyPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const final = await verifyPool.query<{ status: string; converted_project_id: string; follow_up_at: Date | null; notes: string }>(
      "SELECT status,converted_project_id,follow_up_at,notes FROM contact_inquiries WHERE id=$1", [leadId],
    );
    expect(final.rows[0]).toMatchObject({ status: "won", converted_project_id: projectId, follow_up_at: null, notes: "CC-016 private synthetic qualification note" });
  } finally { await verifyPool.end(); }
});
