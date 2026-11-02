import { describe, expect, test } from "bun:test";

const source = await Bun.file(new URL("./route.ts", import.meta.url)).text();

describe("temporary YS-SYS-001 diagnostic mode", () => {
  test("reuses the existing owner-only route and is disabled outside production or by default", () => {
    const ownerCheck = source.indexOf("getOwnerSession(request.headers)");
    const diagnosticMode = source.indexOf('searchParams.get("mode") === "ys-sys-001-preflight"');
    const databaseCall = source.indexOf("readSystemsDirectoryPreflight(sql, raw)");
    expect(ownerCheck).toBeGreaterThanOrEqual(0);
    expect(ownerCheck).toBeLessThan(diagnosticMode);
    expect(source).toContain('process.env.VERCEL_ENV !== "production"');
    expect(source).toContain('process.env.YS_SYS_001_PREFLIGHT_ENABLED !== "true"');
    expect(source).toContain('process.env.YS_SYS_001_PREFLIGHT_WAF_CONFIRMED !== "true"');
    expect(diagnosticMode).toBeLessThan(databaseCall);
    expect(source).toContain("private, no-store, max-age=0");
    expect(source).toContain("createOnePerWindowLimiter(60_000)");
  });

  test("keeps database errors generic and does not log or return connection identity in preflight mode", () => {
    expect(source).toContain('error: "database_check_failed"');
    expect(source).not.toContain("console.log");
    expect(source).not.toContain("console.error");
  });
});
