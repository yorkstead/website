import type { CaseStudy } from "./case-studies";

export const tableOsCaseStudy: CaseStudy = {
  slug: "table-os",
  number: "07",
  status: "In development",
  title: "TableOS",
  kicker: "Sovereign restaurant appliance",
  icon: "scan-line",
  summary:
    "Cloud POS giants extract $1,200–$2,000/month in perpetual software rent while freezing when the internet hiccups. TableOS replaces recurring SaaS with a local Intel N100 mini-PC appliance—delivering sub-5ms LAN speed, 100% offline immunity, direct commercial hardware with 0% markup, and over $66,000 to $158,000 in five-year retained savings.",
  signal: "In-house LAN appliance, 0% hardware markup, 100% offline immunity, and $0 monthly software rent.",
  industries: [
    "Independent fine dining",
    "Upscale taverns and steakhouses",
    "High-volume dinner bistros",
    "Multi-station banquet operations",
    "Wine cellars and craft cocktail bars",
    "Hospitality groups",
  ],
  intendedFor:
    "Independent restaurant owners, operators, and general managers who are tired of paying endless cloud POS subscriptions, proprietary terminal markups, and payment gateway tolls for systems that freeze during a Friday night dinner rush.",
  problem:
    "Modern cloud POS platforms lock hospitality operators into perpetual monthly SaaS subscriptions ($15,000–$24,000+ per year), proprietary locked hardware, and extractive card processing rates. Worse, when the internet connection blips, floor terminals freeze, kitchen printers drop orders, and staff are left scrambling during peak service.",
  previousWorkflow:
    "Fragile cloud POS terminals dependent on external internet → proprietary locked tablets billed at inflated rates → flat 3%+ payment tolls → manual split-check calculations on 8-tops → paper 86 lists drifting from cellar stock → 45-minute manual nightly drawer reconciliation.",
  solution:
    "A sovereign local-first appliance: the entire database, state machine, and kitchen routing run on a silent, fanless $160 Intel N100 mini-PC inside the restaurant. Floor terminals, mobile handhelds, and kitchen KDS screens communicate across the local LAN with sub-5ms response time and zero cloud dependencies. Clients purchase commercial hardware directly on their card with 0% markup and 100% Section 179 tax deduction.",
  capabilities: [
    "Silent Intel N100 local LAN server appliance ($160)",
    "Sub-5ms local ticket firing with 100% offline immunity",
    "30-second corporate lunch speed-splits with auto-cent rounding",
    "60-foot open kitchen KDS with visual coursing state machine",
    "Sommelier cellar stock decrement and instant cross-terminal 86 sync",
    "Cryptographic SHA-256 comps and voids audit ledger",
    "5-tab nightly shift closeout with blind cash safe drop",
    "Direct interchange-plus card processing integration",
    "Direct ESC/POS network thermal printing on standard hardware",
    "Zero mandatory recurring software fees forever",
  ],
  technologies: [
    "Intel N100 Fanless Appliance",
    "Local-First LAN Architecture",
    "Next.js App Router",
    "TypeScript",
    "SQLite / PostgreSQL Engine",
    "ESC/POS Socket Protocol",
    "Tailscale Encrypted Mesh",
  ],
  outcomeLabel: "Intended outcome",
  outcome:
    "The intended outcome is full software payback in 5.42 to 6.08 months ($7,500 one-time investment vs. $1,383/month in avoided software rent), producing $66,540 to $75,480 in net five-year software savings. Paired with non-extractive interchange-plus payment processing, modeled five-year retained savings reach $158,700 to $167,640. Financial outcomes reflect structured operating models and unverified customer data.",
  limitations:
    "This interactive public prototype models the fictional Copper Pine Tavern & Cellar using in-memory state, simulated card authorizations, and synthetic tickets. It runs in browser memory at ops.yorkstead.com/restaurant and resets on reload or after 30 minutes. Production deployment requires on-site installation of the Intel N100 appliance, local network Cat6/Wi-Fi configuration, and certified payment terminal pairing.",
  applications: [
    {
      title: "The Sovereign Local Server ($160)",
      description:
        "Replace cloud fragility with an in-house Intel N100 fanless mini-PC. The entire restaurant database and state machine run locally at sub-5ms latency. If the internet cable is cut, service continues uninterrupted.",
    },
    {
      title: "0% Hardware Markup & 100% Tax Write-Off",
      description:
        "The restaurant purchases commercial terminals directly from Amazon or CDW (~$2,110 total) with 0% markup from Yorkstead. The business retains 100% equipment title, factory warranties, and an immediate IRS Section 179 deduction.",
    },
    {
      title: "30-Second Speed-Split Checks",
      description:
        "Resolve 8-to-12-top corporate lunch checks in seconds. One-tap split by seat, automatic fractional division for shared appetizers with exact cent rounding, and individual guest card settlements.",
    },
    {
      title: "60-Foot Open Kitchen Coursing Pass",
      description:
        "Visual coursing state machine (HOLD → PREP → FIRE → PLATED) with station-specific line filtering (Hearth Grill, Sauté, Wood Oven, Raw Bar, Expo Pass) and crisp auditory chimes.",
    },
    {
      title: "Cellar Reserve & Live 86 Sync",
      description:
        "Allocate reserve vintages with live bin numbers and bottle counters. When the last bottle of an allocated Cabernet sells, every terminal's 86 board updates instantly.",
    },
    {
      title: "5-Tab Nightly Shift Closeout Z-Report",
      description:
        "Department sales mix, blind cash safe drop calculator before displaying expected totals, server tip pooling distributions, immutable SHA-256 comp ledger, and 1-tap QuickBooks CSV export.",
    },
  ],
  paths: [
    {
      label: "Guided Walkthrough",
      description: "Follow peak dinner coursing, speed-splits, and shift closeout.",
      href: "https://ops.yorkstead.com/restaurant?mode=guided",
      external: true,
    },
    {
      label: "Open Interactive Sandbox",
      description: "Explore the live POS, floor layout, kitchen KDS, and savings calculator.",
      href: "https://ops.yorkstead.com/restaurant",
      external: true,
    },
    {
      label: "Architecture & Hardware",
      description: "Inspect the $160 local server appliance, bill of materials, and offline LAN model.",
      href: "/work/table-os#architecture",
    },
  ],
  media: [],
  cta: {
    label: "Audit your restaurant technology stack",
    href: "/workflow-audit#audit-intake",
  },
  workflowStory: {
    demoUrl: "https://ops.yorkstead.com/restaurant",
    observation:
      "A restaurant's core operations—seating, ordering, kitchen firing, split checks, and cash reconciliation—belong to the physical dining room and kitchen, not an external cloud server. By housing the system on an in-house appliance, the restaurant regains speed, offline immunity, data sovereignty, and thousands of dollars in retained monthly cash.",
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
        title: "Internet Outage Simulation",
        description: "External internet drops during peak rush: local Intel N100 appliance keeps firing tickets and printing without a hiccup.",
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
        title: "The In-House Appliance ($160 Local Server)",
        description:
          "Runs on an Intel N100 fanless mini-PC in the restaurant's back office. The entire application server, state machine, and SQLite/PostgreSQL database execute locally with sub-5ms latency, completely immune to ISP outages.",
      },
      {
        title: "0% Hardware Markup (Direct Client Purchase)",
        description:
          "The restaurant purchases commercial terminals, rugged handhelds, and stands directly from Amazon/CDW (~$2,110). Client retains 100% equipment title, manufacturer warranties, and an immediate IRS Section 179 tax write-off.",
      },
      {
        title: "Interchange-Plus Payment Processing",
        description:
          "Connects directly to transparent merchant processors at wholesale interchange-plus rates. Eliminates the 3%+ flat tolls extracted by cloud POS vendors, saving $15,000–$18,000+ per year on card volume.",
      },
      {
        title: "Isolated Browser Sandbox",
        description:
          "The public demonstration at ops.yorkstead.com/restaurant models Copper Pine Tavern & Cellar in browser memory. Reload, scenario selection, or the 30-minute timer restores synthetic fixtures without connecting to live customer databases.",
      },
    ],
  },
};
