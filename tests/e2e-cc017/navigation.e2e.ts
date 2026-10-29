import { expect, test } from "@playwright/test";
import { cc016Owner, disposeCc016Inquiry, setupCc016Owner } from "../fixtures/cc016-owner";

const origin = "http://127.0.0.1:3110";
let workspaceSnapshot: Awaited<ReturnType<typeof setupCc016Owner>>["workspace"] | null = null;
let fixtureInitialized = false;

test.beforeAll(async () => {
  workspaceSnapshot = (await setupCc016Owner()).workspace;
  fixtureInitialized = true;
});

test.afterAll(async () => {
  if (fixtureInitialized) await disposeCc016Inquiry(`cc017-nav-${process.pid}@example.test`, workspaceSnapshot);
});

test("owner navigation covers destinations, active state, collapse, and persisted preference", async ({ page, context }) => {
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);

  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Primary and tools navigation" });
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");

  const routes = [
    ["CRM", "/dashboard/leads", /\/dashboard\/leads$/],
    ["Overdue follow-ups", "/dashboard/leads?followUp=overdue", /followUp=overdue/],
    ["Due today", "/dashboard/leads?followUp=today", /followUp=today/],
    ["Upcoming follow-ups", "/dashboard/leads?followUp=upcoming", /followUp=upcoming/],
    ["Consultations", "/dashboard/consultations", /\/dashboard\/consultations$/],
    ["Projects", "/dashboard#projects", /\/dashboard#projects$/],
    ["Tasks", "/dashboard#tasks", /\/dashboard#tasks$/],
    ["Insights", "/dashboard/analytics", /\/dashboard\/analytics$/],
    ["Marketing", "/dashboard/marketing", /\/dashboard\/marketing$/],
    ["Operations", "/dashboard/operations", /\/dashboard\/operations$/],
    ["Client Access", "/dashboard/client-access", /\/dashboard\/client-access$/],
    ["Client Publishing", "/dashboard/client-publishing", /\/dashboard\/client-publishing$/],
    ["Portal Preview", "/dashboard/customer-portal-preview", /\/dashboard\/customer-portal-preview$/],
    ["Portal Readiness", "/dashboard/portal-readiness", /\/dashboard\/portal-readiness$/],
    ["Customer Communications", "/dashboard/customer-communications", /\/dashboard\/customer-communications$/],
    ["Marketing one-sheet", "/dashboard/marketing/one-sheet", /\/dashboard\/marketing\/one-sheet$/],
    ["Account & passkeys", "/account", /\/account$/],
  ] as const;

  for (const [label, href, expectedUrl] of routes) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await link.click();
    await expect(page).toHaveURL(expectedUrl);
    if (label === "CRM" || label === "Overdue follow-ups" || label === "Due today" || label === "Upcoming follow-ups") {
      await expect(nav.getByRole("link", { name: "CRM", exact: true })).toHaveAttribute("aria-current", "page");
      if (label !== "CRM") await expect(link).toHaveAttribute("aria-current", "page");
    } else if (label === "Insights" || label === "Marketing" || label === "Operations") {
      await expect(nav.getByRole("link", { name: "Insights", exact: true })).toHaveAttribute("aria-current", "page");
    } else {
      await expect(link).toHaveAttribute("aria-current", "page");
    }
  }
  await expect(nav.getByRole("link", { name: "Daily Operations", exact: true })).toHaveAttribute("href", "https://cal.yorkstead.com/command");
  await expect(nav.getByRole("link", { name: "Daily Operations", exact: true })).toHaveAttribute("target", "_blank");

  await page.goto("/dashboard/leads?lead=731&followUp=upcoming");
  await expect(page).toHaveURL(/\/dashboard\/leads\?lead=731&followUp=upcoming/);
  await expect(nav.getByRole("link", { name: "CRM", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Upcoming follow-ups", exact: true })).toHaveAttribute("aria-current", "page");
  await page.goto("/dashboard?project=cc017-navigation-deep-link");
  await expect(page).toHaveURL(/\/dashboard\?project=cc017-navigation-deep-link/);
  await expect(page.getByRole("alert").filter({ hasText: "Project link not found" })).toBeVisible();

  const collapse = page.getByRole("button", { name: "Collapse navigation" });
  await collapse.click();
  await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("link", { name: "Customer Communications" })).toHaveAttribute("title", "Customer Communications");
  expect(await page.evaluate(() => localStorage.getItem("yorkstead-dashboard-nav-collapsed"))).toBe("true");

  await page.reload();
  await expect(page.getByRole("button", { name: "Expand navigation" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Client Access" })).toHaveAttribute("title", "Client Access");

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Workspace settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
});

test("mobile drawer supports keyboard focus, Escape, backdrop, and route selection", async ({ page, context }) => {
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  const opener = page.getByRole("button", { name: "Open navigation menu" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Yorkstead navigation" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Overview" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Overview" })).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");

  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Close navigation drawer" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await page.getByRole("link", { name: "CRM", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
  await expect(page.getByRole("dialog", { name: "Yorkstead navigation" })).toBeHidden();

  await opener.click();
  await page.locator('button[tabindex="-1"][aria-label="Close navigation drawer"]').click();
  await expect(page.getByRole("dialog", { name: "Yorkstead navigation" })).toBeHidden();
  await expect(opener).toBeFocused();
});
