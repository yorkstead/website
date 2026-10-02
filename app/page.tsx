import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  Gauge,
  GitBranch,
  Github,
  Globe2,
  Mail,
  MoveUpRight,
  Phone,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { CaseStudyCard } from "@/components/case-study-card";
import { ContactForm } from "@/components/contact-form";
import { TrackedLink } from "@/components/conversion-tracker";
import { EngagementPricing } from "@/components/engagement-pricing";
import { FounderIntroduction } from "@/components/founder-introduction";
import { ProjectStatusLegend } from "@/components/project-status-legend";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { brand, brandMailto } from "@/lib/brand";
import { caseStudies } from "@/lib/case-studies";
import { organizationStructuredData } from "@/lib/founder";
import { publicBusinessDetails, publicBusinessPhoneHref } from "@/lib/local-business";
import { publicServices } from "@/lib/services";

const serviceIcons = { factory: Factory, workflow: GitBranch, website: Globe2, "scan-line": ScanLine };

const industryApplications = [
  {
    title: "Manufacturing & Fabrication",
    icon: Factory,
    summary: "Quote-to-job conversion, CAD revision locking, shopfloor travelers, material allocation, and inspection checklists.",
    detail: "Keep drawing revisions, machine routing, and floor operator signoffs connected without generic ERP friction.",
  },
  {
    title: "Warehousing & Logistics",
    icon: Truck,
    summary: "Pallet load building, container capacity math, double-entry inventory ledgers, dock receiving, and carrier manifests.",
    detail: "Verify weights, track dock variances, and generate bills of lading without spreadsheet drift or manual re-entry.",
  },
  {
    title: "Restaurants & Hospitality",
    icon: UtensilsCrossed,
    summary: "Order routing, kitchen display workflows, table status coordination, and split-payment validation.",
    detail: "Connect front-of-house table turns with back-of-house kitchen prep queues without runaway per-terminal fees.",
  },
  {
    title: "Ecommerce & Retail",
    icon: ShoppingBag,
    summary: "Branded storefronts, product catalogs, order fulfillment, and custom commission paths tied directly to live inventory.",
    detail: "Keep customer orders, catalog availability, and fulfillment workflows aligned with an owned operating record.",
  },
  {
    title: "Field Services & Contractors",
    icon: Wrench,
    summary: "Phone-first mobile checklists, on-site customer add-on consent, timestamped photo proof-of-work, and dispatch handoffs.",
    detail: "Empower technicians with reliable mobile workflows while office leads receive instant job completion records.",
  },
];

const operatingFriction = [
  ["Quoting", "Requests wait too long for pricing because the right details live in someone’s head."],
  ["Inventory", "Nobody is fully certain what is on hand, committed to a job, or due to be reordered."],
  ["Production", "Status gets reconstructed from messages, paper travelers, whiteboards, and walk-arounds."],
  ["Administration", "The same information is entered twice while paperwork, scheduling, and follow-up keep pulling the owner back in."],
];

const operatingExperience = [
  "Production management",
  "CNC fabrication",
  "Inventory",
  "Shipping",
  "Operations",
  "Software development",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c") }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_38%)]" />
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative mx-auto grid min-h-[72vh] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Tailored Business Software // Owned Systems
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-0.055em] sm:text-7xl">
            Software you buy once. <span className="text-primary">Software you own.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            We build focused software around how your shop, warehouse, kitchen or field crew actually works, and sell it as an asset you own. No monthly fee just to keep running your own operation.
          </p>
          <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/60">
            Independent builder · Denver, Colorado
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="/demos"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
            >
              Try the demos <MoveUpRight className="size-4" />
            </a>
            <Link
              href="#buying-model"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium transition hover:border-primary/40"
            >
              Buy the system. Choose the support.
            </Link>
            <Link
              href="#work"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card/60 px-5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              See selected work <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 bg-primary/10 blur-3xl" />
          <Card className="relative overflow-hidden bg-card/85 shadow-2xl backdrop-blur">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">The Yorkstead Model</div>
                  <div className="mt-1 text-sm font-medium">Tailored software // Full system ownership</div>
                </div>
                <Gauge className="size-5 text-primary" aria-hidden="true" />
              </div>
              {[
                {
                  label: "Built for your actual operation",
                  desc: "Software shaped around your specific team, handoffs, and physical constraints.",
                },
                {
                  label: "An owned business system",
                  desc: "You purchase the software. Continued use does not depend on a mandatory subscription.",
                },
                {
                  label: "Choose optional support",
                  desc: "Ongoing maintenance and updates when you want them; maintain it yourself if you prefer.",
                },
                {
                  label: "Reusable software foundations",
                  desc: "Existing modules tailored to the agreed workflow without paying for unused bloat.",
                },
              ].map((item, index) => (
                <div key={item.label} className="border-b border-border/60 py-3.5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-primary">0{index + 1}</span>
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="mt-1 pl-6 text-xs leading-5 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why we build this way, with an illustrative cost comparison */}
      <section id="why" className="relative border-b border-border py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Why we do it this way</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">We&apos;ve worked the floor.</h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Yorkstead was started by someone who spent about 15 years in restaurants and then rose to production manager at a manufacturer. We&apos;ve lived with software that charged by the seat and still didn&apos;t fit the way the work moves.
            </p>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              So we build the other way: focused systems shaped around your operation, handed over as something you own, with support only if you want it.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
            <div className="font-mono text-[9px] uppercase tracking-wider text-primary">Illustration // Three years of cost</div>
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Illustrative three-year cost of a monthly subscription compared with a one-time purchase</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 font-medium">Monthly software fees</th>
                  <th scope="col" className="py-2 text-right font-medium">Over 3 years</th>
                </tr>
              </thead>
              <tbody>
                {[500, 1000, 1500].map((monthly) => (
                  <tr key={monthly} className="border-b border-border/60">
                    <td className="py-3">${monthly.toLocaleString("en-US")} per month</td>
                    <td className="py-3 text-right font-medium">${(monthly * 36).toLocaleString("en-US")}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 font-medium text-primary">A Yorkstead system</td>
                  <td className="py-3 text-right font-medium text-primary">$7,500 once</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Illustration only. Your current fees and scope will differ. The $7,500 price applies to our two named systems, and what&apos;s included is defined in the proposal. Hosting and third-party services are identified separately, and optional support is extra.
            </p>
          </div>
        </div>
      </section>

      {/* Buying Model: Buy the system. Choose the support. */}
      <section id="buying-model" className="relative border-y border-border bg-card/45 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The Buying Model</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              Buy the system. Choose the support.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Most business software forces you into an unwanted compromise: accept rigid SaaS tools that don&apos;t match how you work and charge recurring subscription fees forever, or face a multi-year enterprise consulting sinkhole. Yorkstead Systems offers a cleaner model: tailored software you own, with support when you want it.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="flex flex-col rounded-xl border border-border bg-background/80 p-6 shadow-sm sm:p-8">
              <div className="font-mono text-[9px] uppercase tracking-wider text-primary">01 // Operational Fit</div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Software suited to your actual operation</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                We build tools around the way your jobs, materials, and people actually move. No forcing your shop, warehouse, or service team into a generic mold.
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Fewer duplicate entries across sales, operations, and billing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Clearer inventory and material visibility without spreadsheet drift</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Reliable handoffs between office, floor, and field teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Less time chasing updates, more time running your business</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-background/80 p-6 shadow-sm sm:p-8">
              <div className="font-mono text-[9px] uppercase tracking-wider text-primary">02 // Real Ownership</div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Clear control over your system and data</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Continued use of your purchased system does not require a Yorkstead support subscription. Your proposal defines the software and documentation delivered, source access, usage and modification rights, and any third-party dependencies. You can manage ongoing maintenance internally or appoint another provider, subject to those terms.
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Delivered software and documentation defined explicitly in your proposal</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Continued use of the purchased system does not require a Yorkstead support subscription</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Manage ongoing maintenance in-house or appoint another provider, subject to terms</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-background/80 p-6 shadow-sm sm:p-8">
              <div className="font-mono text-[9px] uppercase tracking-wider text-primary">03 // Optional Support</div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">Support when you want it, on your terms</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Software exists in an evolving ecosystem of browser updates, dependencies, and business changes. Continued use does not require an ongoing contract.
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Optional support retainers for troubleshooting triage and scheduled health checks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Scope, response expectations, and terms confirmed in your proposal</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Continued system use never depends on maintaining an active support contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>Flexibility to handle maintenance internally or engage third-party support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Relationship: Consulting, Modules, Tailored Implementation */}
      <section id="delivery-model" className="relative border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Delivery Method</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                Consulting, reusable foundations, and tailored implementation.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                How do we deliver tailored business software without starting from scratch or forcing you into rigid off-the-shelf software? By connecting three disciplined practices:
              </p>
            </div>
            <div>
              <Link
                href="/how-we-build"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium transition hover:border-primary/40"
              >
                How we build <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/35 p-6 sm:p-8">
              <span className="font-mono text-xs uppercase tracking-wider text-primary">Stage 01</span>
              <h3 className="mt-3 text-xl font-semibold">1. Operational Consulting</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">Workflow Audit</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                We spend time in your business observing real work: tracing an order from intake to delivery, mapping spreadsheet silos, and identifying where information gets re-entered or stalls. We deliver an Operations Systems Blueprint ranking bottlenecks by impact, with scope and terms agreed in the proposal.
              </p>
              <div className="mt-6 border-t border-border pt-4">
                <Link href="/workflow-audit" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  Learn about the workflow audit <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/35 p-6 sm:p-8">
              <span className="font-mono text-xs uppercase tracking-wider text-primary">Stage 02</span>
              <h3 className="mt-3 text-xl font-semibold">2. Reusable Software Foundations</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">Existing Operational Modules</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                You don&apos;t pay to reinvent standard operational patterns. We draw from reusable software foundations—quoting calculators, work order tracking, inventory ledgers, capacity scheduling, QC inspection workflows, and shipping load builders.
              </p>
              <div className="mt-6 border-t border-border pt-4">
                <Link href="/platform" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  Explore platform modules <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/35 p-6 sm:p-8">
              <span className="font-mono text-xs uppercase tracking-wider text-primary">Stage 03</span>
              <h3 className="mt-3 text-xl font-semibold">3. Tailored Implementation</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">Configured & Purchased Systems</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                We configure, integrate, and extend those modules to match your exact operating rules, existing tools (like QuickBooks or CAD/CAM), and team roles. Built with agreed milestones, documented operation, team training, and clear asset rights confirmed in the proposal.
              </p>
              <div className="mt-6 border-t border-border pt-4">
                <Link href="/packages" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  View packages & pricing ladder <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demos */}
      <section id="demos" className="relative border-b border-border bg-card/40 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Try it yourself</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Click through the software, not a slide deck.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Each demo uses made-up data and needs no login. Rework Flow is a screen-by-screen walkthrough of the real application; the others you can click through, and nothing you do is saved.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { href: "/demos/rework", title: "Rework Flow", kicker: "Freight rework and warehousing", summary: "A seven-step walkthrough of the real application, from the driver's bay reservation to the completion packet." },
              { href: "/demos/ellwood", title: "Ellwood Flow", kicker: "Manufacturing release control", summary: "A drawing revision arrives after work is released. Review affected work and carry the decision to the shop floor." },
              { href: "https://240.yorkstead.com", title: "Union OS", kicker: "Restaurant operations", summary: "A tableside ordering, kitchen and payments prototype for a neighborhood restaurant." },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-xl border border-border bg-background/80 p-6 transition hover:border-primary/40 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.kicker}</div>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground transition group-hover:text-primary">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                </div>
                <div className="mt-5 flex items-center gap-1 text-xs font-medium text-primary">
                  <span>Open demo</span>
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>
          <div className="mt-8 text-sm">
            <Link href="/demos" className="font-medium text-primary hover:underline">All demos →</Link>
          </div>
        </div>
      </section>

      {/* Coherent Industries Section */}
      <section id="industries" aria-labelledby="industries-heading" className="relative border-b border-border bg-card/25 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Operational Breadth</div>
            <h2 id="industries-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              One coherent offer across operational industries.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Manufacturing experience is an important credential, but manufacturing is not the boundary of the business. Experience in production management and fabrication informs practical system design for real operations—where work moves through physical steps, multiple people, and critical handoffs. We apply that same practical design approach across warehousing, logistics, restaurants, ecommerce, and field services.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {industryApplications.map((ind, index) => {
              const Icon = ind.icon;
              return (
                <div key={ind.title} className="flex flex-col justify-between rounded-xl border border-border bg-background/80 p-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <span className="font-mono text-[9px] text-muted-foreground">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{ind.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-foreground/80 font-medium">{ind.summary}</p>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{ind.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative border-b border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="mb-10 max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Specialized Services</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From stubborn problem to working system.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Tailored business software and workflow automation delivered as owned systems, supported by commerce-ready storefronts and digital fabrication systems.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {publicServices.map((service) => {
              const Icon = serviceIcons[service.icon];
              return (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  <Card className="h-full bg-background/60 transition group-hover:border-primary/30">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <Icon className="size-5 text-primary" aria-hidden="true" />
                        {service.primary ? (
                          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-primary">
                            Primary specialty
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-8 text-lg font-medium">{service.name}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{service.summary}</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-primary">
                        Explore this service <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Operational Friction Section */}
      <section aria-labelledby="operators-heading" className="relative border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Built from the floor up</div>
              <h2 id="operators-heading" className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for businesses where the work is real.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                The best system is not the one with the longest feature list. It is the one that understands how a quote becomes a job, how material moves, where handoffs stall, and what the person doing the work needs to see next.
              </p>
              <p className="mt-5 max-w-xl text-sm leading-7 text-foreground/85">
                I bring production management, CNC fabrication, inventory, shipping, and day-to-day operations experience to the software side of the problem. That combination keeps the work grounded in what actually happens between the office, shop floor, truck, and customer.
              </p>
              <TrackedLink
                href="/workflow-audit"
                event="workflow_audit_cta_click"
                metadata={{ placement: "homepage-operators" }}
                className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-5 text-sm font-medium text-primary transition hover:bg-primary/15"
              >
                Book a workflow audit <ArrowRight className="size-4" />
              </TrackedLink>
            </div>
            <div className="border-t border-border lg:border-l lg:border-t-0 lg:pl-10">
              <div className="py-4 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground lg:pt-0">
                The operational drag usually looks like this
              </div>
              {operatingFriction.map(([label, description], index) => (
                <div key={label} className="grid gap-2 border-t border-border py-5 sm:grid-cols-[44px_110px_1fr] sm:items-start">
                  <span className="font-mono text-[9px] text-primary">0{index + 1}</span>
                  <h3 className="text-sm font-medium">{label}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 grid border-y border-border md:grid-cols-[.8fr_1.2fr]">
            <div className="py-6 md:border-r md:pr-8">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Who it is for</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Operators who need less chasing, fewer handoffs, and a clearer view of the work.
              </p>
            </div>
            <div className="grid sm:grid-cols-2">
              {[
                "Manufacturers and fabrication shops",
                "Logistics, freight, and warehousing hubs",
                "Restaurants and hospitality operations",
                "Ecommerce brands and specialty merchants",
                "Contractors and field-service fleets",
                "Owner-led businesses outgrowing spreadsheets",
              ].map((operator, index) => (
                <div
                  key={operator}
                  className="flex min-h-20 items-center gap-3 border-t border-border py-4 md:px-6 md:first:border-t-0 md:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(odd)]:border-r"
                >
                  <span className="font-mono text-[9px] text-primary">0{index + 1}</span>
                  <span className="text-sm font-medium leading-5">{operator}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Operating experience</span>
            {operatingExperience.map((item) => (
              <span key={item} className="text-xs text-foreground/75">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <FounderIntroduction />
      <EngagementPricing />

      {/* Selected Work */}
      <section id="work" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mb-12">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Selected work</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Systems with an operating point of view.</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Documented case studies and operational prototypes spanning production release control, internal operations, online commerce, inventory visibility, hospitality point of sale, employee scan workflows, and authenticated production analytics. Each profile states what exists today, what remains intended, and where evidence is still limited.
              </p>
            </div>
            <a
              href="https://github.com/yorkstead"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <Github className="size-4" />
              View GitHub <MoveUpRight className="size-3.5" />
            </a>
          </div>
          <ProjectStatusLegend />
        </div>
        <div className="space-y-4">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} />
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative border-t border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Project contact</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Have an operating problem worth fixing?</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              Share the messy version. A useful first conversation is about the current workflow, where it breaks, and what better would actually mean.
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Direct and confidential · Brandon York
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-primary" aria-hidden="true" />
                <TrackedLink
                  href={brandMailto}
                  event="email_link_click"
                  metadata={{ placement: "homepage-contact" }}
                  className="hover:text-primary"
                >
                  {brand.email}
                </TrackedLink>
              </div>
              {publicBusinessDetails.phone && publicBusinessPhoneHref ? (
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-primary" aria-hidden="true" />
                  <TrackedLink
                    href={publicBusinessPhoneHref}
                    event="phone_link_click"
                    metadata={{ placement: "homepage-contact" }}
                    className="hover:text-primary"
                  >
                    {publicBusinessDetails.phone}
                  </TrackedLink>
                </div>
              ) : null}
              <p className="pl-7 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                {brand.descriptor}
              </p>
            </div>
          </div>
          <Card className="bg-background/70">
            <CardContent className="p-6 sm:p-8">
              <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" aria-label="Loading contact form" />}>
                <ContactForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter>
        <nav aria-label="Service pages" className="flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
          {publicServices.map((service) => (
            <Link key={service.slug} href={`/services/${service.slug}`} className="transition hover:text-foreground">
              {service.name}
            </Link>
          ))}
        </nav>
      </SiteFooter>
    </main>
  );
}
