import { expect, mock, test } from "bun:test";

let crmSql = "";
let crmParams: unknown[] = [];
mock.module("@/lib/marketing-storage", () => ({ getMarketingWorkspace: async () => ({ workspace: { prospects: Array.from({ length: 55 }, (_, i) => ({ id: `m${i}`, company: "Acme Labs", contactName: "", email: "", crmLeadId: null })) } }) }));
mock.module("@/lib/opportunity-discovery-store", () => ({ opportunityStore: { list: async () => ({ opportunities: [{ id: "research", businessName: "Acme Labs", crmLeadId: null }], pagination: { hasNext: false } }) } }));
mock.module("@/lib/contact-inquiries", () => ({ contactDatabase: async () => ({ query: async (sql: string, params: unknown[]) => { crmSql = sql; crmParams = params; return []; } }) }));
const { loadOverlapReview } = await import("@/lib/overlap-review");

test("bounds all source reads and marks incomplete results without writing records", async () => {
  const result = await loadOverlapReview("Acme");
  expect(result.limited).toBe(true);
  expect(result.candidates[0]?.records.filter((item) => item.source === "Marketing")).toHaveLength(50);
  expect(crmSql).toContain("LIMIT 51");
  expect(crmSql).toContain("inquiry_retirements");
  expect(crmParams).toEqual(["%Acme%"]);
  expect(crmSql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
});
