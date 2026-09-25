"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Server,
  DollarSign,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ExternalLink,
  Flame,
  Sparkles,
  Cpu,
  Split,
  ArrowRight,
} from "lucide-react";

interface SlideData {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  highlights: { label: string; value: string; detail: string }[];
  visualType: "hardware" | "speed-split" | "kds" | "roi" | "closeout";
}

const slides: SlideData[] = [
  {
    id: "hardware",
    badge: "Connected Operating System",
    title: "Run the Restaurant from One Connected System",
    subtitle:
      "Tables, ordering, coursing, kitchen execution, payments, cellar inventory, shift handoff, and management workflows united in one restaurant-specific operating system.",
    icon: Server,
    highlights: [
      { label: "Architecture", value: "Local-First LAN", detail: "Sub-5ms terminal response across all stations" },
      { label: "Outage Resilience", value: "Local Continuity", detail: "Core restaurant operations continue when internet drops" },
      { label: "Hardware Model", value: "Direct Commercial", detail: "Affordable commercial hardware; no proprietary lock-in" },
      { label: "Software Cost", value: "$0 SaaS Rent", detail: "No perpetual monthly software subscriptions" },
    ],
    visualType: "hardware",
  },
  {
    id: "speed-split",
    badge: "High-Volume Lunch Velocity",
    title: "30-Second Speed-Split Check",
    subtitle:
      "Busy 8-tops split checks in seconds without manager overrides. Shared starters are fractionally calculated with exact cent rounding.",
    icon: Split,
    highlights: [
      { label: "Table Resolution", value: "< 30 Seconds", detail: "Split 8+ ways with single-tap seat assignment" },
      { label: "Fractional Split", value: "Exact Cent", detail: "Shared appetizers divided evenly across seats" },
      { label: "Card Settlement", value: "Multi-Tender", detail: "Visa, AMEX, Apple Pay settled simultaneously" },
      { label: "Auto-Gratuity", value: "Configurable", detail: "Automatic large-party grat and local tax calculation" },
    ],
    visualType: "speed-split",
  },
  {
    id: "kds",
    badge: "Synchronized Line Execution",
    title: "60-Foot Open Kitchen Coursing",
    subtitle:
      "Multi-station visual coursing pass that prevents food dying in the window. Station routing separates wood hearth, sauté line, and raw bar.",
    icon: Flame,
    highlights: [
      { label: "State Transitions", value: "HOLD → FIRE", detail: "Visual coursing state machine with audio cues" },
      { label: "Station Routing", value: "Multi-Line Pass", detail: "Hearth Grill, Sauté, Wood Oven, Expo Pass" },
      { label: "Live 86 Sync", value: "Real-Time", detail: "Depleted cellar vintages sync instantly to floor" },
      { label: "Course Timers", value: "Color-Coded", detail: "Green on pace, amber holding, rush alert" },
    ],
    visualType: "kds",
  },
  {
    id: "roi",
    badge: "Retained Restaurant Wealth",
    title: "5-Year Financial Recovery Audit",
    subtitle:
      "Why rent a cloud POS for $1,383/month when you can run a connected system you control? Modeled payback in under 6 months.",
    icon: DollarSign,
    highlights: [
      { label: "Legacy Cloud SaaS", value: "$82,980", detail: "Typical $1,383/month perpetual software extraction" },
      { label: "Yorkstead Model", value: "Turnkey Setup", detail: "Workflow engineering & configuration investment" },
      { label: "5-Year Savings", value: "+$66,540", detail: "Modeled net cash retained in your account" },
      { label: "Modeled Payback", value: "5.42 Months", detail: "Based on avoided cloud software subscription fees" },
    ],
    visualType: "roi",
  },
  {
    id: "closeout",
    badge: "Tamper-Proof Closeout Engine",
    title: "5-Tab Nightly Shift Z-Report",
    subtitle:
      "Blind safe drop eliminates till skimming. Comps and voids are locked in a cryptographic SHA-256 chain, exported to accounting in 1 tap.",
    icon: ShieldCheck,
    highlights: [
      { label: "Blind Safe Drop", value: "Till Security", detail: "Count physical cash before viewing expected total" },
      { label: "Audit Defense", value: "SHA-256", detail: "Immutable chained block of every comp/void PIN" },
      { label: "Server Tip Pool", value: "Automated", detail: "Bar, runner, and kitchen pool distributions" },
      { label: "Bookkeeping", value: "1-Tap Export", detail: "Clean CSV export for nightly reconciliation" },
    ],
    visualType: "closeout",
  },
];

export function RestaurantHeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isPlaying, nextSlide]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl transition-all">
      {/* Decorative top accent glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/10 blur-3xl" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-3 sm:px-7">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          <Sparkles className="size-3.5 text-primary" />
          <span>Interactive System Showcase · 240 Union Concept</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#trial-intake"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 font-mono text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90"
          >
            <span>Start a 14-Day Trial</span>
            <ArrowRight className="size-3" />
          </a>
          <a
            href="https://240.yorkstead.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 font-mono text-xs font-semibold text-foreground shadow-sm transition hover:text-primary"
          >
            <span>Launch Interactive Demo</span>
            <ExternalLink className="size-3" />
          </a>
          <a
            href="#workflow"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 font-mono text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground"
          >
            <span>See How It Works</span>
          </a>
        </div>
      </div>

      {/* Two-Way Experience Pathway Bar */}
      <div className="grid border-b border-border bg-background/50 text-xs sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="flex items-center justify-between px-5 py-2.5 sm:px-7">
          <span className="text-muted-foreground">
            <strong className="text-foreground">Explore it now:</strong> Launch the online UnionOS simulation.
          </span>
          <a
            href="https://240.yorkstead.com"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] font-bold text-primary hover:underline shrink-0 ml-3"
          >
            Web Simulator ↗
          </a>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5 sm:px-7 bg-primary/[0.03]">
          <span className="text-muted-foreground">
            <strong className="text-foreground">Prove it in your restaurant:</strong> Run configured hardware for 14 days.
          </span>
          <a
            href="#trial-intake"
            className="font-mono text-[11px] font-bold text-primary hover:underline shrink-0 ml-3"
          >
            Request Trial ↓
          </a>
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="grid gap-8 p-6 lg:grid-cols-12 lg:gap-10 sm:p-8 items-center min-h-[460px]">
        {/* Left Column: Narrative & Metrics */}
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Icon className="size-3.5" />
            <span>{slide.badge}</span>
          </div>

          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {slide.title}
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {slide.subtitle}
          </p>

          {/* Metric Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {slide.highlights.map((h) => (
              <div
                key={h.label}
                className="rounded-xl border border-border bg-background/60 p-3 sm:p-4 transition hover:border-primary/40"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {h.label}
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-foreground sm:text-xl">
                  {h.value}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground leading-tight">
                  {h.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Visual Diagram Frame */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="relative rounded-xl border border-border bg-background/80 p-5 shadow-inner">
            {/* Slide Visuals */}
            {slide.visualType === "hardware" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Cpu className="size-4" />
                    <span>LOCAL RESTAURANT ARCHITECTURE</span>
                  </div>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    LOCAL LAN CONTINUITY
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-foreground">Local Operating Layer (Commercial Mini-PC)</span>
                    <span className="text-primary font-bold">Affordable Direct</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-foreground">2x Main Bar Terminals (15.6&quot; Spill-Proof)</span>
                    <span className="text-primary font-bold">Direct Commercial</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-foreground">2x Dining Room Server Terminals</span>
                    <span className="text-primary font-bold">Direct Commercial</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-foreground">Kitchen Expo Screen (21.5&quot; Display)</span>
                    <span className="text-primary font-bold">Direct Commercial</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-foreground">Existing Printers &amp; Drawers Reused</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">$0.00</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between font-bold">
                  <span>EQUIPMENT OWNERSHIP</span>
                  <span className="text-foreground">Restaurant-Owned Hardware</span>
                </div>
              </div>
            )}

            {slide.visualType === "speed-split" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-bold text-primary">TABLE 24 · 8 GUESTS</span>
                  <span className="text-muted-foreground">CIVIC CENTER LUNCH</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground">SEAT 1 · AMEX</div>
                    <div className="font-bold text-foreground">$38.45</div>
                    <div className="text-[10px] text-muted-foreground">Ribeye + 1/8 Calamari</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground">SEAT 2 · VISA</div>
                    <div className="font-bold text-foreground">$31.20</div>
                    <div className="text-[10px] text-muted-foreground">Halibut + 1/8 Calamari</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground">SEAT 3 · APPLE PAY</div>
                    <div className="font-bold text-foreground">$29.80</div>
                    <div className="text-[10px] text-muted-foreground">Pasta + 1/8 Calamari</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-muted-foreground">SEAT 4 · MASTERCARD</div>
                    <div className="font-bold text-foreground">$34.15</div>
                    <div className="text-[10px] text-muted-foreground">Steak Salad + 1/8 Calamari</div>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center text-primary text-[11px] font-semibold">
                  1-Tap Split by Seat · Exact Cent Rounding · Sub-30s Close
                </div>
              </div>
            )}

            {slide.visualType === "kds" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-bold text-amber-500">EXPO PASS · TICKET #104</span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                    FIRE ENTREES (08:42)
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded bg-card border border-border">
                    <span>1x Wood-Fired Prime Ribeye (MR)</span>
                    <span className="text-primary font-bold">GRILL PASS</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-card border border-border">
                    <span>1x Colorado Striped Bass (Crispy)</span>
                    <span className="text-primary font-bold">SAUTÉ LINE</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-card border border-border">
                    <span>1x Wild Mushroom Risotto (Truffle)</span>
                    <span className="text-primary font-bold">HEARTH OVEN</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-muted-foreground">Cellar Sync: Reserve Cab #412</span>
                  <span className="text-emerald-500 font-bold">BOTTLE ALLOCATED</span>
                </div>
              </div>
            )}

            {slide.visualType === "roi" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-bold text-primary">5-YEAR RECOVERY MODEL</span>
                  <span className="text-muted-foreground">INDEPENDENT DINING</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400">
                    <span>5-Yr Toast SaaS Rent ($1,383/mo)</span>
                    <span className="font-bold">-$82,980</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                    <span>TableOS One-Time Turnkey Buyout</span>
                    <span className="font-bold">-$7,500</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/30 font-bold text-foreground">
                    <span>5-YEAR NET RETAINED CASH</span>
                    <span className="text-primary text-sm">+$75,480</span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  Simple Payback: 5.42 Months · $0 Mandatory Monthly Fees
                </div>
              </div>
            )}

            {slide.visualType === "closeout" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    BLIND SAFE CASH DROP
                  </span>
                  <span className="text-muted-foreground">GM SHIFT CLOSING</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-muted-foreground">Drawer Count</span>
                    <div className="font-bold text-foreground">$1,450.00</div>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-muted-foreground">Opening Float</span>
                    <div className="font-bold text-foreground">-$200.00</div>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-muted-foreground">Calculated Drop</span>
                    <div className="font-bold text-primary">$1,250.00</div>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-muted-foreground">Over / Short</span>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">$0.00 PERFECT</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-background border border-border text-[11px]">
                  <span>QuickBooks Sales Journal CSV</span>
                  <span className="text-primary font-bold">1-TAP READY</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between border-t border-border bg-card/60 px-5 py-4 sm:px-7">
        {/* Slide Indicators / Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setCurrent(idx);
                setIsPlaying(false);
              }}
              className={`rounded-lg px-2.5 py-1 font-mono text-xs transition ${
                current === idx
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              0{idx + 1} {s.title.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Slide Controls */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
            className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <button
            onClick={() => {
              prevSlide();
              setIsPlaying(false);
            }}
            aria-label="Previous slide"
            className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => {
              nextSlide();
              setIsPlaying(false);
            }}
            aria-label="Next slide"
            className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
    <p className="text-center font-mono text-[11px] text-muted-foreground/70">
      Independent Yorkstead concept demonstration. Not commissioned by or affiliated with 240 Union.
    </p>
  </div>
  );
}
