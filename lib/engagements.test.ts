import { describe, expect, test } from "bun:test";
import {
  buyingModelElements,
  careTiers,
  confirmedNamedSystems,
  engagementPlanningNote,
  engagements,
  getEngagement,
  milestoneSchedule,
  ownershipStatement,
  specializedServices,
  supportOffers,
} from "@/lib/engagements";

describe("public engagement offers and buying model", () => {
  test("keeps the core service ladder offers in one typed catalog with proposal-agreed audit and scoped-proposal terms", () => {
    expect(engagements.map(({ id, priceLabel }) => ({ id, priceLabel }))).toEqual([
      { id: "workflow-diagnostic", priceLabel: "Scope & terms agreed in proposal" },
      { id: "workflow-sprint", priceLabel: "Scoped proposal" },
      { id: "department-system", priceLabel: "Scoped proposal" },
      { id: "custom-operations-system", priceLabel: "Scoped proposal" },
    ]);
    expect(engagementPlanningNote).toContain("Every engagement is scoped to your specific operational requirements");
    expect(engagementPlanningNote).toContain("milestone payments confirmed in writing");
    // Ensure no unconfirmed numeric ranges exist in the planning note or ladder offers
    const serializedOffers = JSON.stringify(engagements);
    expect(serializedOffers).not.toContain("$3,500");
    expect(serializedOffers).not.toContain("$8,000");
    expect(serializedOffers).not.toContain("$25,000");
    expect(serializedOffers).not.toContain("$350");
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

  test("exports confirmed named systems with verified scopes and boundaries", () => {
    const ids = confirmedNamedSystems.map((s) => s.id);
    expect(ids).toEqual(["union-os", "rework-flow", "expanded-warehousing"]);

    // UnionOS
    const unionOS = confirmedNamedSystems.find((s) => s.id === "union-os");
    expect(unionOS?.name).toBe("UnionOS");
    expect(unionOS?.priceLabel).toBe("$7,500");
    expect(unionOS?.priceType).toBe("fixed");
    expect(unionOS?.readinessLabel).toBe("Interactive concept demonstration");
    expect(unionOS?.verifiedScope.length).toBeGreaterThanOrEqual(4);
    expect(unionOS?.boundaries).toContain("Included configuration, implementation, integrations, and handoff are defined in the proposal.");
    expect(unionOS?.boundaries.some((b) => b.includes("cabling"))).toBe(false);

    // Rework Flow
    const reworkFlow = confirmedNamedSystems.find((s) => s.id === "rework-flow");
    expect(reworkFlow?.name).toBe("Rework Flow");
    expect(reworkFlow?.priceLabel).toBe("$7,500");
    expect(reworkFlow?.priceType).toBe("fixed");
    expect(reworkFlow?.readinessLabel).toBe("Working demonstration");
    expect(reworkFlow?.verifiedScope.length).toBeGreaterThanOrEqual(4);
    expect(reworkFlow?.boundaries).toContain("Included configuration, implementation, integrations, and handoff are defined in the proposal.");
    expect(reworkFlow?.boundaries.some((b) => b.includes("deep ERP"))).toBe(false);

    // Expanded Warehousing (scoped proposal, no fixed price)
    const warehousing = confirmedNamedSystems.find((s) => s.id === "expanded-warehousing");
    expect(warehousing?.name).toBe("Expanded Warehousing Systems");
    expect(warehousing?.priceLabel).toBe("Scoped proposal");
    expect(warehousing?.priceType).toBe("scoped");
    expect(warehousing?.readinessLabel).toBe("Demonstration prototype");
    expect(warehousing?.boundaries.some((b) => b.includes("Request a proposal tailored to your operation"))).toBe(true);

    // Privacy invariant: Adorned private ecommerce proposal ($3,000–$4,000) must NEVER appear in public named systems
    const serializedCatalog = JSON.stringify({ confirmedNamedSystems, engagements, specializedServices });
    expect(serializedCatalog.toLowerCase()).not.toContain("adorned");
    expect(serializedCatalog).not.toContain("3,000–$4,000");
    expect(serializedCatalog).not.toContain("$3,000–4,000");
  });

  test("defines the 6 distinct commercial buying model elements with approved commitments", () => {
    expect(buyingModelElements).toHaveLength(6);
    const titles = buyingModelElements.map((item) => item.title);
    expect(titles).toEqual([
      "The System Purchase",
      "Agreed Tailoring",
      "Documented Handoff",
      "Additional Work",
      "Optional Support",
      "Third-Party Costs",
    ]);

    // Item 01 must use the approved narrower commitment:
    const systemPurchase = buyingModelElements.find((item) => item.title === "The System Purchase");
    expect(systemPurchase?.description).toContain("Continued use of the purchased system does not require a Yorkstead support subscription.");
    expect(systemPurchase?.points).toContain("Continued use of the purchased system does not require a Yorkstead support subscription");
    // Ensure no unverified "zero per-seat licensing penalties" claims exist
    const serializedPurchase = JSON.stringify(systemPurchase);
    expect(serializedPurchase).not.toContain("zero per-seat");
    expect(serializedPurchase).not.toContain("per-user licensing penalties");

    // Item 06 must use the approved third-party costs commitment:
    const thirdParty = buyingModelElements.find((item) => item.title === "Third-Party Costs");
    expect(thirdParty?.description).toBe(
      "Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation."
    );

    buyingModelElements.forEach((item) => {
      expect(item.description.length).toBeGreaterThan(20);
      expect(item.points.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("exports the verbatim approved ownership statement", () => {
    const expectedOwnership =
      "Continued use of your purchased system does not require a Yorkstead support subscription. Your proposal defines the software and documentation delivered, source access, usage and modification rights, and any third-party dependencies. You can manage ongoing maintenance internally or appoint another provider, subject to those terms.";
    expect(ownershipStatement).toBe(expectedOwnership);
  });

  test("defines support retainers and milestones without unconfirmed numeric commitments", () => {
    // Support offers should not have unconfirmed monthly prices
    supportOffers.forEach((offer) => {
      expect(offer.availability).toContain("agreed in proposal");
      expect(offer.availability).not.toContain("$149");
      expect(offer.availability).not.toContain("$350");
    });

    // Care tiers should match support offers
    expect(careTiers.map((t) => t.name)).toEqual(["Optional Support Retainer"]);

    // Milestone schedule should have milestones without unapproved percentage splits (no 50/50, 30/30/30/10)
    expect(milestoneSchedule.length).toBeGreaterThanOrEqual(2);
    const serializedMilestones = JSON.stringify(milestoneSchedule);
    expect(serializedMilestones).not.toContain("50%");
    expect(serializedMilestones).not.toContain("30%");
    expect(serializedMilestones).not.toContain("10%");

    // Specialized services - all proposal-based
    expect(specializedServices.length).toBe(3);
    specializedServices.forEach((s) => {
      expect(s.priceLabel).toContain("confirmed in proposal");
      expect(s.priceLabel).not.toContain("$");
    });
  });
});
