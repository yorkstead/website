import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Terminal, RefreshCcw } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Walkthroughs",
  description: "Step-by-step walkthroughs of our working prototypes: freight rework, manufacturing release control, freight brokerage, restaurant operations and more. Made-up data throughout.",
  alternates: { canonical: "/demos" },
};

export default function DemosPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_38%)]" />

      {/* Header */}
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#services" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:block">
            Software + automation
          </Link>
          <Link href="/demos" className="px-3 py-2 text-xs text-foreground font-semibold border-b-2 border-primary">
            Walkthroughs
          </Link>
          <Link href="/#work" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:block">
            Work
          </Link>
          <Link href="/about" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground lg:block">
            About
          </Link>
          <Link href="/#contact" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:block">
            Contact
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-5 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Walkthroughs // Made-up Data
          </div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl">
            Follow the software. <span className="text-primary">See how it works.</span>
          </h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg">
            Each walkthrough follows a working prototype modeled on a real kind of business, screen by screen, with made-up data. We built them to show how we work, not as finished products.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              <span>Made-up Data Only</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCcw className="size-4 text-primary" />
              <span>Resets on Reload</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Terminal className="size-4 text-primary" />
              <span>No Login, No Charges</span>
            </div>
          </div>
        </div>
      </section>

      {/* Demos Showcase Grid */}
      <section className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="space-y-8">
          {[
            { href: "/demos/rework", label: "Flagship", title: "Rework Flow: from arrival to an explainable invoice", body: "Follow a freight load from the driver's bay reservation through dock intake, rework and the completion packet, using screens from the real application.", cta: "Open the walkthrough", study: "/work/rework-flow" },
            { href: "/demos/ellwood", label: "Concept", title: "Ellwood Flow: from release to the shop floor", body: "Follow a manufacturing release from its current revision through the production queue, shop-floor scans, inspection and pallet planning, using screens from the prototype. A concept inspired by past workplace experience.", cta: "Open the walkthrough", study: "/work/ellwood-flow" },
            { href: "https://240.yorkstead.com", label: "Flagship", title: "Union OS: restaurant operations", body: "A tableside ordering, kitchen and payments prototype built around a real neighborhood restaurant.", cta: "Open the live demo", study: "/work/table-os" },
            { href: "/demos/freight-flow", label: "Concept", title: "FreightFlow: what needs attention, and who acts", body: "Follow a freight brokerage exception from the morning overview to a ranked queue, a load, a customer update and the rules behind it. It sits beside the TMS a brokerage already runs." , cta: "Open the walkthrough" },
            { href: "/demos/sic-pizza", label: "Concept", title: "SIC Pizza: one live table for everyone", body: "A fictional pizza restaurant shows a guest proposal, server approval, kitchen stations, expo and manager views built on one shared table.", cta: "Open the walkthrough", study: "/work/sic-pizza-pos" },
            { href: "/demos/barcodes", label: "Working tool", title: "Employee barcode labels", body: "Keep an employee directory and print sheets of Code 128 labels for scan-based handoffs. The first tool we built, now shown as a walkthrough.", cta: "Open the walkthrough", study: "/work/employee-barcodes" },
            { href: "/demos/leads-rescue", label: "Concept", title: "Leads Rescue: texting back missed calls", body: "A contractor misses a call from a roof. An automatic text collects the issue and address and offers inspection times. A simulation aimed at contractors.", cta: "Open the walkthrough" },
          ].map((demo) => (
            <div key={demo.href} className="rounded-xl border border-border bg-card p-7">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">{demo.label}</span>
              <h2 className="mt-3 text-2xl font-semibold">{demo.title}</h2>
              <p className="mt-3 max-w-3xl text-muted-foreground">{demo.body}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                <a href={demo.href} className="inline-flex items-center gap-2 font-medium text-primary hover:underline">{demo.cta} <ArrowRight className="size-4" /></a>
                {demo.study && <Link href={demo.study} className="text-sm text-muted-foreground hover:text-foreground">Read the case study</Link>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Banner */}
      <section className="relative border-t border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary mb-2">
            Tailored Engineering
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Want software built around how your business runs?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Tell us where the handoffs break down and we will show you what a focused system, owned by you, could look like.
          </p>
          <div className="mt-6">
            <Link
              href="/#contact"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
            >
              <span>Start a conversation</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
