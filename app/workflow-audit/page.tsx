import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, Factory, FileSearch, Gauge, Map, ShieldCheck, Wrench, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { TrackedLink, WorkflowAuditViewTracker } from "@/components/conversion-tracker";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkflowAuditBookingLink, WorkflowAuditForm } from "@/components/workflow-audit-form";
import { WorkflowRescueCheck } from "@/components/workflow-rescue-check";
import { Card, CardContent } from "@/components/ui/card";
import { brand } from "@/lib/brand";
import { workflowAuditEngagement } from "@/lib/engagements";
import { workflowAuditBookingURL } from "@/lib/workflow-audit-config";

export const metadata: Metadata = {
  title: "Workflow Rescue for Broken Business Processes",
  description: "Choose one frustrating workflow. Yorkstead maps the handoffs, ranks the breakdowns, and delivers an Operations Systems Blueprint with a practical next step.",
  alternates: { canonical: "/workflow-audit" },
  openGraph: {
    title: `Workflow Rescue · ${brand.name}`,
    description: "Bring Yorkstead the workflow your team hates. Get a clear map, ranked bottlenecks, and a practical fix.",
    url: "/workflow-audit",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${brand.name} — ${brand.descriptor}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Workflow Rescue · ${brand.name}`,
    description: "Bring Yorkstead the workflow your team hates. Get a clear map, ranked bottlenecks, and a practical fix.",
    images: ["/opengraph-image"],
  },
};

const friction = [
  "Spreadsheets passed around",
  "Information re-entered in multiple places",
  "Paper travelers & clipboard sheets",
  "Undocumented tribal knowledge",
  "Production bottlenecks & late jobs",
  "Inventory & material uncertainty",
  "Scheduling conflicts across teams",
  "Single-employee dependency silos",
  "Duplicate & disconnected SaaS tools",
  "Management asking, “Where is this?”",
];

const process = [
  ["01", "Focused intake", "You choose one workflow and share the handoffs, tools, and immediate pain points without uploading sensitive records."],
  ["02", "Working session", "Brandon follows one representative job through the process and separates the normal path from exceptions and workarounds."],
  ["03", "Impact ranking", "Observed friction is ranked by operational impact, with measured facts separated from staff estimates and unknowns."],
  ["04", "Operations Blueprint", "You receive the workflow map, ranked findings, recommended next step, and an optional implementation scope within the agreed delivery window."],
];

const deliverables = [
  [Map, "Current-state workflow map", "A clear visual map of how work actually moves, where data gets re-entered, and where handoffs break."],
  [FileSearch, "Ranked friction & impact analysis", "Observed bottlenecks ranked by impact, with evidence and estimates clearly distinguished."],
  [Wrench, "Proposed architecture & stack", "A modular technical solution designed around your existing strengths (QuickBooks, CAD, etc.)."],
  [ClipboardCheck, "Sequenced build plan & quote", "A proposed implementation contract with scope, price, acceptance criteria and handoff. Implementation uses structured milestone payments confirmed in writing."],
];

export default function WorkflowAuditPage() {
  const bookingURL = workflowAuditBookingURL();
  return (
    <main className="min-h-screen overflow-hidden">
      <WorkflowAuditViewTracker />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_38%)]" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/packages"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Pricing & Model
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            Workflow Rescue · {workflowAuditEngagement.priceLabel}
          </div>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-0.055em] sm:text-7xl">
            Bring me the workflow your team hates.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Pick one repeated process where work gets re-entered, chased, delayed, or trapped with one person. Yorkstead will map how it actually moves, rank the breakdowns, and show you the smallest practical way to fix it.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary">
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
            <span>First three qualified clients · one workflow · target delivery within 7 business days.</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink
              href="#bottleneck-check"
              event="workflow_audit_cta_click"
              metadata={{ placement: "workflow-audit-hero" }}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Check your workflow <ArrowRight className="size-4" />
            </TrackedLink>
            {bookingURL ? (
              <WorkflowAuditBookingLink
                href={bookingURL}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium"
              />
            ) : null}
          </div>
          <p className="mt-4 max-w-xl text-xs leading-5 text-muted-foreground">
            The founding rate covers the review and Blueprint for one workflow. Fit, inputs, and delivery timing are confirmed directly before booking. No payment is collected on this site.
          </p>
        </div>

        <Card className="bg-card/80 shadow-2xl backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Strong rescue signals</div>
                <div className="mt-1 text-sm font-medium">What makes one workflow worth investigating</div>
              </div>
              <Gauge className="size-5 shrink-0 text-primary" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {friction.map((item, index) => (
                <div key={item} className="flex items-center gap-2.5 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs">
                  <span className="font-mono text-[9px] text-primary">0{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="bottleneck-check" className="relative mx-auto max-w-7xl scroll-mt-6 px-5 pb-20 sm:px-8">
        <WorkflowRescueCheck />
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <h2 className="text-2xl font-semibold">Own the solution and the ability to run it</h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Buy the agreed custom assets with source, operating instructions, and a documented handoff, with a strongly recommended review by a developer you choose and pay. Evaluate client-owned hardware and in-house servers where they add value. Final ownership transfer follows payment. Hosting and third-party services are identified separately. Account ownership, billing, and ongoing responsibilities are agreed before implementation. Optional support retainers cover questions, troubleshooting triage, and scheduled health checks, with scope and terms agreed in the proposal, and are not required to keep using the purchased system.</p>
      </section>

      {/* Process */}
      <section className="relative border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10 max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The Process</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From a frustrating handoff to a practical next step.
            </h2>
          </div>
          <div className="grid border-y border-border lg:grid-cols-4">
            {process.map(([number, title, description], index) => (
              <div
                key={title}
                className="border-t border-border py-6 first:border-t-0 lg:border-l lg:border-t-0 lg:px-6 lg:first:border-l-0 lg:first:pl-0"
              >
                <span className="font-mono text-[9px] text-primary">{number}</span>
                <h3 className="mt-5 text-base font-medium">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                {index === 3 ? (
                  <span className="mt-5 inline-flex items-center gap-2 text-xs text-primary">
                    <ShieldCheck className="size-3.5" /> Findings and proposed contract
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Fictional example · not a customer result</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">See what the Blueprint makes visible.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              A Blueprint does not begin by prescribing new software. It makes the current record, broken handoff, operational consequence, and smallest safe intervention explicit.
            </p>
          </div>
          <Card className="overflow-hidden bg-background/75">
            <CardContent className="p-0">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Example workflow · quote to production release</div>
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-3">
                <div className="bg-card p-5">
                  <div className="font-mono text-[9px] text-primary">01 · CURRENT RECORD</div>
                  <h3 className="mt-3 text-sm font-medium">Inbox + estimating sheet</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Customer requirements arrive in email, then get copied into a private spreadsheet.</p>
                </div>
                <div className="bg-card p-5">
                  <div className="font-mono text-[9px] text-amber-500">02 · BREAKDOWN</div>
                  <h3 className="mt-3 text-sm font-medium">Approval loses revision context</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">The shop receives a release, but cannot see whether the quoted drawing is still current.</p>
                </div>
                <div className="bg-card p-5">
                  <div className="font-mono text-[9px] text-emerald-500">03 · SMALLEST FIX</div>
                  <h3 className="mt-3 text-sm font-medium">One controlled release checkpoint</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Keep existing tools; add a shared approval record that locks the released revision and owner.</p>
                </div>
              </div>
              <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2 sm:p-6">
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <div className="text-xs font-medium">Finding ranked: high operational impact</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Evidence required: two recent revision changes, who discovered them, and what work had already begun.</p>
                </div>
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <div className="text-xs font-medium">Recommendation: validate before building</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Pilot the checkpoint beside the existing process, then decide whether automation is justified.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Deliverable: Operations Systems Blueprint */}
      <section className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Tangible Deliverable</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">The Operations Systems Blueprint</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              You leave with a concrete, documented strategy showing what to keep, what to simplify, what might justify automation, and what the next implementation would include.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {deliverables.map(([Icon, title, description]) => (
              <Card key={title as string} className="bg-card/60">
                <CardContent className="p-6">
                  <Icon className="size-5 text-primary" />
                  <h3 className="mt-7 text-base font-medium">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description as string}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Qualification Intake */}
      <section id="audit-intake" className="relative border-t border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.55fr_1.45fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Workflow Rescue intake</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Tell me the messy version.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Tell us about the process, the spreadsheets, and where your team is losing time. We do not require sensitive customer records, trade secrets, or financial files.
            </p>
            <div className="mt-7 space-y-3 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
              <p className="flex gap-2">
                <Factory className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Best fit: manufacturers, fabrication shops, custom builders, field-service operations, and owner-led teams.
              </p>
              <p className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Submissions go directly to Brandon York for fit review. The $750 founding rate is offered to the first three qualified one-workflow engagements.
              </p>
            </div>
          </div>
          <Card className="bg-background/75">
            <CardContent className="p-6 sm:p-8">
              <WorkflowAuditForm bookingURL={bookingURL} />
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
