# Feature: Workflow Rescue public launch

## Status
Release approved

## User outcome
As an owner-led business with a frustrating operational handoff, I want to understand whether that workflow is a strong rescue candidate and exactly what a paid review includes, so that I can make a confident inquiry without buying a vague consulting engagement.

## Scope

### In scope
- Reposition the existing Workflow Audit as the clearer public offer “Workflow Rescue.”
- Publish a fixed founding-client price of $750 for one workflow and a clearly bounded delivery promise.
- Add a browser-only bottleneck check that scores five operational signals and recommends an appropriate next step without collecting personal data.
- Show a concrete, fictional sample of the Operations Systems Blueprint.
- Continue using the existing secure Workflow Audit intake, storage, notification, rate limiting, duplicate protection, and owner pipeline.
- Preserve the stable `/workflow-audit` route while using Workflow Rescue in customer-facing copy.

### Out of scope
- Customer accounts, authentication, file uploads, payments, subscriptions, team seats, or a persistent customer portal.
- Automated operational advice presented as a substitute for direct investigation.
- Changes to the owner dashboard or deployment configuration, or database changes beyond allowing the two new anonymous conversion event names.
- Claims of measured savings, guaranteed results, or existing customer adoption.

## Acceptance criteria
- Given a prospective buyer lands on `/workflow-audit`, when the first viewport renders, then the page names Workflow Rescue, displays the $750 founding-client price, identifies one-workflow scope, and states what happens next.
- Given a visitor uses the bottleneck check, when all five questions are answered, then the page shows a deterministic score band, plain-language interpretation, and an appropriate CTA without transmitting or storing the answers.
- Given a visitor reviews the deliverable, when they reach the sample section, then they can see the structure of a fictional workflow map, ranked friction finding, and recommended next action.
- Given a qualified visitor submits the existing intake, when validation and storage succeed, then the request continues to enter the private Yorkstead lead pipeline with its existing privacy and abuse controls.
- Given JavaScript is unavailable or the visitor skips the check, when they navigate the page, then the paid offer and intake remain usable.
- Given the implementation is complete, when required verification runs, then preflight, migration validation, lint, typecheck, tests, and production build pass.

## Constraints and compatibility
- Existing behavior to preserve: `/workflow-audit`, conversion measurement, booking link handling, intake validation, duplicate detection, notification, and owner lead management.
- Data/security considerations: The bottleneck check is local-only and asks no identifying questions. Public form input remains untrusted and server validated.
- Operational or rollback considerations: The feature is additive copy/UI work. A forward-only compatibility migration expands the existing analytics event-name constraint; rolling back the UI does not require reversing it.

## Verification evidence
- Commands: `bun run yorkstead:check`; `bun run db:migrate:check`; `bun run lint`; `bun run typecheck`; `bun test`; `bun run build`.
- Results: Scaffold passed with one active spec; six migrations validated; lint passed with zero errors and three unrelated existing warnings; typecheck passed; 219 tests passed and two existing database-integration tests were skipped; production build compiled and generated 72 routes successfully.
- Security review: The bottleneck check is local-only, collects no identifying information, and records only start/completion plus the allowlisted anonymous result band. Existing server validation, duplicate protection, rate limiting, bounded intake, and private lead storage remain in place. No new dependency, secret, customer account, upload, or payment boundary was introduced; the only database change expands an existing analytics allowlist.
- Release review: The protected Vercel preview deployed successfully and was approved by the owner on 2026-10-11.
