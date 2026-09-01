import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, Factory, FileSearch, Gauge, Map, ShieldCheck, Wrench, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { TrackedLink, WorkflowAuditViewTracker } from "@/components/conversion-tracker";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkflowAuditBookingLink, WorkflowAuditForm } from "@/components/workflow-audit-form";
import { Card, CardContent } from "@/components/ui/card";
import { brand } from "@/lib/brand";
import { workflowAuditEngagement } from "@/lib/engagements";
import { workflowAuditBookingURL } from "@/lib/workflow-audit-config";

export const metadata: Metadata = {
  title: "Workflow Diagnostic & Operations Systems Blueprint",
  description: "A focused paid operational diagnostic ($750–$1,500) that uncovers bottlenecks, spreadsheets, and re-entry friction, delivering an Operations Systems Blueprint credited 100% toward your project.",
  alternates: { canonical: "/workflow-audit" },
  openGraph: {
    title: `Workflow Diagnostic · ${brand.name}`,
    description: "Find where operational work is getting stuck and receive an Operations Systems Blueprint credited toward your build.",
    url: "/workflow-audit",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${brand.name} — ${brand.descriptor}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Workflow Diagnostic · ${brand.name}`,
    description: "Find where operational work is getting stuck and receive an Operations Systems Blueprint credited toward your build.",
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
  ["01", "Focused intake", "You share the core workflow, handoffs, tools, and immediate pain points without uploading sensitive records."],
  ["02", "Deep investigation", "Brandon spends time in the business tracing where data originates, where it gets re-entered, and where decisions stall."],
  ["03", "Impact ranking", "Every friction point and failure mode is analyzed and ranked by operational and financial impact on the business."],
  ["04", "Operations Blueprint", "You receive a complete Operations Systems Blueprint with current-state map, proposed architecture, and sequenced budget."],
];

const deliverables = [
  [Map, "Current-state workflow map", "A clear visual map of how work actually moves, where data gets re-entered, and where handoffs break."],
  [FileSearch, "Ranked friction & impact analysis", "Your operational bottlenecks ranked by direct financial cost, labor waste, and delivery risk."],
  [Wrench, "Proposed architecture & stack", "A modular technical solution designed around your existing strengths (QuickBooks, CAD, etc.)."],
  [ClipboardCheck, "Sequenced build plan & quote", "A phased implementation roadmap with exact scopes, timelines, and 100% diagnostic fee credit."],
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
            Paid Operational Review · {workflowAuditEngagement.priceLabel}
          </div>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-0.055em] sm:text-7xl">
            Find where your operations get stuck.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            A Workflow Diagnostic spends focused hours in your business uncovering the root causes of production bottlenecks, spreadsheets, inventory errors, and re-entry friction.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary">
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
            <span>100% credited toward your build project when hired within 30 days.</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink
              href="#audit-intake"
              event="workflow_audit_cta_click"
              metadata={{ placement: "workflow-audit-hero" }}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Start the qualification intake <ArrowRight className="size-4" />
            </TrackedLink>
            {bookingURL ? (
              <WorkflowAuditBookingLink
                href={bookingURL}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium"
              />
            ) : null}
          </div>
          <p className="mt-4 max-w-xl text-xs leading-5 text-muted-foreground">
            Fit, scope, fee, and timing are confirmed directly before booking. No payment is collected on this site.
          </p>
        </div>

        <Card className="bg-card/80 shadow-2xl backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Target symptoms</div>
                <div className="mt-1 text-sm font-medium">What we investigate & isolate during the diagnostic</div>
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

      {/* Process */}
      <section className="relative border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10 max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The Process</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From operational chaos to a clear architecture.
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
                    <ShieldCheck className="size-3.5" /> 100% credited toward build
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverable: Operations Systems Blueprint */}
      <section className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Tangible Deliverable</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">The Operations Systems Blueprint</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              You leave with a concrete, documented strategy that gives you total clarity on what to fix, what to keep, what to build, and what it will cost.
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
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Diagnostic Intake</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Start with the messy version.</h2>
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
                Submissions go directly to Brandon York for review and direct follow-up.
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

