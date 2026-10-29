import { afterEach, describe, expect, test } from "bun:test";
import { getAutomationHubData } from "@/lib/automation-hub-data";

const originalFetch = globalThis.fetch;
const originalToken = process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET;
  else process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET = originalToken;
});

const at = "2026-10-29T16:00:00.000Z";
const fixture = {
  contractVersion: 1,
  source: "Automation Hub",
  generatedAt: at,
  captures: { source: "Automation Hub · captures", state: "available", checkedAt: at, truncated: false, errorCode: null, items: [{ id: "capture-123", createdAt: at, status: "pending", classification: { kind: "task", title: "Replace filter", summary: "Replace the filter by Friday", dueDate: "2026-10-30", requiresConfirmation: true }, rawText: "strip this" }] },
  activity: { source: "Automation Hub · execution history", state: "available", checkedAt: at, truncated: false, errorCode: null, items: [] },
  integrationHealth: { source: "Automation Hub · integrations", state: "available", checkedAt: at, database: "healthy", googleTasks: "healthy", errorCode: null },
  reviewQueue: { source: "Automation Hub · pending captures", state: "available", checkedAt: at, truncated: false, errorCode: null, items: [] },
  tasks: { source: "Google Tasks via Automation Hub", state: "available", checkedAt: at, truncated: false, errorCode: null, items: [{ id: "task-1", listId: "list-1", title: "Call supplier", status: "needsAction", dueAt: at, updatedAt: at }] },
};

describe("Automation Hub data client", () => {
  test("does not call Hub when the dedicated read credential is missing", async () => {
    delete process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET;
    globalThis.fetch = (() => { throw new Error("must not fetch"); }) as unknown as typeof fetch;
    expect((await getAutomationHubData()).state).toBe("not_configured");
  });

  test("sends the server-only credential to the fixed bounded read route and validates the contract", async () => {
    process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET = "synthetic-read-token-at-least-32-characters";
    globalThis.fetch = (async (input, init) => {
      expect(String(input)).toBe("https://cal.yorkstead.com/api/integrations/website-automations");
      expect(init?.method).toBe("GET");
      expect(init?.cache).toBe("no-store");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET}`);
      return Response.json(fixture);
    }) as typeof fetch;
    const result = await getAutomationHubData();
    expect(result.state).toBe("available");
    if (result.state !== "available") throw new Error("expected available contract");
    expect(result.data.captures.items[0]?.classification.title).toBe("Replace filter");
    expect("rawText" in result.data.captures.items[0]!).toBe(false);
    expect(result.data.tasks.items[0]?.id).toBe("task-1");
  });

  test("distinguishes Hub errors, malformed contracts, and oversized responses from empty success", async () => {
    process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET = "synthetic-read-token-at-least-32-characters";
    globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    expect((await getAutomationHubData()).state).toBe("unavailable");
    globalThis.fetch = (async () => Response.json({ ...fixture, contractVersion: 2 })) as unknown as typeof fetch;
    expect((await getAutomationHubData()).state).toBe("degraded");
    globalThis.fetch = (async () => new Response("x".repeat(270000), { headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
    expect((await getAutomationHubData()).state).toBe("unavailable");
    globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect((await getAutomationHubData()).state).toBe("unavailable");
  });
});
