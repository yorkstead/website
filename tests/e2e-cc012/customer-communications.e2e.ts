import { test, expect } from "@playwright/test";
import {
  publishingOwner,
  setupOwnerPublishingFixture,
} from "../fixtures/owner-publishing-setup";
const origin = "http://127.0.0.1:3107";
for (const width of [390, 1440])
  test(`owner inspects read-only communications and closed production gates at ${width}px`, async ({
    page,
    context,
  }) => {
    await setupOwnerPublishingFixture();
    await page.setViewportSize({ width, height: 900 });
    const denied = await context.request.get("/api/customer-communications");
    expect(denied.status()).toBe(401);
    expect(denied.headers()["referrer-policy"]).toBe("no-referrer");
    expect(denied.headers()["cache-control"]).toContain("no-store");
    await page.goto("/dashboard/customer-communications");
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
      page
        .getByRole("link", { name: "Customer Communications", exact: true })
        .first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: width < 768 ? "More" : /Commands/ })
      .click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await palette
      .getByRole("textbox", { name: "Search commands and projects" })
      .fill("Customer Communications");
    await palette
      .getByRole("button", { name: /Customer Communications/ })
      .click();
    await expect(page).toHaveURL(/dashboard\/customer-communications/);
    await expect(
      page.getByRole("region", { name: "Communications readiness" }),
    ).toContainText("Blocked");
    await expect(
      page.getByRole("region", { name: "Delivery queue health" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Suppression status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Message lifecycle" }),
    ).toContainText("Safe metadata only");
    await expect(
      page.getByRole("button", { name: /resend|send.test|retry.now|cancel/i }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Refresh communications" }).click();
    await expect(
      page.getByRole("region", { name: "Security and audit history" }),
    ).toBeVisible();
    expect(
      (
        await context.request.post("/api/customer-communications", {
          headers: { origin },
          data: { action: "resend" },
        })
      ).status(),
    ).toBe(405);
    expect(
      (
        await context.request.post("/api/customer-communications/webhook", {
          data: {},
        })
      ).status(),
    ).toBe(404);
    const body = await (
      await context.request.get("/api/customer-communications")
    ).text();
    for (const secret of [
      "ciphertext",
      "token_verifier",
      "auth_subject",
      "recipient",
      "sender@example",
      "https://portal",
    ])
      expect(body).not.toContain(secret);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
