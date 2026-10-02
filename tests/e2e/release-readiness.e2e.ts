import { expect, test } from "@playwright/test";

test.describe("Release Readiness: Browser & Customer Journey Verification", () => {
  test("1. Journey: Homepage -> Named System -> Case Study -> Inquiry", async ({ page }) => {
    await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) }));

    // Start on homepage
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Software you buy once. Software you own.");

    // Customer navigation: Click header navigation link to Pricing & Model
    const pricingNavLink = page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Pricing & Model" });
    await expect(pricingNavLink).toBeVisible();
    await pricingNavLink.click();

    // Verify navigation reached /packages and displays pricing model
    await expect(page).toHaveURL(/\/packages$/);
    await expect(page.getByRole("heading", { name: "Buy the system. Choose the support.", level: 1 })).toBeVisible();

    // Verify confirmed $7,500 named systems are displayed with proposal scope text and readiness label
    const reworkCard = page.locator("article", { hasText: "Rework Flow" });
    await expect(reworkCard).toBeVisible();
    await expect(reworkCard.getByText("$7,500", { exact: true })).toBeVisible();
    await expect(reworkCard.getByText("Included configuration, implementation, integrations, and handoff are defined in the proposal.")).toBeVisible();
    await expect(reworkCard.getByText("Working demonstration")).toBeVisible();

    const unionCard = page.locator("article", { hasText: "UnionOS" });
    await expect(unionCard).toBeVisible();
    await expect(unionCard.getByText("$7,500", { exact: true })).toBeVisible();
    await expect(unionCard.getByText("Included configuration, implementation, integrations, and handoff are defined in the proposal.")).toBeVisible();
    await expect(unionCard.getByText("Interactive concept demonstration")).toBeVisible();

    // Customer navigation: Click from Rework Flow card directly into the Case Study
    const caseStudyLink = reworkCard.getByRole("link", { name: "View case study" });
    await expect(caseStudyLink).toBeVisible();
    await caseStudyLink.click();

    // Verify navigation reached /work/rework-flow
    await expect(page).toHaveURL(/\/work\/rework-flow$/);
    await expect(page.getByRole("heading", { name: "Rework Flow", level: 1 })).toBeVisible();
    await expect(page.getByText("Confirmed $7,500 System")).toBeVisible();

    // Customer navigation: Follow the dedicated product inquiry CTA
    const inquiryCta = page.getByRole("link", { name: "Inquire about Rework Flow" });
    await expect(inquiryCta).toBeVisible();
    await inquiryCta.click();

    // Verify navigation reached inquiry section with product context preserved in URL
    await expect(page).toHaveURL(/\/\?product=rework-flow#contact$/);

    // Verify product inquiry context is visibly rendered in the form
    const contactSection = page.locator("#contact");
    await expect(contactSection).toBeVisible();
    await expect(contactSection.getByText("Conversation context")).toBeVisible();
    await expect(contactSection.getByText("Rework Flow · $7,500")).toBeVisible();
    await expect(contactSection.getByText("Freight Rework & Exception Management")).toBeVisible();

    // Verify hidden input and project type selection preserve the product
    await expect(page.locator("#projectType")).toHaveValue("Rework Flow");
    await expect(page.locator('input[name="productId"]')).toHaveValue("rework-flow");
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

    // Mandatory assertion: Conversation context reflects requested service
    await expect(contactSection.getByText("Conversation context")).toBeVisible();
    await expect(contactSection.getByRole("paragraph").filter({ hasText: "Manufacturing Software" })).toBeVisible();

    // Mandatory assertion: Conversation context does NOT display Company Operations System
    const contextBanner = contactSection.locator(".rounded-lg", { hasText: "Conversation context" });
    await expect(contextBanner).not.toContainText("Company Operations System");

    // Mandatory assertion: projectType selection defaults to the requested service
    const projectTypeSelect = page.locator("#projectType");
    await expect(projectTypeSelect).toBeVisible();
    await expect(projectTypeSelect).toHaveValue("Manufacturing Software");
    await expect(projectTypeSelect).not.toHaveValue("Company Operations System");

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

    // Test restaurant trial intake validation with mandatory assertions (no silent if)
    await page.goto("/work/table-os#trial-intake");
    const trialBtn = page.getByRole("button", { name: "Request 14-Day Restaurant Trial" });
    await expect(trialBtn).toBeVisible();
    await trialBtn.click();

    const alert = page.locator("#trial-intake").getByRole("alert");
    await expect(alert).toContainText("Check the highlighted fields to submit your evaluation request.");
    const restaurantInput = page.locator("#trial-restaurant");
    await expect(restaurantInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#trial-intake").getByText("Enter your restaurant or hospitality group name.")).toBeVisible();
  });

  test("5. First-party analytics: isolated event dispatch without third-party leaks", async ({ page }) => {
    let dispatchedPayload = null;
    let thirdPartyLeakDetected = false;

    // Intercept all requests to track first-party events and catch external leaks
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/analytics/events")) {
        try {
          dispatchedPayload = JSON.parse(route.request().postData() || "{}");
        } catch {
          dispatchedPayload = null;
        }
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
    await page.waitForTimeout(1000);

    // Verify first-party conversion measurement captured the interaction with exact payload
    expect(Boolean(dispatchedPayload)).toBe(true);
    expect(dispatchedPayload?.["event"]).toBe("workflow_audit_view");
    expect(dispatchedPayload?.["path"]).toBe("/workflow-audit");

    // Verify zero third-party advertising leaks occurred
    expect(thirdPartyLeakDetected).toBe(false);
  });
});
