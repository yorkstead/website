import { isValidDateKey } from "@/lib/date-time";

export const researchStatuses = ["hypothesis", "researching", "interview_scheduled", "validated", "qualified", "archived"] as const;
export type ResearchStatus = typeof researchStatuses[number];
export const outreachStatuses = ["research_only", "preparing", "permission_requested", "permission_granted", "declined"] as const;
export type OutreachStatus = typeof outreachStatuses[number];
export const evidenceTypes = ["verified_fact", "business_statement", "research_inference", "hypothesis"] as const;
export type EvidenceType = typeof evidenceTypes[number];
export const qualificationCriteria = [
  ["evidence", "Evidence strength"], ["severity", "Operational pain severity"],
  ["frequency", "Problem frequency"], ["impact", "Business impact"],
  ["decisionAccess", "Decision-maker access"], ["willingness", "Willingness to address"],
  ["feasibility", "Technical feasibility"], ["reusability", "Reusability"],
  ["complexity", "Implementation complexity"], ["revenueFit", "Revenue relative to delivery cost"],
] as const;
export type QualificationKey = typeof qualificationCriteria[number][0];
export type Rating = "low" | "medium" | "high" | "unknown";
export type OpportunityQualification = Record<QualificationKey, Rating>;

const maxText = {
  businessName: 200, industry: 100, geographicMarket: 200, workflow: 300,
  suspectedProblem: 5000, currentWorkaround: 3000, likelyFrequency: 500,
  likelySeverity: 500, operationalImpact: 3000, potentialSoftwareApproach: 2000,
  openQuestions: 3000, nextAction: 1000,
} as const;
export type OpportunityInput = { [K in keyof typeof maxText]: string } & {
  observedOn: string; lastVerifiedOn: string; nextActionAt: string; evidenceConfidence: "unknown" | "low" | "medium" | "high";
};

function bounded(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseOpportunityInput(value: unknown): OpportunityInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result = Object.fromEntries(Object.entries(maxText).map(([key, max]) => [key, bounded(input[key], max)])) as Record<keyof typeof maxText, string>;
  const observedOn = bounded(input.observedOn, 10);
  const lastVerifiedOn = bounded(input.lastVerifiedOn, 10);
  const nextActionAt = bounded(input.nextActionAt, 10);
  const evidenceConfidence = bounded(input.evidenceConfidence, 12) || "unknown";
  if (!result.businessName || !result.industry || !isValidDateKey(observedOn) || (lastVerifiedOn && !isValidDateKey(lastVerifiedOn)) || (nextActionAt && !isValidDateKey(nextActionAt))) return null;
  if (!(["unknown", "low", "medium", "high"] as const).includes(evidenceConfidence as OpportunityInput["evidenceConfidence"])) return null;
  if (observedOn && lastVerifiedOn && lastVerifiedOn < observedOn) return null;
  return { ...result, observedOn, lastVerifiedOn, nextActionAt, evidenceConfidence: evidenceConfidence as OpportunityInput["evidenceConfidence"] };
}

export function parseEvidenceInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const evidenceType = bounded(input.evidenceType, 32);
  const summary = bounded(input.summary, 4000);
  const sourceReference = bounded(input.sourceReference, 1000);
  const observedOn = bounded(input.observedOn, 10);
  const ownerNote = bounded(input.ownerNote, 2000);
  if (!(evidenceTypes as readonly string[]).includes(evidenceType) || !summary || !sourceReference || !isValidDateKey(observedOn) || !isSafeSourceReference(sourceReference)) return null;
  return { evidenceType: evidenceType as EvidenceType, summary, sourceReference, observedOn, ownerNote };
}

export function isSafeSourceReference(value: string) {
  if (/\p{Cc}/u.test(value) || value.length > 1000) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  if (value.startsWith("/")) {
    try { return new URL(value, "https://yorkstead.com").origin === "https://yorkstead.com"; }
    catch { return false; }
  }
  if (!/^https:\/\//i.test(value)) return !/^[a-z][a-z\d+.-]*:/i.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function parseQualification(value: unknown): OpportunityQualification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const allowed: readonly string[] = ["low", "medium", "high", "unknown"];
  const result = Object.fromEntries(qualificationCriteria.map(([key]) => [key, source[key]])) as Record<QualificationKey, unknown>;
  if (qualificationCriteria.some(([key]) => !allowed.includes(String(result[key])))) return null;
  return result as OpportunityQualification;
}

export function emptyQualification(): OpportunityQualification {
  return Object.fromEntries(qualificationCriteria.map(([key]) => [key, "unknown"])) as OpportunityQualification;
}

export function assessQualification(value: OpportunityQualification) {
  const unknowns: string[] = [];
  const strengths: string[] = [];
  let score = 0;
  for (const [key, label] of qualificationCriteria) {
    const rating = value[key];
    if (rating === "unknown") {
      unknowns.push(label);
      continue;
    }
    const rank = rating === "low" ? 1 : rating === "medium" ? 2 : 3;
    score += key === "complexity" ? 4 - rank : rank;
    if ((key === "complexity" && rating === "low") || (key !== "complexity" && rating === "high")) strengths.push(label);
  }
  const answered = qualificationCriteria.length - unknowns.length;
  return { score: unknowns.length === 0 ? score : null, answered, total: qualificationCriteria.length, complete: unknowns.length === 0, strengths, unknowns };
}

export function isAllowedResearchTransition(from: ResearchStatus, to: ResearchStatus) {
  const allowed: Record<ResearchStatus, readonly ResearchStatus[]> = {
    hypothesis: ["researching", "interview_scheduled", "archived"],
    researching: ["hypothesis", "interview_scheduled", "validated", "archived"],
    interview_scheduled: ["researching", "validated", "archived"],
    validated: ["researching", "qualified", "archived"],
    qualified: ["validated", "archived"],
    archived: ["researching"],
  };
  return from === to || allowed[from].includes(to);
}

export function normalizeBusinessName(value: string) {
  return value.normalize("NFKD").toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function buildOpportunityDraft(opportunity: { businessName: string; workflow: string; suspectedProblem: string; evidence: Array<{ evidenceType: EvidenceType; summary: string }> }) {
  const supported = opportunity.evidence.filter((item) => item.evidenceType === "business_statement" || item.evidenceType === "verified_fact");
  if (!supported.length) return `I am researching how ${opportunity.businessName} handles ${opportunity.workflow || "this workflow"}. Would you be open to discussing how the process works today?`;
  const observations = supported.map((item) => item.summary).join(" ");
  return `I am researching how ${opportunity.businessName} handles ${opportunity.workflow || "this workflow"}. I recorded: ${observations} Would you be open to correcting my understanding of the process?`;
}
