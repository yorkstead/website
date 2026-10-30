import { describe, expect, test } from "bun:test";
import {
  assessQualification,
  buildOpportunityDraft,
  emptyQualification,
  isAllowedResearchTransition,
  isSafeSourceReference,
  normalizeBusinessName,
  parseEvidenceInput,
  parseOpportunityInput,
  parseQualification,
  qualificationCriteria,
} from "@/lib/opportunity-discovery";

describe("opportunity discovery domain", () => {
  test("keeps an initial idea explicitly unvalidated and dates ordered", () => {
    expect(parseOpportunityInput({ businessName: "A shop", industry: "Manufacturing", observedOn: "2026-10-20", lastVerifiedOn: "2026-10-19" })).toBeNull();
    expect(parseEvidenceInput({ evidenceType: "hypothesis", summary: "Maybe paper re-entry is common", sourceReference: "owner notebook", observedOn: "2026-10-20" })?.evidenceType).toBe("hypothesis");
  });

  test("labels evidence classes without coercing statements or hypotheses", () => {
    for (const evidenceType of ["verified_fact", "business_statement", "research_inference", "hypothesis"] as const) {
      expect(parseEvidenceInput({ evidenceType, summary: "A bounded observation", sourceReference: "https://example.com/research", observedOn: "2026-10-20" })?.evidenceType).toBe(evidenceType);
    }
    expect(parseEvidenceInput({ evidenceType: "confirmed_customer_problem", summary: "x", sourceReference: "source", observedOn: "2026-10-20" })).toBeNull();
  });

  test("allows safe evidence references and rejects script, credential, and network-path URLs", () => {
    expect(isSafeSourceReference("https://example.com/report")).toBe(true);
    expect(isSafeSourceReference("/dashboard/opportunities?id=abc")).toBe(true);
    expect(isSafeSourceReference("javascript:alert(1)")).toBe(false);
    expect(isSafeSourceReference("//example.com/redirect")).toBe(false);
    expect(isSafeSourceReference("https://user:pass@example.com/")).toBe(false);
    expect(isSafeSourceReference("data:text/html,hello")).toBe(false);
  });

  test("does not calculate a comparable score while any criterion is unknown", () => {
    const empty = emptyQualification();
    expect(parseQualification(empty)).toEqual(empty);
    expect(assessQualification(empty)).toMatchObject({ score: null, answered: 0, total: 10, complete: false });
    const complete = Object.fromEntries(qualificationCriteria.map(([key]) => [key, "high"])) as typeof empty;
    expect(assessQualification(complete)).toMatchObject({ score: 28, answered: 10, complete: true });
    expect(parseQualification({ ...complete, feasibility: "unknown-ish" })).toBeNull();
  });

  test("requires a supported path to validation and permits restoring archived research", () => {
    expect(isAllowedResearchTransition("hypothesis", "validated")).toBe(false);
    expect(isAllowedResearchTransition("researching", "validated")).toBe(true);
    expect(isAllowedResearchTransition("archived", "researching")).toBe(true);
  });

  test("normalizes business names and drafts only from recorded evidence", () => {
    expect(normalizeBusinessName("Yorkstead, Systems LLC")).toBe("yorkstead systems llc");
    expect(buildOpportunityDraft({ businessName: "North Plant", workflow: "receiving", suspectedProblem: "", evidence: [{ evidenceType: "hypothesis", summary: "Maybe mismatch rates are high" }] })).not.toContain("mismatch rates are high");
    expect(buildOpportunityDraft({ businessName: "North Plant", workflow: "receiving", suspectedProblem: "", evidence: [{ evidenceType: "business_statement", summary: "Staff reconcile packing slips daily" }] })).toContain("Staff reconcile packing slips daily");
  });
});
