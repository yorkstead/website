import type { PublicDemoManifest, PublicDemoScenario } from "../types";

export const reworkManifest: PublicDemoManifest = {
  id: "yorkstead-public-rework-v1",
  company: "Juniper Freight Lab",
  product: "Rework Flow",
  description: "A fictional cross-dock operation. Follow one load from arrival to an explainable invoice.",
  caseStudyUrl: "https://yorkstead.com/work/rework-flow",
  resetAfterMs: 30 * 60 * 1000,
};

export const scenarios = [
  { id: "normal", title: "Normal job", summary: "Four shifted pallets arrive inside the bay hold. Document the work and close the handoff.", why: "Intake, material counts, evidence, and sign-off belong to the same job so the office can bill without reconstructing the dock shift." },
  { id: "quantity-dispute", title: "Quantity dispute", summary: "Intake says four pallets; the dock counts six. Resolve the difference before closing the job.", why: "Keep the original request and actual count visible together. An acknowledged adjustment is more useful than silently overwriting the intake." },
  { id: "damaged-material", title: "Damaged material", summary: "Two pallet runners are damaged on arrival. Record the condition before work starts.", why: "Before and after evidence separates arrival condition from work performed. The demo adds an explicit condition review checkpoint." },
  { id: "late-arrival", title: "Late arrival", summary: "The driver arrives after the 45-minute hold. Recheck availability before assigning a bay.", why: "An expired promise should not occupy the dock indefinitely. A new availability decision keeps dispatch and the operator aligned." },
  { id: "signature-refusal", title: "Signature refusal", summary: "Work is ready, but the driver refuses to sign. See why the office handoff stays blocked.", why: "A missing signature is an unresolved handoff, not a completed certificate. The demo records refusal and allows a simulated later return to sign." },
  { id: "completed-invoice", title: "Completed invoice", summary: "Inspect a finished job with itemized costs and the evidence behind each handoff.", why: "Billing should inherit operational facts: actual materials, labor, evidence, and sign-off. Totals are derived from quantities rather than typed over." },
] as const satisfies readonly PublicDemoScenario[];

export type ScenarioId = (typeof scenarios)[number]["id"];
export function getScenario(id: unknown) {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}
