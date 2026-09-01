import { describe, expect, test } from "bun:test";
import { careTiers, engagementPlanningNote, engagements, getEngagement, milestoneSchedule, specializedServices } from "@/lib/engagements";

describe("public engagement offers", () => {
  test("keeps the core service ladder offers in one typed catalog", () => {
    expect(engagements.map(({ id, priceLabel }) => ({ id, priceLabel }))).toEqual([
      { id: "workflow-diagnostic", priceLabel: "$750–$1,500" },
      { id: "workflow-sprint", priceLabel: "$3,500–$7,500" },
      { id: "department-system", priceLabel: "$8,000–$20,000" },
      { id: "custom-operations-system", priceLabel: "$25,000–$75,000+" },
    ]);
    expect(engagementPlanningNote).toContain("planning ranges, not automatic quotes");
    expect(engagementPlanningNote).toContain("credited toward build");
  });

  test("connects every offer to the appropriate qualification path", () => {
    expect(getEngagement("workflow-diagnostic")?.cta.href).toBe("/workflow-audit#audit-intake");
    expect(getEngagement("workflow-audit")?.cta.href).toBe("/workflow-audit#audit-intake");
    expect(getEngagement("workflow-sprint")?.cta.href).toBe("/?engagement=workflow-sprint#contact");
    expect(getEngagement("department-system")?.cta.href).toBe("/?engagement=department-system#contact");
    expect(getEngagement("custom-operations-system")?.cta.href).toBe("/?engagement=custom-operations-system#contact");
  });

  test("only accepts known engagement preselection values", () => {
    expect(getEngagement("workflow-sprint")?.title).toBe("Workflow Sprint");
    expect(getEngagement("department-system")?.title).toBe("Department System");
    expect(getEngagement("something-made-up")).toBeNull();
    expect(getEngagement(null)).toBeNull();
  });

  test("defines recurring care tiers and specialized services", () => {
    expect(careTiers.map((tier) => tier.name)).toEqual(["Care", "Operations", "Partner"]);
    expect(specializedServices.length).toBe(3);
    expect(milestoneSchedule.length).toBe(4);
  });
});

