import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Contact, Mail, MessageSquare, MoveUpRight, Phone } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { CardCostCalculator } from "@/components/card-cost-calculator";
import { TrackedLink } from "@/components/conversion-tracker";
import { ThemeToggle } from "@/components/theme-toggle";
import { cardContact, cardEmailHref, cardFullName, cardPhoneHref, cardTextHref } from "@/lib/contact-card";

export const metadata: Metadata = {
  title: `${cardFullName}, Founder`,
  description: "Software you own. No subscription. Save Brandon's contact, see two working demos, and compare years of software fees with buying once.",
  alternates: { canonical: "/card" },
  robots: { index: false, follow: true },
};

const demos = [
  {
    href: "/demos/rework",
    name: "Rework Flow",
    kind: "Walkthrough",
    summary: "A freight rework dock, from the driver's bay reservation to an invoice you can explain. Screens from the real application, made-up data.",
  },
  {
    href: "https://240.yorkstead.com",
    name: "Union OS",
    kind: "Live demo",
    summary: "Tableside ordering, kitchen and payments for a neighborhood restaurant. Click through it yourself. Nothing you do is saved.",
  },
];

export default function CardPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_42%)]" />

      <div className="relative mx-auto max-w-md px-4 pb-16">
        <header className="flex items-center justify-between py-4">
          <BrandMark showDescriptor={false} />
          <ThemeToggle />
        </header>

        <section className="pt-6">
          <h1 className="text-3xl font-semibold tracking-tight">{cardFullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cardContact.title}, {cardContact.organization} · {cardContact.city}
          </p>

          <p className="mt-6 text-2xl font-semibold leading-tight tracking-tight">
            Software you own. <span className="text-primary">No subscription.</span>
          </p>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            We build software around how your shop, warehouse, kitchen or crew actually works, and hand it over as something you own. Support is there if you want it, never required to keep running.
          </p>

          <div className="mt-6 grid gap-2.5">
            <TrackedLink
              href="/card/vcard"
              download="brandon-york.vcf"
              event="contact_save_click"
              metadata={{ placement: "card" }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
            >
              <Contact className="size-4" />
              Save my contact
            </TrackedLink>
            <TrackedLink
              href={cardTextHref}
              event="phone_link_click"
              metadata={{ placement: "card", destination: "sms" }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 text-sm font-medium text-primary transition hover:bg-primary/15"
            >
              <MessageSquare className="size-4" />
              Text me: {cardContact.phoneDisplay}
            </TrackedLink>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            A text is the fastest way to reach me. Tell me what you&apos;re running on today.
          </p>
        </section>

        <section className="mt-12" aria-labelledby="demos-heading">
          <h2 id="demos-heading" className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">See what we build</h2>
          <div className="mt-3 grid gap-3">
            {demos.map((demo) => (
              <a key={demo.href} href={demo.href} className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">{demo.name}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{demo.kind}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{demo.summary}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Open it {demo.href.startsWith("http") ? <MoveUpRight className="size-3.5" /> : <ArrowRight className="size-3.5" />}
                </span>
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Both are demos modeled on real kinds of businesses, not systems a customer runs today.{" "}
            <Link href="/demos" className="underline underline-offset-2 hover:text-foreground">See every walkthrough</Link>.
          </p>
        </section>

        <section className="mt-12" aria-labelledby="cost-heading">
          <h2 id="cost-heading" className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Renting vs. owning</h2>
          <div className="mt-3">
            <CardCostCalculator />
          </div>
        </section>

        <section className="mt-12 border-t border-border pt-6 text-sm">
          <div className="grid gap-3">
            <TrackedLink href={cardPhoneHref} event="phone_link_click" metadata={{ placement: "card", destination: "call" }} className="inline-flex items-center gap-2.5 text-muted-foreground hover:text-foreground">
              <Phone className="size-4 text-primary" /> Call {cardContact.phoneDisplay}
            </TrackedLink>
            <TrackedLink href={cardEmailHref} event="email_link_click" metadata={{ placement: "card" }} className="inline-flex items-center gap-2.5 text-muted-foreground hover:text-foreground">
              <Mail className="size-4 text-primary" /> {cardContact.email}
            </TrackedLink>
            <Link href="/" className="inline-flex items-center gap-2.5 text-muted-foreground hover:text-foreground">
              <ArrowRight className="size-4 text-primary" /> yorkstead.com
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
