import { describe, expect, test } from "bun:test";

const source = await Bun.file(new URL("./route.ts", import.meta.url)).text();

describe("Automation Hub action BFF contract", () => {
  test("enforces the Website owner session before it calls the Hub command client", () => {
    const ownerCheck = source.indexOf("getOwnerSession(await headers())");
    const hubCall = source.indexOf("postAutomationHubCommand(input)");
    expect(ownerCheck).toBeGreaterThanOrEqual(0);
    expect(ownerCheck).toBeLessThan(hubCall);
    expect(source).toContain("status: 401");
    expect(source).toContain("YORKSTEAD_AUTOMATIONS_ACTIONS_ENABLED !== 'true'");
  });

  test("bounds and validates same-origin JSON without accepting browser credentials", () => {
    expect(source).toContain("content-length");
    expect(source).toContain("size > 4096");
    expect(source).toContain("sec-fetch-site");
    expect(source).toContain("AutomationHubCommand.parse");
    expect(source).toContain("private, no-store");
    expect(source).not.toContain("request.headers.get('authorization')");
    expect(source).not.toContain("YORKSTEAD_AUTOMATIONS_WRITE_SECRET");
  });
});
