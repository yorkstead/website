import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  buyingModelElements,
  confirmedNamedSystems,
  engagementPlanningNote,
  engagements,
  milestoneSchedule,
  ownershipStatement,
  specializedServices,
  supportOffers,
} from "@/lib/engagements";

export const metadata: Metadata = {
  title: "Service Ladder, Systems & Buying Model",
  description:
    "Workflow Audit, Workflow Sprint, Department Systems, and Company Operations Systems, plus operational systems and our transparent buying model.",
  alternates: { canonical: "/packages" },
};

const ladderPackages = [
  {
    step: "01",
    title: engagements[0].title,
    price: engagements[0].priceLabel,
    note: "Operations Systems Blueprint",
    outcome: "Find where information originates, gets re-entered, stalls, or lives in spreadsheets.",
    detail: "A few hours in the business uncovering bottlenecks, paper processes, duplicate software, and single-employee silos.",
    deliverable: "Operations Systems Blueprint: current-state map, problems ranked by impact, proposed architecture, estimated build cost, and sequence.",
    cta: engagements[0].cta,
  },
  {
    step: "02",
    title: engagements[1].title,
    price: engagements[1].priceLabel,
    note: "Focused operational tool",
    outcome: "Solve one annoying operational problem completely.",
    detail: "Give me one process everybody hates—I'll fix it. Take a single broken handoff from friction to a reliable, usable tool.",
    deliverable: "Examples: digital production board, release processor, receiving workflow, inventory tracker, barcode/QR flow, shipping dashboard, QC signoff.",
    cta: engagements[1].cta,
  },
  {
    step: "03",
    title: engagements[2].title,
    price: engagements[2].priceLabel,
    note: "Single functional department",
    outcome: "Replace an entire functional chunk of your operation.",
    detail: "Connect records, roles, and status visibility across an entire functional area such as Production Control, Inventory Control, or Shipping.",
    deliverable: "End-to-end departmental pipeline: quote/release → document generation → scheduling → shop floor → live status visibility.",
    cta: engagements[2].cta,
  },
  {
    step: "04",
    title: engagements[3].title,
    price: engagements[3].priceLabel,
    note: "Modular build · purchased software",
    outcome: "Your company's modular operating system.",
    detail: "Connect multiple areas of the business without traditional ERP bloat, complex consultant fees, or locked proprietary software.",
    deliverable: "Modular system with Command Center, Jobs, Production, Inventory, Scheduling, QC, Shipping, Documents, Reporting, and Customer Portal.",
    cta: engagements[3].cta,
  },
];

const modularComponents = [
  { module: "Command Center", badge: "Executive Overview", description: "Executive cockpit, live operational metrics, exception alerts, and company-wide throughput visibility." },
  { module: "Jobs & Releases", badge: "Order Intake", description: "Order intake, drawing validation, revision tracking, customer specifications, and job packet generation." },
  { module: "Production Control", badge: "Shop Floor", description: "Work queues, station checklists, operator tracking, live station status, and bottleneck alerts." },
  { module: "Inventory & Materials", badge: "Material Control", description: "Receiving, bin locations, consumption logging, shortages, and reorder point alerts." },
  { module: "Scheduling & Capacity", badge: "Capacity Planning", description: "Work-center scheduling, machine load planning, shift calendar, and delivery commitments." },
  { module: "Quality Control (QC)", badge: "Quality & Compliance", description: "Inspection checklists, traveler signoffs, defect tracking, and certificate generation." },
  { module: "Shipping & Logistics", badge: "Fulfillment", description: "Pallet tracking, load planning, carrier documents, and bill of lading generation." },
  { module: "Document Control", badge: "Document Automation", description: "Automated shop document generation, print routing, drawing distribution, and traveler packs." },
  { module: "Reporting & Insights", badge: "Analytics", description: "Throughput, labor utilization, bottleneck reporting, margin analysis, and historical trends." },
  { module: "Customer Portal", badge: "Customer Visibility", description: "Self-service order status, proof approvals, tracking, and document downloads." },
  { module: "Automations & Integrations", badge: "Data Bridges", description: "Direct API bridges with QuickBooks, CAD/CAM, shipping carriers, and barcode scanners." },
];

const examples = [
  {
    id: "manufacturing",
    title: "Manufacturing & Fabrication (Ellwood Flow)",
    project: "Ellwood Flow",
    href: "/work/ellwood-flow",
    sprint: "Improve one release-tracking, drawing inspection, or packing-list workflow with clear operator handoffs.",
    department: "Connect release intake, document generation, work queues, and production status within a defined production-control area.",
    system: "Connect release control to shop floor scanning, material readiness, quality signoff, and shipping in agreed stages.",
  },
  {
    id: "operations",
    title: "Internal Business Operations (Yorkstead Ops)",
    project: "Yorkstead Operations",
    href: "/platform",
    sprint: "Improve one task intake, approval, service-checklist, or reporting workflow using existing data sources.",
    department: "Connect request intake, assignment, scheduling, approvals, and completion within one service team.",
    system: "Connect work orders, operator responsibilities, supporting records, customer communication, and executive dashboards.",
  },
  {
    id: "restaurant",
    title: "Restaurant POS & Service Flow (SIC Pizza)",
    project: "SIC Pizza POS",
    href: "/work/sic-pizza-pos",
    sprint: "Improve one defined handoff, such as a kitchen status board or guest-request queue with agreed actions.",
    department: "Improve the service operation from table order entry through kitchen prep queues and fulfillment status.",
    system: "Connect ordering, kitchen display systems, manager views, and split-payment validation in phases.",
  },
];

const steps = [
  ["01", "Workflow Audit", "We spend time mapping your real process, spreadsheets, bottlenecks, and handoffs, delivering an Operations Systems Blueprint."],
  ["02", "Scope & Milestone Agreement", "Confirm screens, data sources, integrations, acceptance criteria, and payment milestones in writing before work begins, with scope and terms agreed in the proposal."],
  ["03", "Build & Integrate Modules", "Configure reusable software foundations to your agreed workflow rules, and review working software with the people doing the work."],
  ["04", "Deploy, Train & Choose Support", "Deploy to production, onboard your team, and complete documented handoff. Continued use is yours without subscription lock-in; choose optional support if you want ongoing maintenance."],
];

const faqs = [
  ["How are audit fees handled if we proceed with implementation?", "When an audit leads directly to an implementation project, any applicable credit terms and implementation milestones are confirmed in writing in the agreed proposal before work begins."],
  ["How are build payments structured?", "Implementation projects use clear milestone payments confirmed in writing before work begins, with scope, deliverables, and acceptance criteria agreed in the proposal."],
  ["Do I own the software and source code?", ownershipStatement],
  ["How does the 'Buy the system. Choose the support.' model work?", "You purchase a system tailored to your actual workflow. Once delivered, continued use does not depend on a mandatory Yorkstead subscription. For ongoing maintenance or troubleshooting triage, optional support retainers are available, or you can manage maintenance internally, with scope and terms agreed in the proposal."],
  ["What makes this different from generic SaaS or legacy ERPs?", "Generic SaaS and traditional ERPs often force your operation into rigid workflows, charge recurring subscription fees forever, or require expensive implementation consultants. Yorkstead builds tailored software around how your business actually runs, keeps the tools you already rely on (like QuickBooks or CAD/CAM), and eliminates duplicate data entry."],
  ["Can you help us consolidate multiple disconnected tools?", "Yes. Our ERP Escape & Software Consolidation service audits companies juggling multiple SaaS subscriptions, spreadsheets, and disconnected tools to determine what to keep, what to eliminate, and how to bridge the gaps with an owned system, with scope and terms confirmed in the proposal."],
  ["Does every project require custom code?", "No. Often the best operational move is removing redundant steps, clarifying ownership, automating a few API connections, or organizing data. Custom software is deployed where it solves a high-value operational gap."],
];

export default function PackagesPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <BrandMark />
        <nav aria-label="Package page navigation" className="flex items-center gap-3">
          <Link href="/work" className="text-xs text-muted-foreground hover:text-foreground">
            Selected work
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Service Ladder, Named Systems & Buying Model</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Buy the system. Choose the support.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">
          Yorkstead Systems builds software around how your business actually operates. Own your system, reduce dependence on recurring software subscriptions, and give your team tools that fit the work. Choose the right step: diagnose the bottleneck, fix one painful workflow, deploy a confirmed named system, replace a department system, or build your company&apos;s modular operating system.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="#service-ladder"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Explore the service ladder <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="#named-systems"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium"
          >
            Systems
          </Link>
          <Link
            href="#buying-model"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium"
          >
            The buying model
          </Link>
          <Link
            href="#specialized-services"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium"
          >
            Specialized engagements
          </Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          All prices in USD. Credit terms, milestones, and deliverables are confirmed in the agreed proposal.
        </p>
      </section>

      {/* Service Ladder Cards */}
      <section id="service-ladder" aria-labelledby="ladder-heading" className="border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The 4-Step Ladder</div>
              <h2 id="ladder-heading" className="mt-3 text-3xl font-semibold tracking-tight">
                Start small. Solve real problems. Scale when ready.
              </h2>
            </div>
            <p className="max-w-md text-xs text-muted-foreground">
              Each tier has a defined finish line. You never buy more software than the immediate operational bottleneck demands.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ladderPackages.map((pkg) => (
              <article key={pkg.title} className="flex flex-col rounded-xl border border-border bg-background/80 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-primary">{pkg.step}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                    {pkg.note}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{pkg.title}</h3>
                <p className="mt-2 text-base font-bold text-foreground">{pkg.price}</p>
                <p className="mt-4 text-sm font-medium text-foreground/90">{pkg.outcome}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{pkg.detail}</p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Key Deliverable</p>
                  <p className="mt-1 text-xs leading-5 text-foreground/80">{pkg.deliverable}</p>
                </div>
                <div className="mt-auto pt-6">
                  <Link
                    href={pkg.cta.href}
                    className="inline-flex min-h-10 w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-medium text-primary transition hover:bg-primary/15"
                  >
                    <span>{pkg.cta.label}</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Systems Section */}
      <section id="named-systems" aria-labelledby="named-systems-heading" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-3xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Systems &amp; Reusable Modules</div>
          <h2 id="named-systems-heading" className="mt-3 text-3xl font-semibold tracking-tight">
            Systems
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Working software foundations tailored to your operation. Each system builds from demonstrated workflows and reusable modules, with scope, deployment requirements, and third-party services agreed in the proposal.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {confirmedNamedSystems.map((system) => (
            <article
              key={system.id}
              className="flex flex-col rounded-xl border border-border bg-card/40 p-6 shadow-sm sm:p-7"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{system.category}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${
                    system.priceType === "fixed"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {system.priceType === "fixed" ? "Fixed price" : "Proposal-based"}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight">{system.name}</h3>
              <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
                <span className="font-mono text-xl font-bold text-foreground">{system.priceLabel}</span>
                <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {system.readinessLabel}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{system.summary}</p>

              <div className="mt-6 border-t border-border pt-4">
                <h4 className="font-mono text-[10px] uppercase tracking-wider text-primary">What it does</h4>
                <ul className="mt-2.5 space-y-1.5">
                  {system.verifiedScope.map((scopeItem) => (
                    <li key={scopeItem} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>{scopeItem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Production deployment &amp; terms</h4>
                <ul className="mt-2.5 space-y-1.5">
                  {system.boundaries.map((boundary) => (
                    <li key={boundary} className="flex items-start gap-2 text-[11px] leading-4 text-muted-foreground/80">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      <span>{boundary}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto space-y-3 pt-6">
                <Link
                  href={system.cta.href}
                  className="inline-flex min-h-10 w-full items-center justify-between rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                >
                  <span>{system.cta.label}</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
                {system.caseStudyHref && (
                  <Link
                    href={system.caseStudyHref}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>View case study</span>
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Modular Operating System Capabilities */}
      <section aria-labelledby="modules-heading" className="border-t border-border bg-card/25">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Modular Operating System</div>
            <h2 id="modules-heading" className="mt-3 text-3xl font-semibold tracking-tight">
              Tailored software from reusable operational modules
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Avoid paying for bloated platforms packed with features your team never uses, or mandatory recurring software subscriptions. A modular Yorkstead system gives you the exact capabilities your operation needs with complete source ownership and zero mandatory subscription fees.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modularComponents.map((mod) => (
              <div key={mod.module} className="rounded-lg border border-border bg-card/40 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{mod.module}</h3>
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {mod.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Buying Model */}
      <section id="buying-model" aria-labelledby="buying-model-heading" className="border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The Buying Model</div>
            <h2 id="buying-model-heading" className="mt-3 text-3xl font-semibold tracking-tight">
              Buy the system. Choose the support.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              We sell tailored business software as a purchased asset. Continued use does not require a Yorkstead subscription, and ongoing maintenance can be managed internally or by another provider.
            </p>
          </div>

          {/* Verbatim Ownership Callout */}
          <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  Ownership &amp; Independence Commitment
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
                  &ldquo;{ownershipStatement}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* 6 Commercial Buying Model Elements */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {buyingModelElements.map((item) => (
              <div key={item.number} className="flex flex-col rounded-xl border border-border bg-background/80 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-primary">{item.number}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {item.subtitle}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
                <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                  {item.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Payment Milestones & Optional Support Retainers */}
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Protected Payment Milestones */}
            <div className="flex flex-col rounded-xl border border-border bg-card/40 p-6">
              <div className="font-mono text-xs uppercase tracking-wider text-primary">Structured Payment Milestones</div>
              <h3 className="mt-2 text-xl font-semibold">Tied to Delivered Progress</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Implementation projects use clear milestone payments confirmed in writing before work begins, with scope, deliverables, and acceptance criteria agreed in the proposal.
              </p>
              <div className="mt-6 space-y-3">
                {milestoneSchedule.map((m) => (
                  <div key={m.milestone} className="rounded-lg border border-border bg-background/70 p-4">
                    <span className="text-xs font-semibold text-foreground">{m.milestone}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{m.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Support Retainers */}
            <div id="support-options" className="flex flex-col rounded-xl border border-border bg-card/40 p-6">
              <div className="font-mono text-xs uppercase tracking-wider text-primary">Optional Support</div>
              <h3 className="mt-2 text-xl font-semibold">Care When You Want It</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Software operates in an evolving environment of browser updates, dependencies, and business changes. Optional support retainers are available for triage, troubleshooting, and scheduled health checks—or you can maintain the system in-house or choose another provider.
              </p>
              <div className="mt-6 space-y-3">
                {supportOffers.map((offer) => (
                  <div key={offer.name} className="rounded-lg border border-border bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{offer.name}</span>
                      <span className="font-mono text-[10px] text-primary">{offer.availability}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{offer.summary}</p>
                    <ul className="mt-3 space-y-1 border-t border-border pt-2.5">
                      {offer.includes.map((inc) => (
                        <li key={inc} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Planning Note */}
          <p className="mt-8 text-xs leading-5 text-muted-foreground">
            {engagementPlanningNote}
          </p>
        </div>
      </section>

      {/* Specialized Consulting Services */}
      <section id="specialized-services" aria-labelledby="specialized-heading" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Focused Engagements</div>
          <h2 id="specialized-heading" className="mt-3 text-3xl font-semibold tracking-tight">
            Specialized High-Value Solutions
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Targeted consulting services designed for high operational ROI without requiring an all-at-once software overhaul.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {specializedServices.map((service) => (
            <div key={service.title} className="flex flex-col rounded-xl border border-border bg-card/40 p-6">
              <span className="font-mono text-xs text-primary">{service.priceLabel}</span>
              <h3 className="mt-3 text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm font-medium text-foreground/90">{service.summary}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{service.detail}</p>
              <div className="mt-auto pt-6">
                <Link
                  href="/#contact"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Discuss this solution <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section id="examples" aria-labelledby="examples-heading" className="border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8">
          <h2 id="examples-heading" className="text-3xl font-semibold tracking-tight">
            What this looks like across real operations
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            Explore how the service ladder applies to manufacturing, business operations, and specialized workflows.
          </p>
          <div className="mt-10 space-y-6">
            {examples.map((example) => (
              <article id={example.id} key={example.id} className="scroll-mt-8 rounded-xl border border-border bg-background/70 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold">{example.title}</h3>
                  <Link href={example.href} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    Explore {example.project} <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  {[
                    ["Workflow Sprint", example.sprint],
                    ["Department System", example.department],
                    ["Operations System", example.system],
                  ].map(([title, description]) => (
                    <div key={title} className="rounded-lg border border-border/70 bg-card/30 p-4">
                      <h4 className="font-mono text-xs uppercase tracking-wider text-primary">{title}</h4>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="process-heading" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Process</div>
          <h2 id="process-heading" className="mt-3 text-3xl font-semibold tracking-tight">
            How the engagement works
          </h2>
        </div>
        <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <li key={title} className="rounded-lg border border-border bg-card/40 p-5">
              <span className="font-mono text-xs text-primary">{number}</span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQs */}
      <section aria-labelledby="faq-heading" className="border-t border-border bg-card/35">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">FAQ</div>
          <h2 id="faq-heading" className="mt-3 text-3xl font-semibold tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="cursor-pointer text-base font-medium marker:text-primary hover:text-foreground">
                  {question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
            <h3 className="text-2xl font-semibold">Ready to diagnose or fix your operation?</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Book a Workflow Audit or reach out to scope a sprint, with scope and terms agreed in the proposal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/workflow-audit#audit-intake"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Book a Workflow Audit <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/#contact"
                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-medium"
              >
                Start a conversation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter>
        <Link href="/work" className="hover:text-foreground">
          Selected work
        </Link>
        <Link href="/platform" className="hover:text-foreground">
          Yorkstead Operations
        </Link>
      </SiteFooter>
    </main>
  );
}
