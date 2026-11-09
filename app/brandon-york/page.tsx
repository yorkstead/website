import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Github, Mail } from "lucide-react";
import { FounderPortrait } from "@/components/founder-portrait";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brand, brandMailto } from "@/lib/brand";
import { founder, founderProfileStructuredData } from "@/lib/founder";

const title = "Brandon York | Founder & Systems Architect at Yorkstead Systems";
const description =
  "Brandon York founded Yorkstead Systems to build focused operational software, business integrations, and workflow automation for small and midsize businesses.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/brandon-york" },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    type: "profile",
    url: "/brandon-york",
    siteName: brand.name,
    images: [{
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: `${brand.name} — ${brand.descriptor}`,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

export default function BrandonYorkPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(founderProfileStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_72%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_38%)]" />
      <SiteHeader />
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1fr_380px] lg:items-center lg:gap-20">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Founder profile // Yorkstead Systems</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">{founder.name}</h1>
          <p className="mt-5 text-xl font-medium sm:text-2xl">{founder.role} at <Link href="/" className="text-primary hover:underline">{brand.name}</Link></p>
          <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground">
            I build focused operational systems, custom business software, integrations, and automation for small and midsize businesses. The goal is not to replace everything a business already uses. It is to identify where work slows down, connect what should work together, and build only what makes the operation better.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-foreground/85">
            My experience spans manufacturing, CNC fabrication, inventory, shipping, warehousing, freight and logistics, restaurants, e-commerce, and service operations. Working directly with the people who run those workflows shapes how I design software.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/#contact" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
              Discuss your workflow <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/work" className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium">
              See selected work <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <FounderPortrait priority className="mx-auto w-full max-w-[380px] lg:mx-0" />
      </section>

      <section aria-labelledby="approach-heading" className="relative border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">How I work</p>
            <h2 id="approach-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start with the operation.</h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-muted-foreground">
            <p>First, I learn the actual workflow: where information originates, who needs it next, and which handoffs create delays, repeated entry, or uncertainty.</p>
            <p>Next, I look for ways to simplify the process and integrate existing tools. When a focused application is the right answer, I design it around the team’s responsibilities and the information they need to trust.</p>
            <p>The work can include internal web applications, databases, mobile-friendly workflows, system integrations, automation, deployment, and ongoing operations. I primarily build with TypeScript, React, Next.js, and PostgreSQL, selecting the rest of the stack to fit the project rather than the other way around.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="more-heading" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <h2 id="more-heading" className="text-2xl font-semibold tracking-tight">More about the work</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
          Yorkstead Systems focuses on practical, maintainable software that fits how a business operates and gives its owner meaningful control over the result.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/about" className="inline-flex items-center gap-2 text-primary hover:underline">About Yorkstead <ArrowRight className="size-4" aria-hidden="true" /></Link>
          <Link href="/work" className="inline-flex items-center gap-2 text-primary hover:underline">Project portfolio <ArrowRight className="size-4" aria-hidden="true" /></Link>
          <a href="https://github.com/yorkstead" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline"><Github className="size-4" aria-hidden="true" />Yorkstead on GitHub</a>
          <a href={brandMailto} className="inline-flex items-center gap-2 text-primary hover:underline"><Mail className="size-4" aria-hidden="true" />Contact Yorkstead</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
