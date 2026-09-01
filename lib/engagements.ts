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
    title: "Workflow Diagnostic",
    priceLabel: "$750–$1,500",
    summary: "Spend a few hours in the business finding where information originates, gets re-entered, stalls, or lives in undocumented spreadsheets.",
    timing: "Focused investigation and Operations Systems Blueprint",
    includes: [
      "Uncovers bottlenecks, paper processes, duplicate software, and single-employee silos",
      "Operations Systems Blueprint: current-state map & problems ranked by impact",
      "Proposed architecture, estimated build cost, and recommended sequence",
      "100% credited toward your project when hired within 30 days",
    ],
    cta: { label: "Book a diagnostic", href: "/workflow-audit#audit-intake" },
  },
  {
    id: "workflow-sprint",
    title: "Workflow Sprint",
    priceLabel: "$3,500–$7,500",
    summary: "Solve one annoying operational problem completely. Give me one process everybody hates—I'll fix it.",
    timing: "Approximately 1–2 weeks",
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
    timing: "Multi-week staged delivery",
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
    timing: "Phased milestone delivery (30/30/30/10)",
    includes: [
      "Modular capabilities: Command Center, Jobs, Production, Inventory, Scheduling, QC, Shipping, Documents, Reporting, Customer Portal",
      "Protected payment structure: 30% start, 30% prototype, 30% deployment, 10% after acceptance",
      "Full source code ownership, zero vendor lock-in, and documented architecture",
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
    name: "Care",
    monthlyPrice: "$350/mo",
    summary: "Hosting oversight, backups, and security/dependency maintenance.",
    includes: [
      "Cloud hosting management & monitoring",
      "Automated daily backups & restore verification",
      "Security updates and dependency patching",
    ],
  },
  {
    name: "Operations",
    monthlyPrice: "$750/mo",
    summary: "Care tier plus minor changes, direct team support, and monthly system review.",
    includes: [
      "All Care features included",
      "Direct operator & management support",
      "Minor workflow adjustments & continuous tweaks",
      "Monthly system review & health check",
    ],
  },
  {
    name: "Partner",
    monthlyPrice: "$1,500–$3,000/mo",
    summary: "Continuous improvement, automation, reporting, and dedicated development allocation.",
    includes: [
      "All Operations features included",
      "Ongoing feature development & new automations",
      "Advanced reporting & operational metric dashboards",
      "Priority roadmap & quarterly architecture reviews",
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
  { milestone: "Deposit to start", percentage: "30%", detail: "Architecture alignment, initial environment, and kickoff" },
  { milestone: "Working prototype", percentage: "30%", detail: "Core workflow interactive demo validated with real data" },
  { milestone: "Production deployment", percentage: "30%", detail: "Team onboarding, system cutover, and live operations" },
  { milestone: "Final acceptance", percentage: "10%", detail: "30-day post-launch warranty and signoff" },
] as const;

export const engagementPlanningNote =
  "These are planning ranges, not automatic quotes. Final scope, price, timing, integrations, migration, and support are confirmed before work begins. Diagnostic fee is credited toward build when hired within 30 days.";

export const workflowAuditEngagement = engagements[0];

export function getEngagement(id: string | null | undefined): Engagement | null {
  if (!id) return null;
  if (id === "workflow-audit") return engagements[0];
  return engagements.find((engagement) => engagement.id === id) ?? null;
}
