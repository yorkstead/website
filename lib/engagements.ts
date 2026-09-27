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
    priceLabel: "Scope & terms agreed in proposal",
    summary: "Spend time in the business observing real work: tracing an order from intake to delivery, mapping spreadsheet silos, and identifying where information stalls or gets re-entered.",
    timing: "Delivered on a timeline confirmed in the proposal",
    includes: [
      "Uncovers bottlenecks, paper processes, duplicate tools, and single-employee silos",
      "Operations Systems Blueprint: current-state map and bottlenecks ranked by impact",
      "Evidence-backed architecture recommendation and proposed implementation scope",
      "Scope, deliverables, timeline, and fee confirmed in writing before work begins",
    ],
    cta: { label: "Book a workflow audit", href: "/workflow-audit#audit-intake" },
  },
  {
    id: "workflow-sprint",
    title: "Workflow Sprint",
    priceLabel: "Scoped proposal",
    summary: "Solve one annoying operational problem completely. Take a single broken handoff from friction to a reliable, usable tool.",
    timing: "Timeline and scope confirmed in the proposal",
    includes: [
      "One focused workflow taken from friction to a reliable, usable result",
      "Examples: digital production board, release processor, inventory tracker, barcode/QR flow, shipping dashboard, QC signoff",
      "Focused implementation, team review, documentation, and handoff",
    ],
    cta: { label: "Scope a workflow sprint", href: "/?engagement=workflow-sprint#contact" },
  },
  {
    id: "department-system",
    title: "Department System",
    priceLabel: "Scoped proposal",
    summary: "Replace an entire functional chunk of your operation with connected records, roles, and status visibility.",
    timing: "Milestones and delivery plan confirmed in the proposal",
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
    priceLabel: "Scoped proposal",
    summary: "Your company's modular operating system containing only what your business needs—without traditional ERP bloat.",
    timing: "Phased milestone delivery defined in the proposal",
    includes: [
      "Modular capabilities: Command Center, Jobs, Production, Inventory, Scheduling, QC, Shipping, Documents, Reporting, Customer Portal",
      "Structured milestone payments tied to verified progress and written acceptance",
      "Delivered custom assets, source access, usage rights, and third-party dependencies defined in the proposal",
    ],
    cta: { label: "Discuss an operations system", href: "/?engagement=custom-operations-system#contact" },
  },
] as const satisfies readonly Engagement[];

export type ConfirmedNamedSystem = {
  id: string;
  name: string;
  category: string;
  priceLabel: string;
  priceType: "fixed" | "scoped";
  summary: string;
  verifiedScope: readonly string[];
  boundaries: readonly string[];
  caseStudyHref?: string;
  cta: { label: string; href: string };
};

export const confirmedNamedSystems: readonly ConfirmedNamedSystem[] = [
  {
    id: "union-os",
    name: "UnionOS",
    category: "Hospitality & Restaurant Operations",
    priceLabel: "$7,500",
    priceType: "fixed",
    summary: "A local-first restaurant operating system uniting floor tables, handheld tableside ordering, coursing state machine, kitchen KDS station routing, cellar reserve tracking, 86 board synchronization, and shift closeout.",
    verifiedScope: [
      "Table management and floor layout",
      "Handheld tableside ordering with visual coursing state machine (HOLD, PREP, FIRE, PLATED, BUMPED)",
      "Kitchen KDS pass with station routing and audio chimes",
      "Cellar reserve tracking with cross-terminal 86 synchronization",
      "Shift closeout summary and cash drawer reconciliation",
    ],
    boundaries: [
      "Confirmed purchase price: $7,500.",
      "Included configuration, implementation, integrations, and handoff are defined in the proposal.",
      "Continued use of the purchased system does not require a Yorkstead support subscription; optional maintenance is available.",
      "Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation.",
    ],
    caseStudyHref: "/work/table-os",
    cta: { label: "Inquire about UnionOS", href: "/work/table-os#trial-intake" },
  },
  {
    id: "rework-flow",
    name: "Rework Flow",
    category: "Freight Rework & Exception Management",
    priceLabel: "$7,500",
    priceType: "fixed",
    summary: "Reservation-to-invoice freight rework operating system connecting arrival promises, dock work, condition evidence, and billing into one unified load record.",
    verifiedScope: [
      "Timed bay reservation intake and appointment tracking",
      "Trailer-side material and labor count tracking with mobile controls",
      "Before-and-after photographic condition evidence capture with audit timestamps",
      "Driver sign-off checkpoint on glass before departure",
      "Itemized billing calculation derived directly from recorded work and materials",
    ],
    boundaries: [
      "Confirmed purchase price: $7,500.",
      "Included configuration, implementation, integrations, and handoff are defined in the proposal.",
      "Continued use of the purchased system does not require a Yorkstead support subscription; optional maintenance is available.",
      "Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation.",
    ],
    caseStudyHref: "/work/rework-flow",
    cta: { label: "Inquire about Rework Flow", href: "/workflow-audit#audit-intake" },
  },
  {
    id: "expanded-warehousing",
    name: "Expanded Warehousing Systems",
    category: "Warehousing & Logistics Operations",
    priceLabel: "Scoped proposal",
    priceType: "scoped",
    summary: "Operational warehousing system continuing the rework-flow module into full facility slotting, yard management, freight tracking, and exception governance.",
    verifiedScope: [
      "Facility slotting, high-bay rack storage, rework bays, and floor staging zones (tailored to facility layouts)",
      "Yard trailer detention monitoring and real-time dock door status",
      "Freight inventory, movements, and storage tracking",
      "Exception logging, damage assessments, and customer electronic authorizations",
      "Job lifecycle tracking with 8-point documentation completeness verification",
    ],
    boundaries: [
      "Scoped proposal; no approved fixed price exists.",
      "Warehouse demonstration parameters (such as 60,000 sq ft, 30ft racks, and 6 dock doors) are example facility configurations, not product limits, customer deployment evidence, or standard purchase scope.",
      "Included configuration, implementation, integrations, and handoff are defined in the proposal.",
      "Continued use of the purchased system does not require a Yorkstead support subscription.",
      "Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation.",
    ],
    cta: { label: "Scope a warehousing system", href: "/?engagement=custom-operations-system#contact" },
  },
] as const satisfies readonly ConfirmedNamedSystem[];

export type CommercialItem = {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  points: readonly string[];
};

export const buyingModelElements: readonly CommercialItem[] = [
  {
    number: "01",
    title: "The System Purchase",
    subtitle: "A purchased asset, not a rental",
    description:
      "You purchase the software as an owned system rather than renting user seats. Continued use of the purchased system does not require a Yorkstead support subscription.",
    points: [
      "Delivered custom software and documentation defined in the proposal",
      "Continued use of the purchased system does not require a Yorkstead support subscription",
      "Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation.",
    ],
  },
  {
    number: "02",
    title: "Agreed Tailoring",
    subtitle: "Configured to your operating rules",
    description:
      "We configure reusable foundations and write custom logic to match your specific workflow, screens, roles, and existing software before work begins.",
    points: [
      "Specific screens, data models, and workflow rules agreed in writing",
      "Integrations with existing tools (like QuickBooks or CAD/CAM) defined in the proposal",
      "No bloat: only the capabilities your business actually uses",
    ],
  },
  {
    number: "03",
    title: "Documented Handoff",
    subtitle: "Clear handover so your team can run it",
    description:
      "Every implementation concludes with documented operation, team onboarding, and delivery of agreed custom assets and source access under clear terms.",
    points: [
      "Operating instructions and administration guides provided at handoff",
      "Source access and database architecture transferred per proposal terms",
      "Review by a developer or technical advisor of your choice is welcomed",
    ],
  },
  {
    number: "04",
    title: "Additional Work",
    subtitle: "New features quoted separately",
    description:
      "When your business expands or processes change, new workflows, additional modules, and feature enhancements are scoped and quoted as separate milestone engagements.",
    points: [
      "No surprise billing or creeping retainers",
      "Clear scope, acceptance criteria, and price confirmed before new work starts",
      "You decide when and what to build next",
    ],
  },
  {
    number: "05",
    title: "Optional Support",
    subtitle: "Care when you want it, on your terms",
    description:
      "Software operates in an evolving environment of browser updates, dependencies, and business changes. Optional support retainers are available for triage, troubleshooting, and scheduled health checks—or you can maintain the system in-house or choose another provider.",
    points: [
      "Optional retainers for troubleshooting triage and scheduled health checks",
      "Support scope, contact hours, and response expectations set in the proposal",
      "Continued use never requires an active support subscription",
      "Freedom to manage maintenance internally or hire a third party",
    ],
  },
  {
    number: "06",
    title: "Third-Party Costs",
    subtitle: "Disclosed separately",
    description:
      "Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation.",
    points: [
      "Hosting, database, and domain costs identified up front",
      "Account ownership, billing, and ongoing responsibilities agreed before implementation",
      "No undisclosed provider markups",
    ],
  },
] as const satisfies readonly CommercialItem[];

export type SupportOffer = {
  name: string;
  availability: string;
  summary: string;
  includes: readonly string[];
};

export const supportOffers: readonly SupportOffer[] = [
  {
    name: "Optional Support Retainer",
    availability: "Optional · Scope & terms agreed in proposal",
    summary: "Questions, troubleshooting triage, and scheduled health checks. Changes and new features are quoted separately.",
    includes: [
      "Support scope, contact hours, and response targets confirmed in writing in the proposal",
      "Troubleshooting triage and scheduled system health checks",
      "Continued use does not require an ongoing support contract; you can maintain the system in-house or choose another provider",
    ],
  },
] as const satisfies readonly SupportOffer[];

export type CareTier = {
  name: string;
  monthlyPrice: string;
  summary: string;
  includes: readonly string[];
};

export const careTiers: readonly CareTier[] = supportOffers.map((offer) => ({
  name: offer.name,
  monthlyPrice: offer.availability,
  summary: offer.summary,
  includes: offer.includes,
}));

export type SpecializedService = {
  title: string;
  priceLabel: string;
  summary: string;
  detail: string;
};

export const specializedServices = [
  {
    title: "ERP Escape & Software Consolidation",
    priceLabel: "Scope & pricing confirmed in proposal",
    summary: "Eliminate software bloat and connect the tools you already rely on.",
    detail: "Keep QuickBooks, CAD/CAM, payroll, and the tools that work. Eliminate disconnected SaaS tools and spreadsheets, bridging the gaps with an owned system.",
  },
  {
    title: "Operations Automation",
    priceLabel: "Scope & pricing confirmed in proposal",
    summary: "Targeted workflow automation priced against eliminated manual handoffs and errors.",
    detail: "Automate repetitive data handoffs (e.g., customer emails drawing ZIP → system parses, validates, creates folders, updates production, and alerts the shop).",
  },
  {
    title: "Workflow Rescue",
    priceLabel: "Scope & pricing confirmed in proposal",
    summary: "Fast, targeted simplification for smaller businesses.",
    detail: "Understand the bottleneck, simplify the process, automate 2–3 key steps, build a live dashboard, kill an unwieldy spreadsheet, and document the flow.",
  },
] as const satisfies readonly SpecializedService[];

export const milestoneSchedule = [
  { milestone: "Signing and kickoff", detail: "Agreed scope, acceptance criteria, deliverables, and payment schedule confirmed in writing" },
  { milestone: "Acceptance and handoff", detail: "Written acceptance, delivered assets, documented operation, and handoff review" },
] as const;

export const ownershipStatement =
  "Continued use of your purchased system does not require a Yorkstead support subscription. Your proposal defines the software and documentation delivered, source access, usage and modification rights, and any third-party dependencies. You can manage ongoing maintenance internally or appoint another provider, subject to those terms.";

export const engagementPlanningNote =
  "Every engagement is scoped to your specific operational requirements. Final scope, price, timing, integrations, migration, and support are confirmed in the agreed proposal before work begins. Implementation uses structured milestone payments confirmed in writing. Delivered assets, source access, usage rights, and third-party dependencies are defined in the proposal; provider costs and optional support are separate.";

export const workflowAuditEngagement = engagements[0];

export function getEngagement(id: string | null | undefined): Engagement | null {
  if (!id) return null;
  if (id === "workflow-audit") return engagements[0];
  return engagements.find((engagement) => engagement.id === id) ?? null;
}
