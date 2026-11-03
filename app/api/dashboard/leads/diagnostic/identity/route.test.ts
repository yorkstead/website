import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

let ownerAuthorized = false;
let authenticationLookups = 0;
let applicationDataQueries = 0;
const previousDatabaseUrl = process.env.DATABASE_URL;

mock.module("@/lib/owner-session", () => ({
  getOwnerSession: async () => {
    authenticationLookups += 1;
    return ownerAuthorized ? { user: { email: "owner@example.test" } } : null;
  },
}));

mock.module("@/lib/contact-inquiries", () => ({
  contactDatabase: async () => {
    applicationDataQueries += 1;
    throw new Error("application database access is forbidden in the identity diagnostic test");
  },
}));

const { POST } = await import("@/app/api/dashboard/leads/diagnostic/identity/route");

const expected = { database: "neondb", hostname: "ep-synthetic.aws.neon.tech" };
const configured = "postgresql://synthetic-user:synthetic-password@ep-synthetic.aws.neon.tech/neondb?sslmode=require";
const request = (body: string, options: { contentType?: string; url?: string; contentLength?: string } = {}) => new Request(
  options.url ?? "https://example.test/api/dashboard/leads/diagnostic/identity",
  {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/json",
      ...(options.contentLength === undefined ? {} : { "content-length": options.contentLength }),
    },
    body,
  },
);

beforeAll(() => {
  process.env.DATABASE_URL = configured;
});

afterAll(() => {
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

describe("owner-authenticated database identity route", () => {
  test("rejects an unauthenticated caller before inspecting configuration or body", async () => {
    ownerAuthorized = false;
    const response = await POST(request(JSON.stringify(expected)));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ result: "UNVERIFIED" });
    expect(authenticationLookups).toBeGreaterThan(0);
    expect(applicationDataQueries).toBe(0);
  });

  test("returns only a match result and UTC capture timestamp to the owner", async () => {
    ownerAuthorized = true;
    const response = await POST(request(JSON.stringify(expected)));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ result: "MATCH", capturedAtUtc: expect.any(String) });
    expect(body.capturedAtUtc).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
    expect(JSON.stringify(body)).not.toContain("ep-synthetic");
    expect(JSON.stringify(body)).not.toContain("synthetic-user");
    expect(JSON.stringify(body)).not.toContain("synthetic-password");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(applicationDataQueries).toBe(0);
  });

  test("returns mismatch without exposing either configured or expected target", async () => {
    ownerAuthorized = true;
    const response = await POST(request(JSON.stringify({ ...expected, database: "otherdb" })));
    const body = await response.json();
    expect(body).toEqual({ result: "MISMATCH", capturedAtUtc: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain("otherdb");
    expect(JSON.stringify(body)).not.toContain("ep-synthetic");
    expect(applicationDataQueries).toBe(0);
  });

  test("fails closed for malformed input, query strings, and missing runtime configuration", async () => {
    ownerAuthorized = true;
    const malformed = await POST(request('{"database":"neondb","hostname":"ep-synthetic.aws.neon.tech","hostname":"other.aws.neon.tech"}'));
    expect(await malformed.json()).toMatchObject({ result: "UNVERIFIED" });

    const query = await POST(request(JSON.stringify(expected), { url: "https://example.test/api/dashboard/leads/diagnostic/identity?target=production" }));
    expect(await query.json()).toMatchObject({ result: "UNVERIFIED" });

    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const unconfigured = await POST(request(JSON.stringify(expected)));
    process.env.DATABASE_URL = original;
    expect(await unconfigured.json()).toMatchObject({ result: "UNVERIFIED" });
    expect(applicationDataQueries).toBe(0);
  });

  test("rejects unsupported content types and oversized bodies", async () => {
    ownerAuthorized = true;
    const unsupported = await POST(request(JSON.stringify(expected), { contentType: "text/plain" }));
    expect(unsupported.status).toBe(400);
    expect(await unsupported.json()).toMatchObject({ result: "UNVERIFIED" });

    const oversized = await POST(request("x".repeat(1025)));
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toMatchObject({ result: "UNVERIFIED" });
    expect(applicationDataQueries).toBe(0);
  });

  test("uses private, non-cacheable headers for every diagnostic outcome", async () => {
    ownerAuthorized = false;
    const response = await POST(request(JSON.stringify(expected)));
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("vary")).toBe("Cookie");
  });

  test("diagnostic and comparison code have no application database client or SQL path", async () => {
    const routeSource = await readFile(resolve(import.meta.dir, "route.ts"), "utf8");
    const helperSource = await readFile(resolve(import.meta.dir, "../../../../../../lib/ys-sys-001-database-identity.ts"), "utf8");
    for (const source of [routeSource, helperSource]) {
      expect(source).not.toMatch(/contactDatabase|new\s+Pool|from\s+["']pg["']|neon\(|SELECT\s|\bsql\s*`/i);
    }
    expect(applicationDataQueries).toBe(0);
  });
});
