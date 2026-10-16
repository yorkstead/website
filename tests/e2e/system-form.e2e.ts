import { expect, test } from "@playwright/test";

const expectedSequence = [
  "core",
  "architecture",
  "core",
  "flow",
  "core",
  "network",
  "core",
  "disorder",
  "core",
  "structure",
  "core",
  "ownership",
];

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`SystemForm continues through the footer at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const sequence = await page.locator("[data-system-form]").evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-system-form")),
    );
    expect(sequence).toEqual(expectedSequence);

    const systemForm = page.locator(".system-form");
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await expect(page.locator('footer[data-system-form="ownership"]')).toBeInViewport();
    await expect(systemForm).toHaveAttribute("data-active-form", "ownership");
    await expect.poll(() => systemForm.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).getPropertyValue("--system-form-presence")),
    )).toBeGreaterThan(0.99);
  });
}
