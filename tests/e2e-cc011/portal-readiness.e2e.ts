import { test, expect } from "@playwright/test";
import {
  publishingOwner,
  setupOwnerPublishingFixture,
} from "../fixtures/owner-publishing-setup";
const origin = "http://127.0.0.1:3106";
for (const width of [390, 1440])
  test(`owner verifies evidence, acknowledges blockers and resolves conflict at ${width}px`, async ({
    page,
    context,
  }) => {
    await setupOwnerPublishingFixture();
    await page.setViewportSize({ width, height: 900 });
    expect((await context.request.get("/api/portal-readiness")).status()).toBe(
      401,
    );
    await page.goto("/dashboard/portal-readiness");
    await expect(page).toHaveURL(/login/);
    expect(
      (
        await context.request.post("/api/auth/sign-in/email", {
          headers: { origin },
          data: publishingOwner,
        })
      ).status(),
    ).toBe(200);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Portal Readiness", exact: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: width < 768 ? "More" : /Commands/ })
      .click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await palette
      .getByRole("textbox", { name: "Search commands and projects" })
      .fill("Portal Readiness");
    await palette.getByRole("button", { name: /Portal Readiness/ }).click();
    await expect(page).toHaveURL(/dashboard\/portal-readiness/);
    const overall = page.getByRole("region", { name: /Global review/ }),
      technical = page.getByRole("region", {
        name: "Technical verification checklist",
      }),
      customer = page.getByRole("region", {
        name: "Customer-specific prerequisites",
      });
    await expect(overall).toContainText("Blocked");
    await expect(overall).toContainText("Customer access enabled: no");
    await expect(customer).toContainText("not verified");
    await expect(
      page.getByRole("button", { name: "Review global approval" }),
    ).toBeDisabled();
    await technical
      .getByRole("button", { name: "Review server verification" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Confirm release review" });
    await expect(dialog).toContainText("This sends no messages");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("button", { name: "Confirm review operation" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await technical
      .getByRole("button", { name: "Review server verification" })
      .click();
    await dialog
      .getByRole("button", { name: "Confirm review operation" })
      .click();
    await expect(
      technical.locator("article").filter({ hasText: "schema.applied" }),
    ).toContainText("passed");
    await expect(
      technical.locator("article").filter({ hasText: "production.secrets" }),
    ).toContainText("not verified");
    await expect(
      technical.locator("article").filter({ hasText: "email.provider" }),
    ).toContainText("blocked");
    await page
      .getByRole("button", {
        name: "Review attestation: security.review",
        exact: true,
      })
      .click();
    await expect(dialog).toContainText("not a technical verification");
    await dialog
      .getByRole("button", { name: "Confirm review operation" })
      .click();
    await expect(
      page.getByRole("region", {
        name: "Owner attestations and accountable roles",
      }),
    ).toContainText("cc009-browser-owner");
    await page.getByRole("button", { name: "Review acknowledgment" }).click();
    await expect(dialog).toContainText("does not mark any requirement passed");
    await dialog
      .getByRole("button", { name: "Confirm review operation" })
      .click();
    await expect(overall).toContainText("Decision: acknowledged");
    await expect(overall).toContainText("Blocked");
    await expect(customer).toContainText("not verified");
    await expect(
      page.getByRole("button", { name: "Review global approval" }),
    ).toBeDisabled();
    const state = await context.request.get("/api/portal-readiness");
    expect(state.headers()["cache-control"]).toContain("no-store");
    expect(state.headers()["referrer-policy"]).toBe("no-referrer");
    const data = await state.json();
    for (const secret of [
      "token_verifier",
      "postgresql://",
      "recipient_email",
      "password",
      "CUSTOMER_AUTH_SECRET",
    ])
      expect(JSON.stringify(data)).not.toContain(secret);
    const base = {
      expectedRevision: data.revision,
      contextDigest: data.assessment.contextDigest,
      assessmentDigest: data.assessment.digest,
      confirmed: true,
    };
    expect(
      (
        await context.request.post("/api/portal-readiness", {
          headers: { origin },
          data: { action: "approve", ...base },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.post("/api/portal-readiness", {
          headers: { origin },
          data: { action: "activate", ...base },
        })
      ).status(),
    ).toBe(400);
    await page.getByRole("button", { name: "Review withdrawal" }).click();
    await dialog
      .getByRole("button", { name: "Confirm review operation" })
      .click();
    await expect(overall).toContainText("Decision: withdrawn");
    await page.getByRole("button", { name: "Review acknowledgment" }).click();
    const current = await (
      await context.request.get("/api/portal-readiness")
    ).json();
    expect(
      (
        await context.request.post("/api/portal-readiness", {
          headers: { origin },
          data: {
            action: "verify",
            expectedRevision: current.revision,
            contextDigest: current.assessment.contextDigest,
            assessmentDigest: current.assessment.digest,
            confirmed: true,
          },
        })
      ).status(),
    ).toBe(200);
    await dialog
      .getByRole("button", { name: "Confirm review operation" })
      .click();
    await expect(
      page.getByRole("alert", { name: "Readiness error" }),
    ).toContainText("Readiness changed");
    await expect(overall).toHaveCount(0);
    await page.getByRole("button", { name: "Refresh readiness" }).click();
    await expect(overall).toContainText("Blocked");
    await expect(customer).toContainText("not verified");
    await expect(
      page.getByRole("region", { name: "Approval and audit history" }),
    ).toContainText("cc009-browser-owner");
    await expect(
      page.getByRole("region", {
        name: "Release runbook and rollback summary",
      }),
    ).toContainText("Stop on mandatory failure");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.route("**/api/portal-readiness**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Readiness unavailable" }),
      }),
    );
    await page.getByRole("button", { name: "Refresh readiness" }).click();
    await expect(
      page.getByRole("alert", { name: "Readiness error" }),
    ).toContainText("Readiness unavailable");
    await expect(
      page.getByRole("button", { name: "Review global approval" }),
    ).toHaveCount(0);
  });
