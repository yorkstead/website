import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { careTiers, milestoneSchedule, specializedServices } from "@/lib/engagements";

export const metadata: Metadata = {
  title: "Service Ladder, Packages & Build + Care Pricing",
  description: "Workflow Diagnostic ($750–$1,500), Workflow Sprint ($3,500–$7,500), Department System ($8,000–$20,000), and Company Operations System ($25,000–$75,000+). Plus monthly Build + Care plans.",
  alternates: { canonical: "/packages" },
};

const ladderPackages = [
  {
    step: "01",
    title: "Workflow Diagnostic",
    price: "$750–$1,500",
    note: "100% credited toward your build within 30 days",
    outcome: "Find where information originates, gets re-entered, stalls, or lives in spreadsheets.",
    detail: "A few hours in the business uncovering bottlenecks, paper processes, duplicate software, and single-employee silos.",
    deliverable: "Operations Systems Blueprint: current-state map, problems ranked by impact, proposed architecture, estimated build cost, and sequence.",
    cta: { label: "Book a diagnostic", href: "/workflow-audit#audit-intake" },
  },
  {
    step: "02",
    title: "Workflow Sprint",
    price: "$3,500–$7,500",
    note: "Normal starting price ~$4,500",
    outcome: "Solve one annoying operational problem completely.",
    detail: "Give me one process everybody hates—I'll fix it. Take a single broken handoff from friction to a reliable, usable tool.",
    deliverable: "Examples: digital production board, release processor, receiving workflow, inventory tracker, barcode/QR flow, shipping dashboard, QC signoff.",
    cta: { label: "Scope a sprint", href: "/?engagement=workflow-sprint#contact" },
  },
  {
    step: "03",
    title: "Department System",
    price: "$8,000–$20,000",
    note: "Typical range $8K–$20K",
    outcome: "Replace an entire functional chunk of your operation.",
    detail: "Connect records, roles, and status visibility across an entire functional area such as Production Control, Inventory Control, or Shipping.",
    deliverable: "End-to-end departmental pipeline: quote/release → document generation → scheduling → shop floor → live status visibility.",
    cta: { label: "Scope a department system", href: "/?engagement=department-system#contact" },
  },
  {
    step: "04",
    title: "Company Operations System",
    price: "$25,000–$75,000+",
    note: "Modular build · no per-seat fees",
    outcome: "Your company's modular operating system.",
    detail: "Connect multiple areas of the business without traditional ERP bloat, complex consultant fees, or locked proprietary software.",
    deliverable: "Modular system with Command Center, Jobs, Production, Inventory, Scheduling, QC, Shipping, Documents, Reporting, and Customer Portal.",
    cta: { label: "Discuss an operations system", href: "/?engagement=custom-operations-system#contact" },
  },
];

const modularComponents = [
  { module: "Command Center", value: "$4,000–$8,000", description: "Executive cockpit, live metrics, exception alerts, and operational overview." },
  { module: "Jobs & Releases", value: "$5,000–$10,000", description: "Order intake, drawing validation, revision tracking, and job packet generation." },
  { module: "Production Control", value: "$7,000–$15,000", description: "Shop floor queues, station checklists, operator tracking, and live progress." },
  { module: "Inventory & Materials", value: "$6,000–$15,000", description: "Receiving, bin locations, consumption, shortages, and reorder alerts." },
  { module: "Scheduling & Capacity", value: "$5,000–$12,000", description: "Work-center scheduling, machine load planning, and delivery commitments." },
  { module: "Quality Control (QC)", value: "$4,000–$8,000", description: "Inspection checklists, signoffs, defect tracking, and certificate generation." },
  { module: "Shipping & Logistics", value: "$5,000–$12,000", description: "Pallet tracking, load planning, carrier documents, and bill of lading generation." },
  { module: "Document Control", value: "$5,000–$15,000", description: "Automatic shop document generation, print routing, and drawing distribution." },
  { module: "Reporting & Insights", value: "$4,000–$10,000", description: "Throughput, labor utilization, bottleneck reporting, and historical trends." },
  { module: "Customer Portal", value: "$5,000–$15,000", description: "Self-service order status, proof approvals, tracking, and document downloads." },
  { module: "Automations & Integrations", value: "$2,000–$10,000+", description: "Direct API bridges with QuickBooks, CAD/CAM, shipping carriers, and scanners." },
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
  ["01", "Workflow Diagnostic", "We spend a few hours mapping your real process, spreadsheets, bottlenecks, and handoffs, delivering an Operations Systems Blueprint."],
  ["02", "Scope & Milestone Agreement", "Confirm the screens, data sources, integrations, acceptance criteria, and 30/30/30/10 payment milestones in writing before work begins."],
  ["03", "Build, Iterate & Prototype", "Simplify the process, eliminate unnecessary steps, and build working software. Review realistic working prototypes with the people doing the work."],
  ["04", "Deploy, Train & Care", "Deploy to production, onboard your team, and provide optional monthly Care retainers so your software continues to evolve smoothly."],
];

const faqs = [
  ["How does the Diagnostic credit work?", "The Workflow Diagnostic costs $750–$1,500. If you choose to hire Yorkstead Systems for the recommended build within 30 days of receiving your Operations Systems Blueprint, 100% of the diagnostic fee is credited directly toward your project."],
  ["How are build payments structured?", "Build projects use a protected 4-milestone structure: 30% deposit to start, 30% upon delivery of a working interactive prototype, 30% upon production deployment and team cutover, and 10% after 30-day post-launch acceptance."],
  ["Do I own the software and source code?", "Yes, absolutely. You receive full ownership of your custom software source code, database architecture, and documentation. You are never held hostage or locked into proprietary per-seat subscriptions."],
  ["What is the Build + Care philosophy?", "We believe you should stay with a partner because they are genuinely useful, not because you are locked in. After your build is complete, you can maintain it yourself or choose one of our monthly Care retainers ($350/mo Care, $750/mo Operations, $1,500–$3,000/mo Partner) for continuous support and enhancements."],
  ["What makes this different from traditional ERPs?", "Traditional ERPs cost tens of thousands in licensing, require expensive $150–$350/hr consultants, force your shop into rigid workflows, and charge per seat forever. Yorkstead builds only what your business needs, keeps what works (like QuickBooks or CAD/CAM), and eliminates the rest."],
  ["Can you help us escape an ERP or consolidate multiple tools?", "Yes. Our ERP Escape service ($2,500 diagnostic / $10K–$50K implementation) specifically audits companies juggling multiple SaaS tools, spreadsheets, and messy software to determine what to keep, what to eliminate, and how to bridge the gaps cleanly."],
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
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Service Ladder & Pricing</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          From diagnosing a bottleneck to an owned operating system.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">
          Yorkstead Systems fixes the systems behind the work. Choose the right step on the ladder: diagnose the problem, fix one painful workflow, replace a department system, or build your company&apos;s modular operating system.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="#service-ladder"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Explore the service ladder <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="#build-and-care"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium"
          >
            Build + Care model
          </Link>
          <Link
            href="#specialized-services"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-medium"
          >
            Specialized engagements
          </Link>
        </div>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          All prices in USD. Diagnostic fees are 100% credited toward project builds within 30 days. You own your source code.
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
                <p className="mt-2 text-lg font-bold text-foreground">{pkg.price}</p>
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

      {/* Modular Value Breakdown */}
      <section aria-labelledby="modules-heading" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-3xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Modular Operating System</div>
          <h2 id="modules-heading" className="mt-3 text-3xl font-semibold tracking-tight">
            Why an owned company system delivers 10x ROI over legacy ERPs
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Traditional ERPs charge $150–$350/hour for consultants plus perpetual per-user seat fees. A modular Yorkstead system gives you the exact capabilities your shop needs with zero seat licenses and complete source ownership.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modularComponents.map((mod) => (
            <div key={mod.module} className="rounded-lg border border-border bg-card/40 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{mod.module}</h3>
                <span className="font-mono text-xs text-primary">{mod.value}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{mod.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Build + Care Model */}
      <section id="build-and-care" aria-labelledby="care-heading" className="border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Build + Care Architecture</div>
              <h2 id="care-heading" className="mt-3 text-3xl font-semibold tracking-tight">
                You own your build. We provide ongoing care.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Our philosophy is simple: <strong className="text-foreground">Stay with us because we are useful, not because you are locked in.</strong> You own the source code and database. There are no proprietary lock-ins.
              </p>
              <div className="mt-8 space-y-4">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">Protected Payment Milestones</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {milestoneSchedule.map((m) => (
                    <div key={m.milestone} className="rounded-lg border border-border bg-background/60 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{m.milestone}</span>
                        <span className="font-mono text-xs font-bold text-primary">{m.percentage}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{m.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recurring Care Tiers */}
            <div className="space-y-4">
              <div className="font-mono text-xs uppercase tracking-wider text-primary">Monthly Care Retainers</div>
              {careTiers.map((tier) => (
                <div key={tier.name} className="rounded-xl border border-border bg-background/80 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{tier.name}</h3>
                    <span className="font-mono text-sm font-bold text-primary">{tier.monthlyPrice}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.summary}</p>
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {tier.includes.map((inc) => (
                      <li key={inc} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="size-3 text-primary shrink-0" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
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
              Book a Workflow Diagnostic ($750–$1,500, credited toward your build) or reach out to scope a sprint.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/workflow-audit#audit-intake"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Book a Workflow Diagnostic <ArrowRight className="size-4" aria-hidden="true" />
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

