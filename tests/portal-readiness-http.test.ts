import { expect, test } from "bun:test";
import { createReadinessController } from "@/lib/portal-readiness-http";
import {
  createPortalReadinessService,
  ReadinessConflict,
} from "@/lib/portal-readiness-service";
import { syntheticInspection } from "./fixtures/portal-readiness-synthetic";
const owner = async () => ({ user: { id: "fictional-owner" } }),
  origin = "http://localhost:3106";
const operation = {
  action: "acknowledge",
  expectedRevision: 0,
  contextDigest: "a".repeat(64),
  assessmentDigest: "b".repeat(64),
  confirmed: true,
};
const request = (
  body: unknown = operation,
  headers: Record<string, string> = {},
) =>
  new Request(origin + "/api/portal-readiness", {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
function setup(verifyOwner = owner) {
  let calls = 0;
  const c = createReadinessController({
    verifyOwner,
    origin,
    service: {
      inspect: async () => {
        calls++;
        return {} as never;
      },
      mutate: async () => {
        calls++;
      },
    },
  });
  return { c, calls: () => calls };
}
test("readiness owner checks deny API/service before database access", async () => {
  const s = setup(async () => null as never);
  expect((await s.c(request())).status).toBe(401);
  expect(s.calls()).toBe(0);
  const pool = {
    connect: async () => {
      throw new Error("must not connect");
    },
  };
  await expect(
    createPortalReadinessService(
      pool,
      async () => syntheticInspection(),
      async () => null,
      true,
    ).inspect(new Headers()),
  ).rejects.toThrow("unavailable");
  await expect(
    createPortalReadinessService(
      pool,
      async () => syntheticInspection(),
      owner,
    ).mutate(new Headers(), operation),
  ).rejects.toThrow("unavailable");
});
test("no actor/status/evidence/feature injection, technical attestation or activation schema", async () => {
  for (const body of [
    { ...operation, actor: "forged" },
    { ...operation, status: "passed" },
    { ...operation, evidence: { password: "secret" } },
    { ...operation, action: "activate" },
    { ...operation, enabled: true },
    { ...operation, confirmed: false },
    { ...operation, action: "attest", requirementId: "production.secrets" },
  ]) {
    const s = setup();
    expect((await s.c(request(body))).status).toBe(400);
    expect(s.calls()).toBe(0);
  }
});
test("configured same-origin, JSON and bounded stream enforced with private errors", async () => {
  for (const headers of [
    { origin: "https://evil.test" },
    { "sec-fetch-site": "cross-site" },
    { "content-type": "text/plain" },
  ] as Record<string, string>[]) {
    const s = setup();
    expect((await s.c(request(operation, headers))).status).toBe(403);
    expect(s.calls()).toBe(0);
  }
  const s = setup();
  expect((await s.c(request({ payload: "x".repeat(5000) }))).status).toBe(413);
  for (const response of [
    await s.c(request()),
    await s.c(request({ action: "invalid" })),
  ]) {
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  }
});
test("unknown/duplicate selectors denied, conflicts require refresh and internals remain generic", async () => {
  for (const query of [
    "page=0&page=1",
    "tenantId=forged",
    "actor=owner",
    "page=-1",
  ])
    expect(
      (await setup().c(new Request(origin + "/api/portal-readiness?" + query)))
        .status,
    ).toBe(400);
  const c = createReadinessController({
    verifyOwner: owner,
    origin,
    service: {
      inspect: async () => {
        throw new Error("postgresql://password:private@secret.test");
      },
      mutate: async () => {
        throw new ReadinessConflict();
      },
    },
  });
  expect((await c(request())).status).toBe(409);
  const response = await c(new Request(origin + "/api/portal-readiness"));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("postgresql");
});
