import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`Rework case study discovery, story, and CTA destinations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/work");
    await page.getByRole("link", { name: "View the Rework Flow project profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rework Flow", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "The observation", exact: true })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Explore Rework Flow" });
    await expect(nav.getByRole("link", { name: /Guided Walkthrough/ })).toHaveAttribute("href", "https://ops.yorkstead.com/rework?mode=guided");
    await expect(nav.getByRole("link", { name: /Open Sandbox/ })).toHaveAttribute("href", "https://ops.yorkstead.com/rework");
    await nav.getByRole("link", { name: /Architecture/ }).click();
    await expect(page.locator("#architecture")).toBeInViewport();
    await expect(page.locator('a[href*="&scenario="]')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
