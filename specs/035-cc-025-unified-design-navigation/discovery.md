# CC-025 repository discovery

## Baseline and scope

CC-025 resumes from the isolated `website-cc025` checkout on `feat/cc-025-unified-design-navigation`. The local base refs and HEAD match `363c4dad28b1d0676e4b28887154b74589536e06`, the user-supplied independently verified main SHA. The requested base is an ancestor of HEAD. Live GitHub refresh is currently unavailable because GitHub DNS/API cannot be reached from the environment.

This is a client-facing presentation change across the public site, owner command center and customer portal. Preserve App Router routes, owner/customer authorization, the current lead capture pipeline, analytics privacy policy, session behavior, theme preference, and all existing business data and actions.

## Existing design system

- `app/globals.css` defines semantic light/dark CSS custom properties and the Tailwind theme. This is the runtime source of truth.
- `design-system/source/tokens.json` is synchronized from those theme variables by `design-system/build.mjs`; the `design-system/source/README.md` documents Yorkstead's warm paper/light, blue-slate/dark, primary blue, Geist typography, semantic colors, spacing, radius and focus treatment.
- The catalog contained a stale `DemoCard` entry pointing to removed `components/demo-card.tsx` and `lib/demos.ts`, and the preview analytics shim omitted the current `getBrowserAnalyticsSession` export. The generator failed on these mismatches before CC-025. Aligning the catalog and inert preview shim keeps the published bundle buildable from current sources; no application analytics behavior changes.
- `components/ui/*` provides shared button, badge, card, input, label and textarea primitives. Public sections mostly use semantic Tailwind tokens. Dashboard pages contain some isolated legacy styling and dashboard accent treatments.
- `components/brand-mark.tsx`, `components/theme-toggle.tsx`, and `components/site-header.tsx` provide the public brand and theme controls.

## Navigation surfaces

- Public: `components/site-header.tsx`. Before this work it was only used on the homepage, while Work, Walkthroughs, Solutions, Platform, Pricing and About each rendered separate nav fragments. Its dropdown already links to Work, Walkthroughs, Pricing & Model, About, Dashboard and Contact. `ThemeToggle` and `BrandMark` are already shared. The path-aware menu behavior needs verification at phone and desktop widths.
- Owner: `components/dashboard/dashboard-navigation.tsx`, mounted by `app/dashboard/layout.tsx`. It contains workspace, nested CRM/insight and tools links, a persisted collapse preference, hash-aware section links, and a mobile modal drawer with Escape, focus wrapping and return focus. It also links to account/passkeys. Do not change owner gating or route targets.
- Customer: `PortalNavigation` in `components/customer-portal/portal-navigation.tsx`, rendered by `components/customer-portal/customer-portal.tsx`. It offers anchor links for Overview, Timeline, Deliverables and Updates in a sticky horizontal scroller. `aria-current` was fixed to Overview rather than reflecting the section in view. Keep project identifiers, selected project handling, sign-out and authorization unchanged.

## Framework and verification

The repo uses Bun, Next.js 16.4 App Router, React 19 and Tailwind CSS 4. Relevant installed Next.js guides read before implementation: `01-app/01-getting-started/04-linking-and-navigating.md`, `01-app/01-getting-started/11-css.md`, and `03-architecture/accessibility.md`. The guide recommends `next/link` for internal route transitions and route landmarks/headings for route announcements. No dependency or database changes are in scope.

## Design direction

Keep Yorkstead's recognizable warm-paper/cool-slate palette, geometric wordmark, Geist/Geist Mono, restrained blue accents, fine borders, and reduced-motion policy. Consolidate navigation-link presentation through one shared token-based helper, while keeping surface-specific behavior in each existing navigation component. Make the public navigation easier to scan at desktop sizes; make customer section navigation reflect the current section and remain operable at narrow widths; retain owner desktop collapse and accessible mobile drawer semantics.

## Risks and non-goals

- Do not introduce a second theme/token source or change semantic color values without a demonstrated accessibility correction.
- Do not expose owner/customer links or data through unauthenticated public surfaces. Existing route authorization is not modified.
- Do not replace or intercept form submissions, lead capture, analytics, authentication, customer session handling, or theme persistence.
- Do not rewrite all dashboard content styling or alter the design-system bundle architecture beyond documenting the shared navigation contract and aligning catalog references with current sources.
- Public browser checks can run without credentials. Owner/customer browser scenarios may require the existing isolated database fixtures; no production environment may be used for verification.
