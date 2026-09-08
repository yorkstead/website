import type { CaseStudy } from "./case-studies";

export const ellwoodStory: NonNullable<CaseStudy["workflowStory"]> = {
  demoUrl: "https://ops.yorkstead.com/ellwood",
  observation: "Experience at a previous job suggested that the difficult part of a revision is not saving a new drawing. It is knowing which instructions people already hold, what work has started, and what decision must travel to the shop. Ellwood explores that problem as a concept; it was not adopted by that employer.",
  handoffs: [
    { role: "Drawing → Release", before: "A new file arrives beside the old instructions.", after: "A candidate revision is visible alongside the current revision." },
    { role: "Release → Review", before: "Someone must remember which work could be affected.", after: "A proposed review records affected panels and the work requiring a decision." },
    { role: "Review → Approval", before: "The shop may not know which revision is authoritative.", after: "Approval makes one revision current and retains the superseded revision." },
    { role: "Approval → Shop", before: "Old identifiers and instructions remain in circulation.", after: "A simulated obsolete scan is blocked; a proposed acknowledgment carries the decision forward." },
  ],
  scenarios: [
    { id: "revision-change", title: "Revision after release", description: "A new fixing detail arrives after revision A reaches the shop. Review affected work and supersede the old instructions." },
    { id: "normal", title: "Normal release", description: "Review a complete drawing package, approve it, and acknowledge the handoff." },
    { id: "missing-drawing", title: "Missing drawing", description: "See why quantities alone are not enough to release work." },
    { id: "blocked-release", title: "Blocked release", description: "Resolve a fictional fixing-detail hold before approval." },
  ],
  architecture: [
    { title: "Grounded in source behavior", description: "The inspected implementation approves revisions, marks earlier revisions superseded, and blocks obsolete identifiers. The sandbox models these behaviors without calling the source application." },
    { title: "Proposed workflow steps", description: "Affected-work review, drawing-readiness gates, hold clarification, and explicit shop-floor acknowledgment are teaching extensions. They are not claimed as completed source integrations or employer policy." },
    { title: "A fictional practice environment", description: "Alder Panel Works uses synthetic panels and a comparison illustration. State stays in this page and resets on reload, scenario selection, manual reset, or after 30 minutes. No operational database, document uploads, or production events are connected." },
    { title: "Reusable public-demo foundation", description: "Rework and Ellwood share sandbox controls, session expiry, explanatory affordances, and scoped presentation styles. Each product owns its scenarios and workflow rules." },
  ],
};
