import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("public navigation stays discoverable and usable across phone and desktop widths", async ({ page }) => {
  const screenshotDirectory = "test-results/cc025-navigation";
  await mkdir(screenshotDirectory, { recursive: true });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open site navigation" });
  await expect(menuButton).toBeVisible();
  await menuButton.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Work" })).toHaveAttribute("href", "/work");
  await expect(menu.getByRole("menuitem", { name: "Contact" })).toHaveAttribute("href", "/#contact");
  await page.screenshot({ path: `${screenshotDirectory}/public-mobile-menu.png` });
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuButton).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/work");
  const primary = page.getByRole("navigation", { name: "Primary" });
  await expect(primary.getByRole("link", { name: "Work", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Open site navigation" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/");
  await page.screenshot({ path: `${screenshotDirectory}/public-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${screenshotDirectory}/public-mobile.png` });
});
