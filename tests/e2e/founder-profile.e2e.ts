import { expect, test } from "@playwright/test";

const canonicalURL = "https://www.yorkstead.com/brandon-york";
const organizationId = "https://www.yorkstead.com/#organization";
const personId = `${canonicalURL}#person`;
const profilePageId = `${canonicalURL}#profilepage`;

test("Brandon York profile publishes one connected canonical identity", async ({ page }) => {
  const response = await page.goto("/brandon-york");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1, name: "Brandon York" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalURL);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonicalURL);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "profile");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Brandon York | Founder & Systems Architect at Yorkstead Systems",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Brandon York founded Yorkstead Systems/,
  );

  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const graph = scripts.flatMap((raw) => {
    const data = JSON.parse(raw) as { "@graph"?: Record<string, unknown>[] };
    return data["@graph"] ?? [];
  });
  const matching = (id: string) => graph.filter((item) => item["@id"] === id);
  expect(matching(profilePageId)).toHaveLength(1);
  expect(matching(personId)).toHaveLength(1);
  expect(matching(organizationId)).toHaveLength(1);
  expect(matching(profilePageId)[0].mainEntity).toEqual({ "@id": personId });
  expect(matching(personId)[0].worksFor).toEqual({ "@id": organizationId });
  expect(matching(organizationId)[0].founder).toEqual({ "@id": personId });
  expect(matching(personId)[0].jobTitle).toBe("Founder & Systems Architect");
  expect(JSON.stringify(graph)).not.toContain("https://yorkstead.com/");

  await expect(page.getByRole("link", { name: "About Yorkstead" })).toHaveAttribute("href", "/about");
  await expect(page.getByRole("link", { name: "Project portfolio" })).toHaveAttribute("href", "/work");
  await expect(page.getByRole("link", { name: "Discuss your workflow" })).toHaveAttribute("href", "/#contact");
});
