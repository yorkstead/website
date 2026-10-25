import { describe, expect, test } from "bun:test";
import { findExactCrmOpportunity } from "@/lib/client-linkage";

describe("read-only CRM linkage", () => {
  const lead = { name: "Morgan Example", company: "Example Workshop" };

  test("links a single exact company match", () => {
    const result = findExactCrmOpportunity(lead, [{ opportunity_id: "opp-1", company: " example workshop ", title: "Website", stage: "won" }]);
    expect(result.status).toBe("linked");
    if (result.status === "linked") expect(result.opportunity.opportunityId).toBe("opp-1");
  });

  test("does not use a person's name as a company match", () => {
    expect(findExactCrmOpportunity({ name: "Morgan Example", company: null }, [{ opportunity_id: "opp-1", company: "Morgan Example", title: "Website", stage: "won" }])).toEqual({ status: "no_match" });
  });

  test("does not infer a fuzzy or ambiguous match", () => {
    expect(findExactCrmOpportunity(lead, [{ opportunity_id: "opp-1", company: "Example Workshop LLC", title: "Website", stage: "won" }])).toEqual({ status: "no_match" });
    expect(findExactCrmOpportunity(lead, [
      { opportunity_id: "opp-1", company: "Example Workshop", title: "Website", stage: "won" },
      { opportunity_id: "opp-2", company: "Example Workshop", title: "Support", stage: "qualified" },
    ])).toEqual({ status: "ambiguous" });
  });
});
