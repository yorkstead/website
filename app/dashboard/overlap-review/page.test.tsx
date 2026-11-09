import { expect, mock, test } from "bun:test";

let authorized = false;
let reads = 0;
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
mock.module("@/lib/owner-session", () => ({ getOwnerSession: async () => authorized ? { user: { id: "owner" } } : null }));
mock.module("@/lib/overlap-review", () => ({ parseOverlapQuery: (value: unknown) => typeof value === "string" && value.length >= 3 ? value : null, loadOverlapReview: async () => { reads += 1; return { candidates: [], limited: false }; } }));
const { default: Page } = await import("@/app/dashboard/overlap-review/page");

test("unauthorized page redirects before reading private records", async () => {
  authorized = false;
  reads = 0;
  expect(Page({ searchParams: Promise.resolve({ q: "Acme" }) })).rejects.toThrow("redirect:/login?next=/dashboard/overlap-review");
  await Promise.resolve();
  expect(reads).toBe(0);
});

test("authorized page reads only for a valid search", async () => {
  authorized = true;
  reads = 0;
  await Page({ searchParams: Promise.resolve({ q: "ab" }) });
  expect(reads).toBe(0);
  await Page({ searchParams: Promise.resolve({ q: "Acme" }) });
  expect(reads).toBe(1);
});
