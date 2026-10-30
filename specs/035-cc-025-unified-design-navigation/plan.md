# CC-025 implementation plan

1. **Consolidate shared presentation:** introduce a small navigation style helper based on the existing semantic tokens and focus styles; document its use and keep the current CSS variables/design-system export as the source of truth. Reconcile stale catalog and preview references so the existing generator builds from current application sources.
2. **Public navigation:** reuse the public header on Home, Work, Walkthroughs, Solutions, Platform, Pricing and About; simplify its desktop hierarchy, retain every current destination, improve current-route indication and keyboard/accessible naming.
3. **Owner navigation:** apply the shared navigation presentation where applicable; preserve the existing route data, drawer, collapse storage key, hash selection, focus trap and return focus. Add regression coverage for relevant interaction.
4. **Customer navigation:** apply shared styles, make the horizontal section rail touch-friendly, and track the current section with a progressively enhanced observer that defaults to Overview and safely handles missing browser support.
5. **Tests and visuals:** add focused component/unit or browser tests; run responsive desktop/mobile browser checks and capture screenshots into this feature's spec directory.
6. **Convergence and delivery:** run all checks in `docs/verification.md`; review privacy/security and scope; record outcomes, update `CURRENT.md`, commit/push the feature branch and open one PR when GitHub connectivity permits. Do not merge or deploy.

## File-level approach

- Shared helper: `components/navigation/navigation-link-styles.ts`.
- Surface behavior: `components/site-header.tsx`, `components/dashboard/dashboard-navigation.tsx`, `components/customer-portal/portal-navigation.tsx`.
- Tests: focused coverage alongside changed components and/or `tests/e2e/`.
- Documentation: this spec folder, `design-system/source/README.md`, and `docs/handoffs/CURRENT.md`.

## Rollback/recovery

No schema or persistent business-data changes. Revert the branch/PR if navigation behavior or accessibility regresses. Existing localStorage key and theme storage key stay unchanged.
