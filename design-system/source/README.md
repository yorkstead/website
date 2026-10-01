Yorkstead Systems builds tailored business software for manufacturing, logistics, warehousing, restaurants, ecommerce and owner-led operations. The look fits the work: warm paper grounds, blue-slate ink, one confident blue, and technical mono labels. It should feel like a well-kept operations console, not a SaaS landing page.

## Content fundamentals

- **Voice: plain, owner-to-owner, specific.** Name real operational nouns: quotes, travelers, pallets, dock variances, kitchen queues. Write "Status gets reconstructed from messages, paper travelers, whiteboards, and walk-arounds", not "streamline your workflows".
- **Address the reader as "you" and "your business".** Yorkstead speaks as "we" or through the founder, Brandon York. The core promise is three parallel sentences: *Your business. Your workflow. Your software.*
- **Ownership is the differentiator.** Say "own your system", "clear control over your system and data", "without mandatory subscriptions". Never promise magic, AI or "10×".
- **Casing.** Headings use sentence case ("Software suited to your actual operation"). Mono kickers are UPPERCASE and may carry an index and a `//` separator: `01 // OPERATIONAL FIT`, `DELIVERY METHOD`.
- **No emoji.** Use typographic quotes and apostrophes (’ “ ”) and `&` in industry names ("Warehousing & Logistics").
- **Brand name.** Write "Yorkstead Systems" in full in running text. The wordmark is `YORKSTEAD` + ` SYSTEMS`.

## Visual foundations

**Color.** Use the semantic tokens and never raw hues. Pages sit on `background`. Alternating bands use `surface` and `surface-raised`, and contained content sits on `card` with a 1px `border`. Text is `foreground`, and supporting copy is `muted-foreground`. `primary` is the only brand hue. Spend it on the primary action, links, eyebrows, active navigation and the " SYSTEMS" suffix, and nowhere else. Tints of `primary` at 10% fill and 20–30% border make the eyebrow pill and the header's demo button. `success`, `warning`, `info` and `destructive` are signals only. Project status has its own four-color set (`status-live-*`, `status-dev-*`, `status-concept-*`, `status-previous-*`). Always show it with the status word; never rely on the color alone.

**Themes.** Light and dark are equal citizens and follow the OS by default (`next-themes`, class `.dark`). The light theme is warm (hue 82 grounds, hue 245 ink). The dark theme is cool blue-slate (hue 239). In dark, `primary` lightens and takes dark `primary-foreground` text.

**Contrast notes (kept exactly as the source has them).** In light, `primary` as text on `background` measures 3.6:1, and `primary-foreground` on `primary` measures 3.9:1. Reserve `primary` text for short, uppercase mono eyebrows and bold labels, never for body copy. `destructive-foreground` on `destructive` is 4.0:1 in light and 3.1:1 in dark, so use bold labels. Every other text pair clears 4.5:1 in both themes.

**Type.** The system has one family pair: **Geist** (`sans`) for everything readable and **Geist Mono** (`mono`) for labels. Both load from Google Fonts (`next/font/google`). Headlines are semibold (600) with negative tracking that tightens as the size grows:
- `display`: 72px, leading 0.95, −0.055em
- `page-title`: 60px, −0.04em
- `section-title`: 48px, −0.025em

Every section h2 sits under an `eyebrow`, which is 10px mono UPPERCASE in `primary` with 0.24em tracking. Card kickers and index numbers use `micro` (9px mono, 0.2em). Body copy is `body` (14px/24px) in `muted-foreground`, and intros are `lead` (18px/28px). Headlines max out at `measure` (56rem).

**Spacing and layout.** The site uses the 4px Tailwind scale. Cards pad at `space-5` (20px), and an eyebrow sits `space-3` above its heading. The page container is `content-max` (80rem) with gutters of 12, 24 and 32px at base, sm and lg. The sticky header is `header` (56px, 64px from lg), `background` at 95% with backdrop blur and a bottom `border`. Controls are `control` (36px); inputs are `control-lg` (44px) for touch.

**Borders, radii, shadows.** The system is border-first: every card, input, menu and divider is a 1px `border`, and elevation almost never comes from shadow. Corners come from one base, `radius` (0.7rem):
- `radius-md`: buttons
- `radius-lg`: fields and icon buttons
- `radius-xl`: cards and menus
- `radius-full`: badges and pills

The only branded shadow is `shadow-glow`, the soft `primary` halo on the primary Button. Floating menus take `shadow-menu`.

**States.** Hover darkens `primary` to 90%. It moves secondary, ghost and outline surfaces to `accent`, and nudges outline borders toward `primary` at 40%. Focus is always visible: `:focus-visible` draws a 2px solid `ring` outline offset 3px (7.7:1 in dark, 3.6:1 on the light ground). Fields swap their border to `primary` and add a 2px `primary` ring at 15%. Disabled controls drop to 50% opacity.

**Motion.** Keep motion to color transitions (`transition-colors`) and smooth anchor scrolling. `prefers-reduced-motion` disables all of it. Theme switches never animate.

**Imagery.** Use real product screenshots and PDFs of shipped systems (Ellwood Flow, SIC Pizza POS, JWLD store, Yorkstead Operations) in `radius-2xl` frames with a `border`. Don't use stock photos or illustrations.

**Print.** Pages that print are US Letter with zero margin. Hide chrome with `.no-print`.

## Iconography

Use **lucide-react** (the shadcn "new-york" setup), outline style at 16px (`size-4`) inside buttons and 14px (`size-3.5`) inside small links. Icons inherit `currentColor`. Common glyphs are `ArrowRight`, `MoveUpRight` (external links), `CheckCircle2`, `Factory`, `Truck`, `UtensilsCrossed`, `ShoppingBag`, `Wrench`, `ScanLine`, `GitBranch`, `Sun`/`Moon` (theme toggle) and `Menu`. Decorative icons get `aria-hidden`. Don't use emoji or custom icon fonts.

## Logo

The mark is a geometric **Y**: two dark arms, one `mark-sky` arm and a `mark-sky` hub with a `mark-hub` ring. See **Logos** in Assets.
- On light grounds, use `logo-dark-transparent` (dark ink) or `logo-light` (on its own light tile).
- On dark grounds, use `logo-light-transparent` or `logo-dark`.
- In the site header, the mark (22px) sits beside the `wordmark`: `YORKSTEAD` in `foreground` and ` SYSTEMS` in `primary`.
- Never recolor, redraw or rotate the mark.

## Print collateral

Business cards (see **Collateral**) use a separate dark palette: `collateral-ground` with `collateral-cyan` accents and `collateral-rule` crosshairs. The type is Geist Mono labels over Geist names, with the `.SYSTEMS` suffix in cyan. Keep this palette to print; on screen, use `primary`.

## Components

The components are the site's real React code, built into one bundle (`window.Yorkstead`), and every preview is live.
- **Primitives:** `Button`, `Badge`, `Card` (with `CardContent`), `Input`, `Textarea`, `Label`, `ThemeToggle`, `PrintButton`.
- **Brand and status:** `BrandMark` (with `BrandLogo`), `ProjectStatusBadge`, `ProjectStatusLegend`.
- **Page sections:** `SiteHeader`, `SiteFooter`, `EngagementPricing`, `FounderIntroduction`, `PaginationControls`.
- **Content cards:** `CaseStudyCard`, `SolutionCard`, `DemoCard`, `LabExperimentCard`.
- **Forms:** `ContactForm`, `WorkflowLeadForm`.

In the app, import them from `@/components/ui/*` and `@/components/*`. Build new screens by composing these; don't restyle them. Section content (case studies, solutions, demos, labs, engagements) lives in `lib/*.ts`, and the bundle exposes the site's own copy as `window.Yorkstead.data`.

Outside Next.js the bundle needs these stand-ins:
- `next/link` renders a plain anchor.
- `next/image` renders an `<img>` that points at this system's uploaded media.
- `next/navigation` always reports the path `/` with empty search params.
- `next-themes` switches `data-theme`.
- Analytics tracking is removed.
- The two forms' server actions are replaced by stand-ins that send nothing and reply "Preview only — nothing was sent."

## Not synced

- Tokens left out: Tailwind's `::selection` and `color-mix()` tints (e.g. `bg-primary/10`) are opacity modifiers on the tokens above, not separate values. The dashboard-only accent gradients in `components/dashboard/dashboard-styles.ts` are also left out.
- Fonts: Geist and Geist Mono are Google-hosted, so no font files are bundled.
- Components not built: the owner-only app UI (`Dashboard` and its sections and dialogs, `marketing/*`, `ConsultationWorkspace`, `ConnectPortal`, `LoginPanel`, `PasskeyManager`, `PlatformRoleViewer`), plus page-specific pieces (`WorkflowAuditForm`, `RestaurantTrialSection`, `RestaurantHeroSlideshow`, `ServiceDetail`, `CaseStudyDetail`, `WorkflowCaseStudy`, `WorkPortfolio`, `MarketingOperations`). These depend on auth, the database or server-only code.
