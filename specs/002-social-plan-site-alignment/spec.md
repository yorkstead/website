# Feature: 30 Days to Market site alignment

## Status
In progress

## User outcome
As a prospect arriving from Yorkstead's 30 Days to Market posts, I want each named offer, link, and ownership promise to match the website, so that I can move from a social post to the right next step without confusion.

## Scope
### In scope
- Keep every Week 2 and Week 3 campaign destination reachable.
- Make the free floor walkthrough and its Cal.com destination visible even when a deployment setting is absent.
- Use “Union OS” consistently in customer-facing copy while preserving the stable `table-os` route and internal identifiers.
- State plainly that the customer receives the agreed custom code and documentation after final payment, while preserving proposal-defined scope and third-party boundaries.
- Keep Workflow Rescue at $750 for the first three qualified one-workflow clients with a target of seven business days after agreed inputs are complete.

### Out of scope
- Changing campaign dates, posting to social media, creating the four owner-photo posts, or moving the Jeweled deployment.
- Changing product pricing, payment terms, database schema, intake fields, or customer authentication.
- Renaming stable public URLs or internal analytics event names.

## Acceptance criteria
- Given the booking environment variable is absent or invalid, when a public page renders the free floor-walk CTA, then it links to `https://cal.com/yorkstead`.
- Given a visitor arrives from the campaign, when they view the homepage or Workflow Rescue page, then “free floor walk” is visible as the first-step option.
- Given a visitor sees the restaurant system on a Yorkstead-owned page, when its product name is displayed, then it reads “Union OS.”
- Given a visitor reviews the ownership model, when they read the plain-language promise, then it says they receive the agreed custom code and documentation after final payment and can keep using it without a required Yorkstead support subscription.
- Given the alignment work is complete, when required checks and live-link checks run, then all campaign routes succeed and the site builds without new errors.

## Constraints and compatibility
- Existing behavior to preserve: Workflow Rescue intake, conversion tracking, stable routes, case-study slugs, external demo, and proposal-defined commercial boundaries.
- Data/security considerations: No new data collection, client storage, secrets, or third-party scripts.
- Operational or rollback considerations: Copy and fallback-link changes are additive and reversible; no database migration is required.

## Verification evidence
- Commands: Pending.
- Results: Pending.
- Manual checks still required: Production CTA and copy review after deployment.
