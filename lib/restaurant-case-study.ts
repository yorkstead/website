import type { CaseStudy } from "./case-studies";

export const tableOsCaseStudy: CaseStudy = {
  slug: "table-os",
  number: "07",
  status: "In development",
  title: "TableOS",
  kicker: "Restaurant Operating System",
  icon: "scan-line",
  summary:
    "Run the restaurant from one connected operating system. Tables, ordering, coursing, kitchen execution, payments, cellar inventory, shift handoff, and management workflows united in one restaurant-specific system. Local-first architecture ensures core restaurant operations continue locally even when the internet connection drops, eliminating recurring SaaS rent and proprietary hardware lock-in.",
  signal: "One connected operating system for floor, kitchen, and management. Local-first resilience and zero recurring SaaS rent.",
  industries: [
    "Independent fine dining",
    "Upscale taverns and bistros",
    "High-volume dinner restaurants",
    "Multi-station banquet operations",
    "Wine cellars and craft cocktail bars",
    "Hospitality groups",
  ],
  intendedFor:
    "Independent restaurant owners, operators, and general managers who need unified floor, kitchen, and cellar workflows without recurring cloud SaaS subscriptions, proprietary terminal markups, or systems that freeze during peak dinner rushes.",
  problem:
    "Modern cloud POS platforms fragment restaurant operations across disconnected tools, lock operators into perpetual monthly SaaS fees ($15,000–$24,000+ per year), and mandate overpriced proprietary hardware. Worse, when the external internet connection blips, floor terminals freeze, kitchen printers drop orders, and staff are left scrambling during peak service.",
  previousWorkflow:
    "Fragile cloud POS terminals dependent on external internet → proprietary locked tablets billed at inflated rates → flat 3%+ payment tolls → manual split-check calculations on 8-tops → paper 86 lists drifting from cellar stock → 45-minute manual nightly drawer reconciliation.",
  solution:
    "A complete, local-first restaurant operating system: floor ordering, coursing state machines, kitchen KDS routing, cellar stock, and management closeout run on a local operating layer inside the restaurant. Floor terminals, mobile handhelds, and kitchen displays communicate over the local LAN with sub-5ms response time. The system does not require an expensive proprietary server—the local operating layer runs on affordable commercial hardware the restaurant owns, qualifying for applicable business-equipment depreciation.",
  capabilities: [
    "Unified table management, ordering, and coursing state machine",
    "Sub-5ms local ticket firing with offline resilience when internet drops",
    "60-foot open kitchen KDS with station routing and audio chimes",
    "30-second speed-splits with automatic cent rounding and multi-tender settlement",
    "Cellar reserve tracking with instant cross-terminal 86 synchronization",
    "Cryptographic SHA-256 comps and voids audit ledger",
    "5-tab nightly shift closeout with blind cash safe drop calculator",
    "Affordable commercial hardware running on local LAN with zero proprietary server lock-in",
    "Direct interchange-plus card processing integration",
    "Zero mandatory recurring software subscriptions",
  ],
  technologies: [
    "Commercial Fanless Mini-PC Appliance",
    "Local-First LAN Architecture",
    "Next.js App Router",
    "TypeScript",
    "SQLite / PostgreSQL Engine",
    "ESC/POS Socket Protocol",
    "Tailscale Encrypted Mesh",
  ],
  outcomeLabel: "Intended outcome",
  outcome:
    "The intended outcome is full software payback in 5.42 to 6.08 months ($7,500 one-time investment vs. $1,383/month in avoided software rent), producing $66,540 to $75,480 in net five-year software savings. Paired with non-extractive interchange-plus payment processing, modeled five-year retained savings reach $158,700 to $167,640. Hardware may qualify for applicable business-equipment depreciation or Section 179 treatment depending on the business's circumstances. Financial outcomes reflect structured operating models.",
  limitations:
    "Demonstrated through an interactive 240 Union-inspired concept environment at 240.yorkstead.com. Independent Yorkstead concept demonstration. Not commissioned by or affiliated with 240 Union. Production deployment includes workflow engineering, on-site installation, local LAN configuration, staff training, and certified payment terminal pairing.",
  applications: [
    {
      title: "Connected Operating System & Local Architecture",
      description:
        "The system does not require an expensive proprietary server. The local operating layer runs on affordable commercial hardware the restaurant owns, executing ordering, coursing, and kitchen routing locally at sub-5ms latency. Core restaurant operations continue locally even when the internet connection drops.",
    },
    {
      title: "Restaurant-Owned Commercial Hardware",
      description:
        "The restaurant purchases commercial terminals directly from standard suppliers with 0% markup from Yorkstead. The business retains 100% equipment title and factory warranties. Hardware may qualify for applicable business-equipment depreciation or Section 179 treatment depending on the business's circumstances.",
    },
    {
      title: "30-Second Speed-Split Checks",
      description:
        "Resolve 8-to-12-top business lunch checks in seconds. One-tap split by seat, automatic fractional division for shared appetizers with exact cent rounding, and individual guest card settlements.",
    },
    {
      title: "60-Foot Open Kitchen Coursing Pass",
      description:
        "Visual coursing state machine (HOLD → PREP → FIRE → PLATED) with station-specific line filtering (Hearth Grill, Sauté, Wood Oven, Raw Bar, Expo Pass) and crisp auditory cues.",
    },
    {
      title: "Cellar Reserve & Live 86 Sync",
      description:
        "Allocate reserve vintages with live bin numbers and bottle counters. When the last bottle of an allocated vintage sells, every terminal's 86 board updates instantly.",
    },
    {
      title: "5-Tab Nightly Shift Closeout Z-Report",
      description:
        "Department sales mix, blind cash safe drop calculator before displaying expected totals, server tip pooling distributions, immutable SHA-256 comp ledger, and 1-tap QuickBooks CSV export.",
    },
  ],
  paths: [
    {
      label: "Launch Restaurant Demo",
      description: "Explore the live restaurant operating system and POS concept.",
      href: "https://240.yorkstead.com",
      external: true,
    },
    {
      label: "See How It Works",
      description: "Follow the connected workflows: tables, kitchen coursing, split checks, and closeout.",
      href: "/work/table-os#workflow",
    },
    {
      label: "Architecture & Hardware",
      description: "Review the local-first LAN architecture, commercial hardware model, and offline resilience.",
      href: "/work/table-os#architecture",
    },
  ],
  media: [],
  cta: {
    label: "Audit your restaurant technology stack",
    href: "/workflow-audit#audit-intake",
  },
  workflowStory: {
    demoUrl: "https://240.yorkstead.com",
    observation:
      "A restaurant's core operations—seating, ordering, kitchen firing, split checks, and cash reconciliation—belong to the physical dining room and kitchen, not an external cloud server. By running on a local operating layer inside the restaurant, the business gains sub-5ms speed, resilience during internet outages, data ownership, and substantial retained cash flow.",
    handoffs: [
      {
        role: "Host → Server",
        before: "Verbal table seating, guest notes scribbled on paper, and uncoordinated floor pacing.",
        after: "Instant floor map status, VIP dietary preferences, and automatic table occupancy timers.",
      },
      {
        role: "Server → Kitchen Line",
        before: "Handwritten tickets, missing coursing instructions, and crowded expediter windows.",
        after: "Station-routed digital KDS with synchronized coursing (Hold, Prep, Fire, Plated) and alert chimes.",
      },
      {
        role: "Table → Payment",
        before: "15 minutes of card juggling, manual calculator math for split appetizers, and frustrated guests.",
        after: "1-tap split by seat, automatic fractional division with cent rounding, and instant card settlement.",
      },
      {
        role: "Closing Manager → Bookkeeper",
        before: "45 minutes of manual cash counting, receipts stuffed in manila envelopes, and retyping into QuickBooks.",
        after: "5-tab Z-Report with blind safe drop count, cryptographic comp audit, and 1-click accounting CSV export.",
      },
    ],
    scenarios: [
      {
        id: "normal-dinner",
        title: "Normal Dinner Rush",
        description: "Coursed 4-top table: starters on hold, entree fire, sommelier wine pairing, and single check settlement.",
      },
      {
        id: "speed-split",
        title: "30-Second Speed-Split",
        description: "8-top civic center business lunch: shared calamari and burrata split fractionally across 8 individual card payments.",
      },
      {
        id: "cellar-depletion",
        title: "Cellar Reserve & 86 Board",
        description: "Last bottle of allocated Reserve Cabernet ordered at the bar; instant 86 broadcast across all floor terminals.",
      },
      {
        id: "offline-resilience",
        title: "Internet Outage Resilience",
        description: "External internet drops during peak rush: core restaurant operations continue locally across the local LAN without interruption.",
      },
      {
        id: "manager-comp-void",
        title: "Cryptographic Audit Ledger",
        description: "VIP comp authorized with manager PIN (2400) and recorded in an immutable SHA-256 chained transaction log.",
      },
      {
        id: "shift-closeout",
        title: "5-Tab Nightly Z-Report",
        description: "Department sales mix, blind cash safe drop reconciliation, server tip pool, and 1-tap QuickBooks export.",
      },
    ],
    architecture: [
      {
        title: "Local Operating Layer & LAN Architecture",
        description:
          "The system does not require an expensive proprietary server. The local operating layer runs on affordable commercial hardware inside the restaurant. The database, state machine, and kitchen routing execute locally with sub-5ms latency, keeping core operations running during internet outages.",
      },
      {
        title: "Restaurant-Owned Commercial Hardware",
        description:
          "The restaurant purchases commercial touchscreen terminals, kitchen displays, and handhelds directly from standard suppliers with 0% markup. Hardware may qualify for applicable business-equipment depreciation or Section 179 treatment depending on the business's circumstances.",
      },
      {
        title: "Direct Interchange-Plus Payment Processing",
        description:
          "Connects directly to transparent merchant processors at wholesale interchange-plus rates, eliminating flat vendor tolls and saving $15,000–$18,000+ per year on card volume.",
      },
      {
        title: "Concept Demonstration Environment",
        description:
          "Demonstrated through an interactive 240 Union-inspired concept environment at 240.yorkstead.com. Independent Yorkstead concept demonstration. Not commissioned by or affiliated with 240 Union.",
      },
    ],
  },
};

