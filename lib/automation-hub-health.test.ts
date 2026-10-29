import { afterEach, describe, expect, test } from "bun:test";
import { getAutomationHubHealth } from "@/lib/automation-hub-health";

const originalFetch = globalThis.fetch;

afterEach(() => { globalThis.fetch = originalFetch; });

describe("Automation Hub health probe", () => {
  test("accepts only the Hub's existing static health response", async () => {
    globalThis.fetch = (async (input, init) => {
      expect(String(input)).toBe("https://cal.yorkstead.com/api/health");
      expect(init?.cache).toBe("no-store");
      return Response.json({ status: "ok", service: "yorkstead-automation-hub", credential: "never forwarded" });
    }) as typeof fetch;
    expect((await getAutomationHubHealth()).state).toBe("responding");
  });

  test("keeps upstream failures visible instead of presenting an empty healthy state", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    expect((await getAutomationHubHealth()).state).toBe("degraded");
    globalThis.fetch = (async () => Response.json({ status: "ok", service: "other-service" })) as unknown as typeof fetch;
    expect((await getAutomationHubHealth()).state).toBe("degraded");
    globalThis.fetch = (() => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect((await getAutomationHubHealth()).state).toBe("unavailable");
  });
});
