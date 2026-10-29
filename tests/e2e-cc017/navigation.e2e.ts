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
    ["Automations", "/dashboard/automations", /\/dashboard\/automations$/],
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
    } else if (label === "Account & passkeys") {
      // The account destination intentionally lives outside the dashboard layout.
      await expect(page.getByRole("heading", { name: "Your passkeys" })).toBeVisible();
    } else if (label === "Insights" || label === "Marketing" || label === "Operations") {
      await expect(nav.getByRole("link", { name: "Insights", exact: true })).toHaveAttribute("aria-current", "page");
    } else {
      await expect(link).toHaveAttribute("aria-current", "page");
    }
  }
  await page.goto("/dashboard");
  await expect(nav.getByRole("link", { name: "Automations", exact: true })).toHaveAttribute("href", "/dashboard/automations");
  await expect(nav.getByRole("link", { name: "Daily Operations", exact: true })).toHaveCount(0);

  await page.goto("/dashboard/leads?lead=731&followUp=upcoming");
  await expect(page).toHaveURL(/\/dashboard\/leads\?lead=731&followUp=upcoming/);
  await expect(nav.getByRole("link", { name: "CRM", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Upcoming follow-ups", exact: true })).toHaveAttribute("aria-current", "page");

  await page.goto("/dashboard/leads?followUp=overdue");
  await expect(nav.getByRole("link", { name: "Overdue follow-ups", exact: true })).toHaveAttribute("aria-current", "page");
  const documentTimeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.locator("main nav").getByRole("link", { name: /Today/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/leads\?followUp=today/);
  await expect(nav.getByRole("link", { name: "Due today", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentTimeOrigin);
  await page.locator("main nav").getByRole("link", { name: /Upcoming/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/leads\?followUp=upcoming/);
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
  await page
    .getByRole("button", { name: "Dismiss navigation backdrop" })
    .click({ position: { x: 350, y: 200 } });
  await expect(page.getByRole("dialog", { name: "Yorkstead navigation" })).toBeHidden();
  await expect(opener).toBeFocused();
});

test("Automations keeps owner-only access and runs Hub capture controls in the Website", async ({ page, context }) => {
  await page.goto("/dashboard/automations");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fautomations|\/login\?next=\/dashboard\/automations/);
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard/automations");
    await expect(page.getByRole("heading", { name: "Voice capture controls" })).toBeVisible();
    await expect(page.getByText(/Hub API responding|Hub health check failed|Hub unavailable/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Hub|Review Hub/ })).toHaveCount(0);
    await expect(page.getByText(/does not require opening its owner interface/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("Automations renders source-labelled Hub records, empty queues, and partial failures", async ({ page, context }) => {
  expect((await context.request.get(`${origin}/api/dashboard/automation-hub`)).status()).toBe(401);
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);

  const checkedAt = "2026-10-29T16:00:00.000Z";
  let responseBody: unknown = {
    state: "available",
    checkedAt,
    data: {
      contractVersion: 1,
      source: "Automation Hub",
      generatedAt: checkedAt,
      captures: { source: "Automation Hub · captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [{ id: "capture-123", createdAt: checkedAt, status: "pending", classification: { kind: "task", title: "Replace filter", summary: "Replace the filter by Friday", dueDate: "2026-10-30", requiresConfirmation: true } }] },
      activity: { source: "Automation Hub · execution history", state: "available", checkedAt, truncated: false, errorCode: null, items: [{ id: "run-456", createdAt: checkedAt, automation: "morning-briefing", runId: "run-456", level: "info", stage: "briefing-generated", outcome: "succeeded", durationMs: 800, errorCode: null }] },
      integrationHealth: { source: "Automation Hub · integrations", state: "available", checkedAt, database: "healthy", googleTasks: "healthy", errorCode: null },
      reviewQueue: { source: "Automation Hub · pending captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      tasks: { source: "Google Tasks via Automation Hub", state: "available", checkedAt, truncated: false, errorCode: null, items: [{ id: "task-789", listId: "list-100", title: "Call supplier", status: "needsAction", dueAt: checkedAt, updatedAt: checkedAt }] },
    },
  };
  await page.route("**/api/dashboard/automation-hub", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(responseBody) }));

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/dashboard/automations");
  await expect(page.getByRole("heading", { name: "Recent voice captures" })).toBeVisible();
  await expect(page.getByLabel("Recent voice captures").getByText("Replace the filter by Friday")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "ID: capture-123" }).getByText("Source: Automation Hub · captures")).toBeVisible();
  await expect(page.getByText("ID: capture-123")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity history" })).toBeVisible();
  await expect(page.getByText("ID: run-456")).toBeVisible();
  await expect(page.getByText("No captures currently need review.")).toBeVisible();
  await expect(page.getByText("Call supplier")).toBeVisible();
  await expect(page.getByText("List ID: list-100")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  responseBody = {
    state: "available",
    checkedAt,
    data: {
      contractVersion: 1,
      source: "Automation Hub",
      generatedAt: checkedAt,
      captures: { source: "Automation Hub · captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      activity: { source: "Automation Hub · execution history", state: "unavailable", checkedAt, truncated: false, errorCode: "source_unavailable", items: [] },
      integrationHealth: { source: "Automation Hub · integrations", state: "available", checkedAt, database: "healthy", googleTasks: "degraded", errorCode: "google_api_unavailable" },
      reviewQueue: { source: "Automation Hub · pending captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      tasks: { source: "Google Tasks via Automation Hub", state: "unavailable", checkedAt, truncated: false, errorCode: "google_api_unavailable", items: [] },
    },
  };
  await page.reload();
  await expect(page.getByText("This source did not return data (source_unavailable). An unavailable source is not an empty queue.")).toBeVisible();
  await expect(page.getByText("No open Google Tasks were returned.")).toHaveCount(0);
});

test("print media hides dashboard navigation and preserves marketing one-sheet pages", async ({ page, context }) => {
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard/marketing/one-sheet");

  const navigation = page.getByRole("navigation", { name: "Primary and tools navigation" });
  const pages = page.locator(".print-page");
  await expect(navigation).toBeVisible();
  await expect(pages).toHaveCount(3);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#dashboard-navigation")).toBeHidden();
  for (const printPage of await pages.all()) await expect(printPage).toBeVisible();

  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  const opener = page.getByRole("button", { name: "Open navigation menu" });
  await expect(opener).toBeVisible();
  await opener.click();
  const drawer = page.getByRole("dialog", { name: "Yorkstead navigation" });
  const backdrop = page.getByRole("button", { name: "Dismiss navigation backdrop" });
  await expect(drawer).toBeVisible();
  await expect(backdrop).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await expect(drawer).toBeHidden();
  await expect(backdrop).toBeHidden();
  await expect(opener).toBeHidden();
  for (const printPage of await pages.all()) await expect(printPage).toBeVisible();
});
