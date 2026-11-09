import { describe, expect, test } from "bun:test";
import { inspectMigrationRoutineManifest, migrationRoutineNamesThrough0022, privateDatabaseTables, privateSessionWriteTables, validatePrivateRecoveryEnvironment } from "./private-rehearsal-policy";

const targetId = "0123456789abcdef01234567";
const env = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  YS_APP_RECOVERY_MODE: "production-derived-private-v1",
  YS_APP_RECOVERY_TARGET_ID: targetId,
  YS_APP_RECOVERY_SETUP_ROLE: `ys_sys_setup_${targetId.slice(0,12)}`,
  YS_APP_RECOVERY_SETUP_DATABASE_URL: `postgresql://ys_sys_setup_${targetId.slice(0,12)}:private@172.20.0.2:5432/ys_sys_001_${targetId}`,
  YS_APP_RECOVERY_RUNTIME_PASSWORD: "a".repeat(64),
});

describe("private production-derived recovery target policy", () => {
  test("accepts only an explicitly marked private literal-IP target and derives distinct roles", () => {
    const result = validatePrivateRecoveryEnvironment(env());
    expect(result.database).toBe(`ys_sys_001_${targetId}`);
    expect(result.setupRole).toBe(`ys_sys_setup_${targetId.slice(0,12)}`);
    expect(result.runtimeRole).toBe(`ys_sys_runtime_${targetId.slice(0,12)}`);
  });

  test("rejects public endpoints and ambient database or cloud configuration", () => {
    const publicHost = env();
    publicHost.YS_APP_RECOVERY_SETUP_DATABASE_URL = `postgresql://ys_sys_setup_${targetId.slice(0,12)}:private@198.51.100.10:5432/ys_sys_001_${targetId}`;
    expect(() => validatePrivateRecoveryEnvironment(publicHost)).toThrow();
    const ambient = env();
    ambient.DATABASE_URL = "must-not-be-read";
    expect(() => validatePrivateRecoveryEnvironment(ambient)).toThrow();
    const integration = env();
    integration.STRIPE_SECRET_KEY = "must-not-be-read";
    expect(() => validatePrivateRecoveryEnvironment(integration)).toThrow();
  });

  test("limits runtime DML to owner-session creation and omits unused publication reads", () => {
    expect(privateSessionWriteTables).toEqual(['public."session"']);
    expect(privateDatabaseTables).not.toContain("public.client_project_publications");
    expect(privateDatabaseTables).toContain("public.contact_inquiries");
    expect(privateDatabaseTables).toContain("public.conversion_events");
  });

  test("pins the reviewed 0022 routine inventory", () => {
    expect(migrationRoutineNamesThrough0022).toHaveLength(37);
    expect(new Set(migrationRoutineNamesThrough0022).size).toBe(37);
  });

  test("parses every migration 0022 routine and trigger attachment without dynamic or external behavior", async () => {
    const { bodies, triggers } = await inspectMigrationRoutineManifest();
    expect(bodies.size).toBe(37);
    expect(triggers.size).toBe(70);
    expect(bodies.has("retire_inquiry")).toBe(true);
    expect([...bodies.keys()].some((name) => name.includes("billing"))).toBe(false);
  });
});
