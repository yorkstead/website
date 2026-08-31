import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Workflow Packages, Process & Planning Prices",
  description: "Solve one workflow from $4,500, improve a department from $10,000, or connect operations from $25,000. See the process and scope examples.",
  alternates: { canonical: "/packages" },
};

const packages = [
  { title: "Workflow Sprint", price: "$4,500", range: "$3,500–$7,500", outcome: "Fix one clearly defined operational problem.", detail: "Simplify the process, connect or configure existing tools, and build only what is missing. Review the result with the people doing the work.", includes: ["One workflow with a clear start and finish", "Agreed success measures and implementation", "Team review, documentation, and handoff"] },
  { title: "Department System", price: "$10,000", range: "$8,000–$20,000", outcome: "Improve an operational area with several related workflows.", detail: "Connect the records, responsibilities, and handoffs within production, inventory, shipping, or another defined function.", includes: ["Related workflows within one operational area", "Shared information, roles, and status visibility", "Staged validation, training, and rollout"] },
  { title: "Operations System", price: "$25,000", range: "$25,000–$75,000+", outcome: "Connect multiple areas of the business.", detail: "Create a phased operating system around the business. Keep useful tools, connect the gaps, and replace only what the agreed scope calls for.", includes: ["Multiple connected operational workflows", "Cross-team handoffs and reporting", "Phased delivery, acceptance, and documented ownership"] },
];

const examples = [
  {
    id: "restaurant",
    title: "Restaurant POS & service workflows",
    project: "SIC Pizza POS",
    href: "/work/sic-pizza-pos",
    department: "Improve the service operation from order entry through kitchen handoff and fulfillment status, with clear ownership at each step.",
    sprint: "Improve one defined handoff, using existing tools or a focused solution such as a guest-request queue or kitchen status board with agreed inputs and actions.",
    system: "Connect ordering, kitchen activity, and manager views in phases. Payment processing and POS hardware are scoped separately.",
  },
  {
    id: "manufacturing",
    title: "Manufacturing & shop-floor tracking",
    project: "Ellwood Flow",
    href: "/work/ellwood-flow",
    department: "Connect release intake, document control, work queues, and production status within a defined production-control function.",
    sprint: "Improve one release-tracking, inspection, or packing-list workflow around a defined record and finish line.",
    system: "Connect release control to production, material readiness, and quality in agreed stages. Machine interfaces and migration need their own scope.",
  },
  {
    id: "operations",
    title: "Business operations & internal tools",
    project: "Yorkstead Operations",
    href: "/platform",
    department: "Connect request intake, assignment, scheduling, approvals, and completion within one service or operations team.",
    sprint: "Improve one task, approval, service-checklist, or reporting workflow using agreed data sources.",
    system: "Connect work orders, team responsibilities, supporting records, and reporting. External messaging and third-party integrations are separately defined.",
  },
];

const steps = [
  ["Show the current process", "Bring a representative job, spreadsheet, form, or screen. Explain who uses it, what is difficult, and what a better result would look like."],
  ["Agree on scope and price", "Confirm the workflow, users, screens, data sources, exclusions, acceptance criteria, and delivery plan in writing before work begins."],
  ["Simplify, implement, and review", "Remove unnecessary steps before choosing tools. Review the work against realistic examples in a test environment. Revisions stay within the agreed scope; new requirements are priced before they are added."],
  ["Validate and hand over", "Check the agreed behavior with the team, document operation and ownership, and confirm the rollout and support plan before production use."],
];

const faqs = [
  ["Are these fixed quotes or subscriptions?", "These are indicative USD project budgets, not software license prices or fixed quotes. Public starting prices are $4,500 for a Sprint, $10,000 for a Department System, and $25,000 for an Operations System. The broader planning ranges allow for smaller or larger scopes; they are not guaranteed minimums or caps."],
  ["Where does the diagnostic fit?", "A Workflow Diagnostic starts around $1,000. It produces an Operations Systems Blueprint: a current-state map, prioritized problems, a recommended approach, and a phased implementation budget. It sits before the three implementation packages when the problem needs investigation. Any credit toward implementation is stated in the proposal."],
  ["Does every engagement involve custom software?", "No. The solution may be removing steps, clarifying ownership, documenting a process, configuring existing software, or connecting tools. Custom software is used when it solves a real gap."],
  ["Will my package include everything in a showcase?", "No. SIC Pizza POS, Ellwood Flow, and Yorkstead Operations illustrate possible approaches. The proposal defines your deliverables. Demo screens, synthetic data, and simulated integrations do not establish production readiness or measured results."],
  ["What changes the price?", "Scope, operational risk, integrations, data quality, migration, hardware, and rollout requirements. Hosting, third-party fees, payment processing, hardware, travel, and ongoing support are itemized separately where applicable."],
  ["How long does it take?", "Timing is set after reviewing access, workflow complexity, data, integrations, and team availability. Larger systems are delivered in agreed phases. A starting price does not promise a fixed delivery time."],
  ["What happens after launch?", "Optional ongoing systems partnership starts around $750 per month. Support coverage, maintenance, improvement time, response expectations, and provider costs are defined separately. Documentation, client data access, and source ownership or licensing are agreed in writing so continued service is a choice."],
];

export default function PackagesPage() {
  return <main className="min-h-screen">
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <BrandMark />
      <nav aria-label="Package page navigation" className="flex items-center gap-3">
        <Link href="/work" className="text-xs text-muted-foreground hover:text-foreground">Selected work</Link>
        <ThemeToggle />
      </nav>
    </header>
    <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Packages & process</p>
      <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">A clear scope. A useful first result. Room to grow.</h1>
      <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">Yorkstead Systems fixes the systems behind the work. Choose the size of the operational problem: one workflow, a department, or connected operations. Software is one possible tool—not the starting assumption.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="#pricing" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">Compare the three packages<ArrowRight className="size-4" aria-hidden="true" /></Link>
        <Link href="#examples" className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm">See project examples</Link>
      </div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">All prices are in USD. Final scope, price, timing, and recurring costs are confirmed before work starts.</p>
    </section>
    <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-border bg-card/35">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <h2 id="pricing-heading" className="text-3xl font-semibold">Three ways to improve the work</h2>
        <div className="mt-9 grid gap-6 lg:grid-cols-3">{packages.map((offer, index) => <article key={offer.title} className="rounded-xl border border-border p-6">
          <p className="font-mono text-xs text-primary">0{index + 1}</p><h3 className="mt-4 text-2xl font-semibold">{offer.title}</h3>
          <p className="mt-3 text-lg text-primary">Starting around {offer.price}</p><p className="mt-2 text-xs text-muted-foreground">Indicative planning range: {offer.range}</p>
          <p className="mt-6 font-medium">{offer.outcome}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{offer.detail}</p>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">{offer.includes.map((item) => <li key={item}>{item}</li>)}</ul>
          <Link href="/#contact" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-primary">Discuss this scope<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </article>)}</div>
        <p className="mt-8 text-sm leading-7 text-muted-foreground"><strong className="text-foreground">Before implementation:</strong> Workflow Diagnostic from around $1,000. Understand the process, prioritize the problems, and receive an Operations Systems Blueprint.</p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground"><strong className="text-foreground">After launch:</strong> Optional Systems Partnership from around $750/month. Coverage and improvement capacity are agreed separately.</p>
      </div>
    </section>
    <section id="examples" aria-labelledby="examples-heading" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8">
      <h2 id="examples-heading" className="text-3xl font-semibold tracking-tight">What that could look like for your business</h2>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">These are scope examples, not a promise that every feature in a showcase is included at the starting price.</p>
      <div className="mt-9 space-y-6">{examples.map((example) => <article id={example.id} key={example.id} className="scroll-mt-8 rounded-xl border border-border bg-card/40 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-xl font-semibold">{example.title}</h3><Link href={example.href} className="inline-flex items-center gap-2 text-sm text-primary">Explore {example.project}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">{[["Workflow Sprint", example.sprint], ["Department System", example.department], ["Operations System", example.system]].map(([title, description]) => <div key={title}><h4 className="font-mono text-xs uppercase tracking-wider text-primary">{title}</h4><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div>
      </article>)}</div>
    </section>
    <section aria-labelledby="process-heading" className="border-y border-border bg-card/35">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><h2 id="process-heading" className="text-3xl font-semibold tracking-tight">How the work happens</h2><ol className="mt-9 grid gap-8 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, description], index) => <li key={title}><span className="font-mono text-xs text-primary">0{index + 1}</span><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></li>)}</ol></div>
    </section>
    <section aria-labelledby="scope-heading" className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
      <h2 id="scope-heading" className="text-3xl font-semibold tracking-tight">Before you choose a package</h2>
      <div className="mt-8 divide-y divide-border border-y border-border">{faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="cursor-pointer text-base font-medium marker:text-primary">{question}</summary><p className="mt-4 text-sm leading-7 text-muted-foreground">{answer}</p></details>)}</div>
      <div className="mt-12 rounded-xl border border-primary/25 bg-primary/5 p-6 sm:p-8"><h2 className="text-2xl font-semibold">Tell us where the work gets stuck.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Share the process, the people involved, and one example. We will identify the right starting point before recommending a build.</p><Link href="/#contact" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">Discuss your workflow<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
    </section>
    <SiteFooter><Link href="/work" className="hover:text-foreground">Selected work</Link><Link href="/platform" className="hover:text-foreground">Yorkstead Operations</Link></SiteFooter>
  </main>;
}
