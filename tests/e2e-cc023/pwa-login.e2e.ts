import { expect, test } from "@playwright/test";
import { cc023Owner, disposeCc023Owner, setupCc023Owner } from "../fixtures/cc023-owner";

test.beforeAll(async () => setupCc023Owner());
test.afterAll(async () => disposeCc023Owner());

test("manifest launch returns to dashboard after real owner recovery login", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  await page.goto(manifest.start_url);
  await expect(page).toHaveURL(/\/login\?next=\/dashboard$/);
  await page.getByLabel("Owner email").fill(cc023Owner.email);
  await page.getByLabel("Recovery password").fill(cc023Owner.password);
  await page.getByRole("button", { name: "Use recovery login" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Systems & recurring costs" })).toBeVisible();
});
