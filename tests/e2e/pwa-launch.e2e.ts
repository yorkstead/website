import { expect, test } from "@playwright/test";

test("served manifest launches into owner login and all shortcuts stay protected", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", scope: "/", start_url: "/dashboard", name: "Yorkstead Command Center", short_name: "Yorkstead" });
  expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
    "/dashboard", "/dashboard/leads", "/dashboard/analytics", "/dashboard/consultations",
  ]);
  for (const destination of [manifest.start_url, ...manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url), "/account"]) {
    await page.goto(destination);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${destination}$`));
    await expect(page.getByRole("button", { name: "Continue with a passkey" })).toBeVisible();
  }
});

test("real service worker caches public navigation and excludes private launches", async ({ page }) => {
  await page.goto("/about");
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(async () => {
    const keys = await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)));
    return keys.flat();
  })).toContain("/about");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=\/dashboard$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=\/account$/);
  const cachedPaths = await page.evaluate(async () => {
    const keys = await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)));
    return keys.flat();
  });
  expect(cachedPaths.some((path) => /^\/(dashboard|login|account|api)(\/|$)/.test(path))).toBe(false);
});
