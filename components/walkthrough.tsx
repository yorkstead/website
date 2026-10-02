import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import type { WalkthroughStep } from "@/lib/rework-walkthrough";

type WalkthroughProps = {
  eyebrow: string;
  title: string;
  intro: string;
  note: string;
  steps: WalkthroughStep[];
  cta: { heading: string; body: string; inquiryLabel: string; inquiryHref: string; caseStudyHref: string };
};

/** The shared layout for every demo walkthrough: hero, jump chips, alternating step sections, closing call to action. */
export function Walkthrough({ eyebrow, title, intro, note, steps, cta }: WalkthroughProps) {
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
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{intro}</p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{note}</p>
        <ol className="mt-6 flex flex-wrap gap-2 text-xs">
          {steps.map((step, index) => (
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
        {steps.map((step, index) => (
          <section
            key={step.id}
            id={step.id}
            aria-labelledby={`${step.id}-title`}
            className={`grid scroll-mt-8 gap-8 border-t border-border py-12 ${step.device === "phone" ? "md:grid-cols-2 md:items-start md:gap-12" : "md:gap-10"}`}
          >
            <div className={step.device === "phone" ? (index % 2 === 1 ? "md:order-2" : undefined) : "max-w-3xl"}>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">Step {index + 1} · {step.who}</p>
              <h2 id={`${step.id}-title`} className="mt-3 text-2xl font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{step.body}</p>
              {step.detail && <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.detail}</p>}
            </div>
            <div className={step.device === "phone" && index % 2 === 1 ? "md:order-1" : undefined}>
              <Image
                src={step.image.src}
                alt={step.image.alt}
                width={step.image.width}
                height={step.image.height}
                sizes={step.device === "phone" ? "(min-width: 768px) 360px, 90vw" : "(min-width: 1152px) 1100px, 100vw"}
                quality={80}
                className={`h-auto rounded-xl border border-border shadow-lg ${step.device === "phone" ? "mx-auto w-full max-w-[360px]" : "w-full"}`}
              />
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">{cta.heading}</h2>
          <p className="mt-3 text-muted-foreground">{cta.body}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href={cta.inquiryHref} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90">
              {cta.inquiryLabel} <ArrowRight className="size-4" />
            </Link>
            <Link href={cta.caseStudyHref} className="text-sm text-muted-foreground hover:text-foreground">Read the case study</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
