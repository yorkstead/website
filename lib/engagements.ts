export type EngagementId =
  | "workflow-diagnostic"
  | "workflow-audit"
  | "workflow-sprint"
  | "department-system"
  | "custom-operations-system";

export type Engagement = {
  id: EngagementId;
  title: string;
  priceLabel: string;
  summary: string;
  timing: string;
  includes: readonly string[];
  cta: { label: string; href: string };
};

export const engagements = [
  {
    id: "workflow-diagnostic",
    title: "Workflow Audit",
    priceLabel: "$350",
    summary: "Spend a few hours in the business finding where information originates, gets re-entered, stalls, or lives in undocumented spreadsheets.",
    timing: "About 48 hours after agreed observation and required inputs are complete",
    includes: [
      "Uncovers bottlenecks, paper processes, duplicate software, and single-employee silos",
      "Operations Systems Blueprint: current-state map & problems ranked by impact",
      "Current systems, evidence-backed diagnosis, proposed fix and acceptance requirements",
      "Written findings and proposed contract; $350 credited against implementation signing payment",
    ],
    cta: { label: "Book a diagnostic", href: "/workflow-audit#audit-intake" },
  },
  {
    id: "workflow-sprint",
    title: "Workflow Sprint",
    priceLabel: "$3,500–$7,500",
    summary: "Solve one annoying operational problem completely. Give me one process everybody hates—I'll fix it.",
    timing: "Delivery timing confirmed after the audit",
    includes: [
      "One focused workflow taken from friction to a reliable, usable result",
      "Examples: digital production board, release processor, inventory tracker, barcode/QR flow, shipping dashboard, QC signoff, scheduling system",
      "Focused implementation, team review, documentation, and handoff",
    ],
    cta: { label: "Scope a workflow sprint", href: "/?engagement=workflow-sprint#contact" },
  },
  {
    id: "department-system",
    title: "Department System",
    priceLabel: "$8,000–$20,000",
    summary: "Replace an entire functional chunk of your operation with connected records, roles, and status visibility.",
    timing: "Delivery timing confirmed after the audit",
    includes: [
      "Production Control: quote/release → document generation → scheduling → shop floor → live status",
      "Inventory Control: receiving → locations → consumption → shortages → reorder points → purchasing",
      "Shipping & Logistics: finished goods → palletization → load planning → QC → carrier",
      "Shared visibility, team training, validation, and staged rollout",
    ],
    cta: { label: "Scope a department system", href: "/?engagement=department-system#contact" },
  },
  {
    id: "custom-operations-system",
    title: "Company Operations System",
    priceLabel: "$25,000–$75,000+",
    summary: "Your company's modular operating system containing only what your business needs—without ERP bloat or per-seat fees.",
    timing: "50% at signing and 50% after written acceptance and handoff",
    includes: [
      "Modular capabilities: Command Center, Jobs, Production, Inventory, Scheduling, QC, Shipping, Documents, Reporting, Customer Portal",
      "50% at signing; 50% after agreed acceptance tests and handoff review",
      "Ownership of agreed custom assets, documented operation and documented handoff with optional client-appointed independent review",
    ],
    cta: { label: "Discuss an operations system", href: "/?engagement=custom-operations-system#contact" },
  },
] as const satisfies readonly Engagement[];

export type CareTier = {
  name: string;
  monthlyPrice: string;
  summary: string;
  includes: readonly string[];
};

export const careTiers = [
  {
    name: "Optional Concierge",
    monthlyPrice: "$149/mo optional",
    summary: "Questions, troubleshooting triage and scheduled health checks. Changes are quoted separately.",
    includes: [
      "Support scope, contact hours and response target set in writing",
      "New development, hardware and provider charges quoted separately",
      "Self-maintain or choose another provider without losing purchased rights",
    ],
  },
] as const satisfies readonly CareTier[];

export type SpecializedService = {
  title: string;
  priceLabel: string;
  summary: string;
  detail: string;
};

export const specializedServices = [
  {
    title: "ERP Escape & Software Consolidation",
    priceLabel: "$2,500 diagnostic · $10K–$50K implementation",
    summary: "Eliminate software bloat and connect the tools you already rely on.",
    detail: "Keep QuickBooks, CAD/CAM, payroll, and the tools that work. Eliminate the 5 disconnected SaaS tools and spreadsheets, bridging the gaps with an owned system.",
  },
  {
    title: "Operations Automation",
    priceLabel: "$2,500–$10,000",
    summary: "High-ROI automation priced against eliminated labor and errors.",
    detail: "Automate repetitive data handoffs (e.g., customer emails drawing ZIP → system parses, validates, creates folders, updates production, and alerts the shop).",
  },
  {
    title: "Workflow Rescue",
    priceLabel: "$1,500–$5,000",
    summary: "Fast, targeted simplification for smaller businesses.",
    detail: "Understand the bottleneck, simplify the process, automate 2–3 key steps, build a live dashboard, kill an unwieldy spreadsheet, and document the flow.",
  },
] as const satisfies readonly SpecializedService[];

export const milestoneSchedule = [
  { milestone: "Signing and kickoff", percentage: "50%", detail: "Agreed scope, price, acceptance tests and ownership schedule" },
  { milestone: "Acceptance and handoff", percentage: "50%", detail: "Written acceptance, documented operation and documented handoff; independent review is encouraged and client-funded" },
] as const;

export const engagementPlanningNote =
  "These are planning ranges, not automatic quotes. Final scope, price, timing, integrations, migration, and support are confirmed before work begins. Start with a $350 workflow audit. Implementation uses 50% at signing and 50% after written acceptance and handoff. Custom assets transfer after full payment; provider costs and optional support are separate.";

export const workflowAuditEngagement = engagements[0];

export function getEngagement(id: string | null | undefined): Engagement | null {
  if (!id) return null;
  if (id === "workflow-audit") return engagements[0];
  return engagements.find((engagement) => engagement.id === id) ?? null;
}
