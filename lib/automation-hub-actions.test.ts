import { afterEach, describe, expect, test } from "bun:test";
import { postAutomationHubCommand } from "@/lib/automation-hub-actions";

const previousSecret = process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET;
const previousFetch = globalThis.fetch;
const command = { contractVersion: 1 as const, captureId: "11111111-1111-4111-8111-111111111111", idempotencyKey: "22222222-2222-4222-8222-222222222222", action: "approve_task" as const, expectedStatus: "pending" as const, expectedKind: "task" as const };

afterEach(() => {
  if (previousSecret === undefined) delete process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET;
  else process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET = previousSecret;
  globalThis.fetch = previousFetch;
});

describe("Automation Hub command client", () => {
  test("fails closed when write credential is missing and rejects malformed browser requests", async () => {
    delete process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET;
    globalThis.fetch = (() => { throw new Error("must not fetch"); }) as unknown as typeof fetch;
    expect(await postAutomationHubCommand(command)).toMatchObject({ configured: false, httpStatus: 503 });
    process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET = "synthetic-write-secret-at-least-32-characters";
    expect(await postAutomationHubCommand({ ...command, actor: "owner" })).toMatchObject({ httpStatus: 400 });
  });

  test("uses only the fixed server endpoint and write credential, and preserves safe retry metadata", async () => {
    process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET = "synthetic-write-secret-at-least-32-characters";
    globalThis.fetch = (async (input, init) => {
      expect(String(input)).toBe("https://cal.yorkstead.com/api/integrations/website-automation-actions");
      expect(init?.method).toBe("POST");
      expect(init?.cache).toBe("no-store");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET}`);
      expect(String(init?.body)).not.toContain("actor");
      return Response.json({ contractVersion: 1, commandId: "33333333-3333-4333-8333-333333333333", captureId: command.captureId, action: "approve_task", status: "pending", destination: "google_tasks", resultCode: "google_not_connected", externalWriteStarted: false, retrySafe: true }, { status: 503 });
    }) as typeof fetch;
    const result = await postAutomationHubCommand(command);
    expect(result).toMatchObject({ configured: true, httpStatus: 503, result: { retrySafe: true, externalWriteStarted: false } });
  });

  test("does not relay unvalidated responses or exception details", async () => {
    process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET = "synthetic-write-secret-at-least-32-characters";
    globalThis.fetch = (async () => Response.json({ contractVersion: 9, privateProviderBody: "never forward" })) as unknown as typeof fetch;
    expect(await postAutomationHubCommand(command)).toMatchObject({ httpStatus: 200, result: null });
    globalThis.fetch = (async () => { throw new Error("secret provider response"); }) as unknown as typeof fetch;
    expect(await postAutomationHubCommand(command)).toMatchObject({ httpStatus: 503, result: null });
  });
});
