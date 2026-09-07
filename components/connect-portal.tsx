"use client";

import * as React from "react";
import Link from "next/link";
import {
  Factory,
  Truck,
  UtensilsCrossed,
  Cpu,
  UserPlus,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ExternalLink,
  ShieldCheck,
  Building2
} from "lucide-react";
import { brand } from "@/lib/brand";
import { publicBusinessDetails, publicBusinessPhoneHref } from "@/lib/local-business";

type SectorKey = "manufacturing" | "logistics" | "hospitality" | "custom";

interface SectorData {
  key: SectorKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  tagline: string;
  frictionHeadline: string;
  frictionPoints: string[];
  solutionHeadline: string;
  solutionPoints: string[];
  systemsBuilt: string;
  destinationUrl: string;
  destinationLabel: string;
}

const sectors: SectorData[] = [
  {
    key: "manufacturing",
    label: "Manufacturing & Fabrication",
    shortLabel: "Manufacturing",
    icon: Factory,
    tagline: "High-contrast digital shopfloor travelers, automated quoting, and real-time machine telemetry.",
    frictionHeadline: "The Shopfloor Reality",
    frictionPoints: [
      "Jobs tracked on paper clipboards & handwritten travelers",
      "Custom quoting takes 3+ days to calculate and send",
      "Zero real-time visibility into machine or station status",
      "Tribal knowledge trapped in the heads of 2 veteran operators",
    ],
    solutionHeadline: "What We Engineer",
    solutionPoints: [
      "Zero-clipboard digital travelers scanned via tablet / phone",
      "Parametric cost estimation engines tied to raw material indexes",
      "Station execution telemetry with blocker and scrap logs",
      "Seamless export to ERP, accounting, and CNC cutting schedules",
    ],
    systemsBuilt: "Architectural Panel Traveler & CNC Shopfloor Control",
    destinationUrl: "/services/production",
    destinationLabel: "Explore Manufacturing Systems",
  },
  {
    key: "logistics",
    label: "Logistics, Fleet & Terminals",
    shortLabel: "Logistics",
    icon: Truck,
    tagline: "Real-time dispatch consoles, driver mobile handoffs, and digital Bills of Lading.",
    frictionHeadline: "The Dispatch Reality",
    frictionPoints: [
      "Load dispatch and gate check-ins handled over SMS text threads",
      "Paper BOLs lost, damaged, or delayed in billing cycles",
      "No live visibility into cross-dock staging or driver arrival",
      "Manual detention tracking resulting in uncollected revenue",
    ],
    solutionHeadline: "What We Engineer",
    solutionPoints: [
      "Unified multi-stop dispatch console for operators and drivers",
      "Digital Bill of Lading (BOL) with instant digital signature sign-off",
      "Real-time dock and package staging with automated weight totals",
      "Automated carrier compliance and detention timestamping",
    ],
    systemsBuilt: "Denver Express Freight Platform & ReworkFlow Dispatch",
    destinationUrl: "/services/scheduling",
    destinationLabel: "Explore Logistics Systems",
  },
  {
    key: "hospitality",
    label: "Restaurants & Multi-Unit Hospitality",
    shortLabel: "Hospitality",
    icon: UtensilsCrossed,
    tagline: "Kitchen line telemetry, automated par-level supplier ordering, and real-time margin control.",
    frictionHeadline: "The Kitchen & Unit Reality",
    frictionPoints: [
      "Prep station disconnects causing line slowdowns and food waste",
      "Manual distributor inventory orders done at 1:00 AM on clipboards",
      "POS reports disconnected from actual live ingredient recipe costs",
      "Multi-unit variance hidden until end-of-month P&L reports",
    ],
    solutionHeadline: "What We Engineer",
    solutionPoints: [
      "Interactive kitchen display and prep line telemetry",
      "Automated par-level supplier purchase orders based on sales velocity",
      "Live ingredient cost index and real-time menu recipe margin tracking",
      "Consolidated multi-unit operator console with shift handoff logs",
    ],
    systemsBuilt: "Sic Pizza Kitchen OS & Multi-Unit Inventory Console",
    destinationUrl: "/services/inventory",
    destinationLabel: "Explore Hospitality Systems",
  },
  {
    key: "custom",
    label: "Custom Architecture & Modernization",
    shortLabel: "Custom Systems",
    icon: Cpu,
    tagline: "Bespoke internal ERPs and workflow control planes built for companies that own their tools.",
    frictionHeadline: "The Software Reality",
    frictionPoints: [
      "Paying monthly SaaS fees for 6 disjointed tools that do not talk",
      "Core operational workflows forced into rigid generic software",
      "Data locked in spreadsheets or outdated software from 2004",
      "Fear of vendor lock-in or catastrophic vendor price hikes",
    ],
    solutionHeadline: "What We Engineer",
    solutionPoints: [
      "Bespoke modular monolith software built around your exact workflow",
      "Full ownership with zero per-seat licensing penalties",
      "Direct API integrations with existing QuickBooks, CRM, and hardware",
      "Fast, dense, operator-first user interfaces built to last decades",
    ],
    systemsBuilt: "Yorkstead Operations Cockpit & Modular Control Planes",
    destinationUrl: "/workflow-audit",
    destinationLabel: "Book a Workflow Audit",
  },
];

export function ConnectPortal() {
  const [activeTab, setActiveTab] = React.useState<SectorKey>("manufacturing");
  const currentSector = sectors.find((s) => s.key === activeTab) || sectors[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Profile / Operator Lockup */}
      <div className="rounded-2xl border border-border bg-card/90 p-6 sm:p-8 backdrop-blur shadow-2xl">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 grid place-items-center text-primary shadow-[0_0_24px_-8px_var(--primary)]">
            <Building2 className="size-9" />
            <div className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card bg-emerald-500" title="Available for System Engagements" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-primary uppercase">
              Operator Access Key
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Brandon York
            </h1>
            <p className="font-mono text-xs text-primary font-medium tracking-wide">
              Founder & Principal Systems Architect // {brand.name}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              We engineer purpose-built operational software and workflow automation for businesses where off-the-shelf tools fail and the real work happens in the real world.
            </p>
          </div>
        </div>

        {/* Primary Contact Actions */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-6 border-t border-border/80">
          <a
            href="/connect/vcard"
            download="brandon-york.vcf"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-mono text-xs font-bold text-primary-foreground shadow-[0_0_24px_-8px_var(--primary)] transition hover:bg-primary/90 active:scale-[0.99]"
          >
            <UserPlus className="size-4 shrink-0" />
            <span>Save Contact to Phone (.vcf)</span>
          </a>

          <a
            href="mailto:brandon@yorkstead.com?subject=Operations%20Inquiry%20from%20Card"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 px-4 font-mono text-xs font-semibold text-secondary-foreground transition hover:border-primary/40 hover:bg-secondary active:scale-[0.99]"
          >
            <Mail className="size-4 shrink-0 text-primary" />
            <span>brandon@yorkstead.com</span>
          </a>

          {publicBusinessPhoneHref && (
            <a
              href={publicBusinessPhoneHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 px-4 font-mono text-xs font-semibold text-secondary-foreground transition hover:border-primary/40 hover:bg-secondary active:scale-[0.99] sm:col-span-2"
            >
              <Phone className="size-4 shrink-0 text-primary" />
              <span>Direct Line: {publicBusinessDetails.phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Sector Selection Grid */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
            Select Your Industry
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            Interactive Sector Portals
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sectors.map((sector) => {
            const Icon = sector.icon;
            const isActive = sector.key === activeTab;
            return (
              <button
                key={sector.key}
                onClick={() => setActiveTab(sector.key)}
                className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_20px_-8px_var(--primary)] scale-[1.02]"
                    : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-card"
                }`}
              >
                <Icon className={`size-5 mb-1.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-mono text-[11px] font-semibold leading-tight">
                  {sector.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sector Card */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <currentSector.icon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">
              {currentSector.label}
            </h2>
            <p className="font-mono text-[11px] text-primary">
              Reference: {currentSector.systemsBuilt}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {currentSector.tagline}
        </p>

        {/* Friction vs Solution Grid */}
        <div className="mt-6 space-y-4">
          {/* Friction */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-destructive uppercase tracking-wider">
              <AlertTriangle className="size-3.5" />
              <span>{currentSector.frictionHeadline}</span>
            </div>
            <ul className="mt-2.5 space-y-2">
              {currentSector.frictionPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 font-mono text-xs text-muted-foreground">
                  <span className="text-destructive shrink-0 select-none">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary uppercase tracking-wider">
              <Zap className="size-3.5" />
              <span>{currentSector.solutionHeadline}</span>
            </div>
            <ul className="mt-2.5 space-y-2">
              {currentSector.solutionPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 font-mono text-xs text-foreground/90">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sector Destination Link */}
        <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row gap-3">
          <Link
            href={currentSector.destinationUrl}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 font-mono text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            <span>{currentSector.destinationLabel}</span>
            <ArrowRight className="size-3.5" />
          </Link>
          <a
            href="https://ops.yorkstead.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 font-mono text-xs font-medium text-secondary-foreground transition hover:border-primary/40 hover:bg-secondary"
          >
            <span>Live Operations Console</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Direct Engagement Block */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 text-center sm:p-8 shadow-xl">
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h3 className="mt-3 text-lg font-bold text-foreground sm:text-xl">
          Ready to look at your floor or terminal?
        </h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          We run a focused, 30-minute operational diagnosis to trace where paperwork and data are getting stuck—then engineer the exact fix.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/workflow-audit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-mono text-xs font-bold text-primary-foreground shadow-[0_0_24px_-8px_var(--primary)] transition hover:bg-primary/90"
          >
            <span>Book a 15-Minute Audit</span>
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="mailto:brandon@yorkstead.com?subject=Let's%20Audit%20Our%20Workflow"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/80 px-6 font-mono text-xs font-semibold text-secondary-foreground transition hover:border-primary/40 hover:bg-secondary"
          >
            <span>Email Brandon Directly</span>
          </a>
        </div>

        <div className="mt-6 font-mono text-[10px] text-muted-foreground">
          Yorkstead Systems • ops.yorkstead.com • Denver, CO
        </div>
      </div>
    </div>
  );
}
