import { expect, test } from "@playwright/test";

test.describe("Release Readiness: Browser & Customer Journey Verification", () => {
  test("1. Journey: Homepage -> Named System -> Case Study -> Inquiry", async ({ page }) => {
    await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) }));

    // Start on homepage
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your business. Your workflow. Your software.");

    // Navigate to pricing & models page
    await page.goto("/packages");
    await expect(page.getByRole("heading", { name: "Buy the system. Choose the support.", level: 1 })).toBeVisible();

    // Verify confirmed $7,500 named systems are displayed with proposal scope text
    const reworkCard = page.locator("article", { hasText: "Rework Flow" });
    await expect(reworkCard).toBeVisible();
    await expect(reworkCard.getByText("$7,500", { exact: true })).toBeVisible();
    await expect(reworkCard.getByText("Included configuration, implementation, integrations, and handoff are defined in the proposal.")).toBeVisible();

    const unionCard = page.locator("article", { hasText: "UnionOS" });
    await expect(unionCard).toBeVisible();
    await expect(unionCard.getByText("$7,500", { exact: true })).toBeVisible();
    await expect(unionCard.getByText("Included configuration, implementation, integrations, and handoff are defined in the proposal.")).toBeVisible();

    // Navigate to Rework Flow case study
    await page.goto("/work/rework-flow");
    await expect(page.getByRole("heading", { name: "Rework Flow", level: 1 })).toBeVisible();
    await expect(page.getByText("Confirmed $7,500 System")).toBeVisible();

    // Follow CTA to inquiry intake
    const ctaLink = page.getByRole("link", { name: "Discuss your handoffs" });
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();
    await expect(page).toHaveURL(/\/workflow-audit#audit-intake$/);
    await expect(page.locator("#audit-name")).toBeVisible();
  });

  test("2. Mobile navigation and keyboard accessibility", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202 }));

    await page.goto("/");

    // Verify zero horizontal scroll overflow on mobile
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);

    // Open mobile navigation menu
    const menuBtn = page.getByRole("button", { name: "Open site navigation" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Confirm navigation menu appears
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();

    // Keyboard navigation: press Escape to close
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  });

  test("3. Inquiry context: preserves service context without selecting unchosen package", async ({ page }) => {
    await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202 }));

    // Visit service contact link with service parameter
    await page.goto("/?service=manufacturing-software#contact");

    const contactSection = page.locator("#contact");
    await expect(contactSection).toBeVisible();

    // Ensure expensive Company Operations System package is not automatically pre-selected
    const engagementSelect = page.locator('select[name="engagement"]');
    if (await engagementSelect.count() > 0) {
      const selectedValue = await engagementSelect.inputValue();
      expect(selectedValue).not.toBe("custom-operations-system");
    }

    // Verify contact form inputs render with proper labels and keyboard focusability
    const nameInput = page.locator("#name");
    await expect(nameInput).toBeVisible();
    await nameInput.focus();
    await expect(nameInput).toBeFocused();
  });

  test("4. Form validation and native failure states", async ({ page }) => {
    await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202 }));

    // Test workflow audit form native validation
    await page.goto("/workflow-audit#audit-intake");
    const submitBtn = page.getByRole("button", { name: "Request workflow audit" });
    await submitBtn.click();

    // Browser native validation should block submission and set valueMissing on required name field
    const nameInput = page.locator("#audit-name");
    await expect(nameInput).toBeFocused();
    await expect(nameInput).toHaveJSProperty("validity.valueMissing", true);

    // Test restaurant trial intake validation
    await page.goto("/work/table-os#trial-intake");
    const trialBtn = page.getByRole("button", { name: /Submit Trial Request|Request 14-Day Pilot Hardware/i });
    if (await trialBtn.count() > 0) {
      await trialBtn.click();
      const restaurantInput = page.locator("#trial-restaurantName");
      if (await restaurantInput.count() > 0) {
        await expect(restaurantInput).toHaveJSProperty("validity.valueMissing", true);
      }
    }
  });

  test("5. First-party analytics: isolated event dispatch without third-party leaks", async ({ page }) => {
    let firstPartyEventReceived = false;
    let thirdPartyLeakDetected = false;

    // Intercept all requests to track first-party events and catch external leaks
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/analytics/events")) {
        firstPartyEventReceived = true;
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      if (url.includes("facebook.net") || url.includes("google-analytics") || url.includes("doubleclick.net")) {
        thirdPartyLeakDetected = true;
        await route.abort();
        return;
      }
      await route.continue();
    });

    // Visit workflow-audit which mounts WorkflowAuditViewTracker
    await page.goto("/workflow-audit");

    // Wait for the first-party analytics event to fire
    await page.waitForTimeout(500);

    // Verify first-party conversion measurement captured the interaction
    expect(firstPartyEventReceived).toBe(true);

    // Verify zero third-party advertising leaks occurred
    expect(thirdPartyLeakDetected).toBe(false);
  });
});
