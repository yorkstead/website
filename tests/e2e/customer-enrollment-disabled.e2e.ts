import { expect, test } from "@playwright/test";
test("customer enrollment and authentication pages and endpoints default closed", async ({
  request,
}) => {
  for (const screen of [
    "accept",
    "enroll",
    "verify",
    "sign-in",
    "sign-out",
    "recovery",
    "portal",
  ]) {
    expect((await request.get(`/customer/${screen}`)).status()).toBe(404);
  }
  for (const operation of [
    "begin",
    "complete",
    "sign-in",
    "sign-out",
    "redeem",
    "recovery",
  ]) {
    const response = await request.post(
      `/api/customer-enrollment/${operation}`,
      { data: {} },
    );
    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
