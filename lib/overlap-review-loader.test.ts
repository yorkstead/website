import { expect, test } from "bun:test";
import { loadOverlapReview } from "@/lib/overlap-review";

test("bounds source results and reports incomplete review without writes", async () => {
  let pattern = "";
  const result = await loadOverlapReview("Acme", {
    marketing: async () => ({ workspace: { campaignStart: "", activities: [], content: [], prospects: Array.from({ length: 55 }, (_, i) => ({ id: `m${i}`, company: "Acme Labs", contactName: "", email: "", crmLeadId: null })) }, updatedAt: null }) as never,
    discovery: async () => ({ opportunities: [{ id: "research", businessName: "Acme Labs", crmLeadId: null }], pagination: { hasNext: false } }) as never,
    crm: async (value) => { pattern = value; return []; },
  });
  expect(result.limited).toBe(true);
  expect(result.candidates[0]?.records.filter((item) => item.source === "Marketing")).toHaveLength(50);
  expect(pattern).toBe("%Acme%");
});
