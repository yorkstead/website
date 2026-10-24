import { describe, expect, test } from "bun:test";
import { createClientAccessController } from "@/lib/client-access-http";
import {
  createClientAccessAdminService,
  ClientAccessConflict,
} from "@/lib/client-access-admin";
import { clientAccessDisposableEnabled } from "@/lib/client-access-schema";
const owner = async () => ({ user: { id: "fictional-access-owner" } });
const origin = "http://localhost:3104";
const operation = {
  action: "revokeGrant",
  tenantId: "fictional",
  projectId: "project",
  identityId: "identity",
  expectedRevision: 1,
  confirmed: true,
};
function setup(verifyOwner = owner) {
  let calls = 0;
  const controller = createClientAccessController({
    verifyOwner,
    origin,
    service: {
      inspect: async () => {
        calls++;
        return {
          writesEnabled: false,
          organizationPage: 0,
          organizationsMore: false,
          organizations: [],
          selected: null,
        };
      },
      mutate: async () => {
        calls++;
      },
    },
  });
  return { controller, calls: () => calls };
}
const request = (
  body: unknown = operation,
  headers: Record<string, string> = {},
) =>
  new Request(`${origin}/api/client-access`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
describe("Client Access HTTP boundary", () => {
  test("authentication first; no data service for absent owner", async () => {
    const s = setup(async () => null as never);
    expect((await s.controller(request())).status).toBe(401);
    expect(s.calls()).toBe(0);
  });
  test("strict operation schemas deny authority injection, escalation and absent confirmation", async () => {
    for (const body of [
      { ...operation, actor: "forged" },
      { ...operation, role: "owner" },
      { ...operation, confirmed: false },
      { ...operation, expectedRevision: 0 },
      { ...operation, action: "issue" },
      { ...operation, action: "reactivate" },
      { ...operation, permission: "admin" },
    ]) {
      const s = setup();
      expect((await s.controller(request(body))).status).toBe(400);
      expect(s.calls()).toBe(0);
    }
  });
  test("CSRF, cross-site, content type and duplicate/unknown selectors denied", async () => {
    for (const headers of [
      { origin: "https://evil.test" },
      { "sec-fetch-site": "cross-site" },
      { "content-type": "text/plain" },
    ] as Record<string, string>[])
      expect(
        (await setup().controller(request(operation, headers))).status,
      ).toBe(403);
    for (const query of [
      "tenantId=a&tenantId=b",
      "role=owner",
      "page=-1",
      "page=10001",
    ])
      expect(
        (
          await setup().controller(
            new Request(`${origin}/api/client-access?${query}`),
          )
        ).status,
      ).toBe(400);
  });
  test("bounded JSON, generic errors and no-store controls on success/failure", async () => {
    const s = setup();
    expect(
      (await s.controller(request({ payload: "x".repeat(9000) }))).status,
    ).toBe(413);
    for (const r of [
      await s.controller(request()),
      await s.controller(request({ action: "invalid" })),
    ]) {
      expect(r.headers.get("cache-control")).toContain("no-store");
      expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    }
    expect(s.calls()).toBe(1);
  });
  test("stale conflicts remain generic and identify need to review", async () => {
    const c = createClientAccessController({
      origin,
      verifyOwner: owner,
      service: {
        ...setupService(),
        mutate: async () => {
          throw new ClientAccessConflict();
        },
      },
    });
    expect((await c(request())).status).toBe(409);
  });
  test("service denies nonowner and readonly mutations before connecting", async () => {
    const pool = {
      connect: async () => {
        throw new Error("must not connect");
      },
    };
    await expect(
      createClientAccessAdminService(pool, async () => null, true).inspect(
        new Headers(),
      ),
    ).rejects.toThrow("unavailable");
    await expect(
      createClientAccessAdminService(pool, owner).mutate(
        new Headers(),
        operation,
      ),
    ).rejects.toThrow("unavailable");
  });
  test("disposable gate cannot enable production or remote database writes", () => {
    const env = {
      NODE_ENV: "development" as const,
      CLIENT_ACCESS_DISPOSABLE: "enabled",
      DATABASE_URL: "postgresql://localhost/access_test",
      TEST_DATABASE_URL: "postgresql://localhost/access_test",
    };
    expect(
      clientAccessDisposableEnabled({ ...env, NODE_ENV: "development" }),
    ).toBe(true);
    for (const suffix of [
      "?host=remote.example.test",
      "?%68ost=remote.example.test",
      "?host=localhost&host=remote.example.test",
      "?hostaddr=192.0.2.1",
      "?database=production",
      "?dbname=production",
      "?port=6432",
      "?sslmode=require",
      "#host=remote.example.test",
    ]) {
      const databaseURL = env.DATABASE_URL + suffix;
      expect(
        clientAccessDisposableEnabled({
          ...env,
          DATABASE_URL: databaseURL,
          TEST_DATABASE_URL: databaseURL,
        }),
      ).toBe(false);
    }

    expect(
      clientAccessDisposableEnabled({ ...env, NODE_ENV: "production" }),
    ).toBe(false);
    expect(
      clientAccessDisposableEnabled({
        ...env,
        DATABASE_URL: "postgresql://remote.test/access_test",
        TEST_DATABASE_URL: "postgresql://remote.test/access_test",
      }),
    ).toBe(false);
    expect(
      clientAccessDisposableEnabled({
        ...env,
        TEST_DATABASE_URL: "postgresql://localhost/other_test",
      }),
    ).toBe(false);
    expect(
      clientAccessDisposableEnabled({
        ...env,
        CLIENT_ACCESS_DISPOSABLE: undefined,
      }),
    ).toBe(false);
  });
});
function setupService() {
  return {
    inspect: async () => ({
      writesEnabled: false,
      organizationPage: 0,
      organizationsMore: false,
      organizations: [],
      selected: null,
    }),
  };
}
