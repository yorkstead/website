# Implementation plan: 30 Days to Market site alignment

## Approach
Treat the campaign plan as the customer-facing message map, then make the smallest reversible site changes needed to remove broken or conflicting paths.

## Files and boundaries
| Area | Change | Risk |
|---|---|---|
| Booking configuration | Provide the confirmed Cal.com page as the safe default | Low; external destination already in campaign |
| Homepage and Workflow Rescue | Surface the free floor walk and plain ownership promise | Low; copy and links only |
| Restaurant product data | Standardize display name to Union OS | Low; preserve slugs and identifiers |
| Focused tests | Lock the booking fallback and public labels | Low |

## Decisions
- The campaign's “Union OS” spelling is the public display name.
- `cal.com/yorkstead` is the canonical free floor-walk entry point and currently redirects to the live event page.
- “You get the code” means the agreed custom code and documentation after final payment; third-party services and precise delivered scope remain defined in the proposal.

## Verification strategy
- Automated: Focused Bun tests, Yorkstead preflight, migration validation, lint, typecheck, full test suite, production build, and relevant Playwright coverage.
- Manual: Check campaign links, homepage CTA, Workflow Rescue CTA, and restaurant naming at desktop and mobile sizes.
- Release/rollback: Deploy through the existing Vercel project; revert the alignment commit if the booking or conversion path regresses.
