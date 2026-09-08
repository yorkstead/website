import type { CaseStudy } from "./case-studies";

export const reworkCaseStudy: CaseStudy = {
  slug: "rework-flow", number: "06", status: "Working prototype", title: "Rework Flow",
  kicker: "Flagship workflow case study", icon: "layers",
  summary: "A freight exception should not become an office mystery. Rework Flow connects the arrival promise, dock work, evidence, and invoice through one load record.",
  signal: "The next person receives the work and the reason behind it.",
  industries: ["Cross-docking", "Freight rework", "Warehousing", "Exception handling"],
  intendedFor: "Dispatchers, dock operators, and office teams whose work crosses physical and administrative handoffs.",
  problem: "A shifted load arrives with urgency. Dispatch needs capacity, the dock needs an accurate scope, and billing needs proof of what happened. When each role keeps its own notes, the office must reconstruct the job after the driver leaves.",
  previousWorkflow: "Phone request → separate bay note → material tally → disconnected photos → signature chase → manually reconstructed invoice.",
  solution: "Keep the reservation, actual material counts, before-and-after evidence, driver acknowledgment, and calculated charges on a single job. Make unresolved handoffs visible before billing.",
  capabilities: ["Timed bay reservation", "Actual material and labor counts", "Before-and-after evidence", "Driver sign-off checkpoint", "Itemized demo invoice", "Resettable exception scenarios"],
  technologies: ["Next.js", "TypeScript", "Pure workflow model", "Browser-local sandbox"],
  outcomeLabel: "Intended outcome",
  outcome: "Intended outcomes are a clearer arrival promise, visible differences between requested and actual work, and a billing handoff that carries its supporting record. The sandbox demonstrates these behaviors; time saved, dispute reduction, revenue recovery, and customer acceptance have not been measured.",
  limitations: "This public prototype uses the fictional Juniper Freight Lab, synthetic people and loads, illustrated evidence, and simulated sign-off. It is a focused workflow simulation, not the complete client application. No live payments, accounting transmissions, camera capture, GPS evidence, or multi-user synchronization are connected.",
  applications: [
    { title: "Dispatch to dock", description: "Carry the arrival promise and expected scope into the operator's job." },
    { title: "Dock to office", description: "Deliver counts, condition evidence, and sign-off with the completed work." },
    { title: "Exception review", description: "Expose expired holds, count differences, damage, and missing sign-off before the next handoff." },
  ],
  paths: [
    { label: "Guided Walkthrough", description: "Follow the normal load, then explore the exceptions.", href: "https://ops.yorkstead.com/rework?mode=guided", external: true },
    { label: "Open Sandbox", description: "Choose a scenario and change the practice job yourself.", href: "https://ops.yorkstead.com/rework", external: true },
    { label: "Architecture", description: "See the workflow model and public-demo boundary.", href: "/work/rework-flow#architecture" },
  ],
  media: [],
  cta: { label: "Discuss your handoffs", href: "/workflow-audit#audit-intake" },
  workflowStory: {
    observation: "The useful unit is the load, not the screen. The inspected implementation already connected bay reservations, material counts, condition evidence, and billing. The public demo makes those connections—and the exceptions between them—deliberate and explainable.",
    handoffs: [
      { role: "Driver → Dispatch", before: "A phone promise with a separate bay note.", after: "A timed reservation carrying requested work and arrival context." },
      { role: "Dispatch → Dock", before: "The operator reconstructs the request at the trailer.", after: "One job shows the requested quantity alongside the actual tally." },
      { role: "Dock → Office", before: "Photos, counts, and signatures need to be collected again.", after: "Evidence and sign-off travel with the completed handoff." },
      { role: "Office → Invoice", before: "Charges are typed from scattered notes.", after: "Itemized charges derive from the same material and labor record." },
    ],
    scenarios: [
      { id: "normal", title: "Normal job", description: "Arrival, work, evidence, sign-off, invoice." },
      { id: "quantity-dispute", title: "Quantity dispute", description: "Four requested pallets; six handled. Review the adjustment." },
      { id: "damaged-material", title: "Damaged material", description: "Record two broken runners before work begins." },
      { id: "late-arrival", title: "Late arrival", description: "An expired hold triggers a fresh capacity decision." },
      { id: "signature-refusal", title: "Signature refusal", description: "An unsigned job remains an unresolved office handoff." },
      { id: "completed-invoice", title: "Completed invoice", description: "Trace the total back to the work and its supporting record." },
    ],
    architecture: [
      { title: "Source logic preserved", description: "The client application keeps its branding, routes, storage, and behavior. The demo uses a traceable snapshot of its pure pricing calculation and models its 45-minute bay hold and handoff concepts." },
      { title: "A separate public environment", description: "Juniper Freight Lab runs in page-local memory at ops.yorkstead.com/rework. Reload, scenario selection, reset, or the 30-minute limit restores synthetic fixtures. No customer database or operational API is connected." },
      { title: "Clear teaching extensions", description: "Quantity review and damage acknowledgment are explicit demo checkpoints. Signature refusal demonstrates a blocked handoff; it does not claim a new client approval policy." },
      { title: "Reusable demo structure", description: "A product manifest supplies fictional branding and scenarios. Shared controls provide the banner, reset, guided entry, and explanations; a future 240 Union demo can supply its own workflow model." },
    ],
  },
};
