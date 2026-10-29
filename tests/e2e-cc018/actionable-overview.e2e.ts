import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { cc018Company, cc018LeadEmail, cc018Owner, cc018ProjectId, cc018TaskId, cc018TodayLeadEmail, cc019LeadEmail, disposeCc018Overview, offsetDateKey, setupCc018Overview } from "../fixtures/cc018-overview";

const origin = "http://127.0.0.1:3111";
type WorkspaceSnapshot = { data: Record<string, unknown>; updated_at: Date } | null;
let workspaceSnapshot: WorkspaceSnapshot = null;
let initialized = false;

test.beforeAll(async () => {
  workspaceSnapshot = (await setupCc018Overview()).workspaceSnapshot;
  initialized = true;
});

test.afterAll(async () => {
  if (initialized) await disposeCc018Overview(workspaceSnapshot);
});

test("navigation preserves initial focus, supports mobile keyboard access, and shows the theme-aware Yorkstead logo", async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem("yorkstead-theme", "light"));
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc018Owner })).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "What needs attention today?" })).toBeVisible();

  const opener = page.getByRole("button", { name: "Open navigation menu" });
  const drawer = page.getByRole("dialog", { name: "Yorkstead navigation" });
  await expect(drawer).toBeHidden();
  await expect.poll(() => opener.evaluate((element) => element === document.activeElement)).toBe(false);
  await page.keyboard.press("Tab");
  await expect(opener).toBeFocused();
  await expect(opener).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation drawer" })).toBeFocused();

  const lightSurfaceLogo = page.locator("img[src*='logo-dark-transparent.png']");
  const darkSurfaceLogo = page.locator("img[src*='logo-light-transparent.png']");
  await expect(lightSurfaceLogo).toHaveCount(2);
  await expect(lightSurfaceLogo.nth(0)).toBeVisible();
  await expect(lightSurfaceLogo.nth(1)).toBeVisible();
  await expect(page.locator("header img[src*='logo-dark-transparent.png']")).toBeVisible();
  await expect(page.locator("header img[src*='logo-light-transparent.png']")).toBeHidden();
  const mobileLogoSize = await page.locator("header img[src*='logo-dark-transparent.png']").evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  });
  expect(mobileLogoSize).toEqual({ width: 32, height: 32 });

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(opener).toBeFocused();

  await page.locator("header").getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("header img[src*='logo-dark-transparent.png']")).toBeHidden();
  await expect(page.locator("header img[src*='logo-light-transparent.png']")).toBeVisible();
  await expect(darkSurfaceLogo).toHaveCount(2);

  await opener.click();
  await expect(drawer).toBeVisible();
  await expect(darkSurfaceLogo.nth(0)).toBeVisible();
  await expect(darkSurfaceLogo.nth(1)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 1000 });
  const desktopLogo = page.locator('#dashboard-navigation img[src*="logo-light-transparent.png"]');
  await expect(desktopLogo).toBeVisible();
  const desktopLogoSize = await desktopLogo.evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  });
  expect(desktopLogoSize).toEqual({ width: 36, height: 36 });
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(page.getByRole("button", { name: "Expand navigation" })).toBeVisible();
  await expect(desktopLogo).toBeVisible();
});

test("owner overview prioritizes persisted work and supports exact links and actions", async ({ page, context }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  expect((await context.request.get("/api/workspace")).status()).toBe(401);
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc018Owner })).status()).toBe(200);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "What needs attention today?" })).toBeVisible();
  const actions = page.locator("section[aria-labelledby='command-center-actions-heading']");
  const overdueLink = actions.locator("article").filter({ hasText: cc018Company }).filter({ hasText: "Overdue" }).getByRole("link", { name: "Open lead" }).first();
  await expect(overdueLink).toBeVisible();
  const overdueRow = overdueLink.locator("xpath=ancestor::article");
  await expect(overdueRow).toContainText("Overdue");
  await overdueRow.getByRole("button", { name: "Mark follow-up complete" }).click();
  await expect(overdueRow).toHaveCount(0);

  const todayRow = actions.locator("article").filter({ hasText: "Due today · proposal" });
  await expect(todayRow).toBeVisible();
  await todayRow.locator("input[type=date]").fill(offsetDateKey(2));
  await todayRow.getByRole("button", { name: "Reschedule" }).click();
  await expect(todayRow).toHaveCount(0);

  const proposalStage = page.locator("a[href='/dashboard/leads?status=proposal']").first();
  await expect(proposalStage).toContainText("1");
  await expect(page.getByText("Active proposal value", { exact: true })).toBeVisible();

  const stalledRow = actions.locator("article").filter({ hasText: "Stalled qualified" });
  await expect(stalledRow.getByRole("link", { name: "Open lead" })).toHaveAttribute("href", /lead=/);
  await stalledRow.getByRole("link", { name: "Open lead" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/leads\\?lead=`));
  await expect(page.getByText("CC-018 Stalled Opportunity")).toBeVisible();

  await page.goto("/dashboard");
  const projectLink = page.locator(`a[href='/dashboard?project=${encodeURIComponent(cc018ProjectId)}']`);
  await expect(projectLink).toBeVisible();
  await projectLink.click();
  await expect(page).toHaveURL(new RegExp(`project=${cc018ProjectId}`));
  await expect(page.getByRole("dialog", { name: "Project workspace" }).getByRole("heading", { name: "CC-018 Active Project" })).toBeVisible();

  await page.goto("/dashboard");
  const taskRow = page.locator("section[aria-labelledby='command-center-actions-heading'] article").filter({ hasText: "CC-018 Complete workspace task" });
  await expect(taskRow).toBeVisible();
  await taskRow.getByRole("button", { name: "Open task" }).click();
  await expect(page.getByRole("heading", { name: "Edit task" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await taskRow.getByRole("button", { name: "Complete" }).click();
  await expect(taskRow).toHaveCount(0);

  await page.getByRole("button", { name: "Create task" }).click();
  await page.getByLabel("Task", { exact: true }).fill("CC-018 Browser-created task");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("section[aria-labelledby='command-center-actions-heading']")).toContainText("CC-018 Browser-created task");
  await expect(page.locator("section[aria-labelledby='command-center-actions-heading']")).toContainText("CC-018 saved workspace activity");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const followUps = await pool.query<{ email: string; follow_up_at: Date | null }>("SELECT email,follow_up_at FROM contact_inquiries WHERE email=ANY($1::text[])", [[cc018LeadEmail, cc018TodayLeadEmail]]);
    expect(followUps.rows.find((row) => row.email === cc018LeadEmail)?.follow_up_at).toBeNull();
    expect(followUps.rows.find((row) => row.email === cc018TodayLeadEmail)?.follow_up_at).not.toBeNull();
    await expect.poll(async () => {
      const taskRead = await context.request.get("/api/workspace");
      if (!taskRead.ok()) return false;
      const saved = (await taskRead.json()).workspace as { tasks: Array<{ id: string; title: string; done: boolean }> };
      return saved.tasks.find((task) => task.id === cc018TaskId)?.done === true && saved.tasks.some((task) => task.title === "CC-018 Browser-created task");
    }, { timeout: 15_000 }).toBe(true);
  } finally { await pool.end(); }
});

test("owner can qualify a lead, manage an explicit proposal, and see won pipeline value", async ({ page, context }) => {
  await page.goto("/dashboard/leads");
  await expect(page).toHaveURL(/\/login/);
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc018Owner })).status()).toBe(200);
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  let leadId: number;
  try {
    const lead = await pool.query<{ id: string }>("SELECT id FROM contact_inquiries WHERE email=$1", [cc019LeadEmail]);
    leadId = Number(lead.rows[0]!.id);
  } finally { await pool.end(); }

  await page.goto(`/dashboard/leads?lead=${leadId}`);
  await expect(page.getByRole("heading", { name: "CC-019 Sales Workflow" })).toBeVisible();
  await page.getByText("Qualification, consultations & proposals").click();
  await expect(page.getByText("Reduce manual reconciliation", { exact: false })).toBeVisible();
  await page.getByLabel("Industry").selectOption("manufacturing");
  await page.getByLabel("Company size").fill("120 employees");
  await page.getByLabel("Urgency").fill("Before peak season");
  await page.getByLabel("Decision-maker").fill("Operations director");
  await page.getByLabel("Budget indication").fill("Unconfirmed: $8,000");
  await page.getByLabel("Pain / requirements").fill("Inventory reconciliation takes two days each week.");
  await page.getByLabel("Next step", { exact: true }).fill("Schedule workflow mapping with operations director.");
  await page.getByLabel("Won reason").fill("Accepted sprint scope and timeline");
  await page.getByLabel("Lost reason").fill("Budget timing did not align");
  await page.getByRole("button", { name: "Save qualification" }).click();
  await expect(page.getByLabel("Industry")).toHaveValue("manufacturing");

  await page.getByLabel("Explicit proposal amount ($)").fill("2500.00");
  await page.getByLabel("Next action", { exact: true }).fill("Review sprint scope");
  await page.getByLabel("Next action date").fill(offsetDateKey(2));
  const createProposalForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Record proposal" }) });
  await createProposalForm.locator('select[name="state"]').selectOption("sent");
  await expect(createProposalForm.locator('select[name="state"]')).toHaveValue("sent");
  await createProposalForm.getByRole("button", { name: "Record proposal" }).click();
  await expect(page.getByText("$2,500.00")).toBeVisible();
  const proposalEditor = page.getByRole("form", { name: "Edit sprint proposal" });
  await proposalEditor.getByLabel("Proposal engagement").selectOption("system");
  await proposalEditor.getByLabel("Proposal amount").fill("3250.75");
  await proposalEditor.getByLabel("Proposal next action date").fill(offsetDateKey(4));
  await proposalEditor.getByLabel("Proposal next action").fill("Reschedule system scope review");
  await proposalEditor.getByRole("button", { name: "Save proposal changes" }).click();
  await expect(page.getByText("$3,250.75")).toBeVisible();

  await page.goto("/dashboard");
  const proposalAction = page.getByRole("link").filter({ hasText: "Reschedule system scope review" });
  await expect(proposalAction).toHaveAttribute("href", `/dashboard/leads?lead=${leadId}`);
  await expect(page.getByText("Active proposal value").locator(".." )).toContainText("$3,250");
  await page.goto(`/dashboard/leads?lead=${leadId}`);
  await page.getByText("Qualification, consultations & proposals").click();
  const updatedEditor = page.getByRole("form", { name: "Edit system proposal" });
  await updatedEditor.getByLabel("Proposal next action date").fill(offsetDateKey(6));
  await updatedEditor.getByLabel("Proposal next action").fill("Review system scope after reschedule");
  await updatedEditor.getByRole("button", { name: "Save proposal changes" }).click();
  await expect(updatedEditor.getByLabel("Proposal next action date")).toHaveValue(offsetDateKey(6));
  await expect(updatedEditor.getByLabel("Proposal next action")).toHaveValue("Review system scope after reschedule");
  await expect(page.getByText("Review system scope after reschedule", { exact: false })).toBeVisible();
  await updatedEditor.getByLabel("Proposal next action date").fill("");
  await updatedEditor.getByLabel("Proposal next action").fill("");
  await updatedEditor.getByRole("button", { name: "Save proposal changes" }).click();
  await expect(page.getByText("No next action", { exact: true })).toBeVisible();
  await expect(updatedEditor.getByLabel("Proposal next action date")).toHaveValue("");
  await expect(updatedEditor.getByLabel("Proposal next action")).toHaveValue("");
  await page.goto("/dashboard");
  await expect(page.getByRole("link").filter({ hasText: "Review system scope after reschedule" })).toHaveCount(0);
  await expect(page.getByText("Active proposal value").locator("..")).toContainText("$3,250");

  await page.goto(`/dashboard/leads?lead=${leadId}`);
  await page.getByText("Qualification, consultations & proposals").click();
  const proposalCard = page.getByRole("form", { name: "Edit system proposal" }).locator("..");
  await proposalCard.getByLabel("Proposal state").selectOption("accepted");
  await proposalCard.getByRole("button", { name: "Update state" }).click();
  await expect(page.getByText("won", { exact: true }).first()).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Won proposals: $3,250.75")).toBeVisible();
  await expect(page.getByText("$8,000", { exact: false })).not.toBeVisible();
  const verifyPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const persisted = await verifyPool.query<{ status: string; industry: string; amount_cents: string; proposal_state: string; engagement_type: string; next_action: string; next_action_at: Date | null; proposal_count: string }>(`SELECT i.status,i.industry,p.amount_cents,p.state AS proposal_state,p.engagement_type,p.next_action,p.next_action_at,
      (SELECT count(*)::text FROM crm_proposals WHERE lead_id=i.id) AS proposal_count FROM contact_inquiries i JOIN crm_proposals p ON p.lead_id=i.id WHERE i.id=$1`, [leadId]);
    expect(persisted.rows[0]).toMatchObject({ status: "won", industry: "manufacturing", amount_cents: "325075", proposal_state: "accepted", engagement_type: "system", next_action: "", next_action_at: null, proposal_count: "1" });
  } finally { await verifyPool.end(); }
});
