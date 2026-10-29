import { describe, expect, test } from "bun:test";
import { parseLeadQualification, parseProposalInput, parseProposalUpdateInput, proposalStates } from "@/lib/crm-sales";

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

  test("validates proposal edits and allows explicitly clearing the next action and date", () => {
    expect(parseProposalUpdateInput({ leadId: "7", proposalId: "c7c93c25-8d38-4dd9-b45d-541f0fe7b848", engagementType: "system", amount: "7500.25", nextAction: "  Confirm architecture review  ", nextActionAt: "2026-11-05" })).toMatchObject({
      leadId: 7, proposalId: "c7c93c25-8d38-4dd9-b45d-541f0fe7b848", engagementType: "system", amountCents: 750025, nextAction: "Confirm architecture review", nextActionAt: "2026-11-05T12:00:00.000Z",
    });
    expect(parseProposalUpdateInput({ leadId: 7, proposalId: "bad-id", engagementType: "system", amount: "7500", nextAction: "", nextActionAt: "" })).toBeNull();
    expect(parseProposalUpdateInput({ leadId: 7, proposalId: "c7c93c25-8d38-4dd9-b45d-541f0fe7b848", engagementType: "system", amount: "7500", nextAction: "x".repeat(1001), nextActionAt: "" })).toBeNull();
    expect(parseProposalUpdateInput({ leadId: 7, proposalId: "c7c93c25-8d38-4dd9-b45d-541f0fe7b848", engagementType: "system", amount: "7500", nextAction: "", nextActionAt: "" })).toMatchObject({ nextAction: "", nextActionAt: null });
  });
});
