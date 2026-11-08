import { expect, test, type Page } from "@playwright/test";

const ownerEmail = process.env.YS_APP_RECOVERY_OWNER_EMAIL;
const ownerPassword = process.env.YS_APP_RECOVERY_OWNER_PASSWORD;
const bootstrapToken = process.env.YS_APP_RECOVERY_BOOTSTRAP_TOKEN;
const baseURL = process.env.YS_APP_RECOVERY_BASE_URL;
if (ownerEmail !== "owner@recovery.test" || baseURL !== "https://recovery.test" || !ownerPassword || !bootstrapToken) {
  throw new Error("Generated synthetic owner credentials are required");
}
const api = (path: string) => new URL(path, baseURL).toString();

async function request(page: Page, path: string, init?: RequestInit) {
  return page.evaluate(async ({ url, options }) => {
    const response = await fetch(url, { ...options, credentials: "include" });
    let body: unknown = null;
    try { body = await response.json(); } catch { /* Some expected denials may not have JSON bodies. */ }
    return { status: response.status, body };
  }, { url: api(path), options: init });
}

test("restored schema supports synthetic owner authentication and legacy read workflows", async ({ page, browser }) => {
  await test.step("application health", async () => { await page.goto("/"); });
  await test.step("health endpoint", async () => {
    const health = await request(page, "/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({ status: "ok" });
  });

  await test.step("synthetic owner registration", async () => {
    const registration = await request(page, "/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", "x-owner-bootstrap-token": bootstrapToken },
      body: JSON.stringify({ name: "Synthetic Recovery Owner", email: ownerEmail, password: ownerPassword }),
    });
    await test.step(`synthetic owner registration HTTP ${registration.status}`, async () => {
      expect(registration.status).toBe(200);
    });
  });

  await test.step("synthetic owner sign-in", async () => {
    const signIn = await request(page, "/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    });
    await test.step(`synthetic owner sign-in HTTP ${signIn.status}`, async () => {
      expect(signIn.status).toBe(200);
    });
  });

  await test.step("owner authorization", async () => {
    const ownerStatus = await request(page, "/api/auth/owner-session-status");
    expect(ownerStatus.status).toBe(200);
    expect(ownerStatus.body).toEqual({ authenticated: true, authorized: true });
  });

  await test.step("owner dashboard read", async () => {
    const dashboard = await page.goto("/dashboard");
    expect(dashboard?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "What needs attention today?" })).toBeVisible();
    await expect(page.getByText("Your follow-ups, delivery work, and next actions in one place.")).toBeVisible();
  });

  await test.step("legacy Directory read", async () => {
    const directory = await request(page, "/api/systems-directory");
    expect(directory.status).toBe(200);
    expect(directory.body).toEqual({ entries: [] });
  });

  await test.step("tenant selector denial", async () => {
    const invalidTenantSelection = await request(page, "/api/systems-directory?tenant=synthetic-other-tenant");
    expect(invalidTenantSelection.status).toBe(400);
  });

  const anonymous = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const anonymousPage = await anonymous.newPage();
    await anonymousPage.goto("/");
    await test.step("anonymous Directory denial", async () => {
      const response = await request(anonymousPage, "/api/systems-directory");
      expect(response.status).toBe(401);
    });
  } finally {
    await anonymous.close();
  }
});
