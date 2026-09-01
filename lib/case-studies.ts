import type { ProjectStatus } from "@/lib/project-status";
import type { ProjectMedia } from "@/lib/project-media";
import { brand } from "@/lib/brand";

export type CaseStudy = {
  slug: string;
  number: string;
  status: ProjectStatus;
  title: string;
  kicker: string;
  summary: string;
  signal: string;
  icon: "gauge" | "scan-line" | "layers";
  industries: string[];
  applications: { title: string; description: string }[];
  paths: { label: string; description: string; href: string; external?: boolean }[];
  intendedFor: string;
  problem: string;
  previousWorkflow: string;
  solution: string;
  capabilities: string[];
  technologies: string[];
  outcomeLabel: "Operational outcome" | "Intended outcome";
  outcome: string;
  limitations: string;
  media: ProjectMedia[];
  previewMediaId?: string;
  cta: { label: string; href: string };
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "ellwood-flow",
    number: "01",
    status: "Live system",
    title: "Ellwood Flow",
    kicker: "Production release control",
    summary: "A live release-intake and document-control system that keeps manufactured orders, approvals, drawings, files, and shop-floor handoffs connected.",
    signal: "One controlled path from release intake to production-ready work",
    icon: "layers",
    industries: ["Architectural panel manufacturing", "Manufacturing and fabrication", "CNC production", "Building products", "Production management", "Document-controlled operations"],
    applications: [
      { title: "Release intake and readiness", description: "Bring order context, required files, approvals, and readiness decisions into one controlled release record before production begins." },
      { title: "Drawing and revision control", description: "Keep controlled drawings, revisions, review decisions, and unresolved document work visible to the people preparing the production handoff." },
      { title: "CNC and production-file handoff", description: "Separate production-ready sources from supporting documents so the shop receives the right files with the right release context." },
      { title: "Manufacturing approval workflow", description: "Turn missing information, review decisions, and release blockers into explicit actions instead of relying on email chains and verbal follow-up." },
    ],
    paths: [
      { label: "Open Ellwood Flow", description: "Visit the live release-intake and document-control system.", href: "https://ellwood-flow.4twenty.dev", external: true },
      { label: "Packages, process & pricing", description: "Compare three ways to scope a manufacturing workflow, with planning prices and delivery expectations.", href: "/packages#manufacturing" },
      { label: "Manufacturing software", description: "Explore tailored systems for release control, production visibility, inventory, scheduling, and shop-floor handoffs.", href: "/services/manufacturing-software" },
      { label: "Audit a production workflow", description: "Map the current intake, review, document, and release path before selecting the first implementation milestone.", href: "/workflow-audit#audit-intake" },
    ],
    intendedFor: "Manufacturers and fabrication teams that need office decisions, controlled documents, and production handoffs to remain attached to the same release.",
    problem: "Release information can arrive through several channels while drawings, approvals, finish schedules, takeoffs, and production files change at different speeds. The shop needs a trustworthy answer to what is ready and what is still blocked.",
    previousWorkflow: "Reconstruct the release from email, shared folders, spreadsheets, PDFs, and verbal updates; compare revisions manually; then chase missing approvals or files before production can safely begin.",
    solution: "A production-minded release workspace that organizes intake, controlled documents, review decisions, drawing and CNC-source handling, and the actions required to move a release toward the shop floor.",
    capabilities: ["Structured release intake", "Controlled drawing and document handling", "Approval and review checkpoints", "Production-file separation", "Release readiness actions", "Authenticated operational workspace"],
    technologies: ["Next.js App Router", "TypeScript", "Bun", "Drizzle ORM", "PostgreSQL", "S3-compatible storage"],
    outcomeLabel: "Operational outcome",
    outcome: "The deployed system gives release work one controlled operating path and makes unresolved document or review work visible before handoff. Current evidence confirms the working system and production deployment; quantified time, quality, or cost improvements have not yet been established.",
    limitations: "Ellwood Flow is an actively evolving operational system. Its current workflow reflects the release and document-control needs implemented so far, and broader customer validation, integrations, and measured business outcomes remain future work.",
    media: [
      {
        id: "active-release-workspace",
        type: "screenshot",
        label: "Active release workspace",
        description: "The live Ellwood Flow active-release workspace showing header metadata, panel marks, drawing review, and revision controls.",
        caption: "The active release view keeps release context, panel schedules, and controlled drawing reviews together in one operational surface.",
        alt: "Ellwood Flow active release dashboard displaying order context, panel schedule, and drawing review status",
        desktop: { src: "/media/projects/ellwood-flow/active-release.png", width: 1916, height: 1077 },
        expandable: true,
        featured: true,
      },
      {
        id: "release-catalog",
        type: "screenshot",
        label: "Release catalog and intake",
        description: "The live release catalog showing status filters, search, job associations, and revision tracking.",
        caption: "Releases are tracked across their entire lifecycle with clear revision status and intake validation.",
        alt: "Ellwood Flow release management screen with search filters, job numbers, and release statuses",
        desktop: { src: "/media/projects/ellwood-flow/releases.png", width: 1918, height: 1074 },
        expandable: true,
      },
      {
        id: "production-dispatch",
        type: "screenshot",
        label: "Production dispatch queue",
        description: "The live production queue with step-by-step station routing, work orders, and panel completion status.",
        caption: "Station queues guide operators through allowed step transitions from cutting through fabrication.",
        alt: "Ellwood Flow production dispatch interface with panel marks, routing steps, and station queues",
        desktop: { src: "/media/projects/ellwood-flow/production.png", width: 1905, height: 1067 },
        expandable: true,
      },
      {
        id: "inventory-visibility",
        type: "screenshot",
        label: "Inventory visibility and allocation",
        description: "The live material inventory view distinguishing on-hand, committed, and allocated sheet goods.",
        caption: "Material allocations prevent stock contention by reserving sheet goods for active release jobs.",
        alt: "Ellwood Flow inventory management view detailing material stock levels, allocations, and sheet goods",
        desktop: { src: "/media/projects/ellwood-flow/inventory.png", width: 1913, height: 1071 },
        expandable: true,
      },
      {
        id: "quality-control",
        type: "screenshot",
        label: "Quality control and inspection",
        description: "The live QC station recording pass, rework, remake, scrap decisions, and reason codes.",
        caption: "Quality inspections capture non-conformance reasons and generate compensating remake actions.",
        alt: "Ellwood Flow quality control dashboard with inspection results, pass rates, and rework tracking",
        desktop: { src: "/media/projects/ellwood-flow/QC.png", width: 1906, height: 1062 },
        expandable: true,
      },
      {
        id: "pallet-planning",
        type: "screenshot",
        label: "Palletization and containerization",
        description: "The live pallet planner optimizing stacking rules, height restrictions, and weight constraints.",
        caption: "Configurable pallet rules enforce elevation grouping, height limits, and weight tolerances.",
        alt: "Ellwood Flow pallet planning view displaying panel grouping, weight calculations, and container limits",
        desktop: { src: "/media/projects/ellwood-flow/pallets.png", width: 1915, height: 1071 },
        expandable: true,
      },
      {
        id: "shipping-staging",
        type: "screenshot",
        label: "Shipping and logistics",
        description: "The live shipping staging surface managing bills of lading, pallet assignments, and carrier handoffs.",
        caption: "Pallet staging ensures complete order verification prior to generating the bill of lading.",
        alt: "Ellwood Flow shipping dashboard with pallet staging, bill of lading generation, and carrier details",
        desktop: { src: "/media/projects/ellwood-flow/shipping.png", width: 1911, height: 1071 },
        expandable: true,
      },
      {
        id: "scan-station",
        type: "screenshot",
        label: "Shop-floor scan terminal",
        description: "The live scan station providing fast barcode scanning, station progression, and obsolete revision alerts.",
        caption: "Barcode scanning enables rapid tap-and-scan shop actions while blocking superseded revisions.",
        alt: "Ellwood Flow scan station interface with barcode input field and station action buttons",
        desktop: { src: "/media/projects/ellwood-flow/scan-station.png", width: 1907, height: 1065 },
        expandable: true,
      },
      {
        id: "global-search-traceability",
        type: "screenshot",
        label: "Traceability and search",
        description: "The live global lookup tool for tracing any job, release, panel mark, or barcode history.",
        caption: "Search provides instant lineage across jobs, releases, panel marks, and audit logs.",
        alt: "Ellwood Flow global search view with query input and structured search results",
        desktop: { src: "/media/projects/ellwood-flow/search.png", width: 1904, height: 1066 },
        expandable: true,
      },
      {
        id: "admin-audit-trail",
        type: "screenshot",
        label: "Administration and audit trail",
        description: "The live administration dashboard with user roles, permissions, and immutable audit logs.",
        caption: "Append-only audit events capture actor, timestamp, workstation, and prior/new state for every action.",
        alt: "Ellwood Flow administration view showing user roles and system audit event logs",
        desktop: { src: "/media/projects/ellwood-flow/admin.png", width: 1905, height: 1069 },
        expandable: true,
      },
      {
        id: "operational-reports",
        type: "screenshot",
        label: "Operational reports",
        description: "The live operational reports view providing throughput, scrap rate, and release cycle time analytics.",
        caption: "Structured operational reporting highlights plant throughput and process bottlenecks.",
        alt: "Ellwood Flow reports screen with production metrics and export options",
        desktop: { src: "/media/projects/ellwood-flow/reports.png", width: 1911, height: 1065 },
        expandable: true,
      },
    ],
    previewMediaId: "active-release-workspace",
    cta: { label: "Discuss production release control", href: "/#contact" },
  },
  {
    "slug": "work-control",
    "number": "02",
    "status": "Working prototype",
    "title": "Yorkstead Operations",
    "kicker": "Operations",
    "summary": "A modular operations platform for manufacturing, fabrication, and service teams. Follow the records, responsibilities, and handoffs from quoting through execution and delivery.",
    "signal": "Shared records. Clear handoffs. Visible next steps.",
    "icon": "gauge",
    "industries": [
      "Manufacturing",
      "Fabrication",
      "Facility services",
      "Sign production and installation",
      "Mobile service businesses"
    ],
    "applications": [
      {
        "title": "Quote-to-ship manufacturing",
        "description": "Follow commercial scope through routed production, inspection, packaging, and delivery in a synthetic manufacturing example."
      },
      {
        "title": "Recurring facility services",
        "description": "Keep sites, work-order checklists, consumables, proof-of-work summaries, and client signoff in context."
      },
      {
        "title": "Sign fabrication and installation",
        "description": "Carry approved artwork and revision context through shop stages and the final field installation handoff."
      },
      {
        "title": "Mobile service delivery",
        "description": "Connect customer and technician context with repeatable checklists, scope approvals, and service closeout."
      }
    ],
    "paths": [
      {
        "label": "Explore the Operations demo",
        "description": "Walk through four publicly available synthetic workflow scenarios.",
        "href": "https://ops.yorkstead.com/demo",
        "external": true
      },
      {
        "label": "Read the Operations showcase PDF",
        "description": "Open the supplied nine-page booklet covering workflows and demonstration boundaries.",
        "href": "/media/yorkstead-ops/yorkstead-operations-showcase.pdf"
      },
      {
        "label": "Packages, process & pricing",
        "description": "Compare a Workflow Sprint, Department System, and Operations System for your business.",
        "href": "/packages#operations"
      },
      {
        "label": "Workflow automation",
        "description": "Simplify the handoffs and connect useful tools around the way your team works.",
        "href": "/services/workflow-automation"
      }
    ],
    "intendedFor": "Manufacturing, fabrication, facility-service, sign-production, and mobile-service teams whose work moves between several people, records, and approval points.",
    "problem": "Quotes, job instructions, material needs, production status, quality decisions, and delivery details can become disconnected as work changes hands.",
    "previousWorkflow": "Reconstruct status from spreadsheets, paper travelers, inboxes, and separate systems; manually pass revisions, approvals, and completion details to the next person.",
    "solution": "Organize the operation around shared job records and explicit handoffs. The showcased modules cover quoting, shopfloor work, materials, quality, maintenance, packaging, shipping, documents, and operational activity.",
    "capabilities": [
      "QuoteFlow and job records",
      "Digital travelers and shopfloor checkpoints",
      "Inventory and purchasing module overview",
      "Quality, maintenance, packaging, and shipping module overview",
      "Job packets, File Vault, and KnowHow module overview",
      "Four synthetic public workflow scenarios"
    ],
    "technologies": [
      "Web-based operational workspace",
      "Modular workflow architecture",
      "Deterministic operational sandboxes",
      "PostgreSQL schema"
    ],
    "outcomeLabel": "Intended outcome",
    "outcome": "The intended outcome is a clearer shared view of the job, its blockers, and the owner of the next step. The supplied booklet illustrates this approach; it does not establish measured customer savings or completed real-world transactions.",
    "limitations": "This prototype showcase uses synthetic demo scenarios and simulated payments. The supplied PDF records public demo inspection on August 31, 2026; authenticated transactions, integrations, storage readiness, production isolation, and reset behavior were not verified. Operations is a separate application from the website and its private Command Center.",
    "media": [
      {
        "id": "operations-overview",
        "type": "screenshot",
        "label": "Yorkstead Operations",
        "description": "PDF showcase page 1. A modular operations platform connecting work from the first quote to the final handoff.",
        "caption": "A modular operations platform connecting work from the first quote to the final handoff. Rendered from the supplied Operations showcase PDF.",
        "alt": "Yorkstead Operations page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-1.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true,
        "featured": true
      },
      {
        "id": "operations-platform",
        "type": "screenshot",
        "label": "Platform overview",
        "description": "PDF showcase page 2. Jobs, travelers, inventory, quality, shipping, and supporting records share an operational context.",
        "caption": "Jobs, travelers, inventory, quality, shipping, and supporting records share an operational context. Rendered from the supplied Operations showcase PDF.",
        "alt": "Platform overview page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-2.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-manufacturing",
        "type": "screenshot",
        "label": "Manufacturing walkthrough",
        "description": "PDF showcase page 3. A synthetic manufacturing scenario follows commercial scope, production routing, inspection, and shipping.",
        "caption": "A synthetic manufacturing scenario follows commercial scope, production routing, inspection, and shipping. Rendered from the supplied Operations showcase PDF.",
        "alt": "Manufacturing walkthrough page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-3.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-facility-service",
        "type": "screenshot",
        "label": "Facility service walkthrough",
        "description": "PDF showcase page 4. A synthetic facility-service scenario connects site checklists, evidence summaries, consumables, and client signoff.",
        "caption": "A synthetic facility-service scenario connects site checklists, evidence summaries, consumables, and client signoff. Rendered from the supplied Operations showcase PDF.",
        "alt": "Facility service walkthrough page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-4.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-sign-fabrication",
        "type": "screenshot",
        "label": "Sign fabrication walkthrough",
        "description": "PDF showcase page 5. A synthetic sign-fabrication scenario carries artwork revision context through fabrication and installation.",
        "caption": "A synthetic sign-fabrication scenario carries artwork revision context through fabrication and installation. Rendered from the supplied Operations showcase PDF.",
        "alt": "Sign fabrication walkthrough page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-5.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-mobile-service",
        "type": "screenshot",
        "label": "Mobile service walkthrough",
        "description": "PDF showcase page 6. A synthetic mobile-service scenario shows technician checklists, approved add-ons, and simulated payment.",
        "caption": "A synthetic mobile-service scenario shows technician checklists, approved add-ons, and simulated payment. Rendered from the supplied Operations showcase PDF.",
        "alt": "Mobile service walkthrough page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-6.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-documents",
        "type": "screenshot",
        "label": "Documents and knowledge",
        "description": "PDF showcase page 7. The module overview explains job packets, controlled files, and procedures alongside the work.",
        "caption": "The module overview explains job packets, controlled files, and procedures alongside the work. Rendered from the supplied Operations showcase PDF.",
        "alt": "Documents and knowledge page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-7.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-demo-boundaries",
        "type": "screenshot",
        "label": "Demo and production boundaries",
        "description": "PDF showcase page 8. The booklet separates public synthetic scenarios from authenticated production paths that were not verified.",
        "caption": "The booklet separates public synthetic scenarios from authenticated production paths that were not verified. Rendered from the supplied Operations showcase PDF.",
        "alt": "Demo and production boundaries page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-8.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      },
      {
        "id": "operations-explore",
        "type": "screenshot",
        "label": "Explore the workflows",
        "description": "PDF showcase page 9. Explore the public demonstration and discuss the workflows relevant to your own operation.",
        "caption": "Explore the public demonstration and discuss the workflows relevant to your own operation. Rendered from the supplied Operations showcase PDF.",
        "alt": "Explore the workflows page from the Yorkstead Operations showcase PDF",
        "desktop": {
          "src": "/media/yorkstead-ops/pages/operations-9.png",
          "width": 1600,
          "height": 1001
        },
        "expandable": true
      }
    ],
    "previewMediaId": "operations-overview",
    "cta": {
      "label": "Discuss your operational workflow",
      "href": "/#contact"
    }
  },
  {
    slug: "jwld-store",
    number: "03",
    status: "Live system",
    title: "jwld.store",
    kicker: "Commerce",
    summary: "A distinctive storefront connecting product discovery, availability, shopping-bag activity, and custom commissions for a handmade-goods brand. Its source-backed administration and payment workflows illustrate how the customer experience can connect to the work behind the sale.",
    signal: "Distinctive products. Clear buying paths. Connected store operations.",
    icon: "layers",
    industries: ["Independent brands", "Handmade goods and jewelry", "Artists and makers", "Curated specialty retail", "Custom commissions and made-to-order", "Local producers"],
    applications: [
      { title: "Direct-to-consumer storefront", description: "Give an independent brand a fast, focused catalog, product-detail experience, shopping bag, and purchasing path without flattening its visual identity into a generic template." },
      { title: "Inventory-aware merchandising", description: "Keep product availability, featured items, categories, media, and price attached to the product record so scarce or handmade pieces are represented accurately." },
      { title: "Custom-commission intake", description: "Provide a structured inquiry workflow for bespoke requests when the buyer needs to describe an idea, choose materials, or specify preferences before fabrication begins." },
      { title: "Connected store operations", description: "Anchor stock reservations, checkout sessions, and administrative order handling in source-backed workflows that connect front-of-house intent to behind-the-scenes work." },
    ],
    paths: [
      { label: "Visit the live store", description: "Explore the current branded catalog, product pages, shopping bag, and custom-commission path.", href: "https://jwld.store", external: true },
      { label: "Read the commerce showcase", description: "Open the supplied eight-page booklet covering storefront discovery, buying paths, and source-backed operations.", href: "/media/jwld/jwld-store-showcase.pdf" },
      { label: "Websites and online commerce", description: "Explore storefront, catalog, marketplace, intake, and operational-integration options for a product-led business.", href: "/services/small-business-websites" },
      { label: "Packages, process & pricing", description: "Compare fixed-scope options from a Workflow Sprint to complete department and operations systems.", href: "/packages" },
    ],
    intendedFor: "Independent brands, artists, makers, curated retailers, specialty-product businesses, and commerce operators that need a buying experience connected to accurate products, inventory, customer intent, and fulfillment responsibilities.",
    problem: "A product business needs more than attractive pages. Catalog structure, product media, availability, pricing, shopping-bag behavior, payment boundaries, custom requests, and fulfillment expectations must stay coherent as customers move from discovery to purchase.",
    previousWorkflow: "Before a dedicated commerce system, products may be promoted through social posts, messages, generic payment links, and manually updated listings, leaving buyers to ask what is available and the operator to reconcile orders and custom requests by hand.",
    solution: "A branded commerce application that connects structured product records, category browsing, detailed product views, shopping-bag interactions, stock-aware merchandising, and a dedicated commission path with source-backed payment and administrative workflows.",
    capabilities: [
      "Responsive product discovery and catalog browsing",
      "Inventory-aware product details and stock status",
      "Interactive shopping bag and item management",
      "Custom-commission request and intake workflow",
      "Stripe checkout integration and webhook source architecture",
      "Administrative product and fulfillment workflows",
    ],
    technologies: ["Next.js App Router", "TypeScript", "Tailwind CSS", "Neon Postgres", "Stripe integration", "Vercel Blob", "Vercel"],
    outcomeLabel: "Operational outcome",
    outcome: "Public browser inspection on August 31, 2026 confirmed the working public storefront, catalog discovery, product detail views, shopping-bag adding and removal, and the custom-commission intake form. Source-code inspection of the jeweled-store repository (commit d502851) confirms implementation of Stripe checkout session creation, webhook signature verification, stock reservations, and administrative workflows. No paid transaction, email delivery, or conversion uplift was measured or claimed.",
    limitations: "The live deployment represents a single-brand storefront, not a functioning multi-vendor marketplace. Public inspection verified the client-facing discovery, cart controls, and commission intake without executing live purchases, file uploads, or authenticated administrative mutations. Multi-vendor extensions such as seller onboarding, commissions, moderation, split payments, payouts, disputes, and marketplace fulfillment are potential future extensions requiring separate operational systems.",
    media: [
      {
        id: "jwld-home",
        type: "screenshot",
        label: "Storefront homepage",
        description: "The live jwld.store homepage introducing the brand, featured collections, and navigation.",
        caption: "The homepage establishes the visual brand identity and provides clear navigation to current collections and custom commissions.",
        alt: "jwld.store homepage showing featured collection hero and navigation",
        desktop: { src: "/media/jwld/screenshots/home.png", width: 1234, height: 712 },
        expandable: true,
        featured: true,
      },
      {
        id: "jwld-catalog",
        type: "screenshot",
        label: "Product collection catalog",
        description: "The collection catalog view displaying available products with prices, category filters, and availability indicators.",
        caption: "The collection view organizes handmade pieces with structured product pricing and clear availability.",
        alt: "jwld.store collection catalog displaying product grid with pricing and category filters",
        desktop: { src: "/media/jwld/screenshots/catalog.png", width: 1234, height: 712 },
        expandable: true,
      },
      {
        id: "jwld-product",
        type: "screenshot",
        label: "Product detail view",
        description: "Galactic Glam product detail page with high-resolution imagery, piece specifications, pricing, and bag controls.",
        caption: "Product detail views combine piece descriptions, specifications, stock status, and direct purchasing controls.",
        alt: "jwld.store Galactic Glam product detail page showing piece photography, pricing, and add to bag button",
        desktop: { src: "/media/jwld/screenshots/product.png", width: 1234, height: 712 },
        expandable: true,
      },
      {
        id: "jwld-bag",
        type: "screenshot",
        label: "Shopping bag and order review",
        description: "Active shopping bag interface displaying populated item quantities, subtotal calculation, and checkout controls.",
        caption: "The slide-out shopping bag manages active selections, pricing subtotals, and seamless checkout entry.",
        alt: "jwld.store shopping bag drawer showing selected item, subtotal price, and checkout button",
        desktop: { src: "/media/jwld/screenshots/bag.png", width: 1248, height: 720 },
        expandable: true,
      },
      {
        id: "jwld-custom",
        type: "screenshot",
        label: "Custom commission overview",
        description: "Custom jewelry commission introduction outlining the bespoke creation process and consultation steps.",
        caption: "The custom commission section explains the bespoke design process for one-of-a-kind and personalized pieces.",
        alt: "jwld.store custom commission introduction page outlining design steps and options",
        desktop: { src: "/media/jwld/screenshots/custom.png", width: 1234, height: 712 },
        expandable: true,
      },
      {
        id: "jwld-custom-form",
        type: "screenshot",
        label: "Commission inquiry form",
        description: "Structured intake form capturing client specifications, budget preferences, material choices, and design notes.",
        caption: "The commission form gathers client preferences, budget ranges, and project details before fabrication starts.",
        alt: "jwld.store custom commission intake form showing input fields for client details and project scope",
        desktop: { src: "/media/jwld/screenshots/custom-form.png", width: 1234, height: 712 },
        expandable: true,
      },
    ],
    previewMediaId: "jwld-home",
    cta: { label: "Discuss your commerce workflow", href: "/#contact" },
  },
  {
    slug: "sic-pizza-pos",
    number: "04",
    status: "Working prototype",
    title: "SIC Pizza POS",
    kicker: "Sarcastic restaurant operations",
    summary: "A mobile-first tableside POS and collaborative-ordering prototype that carries diners, configured items, guest proposals, kitchen status, split payments, and an intentionally sarcastic brand voice through one restaurant workflow.",
    signal: "Keep the personality loud while pricing, approvals, kitchen state, and payment boundaries stay literal",
    icon: "scan-line",
    industries: ["Independent restaurants", "Pizza shops", "Bars and taprooms", "Food halls", "Pop-ups and events", "Multi-location concepts"],
    applications: [
      { title: "Tableside point of sale", description: "Give servers a responsive floor, table, diner, modifier, pricing, review, and kitchen-submission path that works across handheld and desktop-sized screens." },
      { title: "Collaborative guest ordering", description: "Let guests join a table without an account, view the shared order, and propose items while preserving employee approval before anything reaches production." },
      { title: "Kitchen display workflow", description: "Carry confirmed items into a constrained submitted, making, ready, and served lifecycle so front- and back-of-house views share the same operational state." },
      { title: "Split payment and audit trail", description: "Model diner-level allocations, tips, payment-provider boundaries, and append-only actor history before introducing certified payment processing or reconciliation." },
    ],
    paths: [
      { label: "Open the interactive prototype", description: "Use the current browser-runnable vertical slice to explore employee access, floor, ordering, kitchen, guest, payment, and history views.", href: "https://sic-pizza.vercel.app", external: true },
      { label: "Packages, process & pricing", description: "See what an audit, focused restaurant workflow, or connected system could include and cost.", href: "/packages#restaurant" },
      { label: "Workflow automation", description: "Explore how ordering, approvals, kitchen transitions, notifications, and exception handling can become one controlled operating flow.", href: "/services/workflow-automation" },
      { label: "Review the source and architecture", description: "Inspect the public repository, domain rules, persistence schema, implementation boundaries, and phased production backlog.", href: "https://github.com/4twentydev/sic-pizza", external: true },
    ],
    intendedFor: "Independent restaurants, pizza shops, bars, food halls, pop-up operators, and growing hospitality concepts that want an owned ordering experience shaped around their service model rather than a generic terminal workflow.",
    problem: "Restaurant orders cross staff access, tables, diners, modifiers, pricing, guest requests, kitchen production, payment, and support history. When those states drift, the team must reconcile what was requested, approved, fired, served, and paid during active service.",
    previousWorkflow: "A small operation may combine handwritten tickets, verbal kitchen calls, generic terminals, separate QR menus, payment hardware, and manager memory, leaving customer context and production status distributed across people and devices.",
    solution: "A browser-runnable vertical slice that models employee entry, a multi-table floor, custom pizza pricing, guest item proposals with server approval, kitchen lifecycle transitions, equal-split mock payments, configurable voice, and append-only event history.",
    capabilities: ["Responsive staff floor and table workflow", "Custom items with integer-cent pricing", "Guest join and employee approval boundary", "Kitchen display lifecycle", "Equal-split mocked payment authorization", "Configurable sarcastic voice with neutral safety contexts", "Multi-location PostgreSQL persistence schema", "Append-only audit-event model"],
    technologies: ["Next.js 16 App Router", "React 19", "TypeScript", "Drizzle ORM", "PostgreSQL schema", "Zod", "Bun", "Tailwind CSS"],
    outcomeLabel: "Intended outcome",
    outcome: "The intended outcome is a restaurant system that keeps floor, guest, kitchen, payment, and audit context connected while allowing a memorable brand voice in non-sensitive moments. The current prototype demonstrates the workflow but has not produced verified service-speed, order-accuracy, or revenue results.",
    limitations: "This is an in-progress prototype using in-memory interaction, a seeded development PIN, a decorative same-browser QR flow, mocked kitchen updates, and mocked card authorization. Production persistence, hashed authentication, rotating join tokens, real-time projections, certified payments, refunds, reconciliation, offline recovery, printers, cash drawers, device testing, and security review remain future milestones.",
    media: [
      {
        id: "floor-overview",
        type: "screenshot",
        label: "Interactive floor plan",
        description: "The live floor overview mapping active tables, server assignments, guest counts, and diner order readiness.",
        caption: "The responsive floor grid keeps table occupancy, dining timers, and active ticket states visible at a glance.",
        alt: "SIC Pizza POS interactive floor layout showing active table states, guest counts, and server assignments",
        desktop: { src: "/media/projects/sic-pizza/floor.png", width: 3263, height: 2040 },
        expandable: true,
        featured: true,
      },
      {
        id: "actionable-queue",
        type: "screenshot",
        label: "Action priority dashboard",
        description: "The 'Do This Next' operator screen highlighting urgent table turnover, pending kitchen items, and payment requests.",
        caption: "Priority queues highlight actionable next steps across front-of-house service and kitchen fulfillment.",
        alt: "SIC Pizza POS action dashboard detailing urgent table actions, pending orders, and service notifications",
        desktop: { src: "/media/projects/sic-pizza/do-this-next.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "kitchen-display",
        type: "screenshot",
        label: "Kitchen display system",
        description: "The back-of-house kitchen station interface categorizing tickets by submitted, in-prep, ready, and served stages.",
        caption: "The kitchen display synchronizes ticket firing timers, modifier alerts, and order completion directly with tableside staff.",
        alt: "SIC Pizza POS kitchen display screen tracking order tickets, pizza oven timings, and recipe modifiers",
        desktop: { src: "/media/projects/sic-pizza/kitchen.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "order-queue",
        type: "screenshot",
        label: "Order and ticket queue",
        description: "The centralized order queue managing multi-course firing sequences, table batching, and kitchen routing.",
        caption: "Comprehensive order staging handles course progression and ticket firing across high-volume dining shifts.",
        alt: "SIC Pizza POS order queue showing staged courses, pizza ticket details, and kitchen routing",
        desktop: { src: "/media/projects/sic-pizza/queue.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "guest-ordering",
        type: "screenshot",
        label: "Collaborative guest ordering",
        description: "The collaborative guest-facing mobile web interface allowing diners to propose items and review the shared check.",
        caption: "Guests join active tables via browser or QR, proposing custom pizzas that require server verification before firing.",
        alt: "SIC Pizza POS guest mobile interface displaying pizza customization, shared table tab, and proposal approval flow",
        desktop: { src: "/media/projects/sic-pizza/guest.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "manager-console",
        type: "screenshot",
        label: "Manager operations console",
        description: "The shift management console configuring floor layouts, menu item availability, staff roles, and brand tone settings.",
        caption: "Operational controls enable dynamic 86ing of ingredients, staff permissions, and brand voice customization.",
        alt: "SIC Pizza POS manager console showing item availability toggles, server shifts, and system configurations",
        desktop: { src: "/media/projects/sic-pizza/manager.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "sales-analytics",
        type: "screenshot",
        label: "Shift and sales analytics",
        description: "Real-time analytics covering hourly sales volume, product category mix, table turn rates, and average spend per guest.",
        caption: "Real-time analytics surface high-margin modifier trends, hourly rush volume, and kitchen throughput times.",
        alt: "SIC Pizza POS analytics dashboard displaying revenue metrics, sales trends, and category breakdown",
        desktop: { src: "/media/projects/sic-pizza/analytics.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "audit-trail",
        type: "screenshot",
        label: "Append-only audit trail",
        description: "The immutable event log recording order modifications, price overrides, comp approvals, and server actions.",
        caption: "Every pricing adjustment, modifier change, and payment transaction is captured in an append-only event history.",
        alt: "SIC Pizza POS audit trail log showing chronological state transitions, user IDs, and transaction timestamps",
        desktop: { src: "/media/projects/sic-pizza/audit-trail.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "expo-handoff",
        type: "screenshot",
        label: "Expo and fulfillment handoff",
        description: "The expediter station coordinating plated pizza handoffs, runner dispatch, and table delivery confirmations.",
        caption: "The expo dispatch screen confirms order completion and coordinates table delivery between kitchen and servers.",
        alt: "SIC Pizza POS expo handoff screen confirming completed orders and runner delivery assignments",
        desktop: { src: "/media/projects/sic-pizza/handoff.png", width: 3263, height: 2040 },
        expandable: true,
      },
      {
        id: "tablet-tableside",
        type: "screenshot",
        label: "Tableside tablet interface",
        description: "The responsive tablet view optimized for fast tableside order entry, split checks, and tip selection.",
        caption: "Touch-friendly tablet layouts speed up tableside pizza configuration, split-check calculations, and payments.",
        alt: "SIC Pizza POS tablet interface showing pizza builder and tableside order workflow",
        desktop: { src: "/media/projects/sic-pizza/tablet-view.png", width: 1771, height: 2041 },
        expandable: true,
      },
      {
        id: "handheld-mobile",
        type: "screenshot",
        label: "Mobile handheld order entry",
        description: "The compact handheld mobile screen designed for high-density server navigation and quick item adding on the move.",
        caption: "Handheld mobile views allow servers to add items, fire courses, and check table status on the move.",
        alt: "SIC Pizza POS mobile smartphone view showing compact table status and item selection",
        desktop: { src: "/media/projects/sic-pizza/phone-view.png", width: 885, height: 2037 },
        layout: "phone",
        expandable: true,
      },
    ],
    previewMediaId: "floor-overview",
    cta: { label: "Discuss a custom POS workflow", href: "/#contact" },
  },
  {
    slug: "employee-barcodes",
    number: "05",
    status: "Live system",
    title: "Employee Barcodes",
    kicker: "Production identity and traceability",
    summary: "A live internal-tool pattern for assigning unique employee numbers, generating standardized Code 128 labels, printing label sheets, and sharing barcode images for downstream production, completion, quality, packaging, or handoff scans.",
    signal: "Make the employee identifier easy to issue, carry, share, and scan wherever work is completed",
    icon: "scan-line",
    industries: ["Architectural panel production", "Manufacturing and fabrication", "CNC and sign shops", "Warehousing and fulfillment", "Packaging and shipping", "Field service and maintenance"],
    applications: [
      { title: "Production completion attribution", description: "Issue a consistent employee barcode that can be scanned by a separate production system when panels, parts, assemblies, or jobs reach a defined completion point." },
      { title: "Quality and inspection handoff", description: "Reuse the same employee identity at inspection, rework, approval, or release stations so a downstream system can associate the responsible operator with an event." },
      { title: "Packing and shipping identification", description: "Give packaging, staging, and shipping teams portable employee labels for scan-based handoffs without repeatedly typing employee numbers at shared workstations." },
      { title: "Rapid label distribution", description: "Search active employees, preview a standardized label, print individual or multi-label sheets, and share a generated PNG when a physical label is needed quickly." },
    ],
    paths: [
      { label: "Open the live barcode tool", description: "Use the deployed employee-label workflow for directory management, barcode preview, print-sheet composition, and label sharing.", href: "https://barcodes.4twenty.dev", external: true },
      { label: "Manufacturing software", description: "Connect operator identity to job, panel, part, quality, inventory, packaging, or completion records inside a broader production system.", href: "/services/manufacturing-software" },
      { label: "Workflow automation", description: "Design the downstream scan event, validation, exception, notification, and reporting flow that gives the barcode operational meaning.", href: "/services/workflow-automation" },
    ],
    intendedFor: "Manufacturers, panel and fabrication shops, warehouses, packaging teams, field-service operations, and other employers that need a simple, repeatable employee identifier for scan-based attribution or workstation handoffs.",
    problem: "Production teams may know who completed, checked, packed, moved, or released work, but entering employee identities manually at shared terminals is slow and inconsistent. Labels also become difficult to replace or distribute when their source records and print format are scattered.",
    previousWorkflow: "Look up or remember an employee number, type it into another system, build labels manually, reformat a spreadsheet, or depend on a supervisor to print and redistribute identifiers when an employee starts, changes, or needs a replacement.",
    solution: "A focused employee-label system with searchable active and inactive records, unique numeric identifiers, Code 128 generation, standardized live preview, up-to-eight-label print sheets, activation controls, and shareable PNG output for mobile or remote distribution.",
    capabilities: ["Employee directory with unique numeric identifiers", "Active, inactive, edit, and reactivation controls", "Code 128 barcode generation", "Searchable multi-label sheet composition", "Avery-format print layout for up to eight labels", "Shareable PNG label output", "Device share and clipboard fallbacks", "Neon-backed employee records"],
    technologies: ["Next.js App Router", "React 19", "TypeScript", "Neon Postgres", "Drizzle ORM", "Zod", "bwip-js", "Next.js ImageResponse", "Tailwind CSS"],
    outcomeLabel: "Operational outcome",
    outcome: "The live system centralizes employee barcode assignment and makes standardized labels available for preview, printing, and digital sharing. Its operational value is enabling faster identity entry in downstream scan workflows; no verified throughput, accuracy, or labor-savings metric is claimed.",
    limitations: "The application generates and manages employee barcode labels but does not itself record scanner events, completed panels, quality checks, timekeeping, or production history. Barcode values are identifiers, not authentication credentials. The current repository does not demonstrate login, authorization, or role controls, so access and employee-data exposure require review before the deployment is treated as a protected production system.",
    media: [{ id: "barcode-tool-overview", type: "placeholder", label: "Employee barcode workflow", description: "Verified desktop and mobile views of the employee directory, label builder, live barcode preview, print sheet, and share workflow.", caption: "Portfolio screenshots of the live employee-barcode tool have not been supplied yet; the deployed system remains available for review.", requestedAsset: "Supply a desktop label-builder or employee-directory view plus a mobile preview or share-sheet view with employee information safely redacted." }],
    previewMediaId: "barcode-tool-overview",
    cta: { label: "Discuss a scan-based workflow", href: "/#contact" },
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((study) => study.slug === slug);
}

export function getAdjacentCaseStudies(slug: string) {
  const index = caseStudies.findIndex((study) => study.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined };
  return {
    previous: caseStudies[(index - 1 + caseStudies.length) % caseStudies.length],
    next: caseStudies[(index + 1) % caseStudies.length],
  };
}

export function getCaseStudyStructuredData(study: CaseStudy) {
  const url = `${brand.siteURL}/work/${study.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#project-profile`,
        name: study.title,
        url,
        description: study.summary,
        creator: { "@id": `${brand.siteURL}/#organization`, name: brand.name },
        keywords: [...study.industries, ...study.applications.map(({ title }) => title), ...study.technologies, study.status],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: brand.siteURL },
          { "@type": "ListItem", position: 2, name: "Selected work", item: `${brand.siteURL}/#work` },
          { "@type": "ListItem", position: 3, name: study.title, item: url },
        ],
      },
    ],
  };
}
