# Customer portal interface

**Assignment:** CC-004  
**Status:** Complete  
**Date:** 2026-10-23

## User value

Yorkstead can review a polished, reusable customer project experience before any customer account or route is enabled. The preview communicates progress, milestones, deliverables, decisions, and next actions without exposing production client data.

## Discovery

- The site uses Geist typography, semantic OKLCH tokens from `app/globals.css`, Tailwind responsive utilities, and the existing Card, Badge, and Button primitives.
- Owner pages authorize on the server with `getOwnerSession(await headers())` and redirect unauthenticated requests to `/login`.
- Project identity and progress live in the existing `Project` model. Milestones, deliverables, decisions, document links, payment references, and delivery activity live additively in the optional `ClientDelivery` object inside the versioned workspace JSON.
- Website inquiry and CRM records remain read-only linkage sources. Customer authorization separately requires a verified session plus active identity, tenant, membership, tenant project, and explicit project grant.
- Customer login, invitations, published updates, and document sharing capability gates are false.
- No new persistence model is required. The portal consumes a presentation view assembled from existing project and delivery concepts.

## Requirements

1. Provide reusable, read-only overview, timeline, deliverables, activity, and navigation components.
2. Present company identity, project summary, phase, status, progress, next action, deadline, and Yorkstead contact.
3. Present ordered milestones with complete, active, blocked, and upcoming states and an explicit no-date state.
4. Present deliverable status, internal review state, and optional version/date metadata without file URLs or download controls.
5. Present chronological updates, decisions, and reviews with clear draft, internal-review, and approved labels.
6. Use semantic headings, landmarks, native keyboard-accessible links, visible focus styles, and responsive layouts.
7. Host the preview only below the owner-authenticated dashboard boundary and label all fixture content as fictional.
8. Keep the fixture deterministic, immutable, separate from production storage, and free of Adorned data.
9. Keep customer routes, authentication, invitations, publishing, and document sharing disabled.
10. Preserve owner CRM, workspace persistence, and existing public website behavior.

## Acceptance criteria

- An owner can open `/dashboard/customer-portal-preview` and review all five interface sections.
- An unauthenticated request is redirected to owner login before preview content is rendered.
- No `/customer-portal` page, public document endpoint, customer sign-in UI, invitation UI, or publishing action is introduced.
- The fictional fixture is explicitly labeled and has no database, workspace, CRM, or network dependency.
- Empty milestones, deliverables, and activity render useful empty states.
- Portal markup has one main heading, named navigation, landmarks, status text, and no download or external document link.
- Mobile, tablet, and desktop layouts remain readable without horizontal overflow.
- Existing customer capability flags remain disabled and security regression tests pass.
- Repository scaffold, migration validation, lint, typecheck, unit/integration tests, Playwright, production build, and clean-worktree verification pass.

## Non-goals

- Customer authentication or account provisioning.
- Invitations, publishing, document sharing, downloads, or public customer routes.
- Production client linkage, Adorned data access, or production record changes.
- A new database table, API, UI framework, or parallel delivery source of truth.
- Editing project delivery data from the preview.

## Verification

- GitHub Actions CI run #215 passed scaffold validation and dependency audit.
- The migration plan validated and all migrations applied to disposable PostgreSQL.
- Unit and PostgreSQL integration tests, lint, typecheck, Playwright, production build, and generated-worktree cleanliness passed.
- Vercel's GitHub integration reported the branch preview ready; the portal path still requires the existing owner session.
- No production data or configuration was accessed or changed, and no manual deployment was initiated.
