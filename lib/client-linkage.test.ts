import { describe, expect, test } from "bun:test";
import { findExactCrmOpportunity } from "@/lib/client-linkage";

describe("read-only CRM linkage", () => {
  const lead = { name: "Arlene Beau", company: "Adorned" };

  test("links a single exact company match", () => {
    const result = findExactCrmOpportunity(lead, [{ opportunity_id: "opp-1", company: " adorned ", title: "Website", stage: "won" }]);
    expect(result.status).toBe("linked");
    if (result.status === "linked") expect(result.opportunity.opportunityId).toBe("opp-1");
  });

  test("does not use a person's name as a company match", () => {
    expect(findExactCrmOpportunity({ name: "Arlene Beau", company: null }, [{ opportunity_id: "opp-1", company: "Arlene Beau", title: "Website", stage: "won" }])).toEqual({ status: "no_match" });
  });

  test("does not infer a fuzzy or ambiguous match", () => {
    expect(findExactCrmOpportunity(lead, [{ opportunity_id: "opp-1", company: "Adorned LLC", title: "Website", stage: "won" }])).toEqual({ status: "no_match" });
    expect(findExactCrmOpportunity(lead, [
      { opportunity_id: "opp-1", company: "Adorned", title: "Website", stage: "won" },
      { opportunity_id: "opp-2", company: "Adorned", title: "Support", stage: "qualified" },
    ])).toEqual({ status: "ambiguous" });
  });
});
