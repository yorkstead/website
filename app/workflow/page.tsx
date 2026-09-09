import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Factory, Gauge, GitBranch, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { MetaPixel } from "@/components/meta-pixel";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkflowLeadForm } from "@/components/workflow-lead-form";
import { Card, CardContent } from "@/components/ui/card";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Fix Broken Business Workflows | Yorkstead Systems",
  description: "Yorkstead Systems helps Colorado businesses fix operational bottlenecks across production, inventory, scheduling, documents, reporting, logistics, and internal workflows.",
  alternates: { canonical: "/workflow" },
  openGraph: {
    title: "Fix Broken Business Workflows | Yorkstead Systems",
    description: "Show me what is slowing your business down.",
    url: "/workflow",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${brand.name} — ${brand.descriptor}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fix Broken Business Workflows | Yorkstead Systems",
    description: "Yorkstead Systems helps Colorado businesses fix operational bottlenecks across production, inventory, scheduling, documents, reporting, logistics, and internal workflows.",
    images: ["/opengraph-image"],
  },
};

const painStatements = [
  "The spreadsheet has become the database.",
  "Employees enter the same information more than once.",
  "Nobody knows the real status of a job without asking someone.",
  "Important processes exist only in one employee's head.",
  "Paper moves with the work.",
  "Management spends time gathering information instead of using it.",
  "Customers call because internal systems don't show them what's happening.",
  "Your software does hundreds of things but not the few things your operation actually needs.",
];

const approach = [
  "workflow redesign",
  "automation",
  "integration",
  "focused software",
  "reporting",
  "operational visibility",
  "better information flow",
  "elimination of duplicate work",
  "improved process ownership",
];

const projectExamples = [
  {
    title: "Rework Flow",
    description: "Problem → Intervention → Result",
    detail: "Fragmented workflow ownership, status visibility, accountability gaps, and information that only existed in a few people’s heads.",
    href: "/work",
  },
  {
    title: "Yorkstead Operations",
    description: "Problem → Intervention → Result",
    detail: "Production coordination, inventory accuracy, scheduling visibility, and reporting designed around daily operations rather than a spreadsheet abstraction.",
    href: "https://ops.yorkstead.com/demo",
  },
  {
    title: "Freight Flow",
    description: "Problem → Intervention → Result",
    detail: "Freight coordination, workflow visibility, communication friction, and status updates that reduced wasted calls and decision delays.",
    href: "/demos",
  },
];

export default function WorkflowPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <MetaPixel />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_38%)]" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Workflow lead funnel</div>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-0.055em] sm:text-7xl">
            Your business probably doesn&apos;t need more software.
          </h1>
          <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] text-foreground/90 sm:text-5xl">
            It needs the right system.
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Yorkstead identifies operational bottlenecks and builds focused workflows that remove wasted work, lost information, duplicate entry, and unnecessary complexity.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#workflow-form" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
              Show Me the Problem <ArrowRight className="size-4" />
            </a>
            <a href="#proof" className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium">
              See What We&apos;ve Built
            </a>
          </div>
        </div>

        <Card className="bg-card/80 shadow-2xl backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Operating drag</div>
                <div className="mt-1 text-sm font-medium">The problem usually isn’t software—it’s the workflow.</div>
              </div>
              <Gauge className="size-5 shrink-0 text-primary" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                "A process has become a spreadsheet",
                "Status depends on memory and follow-up",
                "The same job is tracked in several places",
                "Customers wait on answers that should be visible",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-3 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="relative border-y border-border bg-card/35">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
          <div className="mb-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Recognition</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Does this sound familiar?</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {painStatements.map((item) => (
              <div key={item} className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm leading-6 text-foreground/90">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-xl font-medium tracking-tight">These are systems problems.</p>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The Yorkstead approach</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Show me what&apos;s slowing your business down.</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Yorkstead is not simply a custom software shop. We look at the actual operation first: how work moves, where information gets lost, where ownership breaks down, and what decision makers are forced to chase manually. The solution may be a workflow redesign, automation, integration, focused software, reporting, operational visibility, better information flow, elimination of duplicate work, or improved process ownership.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {approach.map((item) => (
              <span key={item} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="relative border-y border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="mb-10 max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Proof</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">See what smarter workflow design looks like.</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {projectExamples.map((project) => (
              <Card key={project.title} className="h-full bg-background/70">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">{project.title}</div>
                  <h3 className="mt-5 text-xl font-semibold">{project.description}</h3>
                  <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">{project.detail}</p>
                  <Link href={project.href} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Explore this example <ArrowRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow-form" className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.64fr_1.36fr]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Tell us the problem</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Show Yorkstead the problem.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Something in your operation is harder than it should be. Yorkstead can find out why and fix it.
            </p>
            <div className="mt-8 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <div className="flex gap-3"><Factory className="mt-0.5 size-4 shrink-0 text-primary" /><span>Production, inventory, scheduling, documents, customer service, shipping, and reporting all count.</span></div>
              <div className="flex gap-3"><GitBranch className="mt-0.5 size-4 shrink-0 text-primary" /><span>We look for the actual workflow bottleneck before recommending a system.</span></div>
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>Direct responses, clear follow-up, and a realistic recommendation path.</span></div>
            </div>
          </div>

          <Card className="bg-background/70">
            <CardContent className="p-6 sm:p-8">
              <WorkflowLeadForm />
            </CardContent>
          </Card>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
