import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const previousCronSecret = process.env.CRON_SECRET;
const previousAccessToken = process.env.MORNING_BRIEFING_ACCESS_TOKEN;

let cronGET: (request: Request) => Promise<Response>;
let briefingGET: (request: Request) => Promise<Response>;

beforeAll(async () => {
  process.env.CRON_SECRET = "cron-secret-longer-than-sixteen";
  process.env.MORNING_BRIEFING_ACCESS_TOKEN = "tasker-secret-longer-than-sixteen";
  cronGET = (await import("@/app/api/cron/morning-briefing/route")).GET;
  briefingGET = (await import("@/app/api/morning-briefing/route")).GET;
});

afterAll(() => {
  process.env.CRON_SECRET = previousCronSecret;
  process.env.MORNING_BRIEFING_ACCESS_TOKEN = previousAccessToken;
});

describe("morning briefing route boundaries", () => {
  test("rejects cron requests before generation", async () => {
    const response = await cronGET(new Request("https://example.test/api/cron/morning-briefing"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("rejects Tasker requests as plain text and disables shared caching", async () => {
    const response = await briefingGET(new Request("https://example.test/api/morning-briefing?token=tasker-secret-longer-than-sixteen"));
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("vary")).toBe("Authorization");
    expect(await response.text()).toBe("Unauthorized");
  });
});
