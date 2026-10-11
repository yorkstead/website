# Implementation plan: Workflow Rescue public launch

## Approach
Preserve the mature Workflow Audit server flow and add a client-only assessment plus clearer commercial framing around it. Keep the assessment deterministic and stateless so the first launch requires no migration, authentication, payment integration, or new trust boundary.

## Files and boundaries
| Area | Change | Risk |
|---|---|---|
| Yorkstead scaffold | Add project profile, constitution, skills, handoff, preflight, and verification scripts | Low; documentation and additive checks |
| `components/workflow-rescue-check.tsx` | Add accessible five-question local assessment | Medium; client interaction and analytics |
| `app/workflow-audit/page.tsx` | Reframe offer, publish founding price, embed assessment and sample Blueprint | Medium; public conversion path |
| `components/workflow-audit-form.tsx` | Update customer-facing labels from audit to Workflow Rescue | Low; existing action remains unchanged |
| `lib/engagements.ts` | Align catalog title, price, scope, and CTA copy | Medium; reused across public pages and lead records |
| `lib/conversion-analytics.ts` | Allow local assessment start/completion events | Low; allowlisted first-party metadata only |
| focused tests | Verify deterministic scoring and offer catalog contract | Low |

## Decisions
- Keep `/workflow-audit` as the stable route for compatibility and search continuity.
- Use “Workflow Rescue” publicly and “Operations Systems Blueprint” for the deliverable.
- Founding offer is $750 for one workflow, limited to the first three qualified clients.
- The assessment does not claim quantified savings and does not send answers to the server.
- The secure client portal is a later feature contingent on paid-customer validation.

## Verification strategy
- Automated: Bottleneck scoring unit tests, engagement catalog tests, Yorkstead preflight, migration check, lint, typecheck, complete Bun suite, and production build.
- Manual: Keyboard/touch assessment completion, responsive content review, no-JavaScript offer usability, and staging intake submission.
- Release/rollback: No migration. Revert the feature commit if conversion or intake regressions appear.
