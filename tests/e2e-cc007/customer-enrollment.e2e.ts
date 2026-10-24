import { expect, test } from "@playwright/test";
test("mobile invitation, independent mailbox proof, account, session, synthetic shell and sign-out", async ({
  page,
  request,
}) => {
  // The browser uses the real form, controller, provider and database; delivery alone is synthetic.
  await page.route("**/api/customer-enrollment/*", async (route) => {
    const original = route.request();
    const response = await route.fetch({
      url: original.url().replace(":3101", ":3102"),
    });
    await route.fulfill({ response });
  });
  const fixture = await (
    await request.get("http://127.0.0.1:3102/fixture")
  ).json();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/customer/accept");
  await page.getByLabel("Private invitation token").fill(fixture.token);
  await page.getByRole("button", { name: "Verify invited email" }).click();
  await expect(page.getByLabel("Email verification proof")).toBeVisible();
  const mailbox = await (
    await request.get(
      `http://127.0.0.1:3102/mailbox?email=${encodeURIComponent(fixture.email)}`,
    )
  ).json();
  await page.getByLabel("Email verification proof").fill(mailbox.proof);
  await page
    .getByLabel("Password", { exact: true })
    .fill("fictional-browser-password-cc007");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/customer\/portal/);
  await expect(
    page.getByText("Synthetic preview only.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Authorized projects" }),
  ).toContainText(fixture.project);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    ),
  ).not.toContain(fixture.token);
  const otherCustomer = await (
    await request.get("http://127.0.0.1:3102/fixture")
  ).json();
  await page.goto(
    `/customer/portal?project=${encodeURIComponent(otherCustomer.project)}`,
  );
  await expect(page.getByRole("status")).toContainText("access is unavailable");
  await expect(
    page.getByRole("navigation", { name: "Authorized projects" }),
  ).toHaveCount(0);
  await page.goto("/customer/portal");
  await expect(
    page.getByRole("navigation", { name: "Authorized projects" }),
  ).toContainText(fixture.project);
  await page.getByRole("link", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/customer\/sign-in/);
  await page.getByLabel("Email address").fill(fixture.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("fictional-browser-password-cc007");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/customer\/portal/);
});
test("missing session and unavailable real delivery fail safely", async ({
  page,
  request,
}) => {
  await page.goto("/customer/portal");
  await expect(page.getByRole("status")).toContainText(
    "session has expired or access is unavailable",
  );
  await page.goto("/customer/recovery");
  await expect(
    page.getByText("Recovery delivery is not available.", { exact: false }),
  ).toBeVisible();
  const fixture = await (
    await request.get("http://127.0.0.1:3102/fixture")
  ).json();
  await page.goto("/customer/accept");
  await page.getByLabel("Private invitation token").fill(fixture.token);
  await page.getByRole("button", { name: "Verify invited email" }).click();
  await expect(page.getByRole("status")).toContainText("Unable to continue");
  await expect(page.getByLabel("Email verification proof")).toHaveCount(0);
});
