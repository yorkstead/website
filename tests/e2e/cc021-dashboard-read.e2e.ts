import { expect, test } from "@playwright/test";

const ownerEmail = "cc021-owner@example.test";
const ownerPassword = "Cc021-browser-owner-test-password-2026!";
const bootstrapToken = "cC021B9vK2xR7mP4qT8nH5sD1aF6Z3Z7";

test("authenticated Dashboard renders source-aware CC-021 data without browser-side briefing reads", async ({ page }) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires the repository's disposable TEST_DATABASE_URL; it will not bootstrap against a default or production database.");
  const observedRequests: string[] = [];
  page.on("request", (request) => observedRequests.push(request.url()));

  const bootstrap = await page.request.get("/api/auth/bootstrap-status");
  if ((await bootstrap.json() as { available?: boolean }).available) {
    const created = await page.request.post("/api/auth/sign-up/email", {
      headers: { "x-owner-bootstrap-token": bootstrapToken },
      data: { email: ownerEmail, password: ownerPassword, name: "CC-021 Browser Owner" },
    });
    expect(created.ok()).toBe(true);
  } else {
    const signedIn = await page.request.post("/api/auth/sign-in/email", { data: { email: ownerEmail, password: ownerPassword } });
    expect(signedIn.ok()).toBe(true);
  }

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Unified attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tasks", exact: true })).toBeVisible();
  await expect(page.locator("#calendar")).toBeVisible();
  await expect(page.getByText("Google Tasks", { exact: false }).first()).toBeVisible();

  expect(observedRequests.some((url) => url.includes("/api/dashboard/automation-hub"))).toBe(false);
  expect(observedRequests.some((url) => url.includes("/api/briefing"))).toBe(false);
  expect(observedRequests.some((url) => /tasks\.googleapis\.com|calendar\.googleapis\.com/.test(url))).toBe(false);
});
