import { expect, test } from "@playwright/test";

const privateMode = process.env.YS_APP_RECOVERY_PRIVATE_REHEARSAL === "true";
const privateTest = privateMode ? test : test.skip;
const email = process.env.OWNER_EMAIL;
const password = process.env.YS_APP_RECOVERY_OWNER_PASSWORD;
const baseURL = process.env.YS_APP_RECOVERY_BASE_URL;

if (privateMode && (email !== "owner@recovery.test" || !password || baseURL !== "https://recovery.test")) {
  throw new Error("private rehearsal requires only the generated synthetic owner and recovery origin");
}

privateTest("pre-provisioned synthetic owner signs in and reads the restored dashboard", async ({ page }) => {
  await page.goto("/");
  const signIn = await page.evaluate(async ({ email, password }) => {
    const response = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.status;
  }, { email, password });
  expect(signIn).toBe(200);

  const session = await page.evaluate(async () => {
    const response = await fetch("/api/auth/owner-session-status", { cache: "no-store", credentials: "include" });
    return { status: response.status, authorized: response.ok && (await response.json()).authorized === true };
  });
  expect(session).toEqual({ status: 200, authorized: true });

  const dashboard = await page.goto("/dashboard");
  expect(dashboard?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "What needs attention today?" })).toBeVisible();
  await expect(page.getByText("Your follow-ups, delivery work, and next actions in one place.")).toBeVisible();

  const directory = await page.evaluate(async () => {
    const response = await fetch("/api/systems-directory", { cache: "no-store", credentials: "include" });
    const body = await response.json();
    return response.ok && Array.isArray(body.entries);
  });
  expect(directory).toBe(true);
});
