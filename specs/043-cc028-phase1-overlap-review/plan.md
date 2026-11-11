# Phase 1 implementation plan

1. Add a pure bounded comparison function for normalized company and exact email signals. Ignore short/generic company names and require at least two distinct sources.
2. Read existing Marketing workspace, Discovery list, and non-retired CRM inquiries on the server for an explicit bounded search. Preserve source limits and show incompleteness.
3. Render an owner-gated review page and CRM navigation link. Provide source links and confidence wording; no mutation endpoint or new persistence.
4. Test candidate false positives, limits, preservation, and authorization-before-read; run focused and repository checks and record outcomes.
5. Publish one focused PR for issue #119. No merge or deployment is part of this plan.

## File boundaries

- `lib/overlap-review.ts`: read adapter and pure candidate comparison.
- `app/dashboard/overlap-review/page.tsx`: authenticated review page.
- `components/dashboard/dashboard-navigation.tsx`: discoverability.
- Focused tests, this spec, verification, and `docs/handoffs/CURRENT.md`.

No migration, provider API write, or change to Marketing/Discovery/CRM mutation contracts.
