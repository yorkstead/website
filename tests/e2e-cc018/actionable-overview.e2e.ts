import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { cc018Company, cc018LeadEmail, cc018Owner, cc018ProjectId, cc018TaskId, cc018TodayLeadEmail, disposeCc018Overview, offsetDateKey, setupCc018Overview } from "../fixtures/cc018-overview";

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

  await page.locator("header").getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("header img[src*='logo-dark-transparent.png']")).toBeHidden();
  await expect(page.locator("header img[src*='logo-light-transparent.png']")).toBeVisible();
  await expect(darkSurfaceLogo).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(opener).toBeFocused();

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
  await expect(page.getByText("Not tracked", { exact: true })).toBeVisible();

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
