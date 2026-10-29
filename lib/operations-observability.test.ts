import { describe, expect, test } from "bun:test";
import {
  buildOperationsOverview,
  buildRecoveryControls,
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
  runtimeEnvironment: "production",
  databaseConnectionConfigured: true,
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

  test("documents the production Neon target without claiming its identity is verified", () => {
    const result = buildOperationsOverview(healthyInput());
    expect(result.deploymentContext).toEqual({
      environment: "production",
      neonOrganizationId: "org-aged-leaf-21920027",
      neonProjectId: "old-boat-18584731",
      neonIdentityStatus: "not_verified",
    });
    expect(result.readinessChecks.find((check) => check.id === "neon-target-identity")?.status).toBe("not_verified");
    expect(result.readinessChecks.find((check) => check.id === "runtime-environment")?.status).toBe("healthy");
    expect(result.readinessChecks.find((check) => check.id === "database-configuration")?.status).toBe("healthy");
    expect(result.readinessChecks.find((check) => check.id === "database-configuration")?.summary).not.toContain("DATABASE_URL");
  });

  test("keeps backup availability and restore verification independent", () => {
    const now = new Date();
    const backupOnly = buildRecoveryControls({ backup: { observedAt: now, source: "provider-console" } }, now);
    expect(backupOnly.find((control) => control.id === "backup")?.status).toBe("verified");
    expect(backupOnly.find((control) => control.id === "restore-test")?.status).toBe("not_verified");
    const restoreOnly = buildRecoveryControls({ restoreTest: { observedAt: now, source: "independent-restore-log" } }, now);
    expect(restoreOnly.find((control) => control.id === "restore-test")?.status).toBe("verified");
    expect(restoreOnly.find((control) => control.id === "backup")?.status).toBe("not_verified");
    const expired = buildRecoveryControls({
      backup: { observedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000), source: "provider-console" },
      restoreTest: { observedAt: new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000), source: "independent-restore-log" },
    }, now);
    expect(expired.find((control) => control.id === "backup")?.status).toBe("stale");
    expect(expired.find((control) => control.id === "restore-test")?.status).toBe("stale");
  });

  test("fails closed when runtime or database configuration is not established", () => {
    const result = buildOperationsOverview(healthyInput({ runtimeEnvironment: "unknown", databaseConnectionConfigured: false }));
    expect(result.readinessChecks.find((check) => check.id === "runtime-environment")?.status).toBe("unknown");
    expect(result.readinessChecks.find((check) => check.id === "database-configuration")?.status).toBe("not_configured");
    expect(result.deploymentContext.neonIdentityStatus).toBe("not_verified");
  });

  test("readiness and recovery output contains no connection strings, credentials, or customer records", () => {
    const serialized = JSON.stringify(buildOperationsOverview(healthyInput()));
    expect(serialized).not.toMatch(/postgres(?:ql)?:\/\//i);
    expect(serialized).not.toMatch(/(?:password|secret|api[_-]?key)\s*[:=]\s*["'][^"']+["']/i);
    expect(serialized).not.toMatch(/customer@example\.com/i);
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
