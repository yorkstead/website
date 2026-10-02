import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { reworkWalkthroughSteps } from "@/lib/rework-walkthrough";

export const metadata: Metadata = {
  title: "Rework Flow walkthrough | Yorkstead",
  description: "Follow a freight rework job from a driver's reservation to a signed completion packet, using screens from the real Rework Flow application.",
  alternates: { canonical: "/demos/rework" },
};

export default function ReworkWalkthroughPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-3">
          <Link href="/demos" className="text-sm text-muted-foreground hover:text-foreground">← All demos</Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-10 pt-8 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Walkthrough</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Rework Flow, step by step</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          A freight load is rejected at a receiver and needs fixing at a dock. Here is that job from the driver&apos;s reservation to a signed packet the office can bill from, in seven screens.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          These are screens from the working application, run with a made-up company name and example loads. The software is in development and has not been measured in a live operation.
        </p>
        <ol className="mt-6 flex flex-wrap gap-2 text-xs">
          {reworkWalkthroughSteps.map((step, index) => (
            <li key={step.id}>
              <a href={`#${step.id}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground transition hover:border-primary hover:text-foreground">
                <span className="font-mono text-primary">{index + 1}</span>
                {step.label}
              </a>
            </li>
          ))}
        </ol>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        {reworkWalkthroughSteps.map((step, index) => (
          <section
            key={step.id}
            id={step.id}
            aria-labelledby={`${step.id}-title`}
            className="grid scroll-mt-8 gap-8 border-t border-border py-12 md:grid-cols-2 md:items-start md:gap-12"
          >
            <div className={index % 2 === 1 ? "md:order-2" : undefined}>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">Step {index + 1} · {step.who}</p>
              <h2 id={`${step.id}-title`} className="mt-3 text-2xl font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{step.body}</p>
              {step.detail && <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.detail}</p>}
            </div>
            <div className={index % 2 === 1 ? "md:order-1" : undefined}>
              <Image
                src={step.image.src}
                alt={step.image.alt}
                width={step.image.width}
                height={step.image.height}
                sizes={step.device === "phone" ? "(min-width: 768px) 360px, 90vw" : "(min-width: 768px) 560px, 100vw"}
                quality={80}
                className={`h-auto rounded-xl border border-border shadow-lg ${step.device === "phone" ? "mx-auto w-full max-w-[360px]" : "w-full"}`}
              />
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Want this around your own dock?</h2>
          <p className="mt-3 text-muted-foreground">We build it to fit how your operation already works, and you own the result.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/?product=rework-flow#contact" className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90">
              Inquire about Rework Flow <ArrowRight className="size-4" />
            </Link>
            <Link href="/work/rework-flow" className="text-sm text-muted-foreground hover:text-foreground">Read the case study</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
