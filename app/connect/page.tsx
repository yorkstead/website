import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { ConnectPortal } from "@/components/connect-portal";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Operator Gateway · Brandon York | Yorkstead Systems",
  description: "Digital access gateway for Brandon York, Founder & Principal Systems Architect at Yorkstead Systems. Operational software and workflow automation for manufacturing, logistics, and hospitality.",
  alternates: { canonical: "/connect" },
  openGraph: {
    title: `Operator Gateway · Brandon York · ${brand.name}`,
    description: "Digital access gateway for manufacturing, logistics, and hospitality operational software.",
    url: "/connect",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${brand.name} — Operator Gateway` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Operator Gateway · Brandon York · ${brand.name}`,
    description: "Digital access gateway for manufacturing, logistics, and hospitality operational software.",
    images: ["/opengraph-image"],
  },
};

export default function ConnectPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_40%)]" />

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8 border-b border-border/40">
        <BrandMark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Home
          </Link>
        </div>
      </header>

      <ConnectPortal />

      <SiteFooter />
    </main>
  );
}
