# Rework Flow flagship case study

The sixth catalog entry is first in selected work, with status **Working prototype**. `/work/rework-flow` uses the optional `workflowStory` contract and reusable `WorkflowCaseStudy` renderer. Other project detail pages keep their existing renderer.

The story includes problem, observation, before/after role handoffs, solution, six scenario links, intended outcomes, limitations, and architecture. Its CTAs target `https://ops.yorkstead.com/rework?mode=guided`, `https://ops.yorkstead.com/rework`, and the local architecture section. `/demos` and the Labs & Prototypes filter expose the new profile. Static params, sitemap, and generated project metadata inherit it through the catalog.

All company, personnel, load, evidence, and invoice content in the new public demo is synthetic. No customer photography or branding is republished. Measured customer outcomes are not claimed. The sandbox is page-local and resettable, not a multi-user deployment of the entire client app.

No existing global visual identity was changed. No new environment variables or schema changes are required. Deploy Operations before Website, and verify actual provider repository/branch bindings before publishing. See Operations `docs/PUBLIC_REWORK_DEMO.md` for rollout details.

Checks: `bun test`, `bun run lint`, `bun x tsc --noEmit --incremental false`, `bun run build`, and `bun x playwright test tests/e2e/rework-case-study.e2e.ts`. Browser tests verify discovery, story headings, scenario links, CTA URLs, architecture navigation, browser errors, and overflow at desktop and phone widths.
