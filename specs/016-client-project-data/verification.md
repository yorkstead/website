# CC-008 verification and launch limits

## Base and implementation

Verified remote main at `05a522abc7e9dc09c66b4c02c74db630eae7e547` after fetching; includes PR #58, 0013 and secure enrollment. Feature branch: `feat/cc-008-client-project-data`. Historical migration files are unchanged. New migration 0014 adds scoped snapshots, revision checks, generated audit and atomic source invalidation.

Owner preparation selects existing Project/ClientDelivery/Update-note fields. Descriptions are optional and require explicit owner selection; dates have separate decisions. Approving the project publishes its overview; each child needs independent approval. Withdrawals are allowed even after lifecycle suspension or source deletion. Source data, publication decisions and the narrow version-1 customer DTO remain separate. No business-data editor or source duplicate is introduced.

## Checks

- Scaffold validation: passes (16 active specifications).
- Dependency audit: `bun audit --audit-level=critical` passes; no dependency changes.
- Migration validation: all 14 migrations pass. Fresh and repeated ledger migrations pass on disposable PostgreSQL 16. Prepared-query tests apply all migrations; dedicated 0013→0014 upgrade preserves legacy source/mapping with zero automatic publication.
- Full unit/database suite: 350 pass, zero failures/skips. Actual Better Auth customer sign-in/session tests cover two published tenants, membership without grant, forged headers, lifecycle denial, withdrawn child/project, separate date approval, source edit/delete/restore invalidation, stale revisions, conflicting owner actions and source-edit/approval serialization. Strict allowlist and semantic rendering checks cover preview and presentation states.
- Lint: zero errors; one pre-existing login-panel warning.
- Typecheck: passes.
- Standard production build: passes without production runtime secrets. Fourteen local production-mode GET/POST smoke requests to customer/auth/enrollment/project/publication paths all return 404.
- Browser verification: all 29 standard scenarios pass across the full run (27 pass) and single-worker retry of two existing public-navigation/journey timeouts (2 pass, 90-second local timeout). All new owner-preview/API-boundary cases passed in the full run. Isolated CC-007 enrollment browser suite: 2/2 pass, confirming enrollment remains unchanged. An initial simultaneous dev-server run was rejected by the Next.js lock; the isolated suite was then run sequentially.
- Diff whitespace check passes; generated `next-env.d.ts` matches the base after the production build. Final post-commit clean-worktree and push status are reported below/in the delivery response.

Initial verification corrections: added 0014 to the explicit migration-version assertion; restored the shared fictional workspace between new database cases so existing CRM tests remain independent. A test expectation was corrected to distinguish owner tenant/project authorization from customer membership authorization; all customer suspension assertions remain. Browser installation was initially missing and then completed. Default browser run passed 27/29, with two existing public-navigation/journey timeout cases queued for a single-worker retry. No security test was disabled or weakened.

## Security review and disclosure limits

No new HTTP/Server Action adapters, customer routes, customer-visible flags, emails, customer activation, documents/downloads, approval/payment integrations, production configuration or secret changes. Production read entry point returns before provider/database initialization. Existing customer enrollment and owner/CRM code are unchanged; the owner preview selects only fixed fictional data and ignores tenant/project selectors.

Allowlisted prose still requires human disclosure review. Full-workspace invalidation includes unrelated source changes and intentionally favors privacy over publication availability. Browser-unsaved changes are not persisted source and cannot be observed by this server service. Statement-snapshot semantics apply to concurrent reads/revocations; every later request rechecks current committed authorization/publication. Audit retains owner decisions and separately identified system invalidations; database administrators remain outside the application boundary. Mapping/tenant deletion with publication history is restricted: use lifecycle status and retain audit.

## Production launch blockers

A separate reviewed change must provide owner publishing UX/transport and customer route integration, review least-privilege database roles and operational monitoring/caching, verify persisted-source freshness, and explicitly authorize activation. CustomerRead remains hard-coded false. No production migration or manual deployment was run. Keep the PR unmerged.

## Remote access blocker

Git fetch works with the supported network execution access. GitHub CLI API calls to `api.github.com` return `Forbidden`; auth readiness also reports the supplied GH token invalid. The environment exposes no ready GitHub outbound identity. PR creation and GitHub Actions inspection require working GitHub API access/credentials. This is an environment restriction, not an application test failure. The user explicitly instructed continuation without requesting credentials or changing production settings: finish local verification, commit and attempt the existing Git remote push, and report branch/SHA/access blocker if the API remains unavailable. No further access request will be made.

## Delivery

Implementation commit `6cce66a7b3050cf1d709d4be6efc0e41651007b8` was pushed successfully through the existing remote to `feat/cc-008-client-project-data`; tracking is configured. The worktree was clean after that commit. A documentation-only follow-up records this status; final HEAD is reported in chat. The branch is available at https://github.com/yorkstead/website/tree/feat/cc-008-client-project-data and GitHub supplied the PR creation link https://github.com/yorkstead/website/pull/new/feat/cc-008-client-project-data . No PR was created because API access remains blocked; GitHub Actions CI is unverified. No merge or deployment occurred.

## PR #59 — customer update chronology correction

Reviewed Vercel thread `PRRT_kwDOUJPn1c6v1_G3` at the original projection line 65. The SQL ordering groups by kind/source ID, so preserving that input order produced arbitrary update chronology. The projection now sorts only validated published updates by timestamp instant ascending, then ordinal source ID ascending for equal instants. Sorting occurs on a newly constructed array and does not mutate source/input rows. The presentation adapter preserves the resulting order.

Regression coverage:

- Multiple updates whose source-ID order conflicts with chronology, with reversed input and timezone-offset timestamps.
- Identical/equivalent timestamp instants, ordered deterministically by source ID across different input permutations.
- Actual Better Auth session/database flow with four published updates, one draft and another tenant; individual withdrawal removes its content and preserves remaining chronology, retains audit, and project withdrawal hides the whole projection.

Local correction verification: targeted suites 12/12 pass; full suite 353/353 pass with no skips on fresh disposable PostgreSQL 16, including prepared-protocol migrations and upgrade tests. Scaffold, 14-migration validation, critical dependency audit, lint, typecheck and standard production build pass. Lint retains one pre-existing login-panel warning. No migration, authorization query, field allowlist, publication gate, customer route or production configuration changed. Browser-only code is untouched; full browser/enrollment verification is included in fresh PR CI.

PR and review access is now available through the connected GitHub tools; the initial delivery API blocker above is historical. Fresh CI must be checked against the correction commit, not the original `bba69ef` head. Final exact-head run URL/status and thread-resolution evidence are maintained in the PR verification section and review reply after pushing. No merge or deployment is authorized.
