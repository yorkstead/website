import { expect, test, type Page } from "@playwright/test";

function failOnBrowserErrors(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") failures.push(message.text()); });
  return () => expect(failures).toEqual([]);
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, `document width at ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body, `body width at ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport);
}

test("homepage renders and primary navigation reaches the about page", async ({ page }) => {
  const assertNoErrors = failOnBrowserErrors(page);
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response?.headers()["permissions-policy"]).toContain("publickey-credentials-get=(self)");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Software and automation");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  assertNoErrors();
});

test("workflow audit form exposes native required-field validation", async ({ page }) => {
  const assertNoErrors = failOnBrowserErrors(page);
  await page.goto("/workflow-audit#audit-intake");
  await page.getByRole("button", { name: "Request workflow audit" }).click();
  await expect(page.locator("#audit-name")).toBeFocused();
  await expect(page.locator("#audit-name")).toHaveJSProperty("validity.valueMissing", true);
  await expect(page).toHaveURL(/\/workflow-audit/);
  assertNoErrors();
});

test("contact form exposes native required-field validation and a usable email fallback", async ({ page }) => {
  await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202 }));
  await page.goto("/#contact");
  await page.getByRole("button", { name: "Send project brief" }).click();
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.locator("#name")).toHaveJSProperty("validity.valueMissing", true);
  await expect(page.locator('#contact a[href^="mailto:"]')).toHaveAttribute(
    "href",
    /^mailto:[^?\s]+@[^?\s]+\?subject=/,
  );
});

test("public navigation and contact links resolve", async ({ page, request }) => {
  const visited = new Set<string>();
  const pending = ["/"];

  while (pending.length) {
    const path = pending.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    await page.goto(path, { waitUntil: "domcontentloaded" });

    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter((href): href is string => Boolean(href)),
    );
    for (const href of hrefs) {
      if (href.startsWith("mailto:")) {
        expect(href, `email link on ${path}`).toMatch(/^mailto:[^?\s]+@[^?\s]+(?:\?.*)?$/);
        continue;
      }
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const destination = new URL(href, "http://site.test");
      const normalized = `${destination.pathname}${destination.search}`;
      if (
        !destination.pathname.split("/").at(-1)?.includes(".") &&
        !visited.has(normalized) &&
        !normalized.startsWith("/dashboard") &&
        !normalized.startsWith("/account") &&
        !normalized.startsWith("/login")
      ) pending.push(normalized);
    }
  }

  for (const path of visited) {
    const response = await request.get(path);
    expect(response.status(), path).toBeLessThan(400);
  }
});

test("mobile layout keeps audit navigation usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const assertNoErrors = failOnBrowserErrors(page);
  await page.goto("/");
  await expectNoHorizontalDocumentOverflow(page);
  await expect(page.getByRole("link", { name: "Command Center" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Contact", exact: true })).toBeHidden();
  await page.getByRole("link", { name: "Book a workflow audit" }).first().click();
  await expect(page).toHaveURL(/\/workflow-audit$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("work is getting stuck");
  await expectNoHorizontalDocumentOverflow(page);
  assertNoErrors();
});

test("service FAQ disclosure remains keyboard operable", async ({ page }) => {
  const assertNoErrors = failOnBrowserErrors(page);
  await page.goto("/services/workflow-automation", { waitUntil: "domcontentloaded" });
  const summary = page.locator("details summary").first();
  await summary.waitFor({ state: "visible" });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  assertNoErrors();
});

test("project profiles connect industries and uses to relevant service paths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const profiles = [
    { slug: "work-control", service: "/services/workflow-automation" },
    { slug: "jwld-store", service: "/services/small-business-websites" },
    { slug: "sic-pizza-pos", service: "/services/workflow-automation" },
    { slug: "employee-barcodes", service: "/services/manufacturing-software" },
  ];

  for (const profile of profiles) {
    const assertNoErrors = failOnBrowserErrors(page);
    await page.goto(`/work/${profile.slug}`);
    await expect(page.getByRole("heading", { name: "Industries and applicable uses" })).toBeVisible();
    await expect(page.locator(`a[href="${profile.service}"]`)).toBeVisible();
    if (profile.slug === "jwld-store") await expect(page.locator('a[href="https://jwld.store"]')).toHaveAttribute("target", "_blank");
    if (profile.slug === "sic-pizza-pos") await expect(page.locator('a[href="https://sic-pizza.vercel.app"]')).toHaveAttribute("target", "_blank");
    if (profile.slug === "employee-barcodes") await expect(page.locator('a[href="https://barcodes.4twenty.dev"]')).toHaveAttribute("target", "_blank");
    await expect(page.locator("article article").first()).toBeVisible();
    if (profile.slug === "work-control") {
      const featuredImage = page.getByAltText("Yorkstead Operations page from the Yorkstead Operations showcase PDF").first();
      await featuredImage.scrollIntoViewIfNeeded();
      await expect(featuredImage).toBeVisible();
      await expect.poll(() => featuredImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await expect(page.locator('img[src*="operations-"]:visible')).toHaveCount(9);
    }
    await expectNoHorizontalDocumentOverflow(page);
    assertNoErrors();
  }
});

test("login next parameter cannot create an external navigation target", async ({ page }) => {
  const assertNoErrors = failOnBrowserErrors(page);
  await page.goto("/login?next=https://evil.example/steal");
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  await expect(page.locator('a[href*="evil.example"], form[action*="evil.example"]')).toHaveCount(0);
  assertNoErrors();
});
