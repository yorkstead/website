import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, CheckCircle2, Clock, FileSpreadsheet, FileText, HeartPulse, Lock, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Behavioral Health Case Management OS | Free Download",
  description: "A complete, audit-proof Obsidian workspace designed to eliminate administrative burnout for behavioral health case managers, intake coordinators, and IOP/PHP clinical teams.",
  alternates: { canonical: "/case-management" },
};

export default function CaseManagementPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_75%_0%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_38%)]" />

      {/* Header */}
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandMark />
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Link href="/solutions" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:block">
            Solutions
          </Link>
          <Link href="/demos" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:block">
            Demos
          </Link>
          <Link href="/work" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:block">
            Work
          </Link>
          <Link href="/case-management" className="px-3 py-2 text-xs text-foreground font-semibold border-b-2 border-primary">
            Case Management OS
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
            Clinical Operations // Free Obsidian Vault Bundle
          </div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl">
            The Behavioral Health <span className="text-primary">Case Management OS.</span>
          </h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg">
            A battle-tested, audit-proof operating system for case managers juggling Intakes, PHP/IOP coordination, Medi-Drive transit, Methadone/MAT dosing, Utilization Reviews, and 30/60/90-day Treatment Plans.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/downloads/case-management-system.zip"
              download="case-management-system.zip"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
            >
              <ArrowDownToLine className="size-5" />
              <span>Download Vault Bundle (.zip)</span>
            </a>
            <a
              href="#installation"
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium transition hover:border-primary/40"
            >
              <span>Setup Guide (30 Seconds)</span>
              <ArrowRight className="size-4" />
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="size-4" /> 100% HIPAA Safe (Local Markdown)
            </span>
            <span>•</span>
            <span>Zero SaaS subscription</span>
            <span>•</span>
            <span>Includes 1-Click Local OCR Scripts</span>
          </div>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What&apos;s Included in the Vault</h2>
          <p className="mt-2 text-sm text-muted-foreground">Built to replace scattered sticky notes, messy spreadsheets, and constant fire-fighting.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card/70 border-border">
            <CardContent className="p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Clock className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">5-Block Daily Cadence</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Time-blocking system that builds a morning firewall for transit/MAT holds, blocks distraction-free client hours, sets a fixed UR window, and reserves afternoon focus for clinical writing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FileText className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">Golden Thread Treatment Plans</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Modular 30/60/90-day review templates paired with an audit-proof SMART Goal Bank for Substance Use, Depression, Trauma, Housing, and Medication Adherence.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Truck className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">Medi-Drive (NEMT) Logistics</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Standing ride schedules, broker escalation rolodex (Modivcare, Veyo), and word-for-word phone scripts to force dispatchers to send emergency rescue rides when drivers no-show.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <HeartPulse className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">Methadone & MAT Coordination</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                OTP clinic directory with direct dosing nurse lines, 42 CFR Part 2 ROI tracking, weekly toxicology/attendance batching, and protocols to immediately resolve dosing holds.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FileSpreadsheet className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">UR Authorization Cheat Sheet</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Rapid cheat sheet distilling the 6 ASAM dimensions into defensible phrases that insurance reviewers and Medicaid auditors require to approve PHP and IOP continued stay.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/70 border-border">
            <CardContent className="p-6">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">Handwritten Intake OCR</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Includes automated Python scripts (with 1-click Windows `.bat` launchers) to transcribe scanned paper intake packets via local Ollama Vision AI or Gemini Vision directly into client files.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Setup Guide Section */}
      <section id="installation" className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Card className="bg-card/80 border-border overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <div className="max-w-2xl">
              <div className="font-mono text-xs text-primary uppercase tracking-widest mb-3">Quick Start</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-6">How to Open in Obsidian (30 Seconds)</h2>
              
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-mono text-xs font-bold mt-0.5">1</div>
                  <div>
                    <p className="font-medium text-foreground">Download the archive</p>
                    <p className="mt-1">Click the download button above or grab <a href="/downloads/case-management-system.zip" download className="text-primary underline">case-management-system.zip</a> (~45 KB).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-mono text-xs font-bold mt-0.5">2</div>
                  <div>
                    <p className="font-medium text-foreground">Extract the ZIP file</p>
                    <p className="mt-1">Right-click the zip file in Windows Explorer and select <strong>&quot;Extract All...&quot;</strong> to your documents, Dropbox, or Google Drive folder.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-mono text-xs font-bold mt-0.5">3</div>
                  <div>
                    <p className="font-medium text-foreground">Open as a Vault in Obsidian</p>
                    <p className="mt-1">In Obsidian, click the vault icon (bottom left) $\rightarrow$ select <strong>&quot;Open folder as vault&quot;</strong> $\rightarrow$ choose the extracted <code>case-management</code> folder.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-mono text-xs font-bold mt-0.5">4</div>
                  <div>
                    <p className="font-medium text-foreground">Start with the Quick-Start Guide</p>
                    <p className="mt-1">Open <code>START HERE - Quick-Start Guide for Case Managers.md</code> or <code>00 - Dashboard.md</code> to begin your workday.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-4">
                <a
                  href="/downloads/case-management-system.zip"
                  download="case-management-system.zip"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                >
                  <ArrowDownToLine className="size-4" />
                  <span>Download case-management-system.zip</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
