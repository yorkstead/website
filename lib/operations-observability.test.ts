import { describe, expect, test } from "bun:test";
import {
  buildOperationsOverview,
  createOperationsController,
  cronScheduleIntent,
  type OperationsInput,
} from "@/lib/operations-observability";

const healthyInput = (overrides: Partial<OperationsInput> = {}): OperationsInput => ({
  now: new Date("2026-10-26T12:00:00.000Z"),
  authConfigurationValid: true,
  databaseStatus: "healthy",
  authSchemaPresent: true,
  briefing: { status: "ready", updatedAt: new Date("2026-10-26T11:00:00.000Z"), generatedAt: new Date("2026-10-26T11:00:00.000Z") },
  briefingReadAvailable: true,
  ...overrides,
});

describe("operations observability model", () => {
  test("keeps absent scheduler, heartbeat, and recovery evidence visible as unverified", () => {
    const result = buildOperationsOverview(healthyInput());
    expect(result.status).toBe("needs_review");
    expect(result.readOnly).toBe(true);
    expect(result.liveAlertDelivery).toBe(false);
    expect(result.checks.find((check) => check.id === "cron-schedule-intent")?.status).toBe("not_verified");
    expect(result.cronSchedules).toHaveLength(4);
    expect(result.checks.find((check) => check.id === "reminder-execution")?.status).toBe("not_verified");
    expect(result.checks.find((check) => check.id === "retention-execution")?.status).toBe("not_verified");
    expect(result.recoveryControls.every((control) => control.status === "not_verified")).toBe(true);
    expect(result.incidents).toEqual([]);
  });

  test("creates a prioritized current incident for database failure without error details", () => {
    const result = buildOperationsOverview(healthyInput({ databaseStatus: "timeout", authSchemaPresent: null }));
    expect(result.status).toBe("degraded");
    expect(result.incidents).toContainEqual(expect.objectContaining({ id: "database", severity: "critical" }));
    expect(JSON.stringify(result)).not.toContain("postgres://");
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
  });

  test("identifies stale, failed, missing, and unobservable background runs distinctly", () => {
    const at = new Date("2026-10-26T12:00:00.000Z");
    const result = buildOperationsOverview(healthyInput({
      now: at,
      briefing: { status: "failed", updatedAt: new Date("2026-10-26T11:00:00.000Z"), generatedAt: null },
      briefingReadAvailable: true,
    }));
    expect(result.incidents).toContainEqual(expect.objectContaining({ id: "morning-briefing", severity: "medium" }));
    expect(buildOperationsOverview(healthyInput({ briefing: null })).checks.find((check) => check.id === "morning-briefing")?.status).toBe("not_verified");
    expect(buildOperationsOverview(healthyInput({ briefingReadAvailable: false })).checks.find((check) => check.id === "morning-briefing")?.status).toBe("unknown");
    expect(buildOperationsOverview(healthyInput({ briefing: { status: "ready", updatedAt: new Date("2026-10-24T00:00:00Z"), generatedAt: new Date("2026-10-24T00:00:00Z") } })).checks.find((check) => check.id === "morning-briefing")?.status).toBe("degraded");
    expect(buildOperationsOverview(healthyInput({ briefing: { status: "ready", updatedAt: new Date("2026-10-27T00:00:00Z"), generatedAt: new Date("2026-10-27T00:00:00Z") } })).checks.find((check) => check.id === "morning-briefing")?.status).toBe("unknown");
  });

  test("keeps the checked-in cron schedule aligned with Vercel configuration", async () => {
    const config = await Bun.file("vercel.json").json();
    expect(cronScheduleIntent.map(({ path, schedule }) => ({ path, schedule }))).toEqual(config.crons);
  });
});

describe("operations HTTP boundary", () => {
  test("authenticates before invoking health dependencies and returns private headers", async () => {
    let inspections = 0;
    const controller = createOperationsController({
      verifyOwner: async () => null,
      inspect: async () => { inspections += 1; return buildOperationsOverview(healthyInput()); },
    });
    const response = await controller(new Request("https://site.test/api/operations"));
    expect(response.status).toBe(401);
    expect(inspections).toBe(0);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  test("rejects query input and sanitizes dependency exceptions", async () => {
    const queryController = createOperationsController({ verifyOwner: async () => ({ user: { id: "owner" } } as never), inspect: async () => buildOperationsOverview(healthyInput()) });
    expect((await queryController(new Request("https://site.test/api/operations?url=https://internal.test"))).status).toBe(400);
    const failureController = createOperationsController({ verifyOwner: async () => ({ user: { id: "owner" } } as never), inspect: async () => { throw new Error("postgres://user:secret@private/db"); } });
    const response = await failureController(new Request("https://site.test/api/operations"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Operations status temporarily unavailable" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
