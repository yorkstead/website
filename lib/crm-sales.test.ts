import { describe, expect, test } from "bun:test";
import { parseLeadQualification, parseProposalInput, proposalStates } from "@/lib/crm-sales";

describe("CRM sales input rules", () => {
  test("bounds qualification fields and accepts only supported industry keys", () => {
    expect(parseLeadQualification({ industry: "manufacturing", pain: "x".repeat(3000), companySize: "~40 staff" })?.pain).toHaveLength(2000);
    expect(parseLeadQualification({ industry: "healthcare" })).toBeNull();
    expect(parseLeadQualification({ industry: ["manufacturing"] })).toBeNull();
  });

  test("requires an explicit decimal amount and never reads the budget indication", () => {
    expect(parseProposalInput({ leadId: "7", engagementType: "audit", amount: "350.00", state: "draft", budgetIndication: "$5000+" })).toMatchObject({ leadId: 7, amountCents: 35000, state: "draft" });
    expect(parseProposalInput({ leadId: 7, engagementType: "sprint", amount: "", state: "draft" })).toBeNull();
    expect(parseProposalInput({ leadId: 7, engagementType: "sprint", amount: "0", state: "draft" })).toBeNull();
    expect(parseProposalInput({ leadId: 7, engagementType: "sprint", amount: "1.999", state: "draft" })).toBeNull();
    expect(parseProposalInput({ leadId: 7, engagementType: "system", amount: "5000", state: "pending" })).toBeNull();
    expect(proposalStates).toEqual(["draft", "sent", "accepted", "declined"]);
  });

  test("rejects malformed dates and unsafe proposal amounts", () => {
    expect(parseProposalInput({ leadId: 1, engagementType: "custom", amount: "100.25", state: "sent", nextActionAt: "tomorrow" })).toBeNull();
    expect(parseProposalInput({ leadId: 1, engagementType: "custom", amount: "100.25", state: "sent", nextActionAt: "2026-02-30" })).toBeNull();
    expect(parseProposalInput({ leadId: 1, engagementType: "custom", amount: "1000000000", state: "sent" })).toBeNull();
  });
});
