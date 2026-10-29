import { test, expect } from "@playwright/test";
import { publishingOwner } from "../fixtures/owner-publishing-setup";
import { setupClientAccessFixture } from "../fixtures/client-access-setup";
const origin = "http://127.0.0.1:3104";
for (const width of [390, 1440])
  test(`owner inspects, prepares and confirms scoped revocation at ${width}px`, async ({
    page,
    context,
  }) => {
    const f = await setupClientAccessFixture();
    await page.setViewportSize({ width, height: 900 });
    expect((await context.request.get("/api/client-access")).status()).toBe(
      401,
    );
    await page.goto("/dashboard/client-access");
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
    if (width < 768) {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
    }
    await expect(
      page.getByRole("link", { name: "Client Access", exact: true }).first(),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Client Access", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/dashboard\/client-access/);
    const selector = page.getByRole("combobox", { name: "Organization" });
    await expect(selector).toBeEnabled();
    for (
      let n = 0;
      n < 100 &&
      !(await selector.locator(`option[value="${f.tenantId}"]`).count());
      n++
    ) {
      await page.getByRole("button", { name: "Next organizations" }).click();
      await expect(selector).toBeEnabled();
    }
    await selector.selectOption(f.tenantId);
    await expect(
      page.getByRole("region", { name: /onboarding readiness/ }),
    ).toContainText("Launch blocked");
    const grants = page.getByRole("region", { name: "Project grants" });
    await expect(grants).toContainText("Effective yes");
    const prep = page.getByRole("region", {
      name: "Prepared invitation configurations",
    });
    await prep
      .getByLabel("Intended recipient")
      .fill("future-fictional@example.test");
    await prep.getByRole("checkbox").check();
    await prep.getByRole("button", { name: "Review preparation" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("No token will be created or delivered");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await dialog.getByRole("button", { name: "Confirm operation" }).click();
    await expect(prep).toContainText(
      "Prepared only · future-fictional@example.test",
    );
    const state = await context.request.get(
      `/api/client-access?tenantId=${encodeURIComponent(f.tenantId)}`,
    );
    expect(state.headers()["cache-control"]).toContain("no-store");
    expect(state.headers()["referrer-policy"]).toBe("no-referrer");
    const json = await state.json();
    expect(json.selected.invitations).toHaveLength(1);
    expect(JSON.stringify(json)).not.toContain("token_verifier");
    await grants
      .getByRole("button", { name: "Review grant revocation" })
      .click();
    await expect(dialog).toContainText(f.identityId);
    await expect(dialog).toContainText(f.projectId);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(grants).toContainText("Effective yes");
    await grants
      .getByRole("button", { name: "Review grant revocation" })
      .click();
    await dialog.getByRole("button", { name: "Confirm operation" }).click();
    await expect(grants).toContainText("revoked");
    await expect(grants.getByRole("button")).toBeDisabled();
    await expect(
      page.getByRole("region", { name: "Lifecycle audit history" }),
    ).toContainText("cc009-browser-owner");
    const identities = page.getByRole("region", {
      name: "Customer identities and memberships",
    });
    await identities
      .getByRole("button", { name: "Review membership suspension" })
      .click();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(identities).toContainText("Membership active");
    const invitations = page.getByRole("region", {
      name: "Issued invitations",
    });
    await invitations
      .getByRole("button", { name: "Review invitation revocation" })
      .click();
    await dialog.getByRole("button", { name: "Confirm operation" }).click();
    await expect(invitations).toContainText("revoked");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    // Concurrent edit must invalidate the rendered revision and require a fresh review.
    await identities
      .getByRole("button", { name: "Review membership suspension" })
      .click();
    const current = (
      await (
        await context.request.get(
          `/api/client-access?tenantId=${encodeURIComponent(f.tenantId)}`,
        )
      ).json()
    ).selected.identities[0];
    expect(
      (
        await context.request.post("/api/client-access", {
          headers: { origin },
          data: {
            action: "suspendMembership",
            tenantId: f.tenantId,
            identityId: f.identityId,
            expectedRevision: current.revision,
            confirmed: true,
          },
        })
      ).status(),
    ).toBe(200);
    await dialog.getByRole("button", { name: "Confirm operation" }).click();
    await expect(
      page.getByRole("alert", { name: "Client Access error" }),
    ).toContainText("Records changed");
    await expect(
      page.getByRole("region", { name: "Project grants" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Refresh access records" }).click();
    await expect(identities).toContainText("suspended");
    await page.route("**/api/client-access**", (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Administration unavailable" }),
      }),
    );
    await page.getByRole("button", { name: "Refresh access records" }).click();
    await expect(
      page.getByRole("alert", { name: "Client Access error" }),
    ).toContainText("Administration unavailable");
    await expect(selector).toHaveCount(0);
  });
