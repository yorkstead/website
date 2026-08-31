import { expect, test } from "@playwright/test";

test.describe("jwld.store case study and portfolio verification", () => {
  test("displays jwld.store in the selected work portfolio", async ({ page }) => {
    await page.goto("/work");
    await expect(page.getByRole("heading", { name: "jwld.store" })).toBeVisible();
    await expect(page.getByText("Commerce", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Distinctive products. Clear buying paths. Connected store operations.").first()).toBeVisible();
  });

  test("verifies /work and /work/jwld-store across desktop and narrow mobile viewports", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 390, height: 844 },
      { name: "narrow-mobile", width: 320, height: 568 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Check /work for no horizontal overflow
      await page.goto("/work");
      const workOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(workOverflow).toBe(false);

      // Check /work/jwld-store for no horizontal overflow
      await page.goto("/work/jwld-store");
      const storeOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(storeOverflow).toBe(false);

      // Verify headings and links
      await expect(page.getByRole("heading", { name: "jwld.store", level: 1 })).toBeVisible();
      await expect(page.locator('a[href="/media/jwld/jwld-store-showcase.pdf"]')).toBeVisible();
      await expect(page.locator('a[href="/packages"]')).toBeVisible();
      await expect(page.locator('a[href="https://jwld.store"]')).toHaveAttribute("target", "_blank");
      await expect(page.getByRole("link", { name: /Discuss your commerce workflow/i })).toHaveAttribute("href", "/#contact");

      // Verify gallery images exist and are displayed
      const galleryFigures = page.locator('section[aria-labelledby="project-media-heading"] figure');
      await expect(galleryFigures).toHaveCount(6);
    }
  });

  test("expands and closes media in the gallery dialog modal", async ({ page }) => {
    await page.goto("/work/jwld-store");
    const firstExpand = page.locator('button[aria-label^="Expand"]').first();
    await firstExpand.click();

    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    const closeBtn = dialog.locator('button[aria-label="Close expanded media"]');
    await closeBtn.click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });
});
