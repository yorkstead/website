import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`owner-only portal preview denies unauthenticated ${viewport.name} requests`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/dashboard/customer-portal-preview?tenant=untrusted&project=untrusted");

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fcustomer-portal-preview|\/login\?next=\/dashboard\/customer-portal-preview/);
    await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
    await expect(page.getByText("Northline Workshop")).toHaveCount(0);
    await expectNoHorizontalDocumentOverflow(page);
  });
}

test("portal and document routes are not public", async ({ request }) => {
  const portal = await request.get("/customer-portal");
  const document = await request.get("/api/customer-documents/fictional");
  expect(portal.status()).toBe(404);
  expect(document.status()).toBe(404);
});

test("customer authentication remains disabled", async ({ request }) => {
  const getResponse = await request.get("/api/customer-auth/get-session");
  const postResponse = await request.post("/api/customer-auth/sign-in/email", {
    data: { email: "fictional@example.test", password: "not-a-real-password" },
  });

  expect(getResponse.status()).toBe(404);
  expect(postResponse.status()).toBe(404);
  expect(getResponse.headers()["cache-control"]).toContain("no-store");
  expect(postResponse.headers()["cache-control"]).toContain("no-store");
});

test("forged document and approval writes have no customer endpoint", async ({ request }) => {
  for (const path of ["/api/customer-documents/fictional", "/api/customer-approvals/fictional"]) {
    const response = await request.post(path, {
      headers: { "x-user-id": "forged", "x-role": "owner", "x-tenant-id": "other" },
      data: { status: "approved", versionId: "forged" },
    });
    expect(response.status()).toBe(404);
  }
});

test("invitation registration and redemption are not public", async ({ request }) => {
  for (const path of ["/api/customer-invitations/redeem", "/api/customer-register", "/invitations/fictional", "/register"]) {
    expect((await request.get(path)).status()).toBe(404);
    expect((await request.post(path, { data: { token: "fictional-disposable" } })).status()).toBe(404);
  }
});

test("source projection preview remains owner-only and project APIs remain absent", async ({ page, request }) => {
  await page.goto("/dashboard/customer-portal-preview?projection=fictional");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByText("Fictional delivery integration")).toHaveCount(0);
  for (const path of ["/api/customer-projects/fictional", "/api/client-project-publications/fictional"]) {
    expect((await request.get(path)).status()).toBe(404);
    expect((await request.post(path, { headers: { "x-role": "owner" }, data: { state: "approved" } })).status()).toBe(404);
  }
});

test("client publishing page, approved preview and operations require owner authentication",async({page,request})=>{
  for(const path of ['/dashboard/client-publishing','/dashboard/client-publishing/preview?projectId=forged']){
    await page.goto(path);await expect(page).toHaveURL(/\/login\?next=/);
  }
  for(const method of ['get','post'] as const){
    const response=await request[method]('/api/owner-publishing',method==='post'?{data:{action:'approve',actor:'forged',tenantId:'other'}}:{});
    expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toContain('no-store');
  }
});
