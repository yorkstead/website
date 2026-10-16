import { getPublicService, type ServiceSlug } from "@/lib/services";

export const consultationIndustryIds = [
  "manufacturing-fabrication",
  "sign-cnc-custom-production",
  "warehousing-freight-logistics",
  "restaurants-hospitality",
  "contractors-field-service",
  "retail-ecommerce-marketplaces",
  "professional-back-office",
] as const;

export type ConsultationIndustryId = typeof consultationIndustryIds[number];

export const consultationIndustryResponseKey = "industry";

export type ConsultationField = {
  id: string;
  label: string;
  prompt: string;
  kind: "short" | "long" | "select";
  required?: boolean;
  options?: readonly string[];
};

export type ConsultationSection = {
  id: string;
  title: string;
  description: string;
  fields: readonly ConsultationField[];
};

export type ConsultationPlaybook = {
  id: ConsultationIndustryId;
  industry: string;
  serviceSlug: ServiceSlug;
  bestFit: string;
  objective: string;
  entryOffer: string;
  callPlan: readonly string[];
  workflowPatterns: readonly string[];
  evidenceToRequest: readonly string[];
  baselineMeasures: readonly string[];
  cautionSignals: readonly string[];
  sections: readonly ConsultationSection[];
  developmentGate: readonly string[];
};

const commonContextFields = [
  { id: "trigger", label: "Why now?", prompt: "What changed, broke, grew, or became too costly to keep handling the same way?", kind: "long", required: true },
  { id: "decision-makers", label: "Decision makers and operators", prompt: "Who approves the work, who owns the process, and who performs it day to day?", kind: "long", required: true },
  { id: "priority", label: "Business priority", prompt: "How does this compare with the other work competing for time and investment?", kind: "select", required: true, options: ["Immediate operational issue", "This quarter", "Planned improvement", "Early exploration"] },
] as const satisfies readonly ConsultationField[];

const commonOutcomeFields = [
  { id: "desired-outcome", label: "Desired operating outcome", prompt: "What should become easier, faster, more reliable, or less dependent on one person?", kind: "long", required: true },
  { id: "current-baseline", label: "Current baseline", prompt: "Record the best available starting numbers or a clearly labeled qualitative baseline. Do not invent precision.", kind: "long", required: true },
  { id: "success-evidence", label: "Evidence of success", prompt: "What observable behavior or reliable measure would show that the workflow improved?", kind: "long", required: true },
  { id: "first-release", label: "Smallest useful release", prompt: "What is the narrowest version that creates real value without requiring the whole system?", kind: "long", required: true },
] as const satisfies readonly ConsultationField[];

const commonCommercialFields = [
  { id: "recommended-path", label: "Recommended Yorkstead path", prompt: "Choose the smallest commercial step supported by the evidence gathered so far.", kind: "select", required: true, options: ["Workflow Rescue — diagnose one workflow", "Workflow Sprint — fix one bounded handoff", "Department System — connect one function", "Company Operations System — phased modular platform", "Not enough evidence yet"] },
  { id: "path-rationale", label: "Path rationale", prompt: "Why is this the right next step, and what would make a larger or smaller engagement more appropriate?", kind: "long", required: true },
  { id: "ownership-model", label: "Ownership and support fit", prompt: "Confirm that the client understands the system is purchased as an asset, third-party costs are separate, and ongoing Yorkstead support is optional.", kind: "long", required: true },
  { id: "investment-timing", label: "Investment and timing reality", prompt: "What decision date, operating window, budget constraint, or milestone will shape the proposal?", kind: "long" },
] as const satisfies readonly ConsultationField[];

const commonDeliveryFields = [
  { id: "data-owner", label: "System of record and data owner", prompt: "Where does authoritative information live, who maintains it, and how trustworthy is it?", kind: "long", required: true },
  { id: "access-constraints", label: "Access and constraints", prompt: "List vendor access, devices, permissions, compliance needs, network limits, and unavailable integrations.", kind: "long" },
  { id: "review-process", label: "Review and acceptance", prompt: "Who reviews prototypes, how quickly can they respond, and what must be true for written acceptance?", kind: "long", required: true },
  { id: "support-owner", label: "Launch and operating owner", prompt: "Who owns training, data corrections, exceptions, administration, and support after handoff?", kind: "long", required: true },
] as const satisfies readonly ConsultationField[];

function standardSections(
  workflowTitle: string,
  workflowDescription: string,
  workflowFields: readonly ConsultationField[],
  riskTitle: string,
  riskDescription: string,
  riskFields: readonly ConsultationField[],
): readonly ConsultationSection[] {
  return [
    { id: "context", title: "Operating context", description: "Establish the business reason, operating boundary, and people responsible.", fields: commonContextFields },
    { id: "workflow", title: workflowTitle, description: workflowDescription, fields: workflowFields },
    { id: "friction", title: riskTitle, description: riskDescription, fields: riskFields },
    { id: "outcome", title: "Outcome and baseline", description: "Define the smallest measurable operating result worth buying.", fields: commonOutcomeFields },
    { id: "commercial", title: "Commercial path", description: "Match the evidence to Yorkstead’s diagnostic-to-system offer ladder.", fields: commonCommercialFields },
    { id: "delivery", title: "Implementation handoff", description: "Expose the constraints that determine architecture, rollout, acceptance, and ownership.", fields: commonDeliveryFields },
  ];
}

export const consultationPlaybooks: readonly ConsultationPlaybook[] = [
  {
    id: "manufacturing-fabrication",
    industry: "Manufacturing & Fabrication",
    serviceSlug: "manufacturing-software",
    bestFit: "Small manufacturers and fabrication teams where quoting, materials, production, quality, and shipping share the same job record.",
    objective: "Trace one representative job from demand to shipment, quantify the most expensive control gap, and choose the smallest owned system that improves it.",
    entryOffer: "Default to Workflow Rescue when the authoritative job flow or baseline is disputed; move to a Sprint only when one bounded handoff is already proven.",
    callPlan: ["Set the product and job boundary", "Walk the last representative job", "Mark queues, decisions, and exceptions", "Reconcile job, material, and status records", "Establish a credible baseline", "Recommend the smallest Yorkstead engagement"],
    workflowPatterns: ["Quote or release to job", "Document and revision control", "Material allocation and shortages", "Production scheduling and status", "Quality, packing, and shipping"],
    evidenceToRequest: ["A recent quote, order, traveler, or job packet", "Current production schedule or board", "Inventory, purchasing, quality, packing, and shipping records", "Examples of late, blocked, expedited, scrapped, and remade jobs", "The reports or spreadsheets used in daily production meetings"],
    baselineMeasures: ["Quote-to-release and release-to-ship time", "Jobs late, blocked, expedited, or waiting on information", "Schedule changes and status checks per job", "Material shortages, variance, scrap, and remake frequency", "Manual entries or reconciliations per job"],
    cautionSignals: ["The request begins as a full ERP replacement", "No one can name the authoritative job status", "Floor users are absent from discovery", "Machine integration is assumed before equipment and responsibility are verified", "ROI is claimed without a usable operating baseline"],
    sections: standardSections(
      "Job flow",
      "Trace a real job rather than discussing an ideal process.",
      [
        { id: "job-entry", label: "Demand and job entry", prompt: "What creates demand, which information releases a job, and what is commonly missing or changed?", kind: "long", required: true },
        { id: "production-stages", label: "Production stages", prompt: "List the actual queues, approvals, holds, work centers, outside services, and handoffs through shipment.", kind: "long", required: true },
        { id: "status-source", label: "Status source", prompt: "How does someone determine ready, running, blocked, late, complete, packed, or shipped today?", kind: "long", required: true },
        { id: "volume-mix", label: "Volume and mix", prompt: "What are normal job volume, variation, lead time, batch size, and exception patterns?", kind: "long" },
      ],
      "Materials, quality, and control",
      "Find where job, material, revision, and completion records stop agreeing.",
      [
        { id: "material-control", label: "Material control", prompt: "How are on-hand, committed, consumed, scrap, substitutions, receiving, and reorders handled?", kind: "long", required: true },
        { id: "revision-quality", label: "Revision and quality control", prompt: "How are released files, specifications, inspections, nonconformance, and rework tied to the job?", kind: "long", required: true },
        { id: "production-exceptions", label: "Costly exceptions", prompt: "Which shortages, holds, rush changes, failures, or missing approvals create the most avoidable delay or cost?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["A current-state job map is approved by office and floor owners", "Job, material, revision, status, ownership, and exception records are defined", "The baseline and expected improvement use defensible evidence", "The first module has explicit in/out-of-scope boundaries", "Representative normal, rush, shortage, and rework cases form the acceptance set", "Migration, fallback, handoff, and post-launch ownership are documented"],
  },
  {
    id: "sign-cnc-custom-production",
    industry: "Sign, CNC & Custom Production",
    serviceSlug: "cnc-signage-systems",
    bestFit: "Sign shops, CNC teams, architectural fabricators, and custom producers where customer choices must stay attached to material and machine readiness.",
    objective: "Keep quote assumptions, customer approval, released files, material readiness, and production status traceable for one repeatable product family.",
    entryOffer: "Use Workflow Rescue to separate pricing judgment from repeatable rules; a Sprint is appropriate when one product family and its exception limits are already clear.",
    callPlan: ["Choose one repeatable product family", "Walk the last quote-to-delivery job", "Separate formulas from expert judgment", "Tie proof approval to the released file", "Map material and machine readiness", "Select the smallest safe implementation"],
    workflowPatterns: ["Configured intake and estimating", "Proof, revision, and approval", "Material yield and allocation", "CAD/CAM and file release", "Fabrication, finishing, delivery, and installation"],
    evidenceToRequest: ["A recent quote, proof, revision history, and job packet", "Material price lists, stock records, and yield assumptions", "Representative design, CAD, CAM, and machine handoff files", "Examples of remakes, rush work, field changes, and unusual materials", "Installation, packing, and completion records"],
    baselineMeasures: ["Quote turnaround and revision cycles", "Approval-to-release and release-to-finish time", "Material yield, offcut reuse, scrap, and shortage frequency", "Remakes caused by approval, file, material, or setup errors", "Jobs waiting on design, material, machine, finishing, or installation"],
    cautionSignals: ["Custom work is described as fully formulaic", "Proof approval is disconnected from the released production file", "Toolpaths or machine control are assumed without equipment-specific responsibility", "Shop-floor devices and connectivity are ignored", "A configurator is expected to cover unbounded product variation"],
    sections: standardSections(
      "Quote to delivery",
      "Keep customer choices connected to production requirements.",
      [
        { id: "product-family", label: "Product family", prompt: "Which repeatable sign, panel, routed part, fixture, or fabricated product should be modeled first?", kind: "long", required: true },
        { id: "quote-inputs", label: "Quote inputs and judgment", prompt: "Which dimensions, materials, finishes, labor, setup, tooling, installation, and exceptions affect price?", kind: "long", required: true },
        { id: "approval-record", label: "Approval record", prompt: "What exactly must be approved, by whom, and how are revisions tied to the released file?", kind: "long", required: true },
        { id: "custom-production-stages", label: "Production stages", prompt: "List design, programming, material, cutting, fabrication, finishing, packing, delivery, and installation states.", kind: "long", required: true },
      ],
      "Readiness and variation",
      "Bound the product variation and make prerequisites visible before capacity is committed.",
      [
        { id: "material-rules", label: "Material planning", prompt: "How are stock, purchasing, yield, offcuts, commitments, scrap, and substitutions decided?", kind: "long", required: true },
        { id: "file-handoff", label: "File and machine handoff", prompt: "Which file types, naming rules, revisions, checks, posts, and signoffs exist between design and production?", kind: "long", required: true },
        { id: "variation-limits", label: "Variation and exceptions", prompt: "Which choices can be configured safely, and which jobs still require expert review or a custom path?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["The first product family and its variation limits are explicit", "Quote rules distinguish formulas from judgment", "Approved proof, revision, material, and released file remain traceable", "Normal, rush, remake, field-change, and exception jobs form the test set", "Machine safety, post-processing, devices, connectivity, and fallback are documented", "The client accepts the purchase, handoff, third-party, and optional-support model"],
  },
  {
    id: "warehousing-freight-logistics",
    industry: "Warehousing, Freight & Logistics",
    serviceSlug: "workflow-automation",
    bestFit: "Warehouses, freight-rework teams, yards, and dock operations that need one defensible record from appointment or arrival through work, evidence, departure, and billing.",
    objective: "Trace one load or work order through the facility, expose detention and exception costs, and define the record that operations and billing can both trust.",
    entryOffer: "Start with Workflow Rescue when event timestamps, exception ownership, or billing evidence are inconsistent; use a Sprint for one bounded arrival-to-invoice lane.",
    callPlan: ["Choose one load or service lane", "Trace appointment through invoice", "Map facility, custody, and status changes", "Test evidence and authorization checkpoints", "Quantify delay, rework, and billing leakage", "Choose the first controlled deployment"],
    workflowPatterns: ["Appointment and bay reservation", "Gate, yard, dock, and trailer status", "Labor and material capture", "Condition evidence and authorization", "Departure, detention, rating, and invoicing"],
    evidenceToRequest: ["Recent appointment, BOL, work order, gate, and invoice records", "Yard, dock-door, bay, slotting, or staging board", "Before/after photos, damage records, signatures, and authorization examples", "Labor, material, accessorial, detention, and rate rules", "Examples of disputed, incomplete, delayed, or unbilled work"],
    baselineMeasures: ["Arrival-to-door, door-to-complete, and complete-to-departure time", "Detention minutes and avoidable dwell by cause", "Loads with incomplete evidence or authorization", "Unbilled or disputed labor, materials, and accessorials", "Manual status checks, handoffs, and duplicate entries per load"],
    cautionSignals: ["The facility layout and physical status model are undefined", "Billing rules are expected to be inferred from inconsistent notes", "Photo or signature capture lacks custody and retention rules", "Carrier, WMS, EDI, or accounting access is assumed", "Real-time promises are made without reliable event capture"],
    sections: standardSections(
      "Load and facility flow",
      "Follow a real trailer, load, or work order through every physical and digital handoff.",
      [
        { id: "arrival-trigger", label: "Arrival and intake", prompt: "What is promised before arrival, what is verified at the gate, and what creates the operating record?", kind: "long", required: true },
        { id: "facility-states", label: "Facility states", prompt: "List yard, door, bay, staging, storage, work, hold, complete, and departure states with their owners.", kind: "long", required: true },
        { id: "custody-status", label: "Custody and status", prompt: "Who can change status, how is location known, and what proves the load is ready for the next handoff?", kind: "long", required: true },
        { id: "freight-volume", label: "Volume and peaks", prompt: "What are normal and peak loads, turns, appointments, dwell, and exception rates?", kind: "long" },
      ],
      "Evidence, exceptions, and billing",
      "Keep performed work, customer authorization, and invoiceable evidence in one chain.",
      [
        { id: "work-evidence", label: "Work and condition evidence", prompt: "Which photos, counts, timestamps, notes, signatures, and approvals prove condition and completed work?", kind: "long", required: true },
        { id: "billing-rules", label: "Billing rules", prompt: "How do recorded labor, material, detention, storage, and accessorial events become invoice lines?", kind: "long", required: true },
        { id: "logistics-exceptions", label: "Exception control", prompt: "How are damage, refusal, late arrival, missing paperwork, shortage, overage, and disputed work handled?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["One load or service lane is mapped from promise through invoice", "Facility locations, statuses, custody, timestamps, and allowed transitions are defined", "Evidence, authorization, retention, and billing rules are approved", "Baseline dwell, exception, and leakage measures are credible", "Normal, late, damaged, incomplete, disputed, and recovery paths are testable", "Facility devices, integrations, fallback, and operating ownership are assigned"],
  },
  {
    id: "restaurants-hospitality",
    industry: "Restaurants & Hospitality",
    serviceSlug: "workflow-automation",
    bestFit: "Independent restaurants and hospitality operators where floor, kitchen, inventory, guest promises, and shift closeout must stay synchronized.",
    objective: "Trace one service period from reservation or walk-in through closeout, identify the handoff damaging speed or control, and bound a deployment that survives a real shift.",
    entryOffer: "Use Workflow Rescue to observe a live service pattern and rank the breakdowns; a Sprint fits one controlled flow such as 86 synchronization, KDS routing, or closeout.",
    callPlan: ["Choose the service format and shift", "Walk guest, order, and kitchen flow", "Map menu, inventory, and 86 state", "Trace comps, voids, payments, and closeout", "Establish service and error baselines", "Plan a low-risk pilot and fallback"],
    workflowPatterns: ["Reservations, waitlist, and table state", "Tableside ordering and coursing", "Kitchen display and station routing", "Menu availability and cellar or stock control", "Payments, exceptions, and shift closeout"],
    evidenceToRequest: ["Current menu, modifiers, courses, station map, and service rules", "POS, KDS, reservation, inventory, and closeout examples", "86, comp, void, allergy, remake, and guest-recovery cases", "Floor layout, device plan, printer/network constraints, and peak volume", "A representative shift report with ticket and payment timing"],
    baselineMeasures: ["Seat-to-order, order-to-fire, fire-to-plate, and table-turn time", "Remakes, voids, comps, and missed modifier or allergy events", "86 updates that fail to reach every ordering point", "Guest checks requiring manual correction or manager intervention", "Closeout variance, reconciliation time, and after-shift cleanup"],
    cautionSignals: ["The concept assumes hardware or payment certification that is not scoped", "Menu and modifier ownership is unclear", "Offline behavior and service fallback are missing", "Allergy or alcohol controls are treated as ordinary automation", "A live pilot is planned without training and rollback"],
    sections: standardSections(
      "Guest to closeout",
      "Trace how a guest promise becomes an order, production sequence, payment, and completed shift record.",
      [
        { id: "service-model", label: "Service model", prompt: "Describe reservations, seating, counter or tableside ordering, courses, takeout, delivery, events, and peak periods.", kind: "long", required: true },
        { id: "order-flow", label: "Order and coursing flow", prompt: "How are modifiers, holds, fires, station routing, pacing, plating, and handoff controlled?", kind: "long", required: true },
        { id: "availability-flow", label: "Menu and availability", prompt: "Who owns menu truth, stock or cellar reserves, substitutions, and 86 changes across every terminal?", kind: "long", required: true },
        { id: "closeout-flow", label: "Payment and closeout", prompt: "How are checks, splits, tips, comps, voids, cash, reconciliation, and shift reports completed?", kind: "long", required: true },
      ],
      "Service exceptions and controls",
      "Protect guest safety, financial control, and recoverability during a live shift.",
      [
        { id: "guest-exceptions", label: "Guest and order exceptions", prompt: "How are allergies, unavailable items, remakes, transfers, cancellations, and recovery decisions handled?", kind: "long", required: true },
        { id: "hospitality-hardware", label: "Hardware and offline reality", prompt: "Which handhelds, terminals, displays, printers, drawers, network paths, and offline fallbacks are required?", kind: "long", required: true },
        { id: "shift-control", label: "Permissions and shift control", prompt: "Which actions require server, kitchen, bartender, manager, or owner authority and audit history?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["The service model, floor layout, menu structure, stations, and role permissions are approved", "Order, coursing, availability, payment, and closeout states are explicit", "Safety-sensitive and financial actions retain the correct human control", "Peak-shift baseline and acceptance scenarios are documented", "Hardware, network, offline, training, pilot, and rollback plans are agreed", "Payments, tax, delivery, reservation, and other third-party responsibilities are bounded"],
  },
  {
    id: "contractors-field-service",
    industry: "Contractors & Field Service",
    serviceSlug: "workflow-automation",
    bestFit: "Trades, installers, maintenance teams, and field-service businesses where intake, estimating, scheduling, site work, change approval, and billing are disconnected.",
    objective: "Trace one job from first request through payment, find the handoff creating delay or margin leakage, and define a field-usable first release.",
    entryOffer: "Workflow Rescue is the default when office and field describe different processes; use a Sprint for one repeatable handoff such as intake-to-estimate or completion-to-invoice.",
    callPlan: ["Choose one job type", "Trace request through payment", "Map office-field-customer handoffs", "Separate estimating rules from judgment", "Quantify delay, revisits, and unbilled work", "Select a mobile-ready first release"],
    workflowPatterns: ["Lead intake and qualification", "Site visit, estimate, and approval", "Scheduling, dispatch, and crew handoff", "Field evidence, change orders, and completion", "Invoice, collection, warranty, and follow-up"],
    evidenceToRequest: ["Recent inquiry, estimate, work order, change order, completion record, and invoice", "Scheduling or dispatch board and crew communication examples", "Site photos, measurements, checklists, signatures, and material lists", "Examples of revisits, delays, disputed scope, and unbilled changes", "Accounting, CRM, field app, and spreadsheet exports used for one job"],
    baselineMeasures: ["Inquiry-to-response, estimate, approval, schedule, and invoice time", "Estimate win rate by job type when reliable", "Revisits, callbacks, missed appointments, and reschedules", "Approved but unbilled changes and invoice corrections", "Office touches, field calls, and duplicate entries per job"],
    cautionSignals: ["Job types are mixed before one repeatable lane is chosen", "Field connectivity and device conditions are ignored", "Change approval depends on informal messages", "Licensing, safety, or compliance decisions are expected to be automated", "Calendar or accounting integration is promised without verified access"],
    sections: standardSections(
      "Request to payment",
      "Follow one representative job through every customer, office, and field handoff.",
      [
        { id: "job-type", label: "First job type", prompt: "Which repeatable service, install, repair, inspection, or maintenance job should be modeled first?", kind: "long", required: true },
        { id: "intake-estimate", label: "Intake and estimate", prompt: "What qualifies the request, what must be measured or inspected, and which decisions affect price?", kind: "long", required: true },
        { id: "dispatch-field", label: "Schedule and field handoff", prompt: "How are availability, crew skills, location, material, customer promises, and job instructions coordinated?", kind: "long", required: true },
        { id: "completion-invoice", label: "Completion to invoice", prompt: "What evidence closes the job, captures changes, updates the customer, and releases billing?", kind: "long", required: true },
      ],
      "Field exceptions and margin control",
      "Make site reality, customer authorization, and incomplete work visible.",
      [
        { id: "site-evidence", label: "Site evidence", prompt: "Which measurements, photos, notes, checklists, signatures, and timestamps are required before and after work?", kind: "long", required: true },
        { id: "change-control", label: "Change control", prompt: "How are unexpected conditions, added scope, price changes, approvals, and schedule effects recorded?", kind: "long", required: true },
        { id: "field-recovery", label: "Exception and recovery", prompt: "How are access failures, missing material, weather, no-shows, partial work, callbacks, and warranty handled?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["One job type is mapped from request through payment and warranty", "Office, field, customer, and accounting records and owners are defined", "Estimate judgment, change approval, and compliance decisions retain human control", "A credible delay, revisit, and leakage baseline exists", "Normal, no-access, shortage, change, partial, and callback cases are testable", "Mobile devices, connectivity, integrations, training, fallback, and ownership are documented"],
  },
  {
    id: "retail-ecommerce-marketplaces",
    industry: "Retail, Ecommerce & Marketplaces",
    serviceSlug: "small-business-websites",
    bestFit: "Independent brands, specialty retailers, makers, and marketplace operators that need the customer experience connected to reliable catalog, order, seller, and fulfillment operations.",
    objective: "Trace one product or order from catalog truth through purchase and fulfillment, then bound the smallest system that improves conversion without creating operational debt.",
    entryOffer: "Use Workflow Rescue when the catalog, inventory, fulfillment, or marketplace ownership model is unsettled; use a Sprint for one complete buying or seller flow.",
    callPlan: ["Choose the transaction and customer", "Trace catalog to fulfillment", "Reconcile product and availability truth", "Map payment, seller, and exception ownership", "Establish conversion and operating baselines", "Scope the smallest complete commerce flow"],
    workflowPatterns: ["Catalog and merchandising", "Cart, checkout, payment, and custom requests", "Inventory, allocation, and fulfillment", "Returns, support, and customer updates", "Seller onboarding, approval, commissions, and payouts"],
    evidenceToRequest: ["Product records, variants, pricing, media, policies, and inventory rules", "Recent orders or custom requests with their actual fulfillment trail", "Analytics, cart, payment, shipping, return, and support examples", "Seller agreement, approval, commission, payout, tax, and dispute rules when applicable", "Examples of oversells, cancellations, substitutions, failed payments, and delayed fulfillment"],
    baselineMeasures: ["Qualified traffic, product-view-to-cart, checkout, and purchase rates when reliable", "Order-to-fulfillment and fulfillment-to-delivery time", "Oversells, cancellations, returns, refunds, and support contacts", "Manual touches and reconciliation per order or seller payout", "Catalog, price, or availability corrections and their causes"],
    cautionSignals: ["The public catalog is expected to outrun the operating record", "Marketplace roles, payouts, tax, moderation, or disputes are unassigned", "Search rankings or sales are promised without evidence", "Payment, shipping, or inventory integrations are assumed", "Unverified claims and placeholder proof are treated as launch-ready"],
    sections: standardSections(
      "Discovery to fulfillment",
      "Trace the customer or seller action into the operating work it creates.",
      [
        { id: "transaction", label: "Primary transaction", prompt: "Should the right person purchase, request custom work, reserve, subscribe, apply as a seller, or take another specific action?", kind: "long", required: true },
        { id: "catalog-truth", label: "Catalog and availability truth", prompt: "Where do product, variant, price, inventory, lead-time, seller, and policy records live and who approves them?", kind: "long", required: true },
        { id: "checkout-handoff", label: "Checkout and handoff", prompt: "What happens after cart or request submission, and how do payment, allocation, notifications, and fulfillment begin?", kind: "long", required: true },
        { id: "fulfillment-flow", label: "Fulfillment and service", prompt: "Map picking or making, packing, shipping or pickup, customer updates, returns, and support ownership.", kind: "long", required: true },
      ],
      "Commerce controls and exceptions",
      "Make money movement, inventory risk, and multi-party responsibility explicit.",
      [
        { id: "payment-boundary", label: "Payment and financial boundary", prompt: "Which provider handles payment, refunds, tax, fraud, commissions, split payments, and payouts?", kind: "long", required: true },
        { id: "seller-governance", label: "Seller or catalog governance", prompt: "How are products or sellers approved, moderated, changed, suspended, and held accountable? Record not applicable for single-brand stores.", kind: "long" },
        { id: "commerce-exceptions", label: "Exception paths", prompt: "How are failed payments, oversells, cancellations, damaged goods, returns, disputes, and unavailable custom options handled?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["The primary transaction and best-fit customer or seller are approved", "Catalog, inventory, order, seller, payment, fulfillment, and support records have owners", "All public claims, products, media, and policies have an approval state", "Baseline measures are available or a measurement plan is explicit", "Normal, failed-payment, oversell, cancellation, return, and dispute paths are testable", "Provider accounts, fees, tax, privacy, accessibility, launch, and maintenance ownership are assigned"],
  },
  {
    id: "professional-back-office",
    industry: "Professional & Back-Office Services",
    serviceSlug: "workflow-automation",
    bestFit: "Owner-led service firms and administrative teams where intake, documents, approvals, scheduling, delivery, and follow-up depend on inboxes and individual memory.",
    objective: "Choose one recurring administrative workflow, separate rules from professional judgment, and design a visible, recoverable handoff with a measurable finish line.",
    entryOffer: "Workflow Rescue is the natural starting point when policy and process are entangled; a Sprint fits one stable intake, document, approval, or follow-up path.",
    callPlan: ["Choose one repeated workflow", "Walk the last three real cases", "Separate rules from judgment", "Map systems, permissions, and sensitive data", "Quantify waiting, rework, and missed follow-up", "Recommend the smallest safe engagement"],
    workflowPatterns: ["Inquiry and qualification", "Document collection and validation", "Proposal, approval, and signature", "Scheduling, assignment, and delivery", "Billing, renewal, and follow-up"],
    evidenceToRequest: ["The last three real inputs, outputs, and timelines", "Templates, emails, spreadsheets, checklists, and standard operating procedures", "Screenshots or exports from each involved system", "Examples of missing information, duplicates, overdue approvals, and manual recovery", "Role, permission, retention, and compliance requirements for the workflow"],
    baselineMeasures: ["Request-to-first-response and request-to-completion time", "Touches, handoffs, and duplicate entries per case", "Cases waiting on missing information or approval", "Rework, correction, missed follow-up, and reopen rates", "Staff time spent assembling status or reporting"],
    cautionSignals: ["The trigger or successful finish cannot be defined", "Automation is expected to make professional judgment", "Sensitive data is collected without access and retention boundaries", "A vendor connection is assumed without supported access", "The process changes every time because policy is undefined"],
    sections: standardSections(
      "Trigger to finish",
      "Map one real case, including waiting, rework, decisions, and communication.",
      [
        { id: "trigger-input", label: "Trigger and input", prompt: "What starts the workflow, where does it arrive, and what minimum information is required?", kind: "long", required: true },
        { id: "steps-owners", label: "Steps and owners", prompt: "List each transformation, decision, approval, wait, customer touch, and owner until completion.", kind: "long", required: true },
        { id: "finish-output", label: "Finish and output", prompt: "What proves the workflow finished successfully, what is delivered, and who needs the result?", kind: "long", required: true },
        { id: "frequency-volume", label: "Frequency and volume", prompt: "How often does it run, how many cases move through it, and when are the peaks?", kind: "long" },
      ],
      "Rules, judgment, and recovery",
      "Protect decisions that should remain human and make failure visible.",
      [
        { id: "deterministic-rules", label: "Repeatable rules", prompt: "Which checks, transformations, routing decisions, reminders, and outputs are explicit and safe to automate?", kind: "long", required: true },
        { id: "human-review", label: "Human judgment", prompt: "Which advice, pricing, commitment, compliance, quality, or unusual cases require qualified review?", kind: "long", required: true },
        { id: "failure-recovery", label: "Failure and recovery", prompt: "How should missing inputs, duplicates, vendor outages, timeouts, retries, and partial completion appear and recover?", kind: "long", required: true },
      ],
    ),
    developmentGate: ["Trigger, successful finish, case identity, and ownership are explicit", "Repeatable rules and qualified human judgment are separated", "Sensitive data, permissions, retention, and audit needs are bounded", "The baseline and expected improvement are defensible", "Normal, missing-input, duplicate, timeout, retry, and manual recovery paths are testable", "Vendor access, monitoring, exception ownership, handoff, and change control are assigned"],
  },
];

const legacyIndustryByService: Record<ServiceSlug, ConsultationIndustryId> = {
  "manufacturing-software": "manufacturing-fabrication",
  "workflow-automation": "professional-back-office",
  "small-business-websites": "retail-ecommerce-marketplaces",
  "cnc-signage-systems": "sign-cnc-custom-production",
};

export function getConsultationPlaybookById(id: string | null | undefined) {
  return consultationPlaybooks.find((playbook) => playbook.id === id) ?? null;
}

export function getConsultationPlaybook(slug: string | null | undefined, industryId?: string | null) {
  if (!slug) return null;
  if (industryId) {
    return consultationPlaybooks.find((playbook) => playbook.id === industryId && playbook.serviceSlug === slug) ?? null;
  }
  const fallbackId = legacyIndustryByService[slug as ServiceSlug];
  return fallbackId ? getConsultationPlaybookById(fallbackId) : null;
}

export function getConsultationService(playbook: ConsultationPlaybook) {
  const service = getPublicService(playbook.serviceSlug);
  if (!service) throw new Error(`Missing public service for ${playbook.serviceSlug}`);
  return service;
}

export function consultationFieldCount(playbook: ConsultationPlaybook) {
  return playbook.sections.reduce((total, section) => total + section.fields.length, 0);
}
