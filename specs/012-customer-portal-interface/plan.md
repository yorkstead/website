# Plan

1. Reuse the existing design tokens and UI primitives for a dark-first presentation shell.
2. Define a read-only portal view contract that maps existing project and client-delivery concepts without becoming a persistence model.
3. Add a deterministic, deeply immutable fictional fixture in a dedicated demo module with no storage imports.
4. Build reusable overview, timeline, deliverables, activity, and navigation components with empty states.
5. Add an owner-authenticated preview page below `/dashboard`, plus loading and error states.
6. Add a discoverable owner-dashboard link without changing owner authorization.
7. Cover fixture isolation, semantic markup, disabled capabilities, owner-only routing, public-route absence, and responsive browser requests.
8. Run the full repository verification matrix, update the handoff, and open an unmerged PR.

## Security design

The page performs the existing server-side owner session check before constructing preview output. It accepts no company, tenant, project, identity, or permission input. The view component receives a server-selected, read-only model. A future customer route must assemble the same view only after `getCustomerProjectAccessForRequest`; CC-004 does not add that route.

The demo fixture is code-only, explicitly fictional, and never passed to a persistence function. Customer capability flags remain unchanged. There are no document URLs, download actions, mutation actions, or publishing controls.

## Data and compatibility

No migration is required. No existing schema is changed. The portal view contract is an adapter target, not a source of truth: future production adapters will derive it from the existing `Project` and `ClientDelivery` records after authorization. Legacy workspace records remain untouched.

## Recovery and rollback

Revert the preview page, reusable presentation components, demo fixture, tests, and dashboard link. There is no database or production-data rollback.
