# CC-010 verification

## Base and boundaries

Fetched origin/main with supported network access and verified required merge `6be30814c6a62e6b9efe8327ee4984596211f799` before creating `feat/cc-010-client-onboarding-admin`. CC-009 and historical migration 0014 are present. Historical migrations unchanged. No real customer records, production database, secrets, settings, migration, deployment, activation, delivery or merge were accessed/performed.

## Local evidence

- Bun 1.3.14, disposable PostgreSQL 16 (`postgres:16-alpine`, loopback port 5436). Dedicated fresh `cc010_final_test` for unit/database verification, separate `cc010_test` for fictional browser fixtures.
- Fresh and repeated migrations: all 15 pass; preparation table empty on additive prepared-query upgrade; existing suspended tenant retained with revision 1. Historic prepared-query compatibility remains covered.
- Complete suite: **382 pass, 0 fail, 0 skips**, 4,199 assertions, 92 files. New tests cover owner denial at service/HTTP, schema authority injection/unsupported operations/confirmation, CSRF/body bounds/privacy headers, production gate, safe preparation retries, cross-tenant scope, concurrent CAS revocation, established per-request authorization denial, invitation lifecycle/audit, audit tampering, duplicate tenant/mapping/global uniqueness, missing source project, disabled mapping creation without implicit grants, stale rename, archival, pagination and safe DTOs.
- Client Access actual-owner browser suite: **2/2 pass**, 390px and 1440px. Uses existing owner Better Auth fixture; fictional issue operation occurs only in the isolated test fixture. Covers unauthenticated page/API, organization pagination/selection, readiness, preparation review/no issuance, focus/Escape/cancel, grant and invitation revocation, owner audit, concurrent membership suspension conflict, explicit refresh, unavailable state, no horizontal overflow, actual no-store/no-referrer headers.
- Scaffold: pass (18 active specs). Migration plan: pass (15). Critical dependency audit: pass. Lint: pass with one pre-existing login-panel navigation warning. Typecheck: pass.
- Existing browser suites, production build and remote CI: pending below; do not interpret pending checks as passed.

## Findings corrected during verification

The global Next.js header configuration overrides handler Referrer-Policy; a narrowly scoped dashboard/API rule now ensures actual no-referrer responses. Browser regression checks the actual header. Reused DialogBoundary for focus trap, focus restoration, scroll lock and background isolation. Named the error alert to distinguish it from Next.js route announcements. Existing 0014 upgrade test accidentally selected the newest migration rather than 0014; it now explicitly targets 0014, preserving every original data/security assertion. Updated the migration inventory to include 0015. A reused browser database exposed an existing lead test assumption about an empty primary workspace; final complete suite ran on a newly migrated dedicated database, as CI does.

## Security review and remaining activation blockers

No unresolved critical/high finding in this change. Production runtime always denies writes, even with disposable opt-in. There is no token issuance/delivery/redeem/session API in this workspace. No grant issuance, privilege changes, reactivation, identity impersonation or identity suspension operation. New organizations/mappings stay disabled. Only mapping archival is supported; no reassignment or activation. Audit generated within the mutation transaction retains actor/time/revision and no credential payload. Existing customer-auth, enrollment/email-proof and publication authorization/gates are unchanged.

Preparation is retained configuration with immutable history, never an issued invitation. Delivery status is unknown; launchReady remains false. Production activation requires a separate reviewed milestone: least-privilege role/operational review and real-record write authorization, tenant/mapping lifecycle activation, delivery integration, email proof/enrollment and customer-route activation. Existing associated identities are organization-scoped; unassociated identities are not auto-assigned or browsable through an unscoped identity endpoint. Orphan flags identify memberships with no grants. Identity lifecycle changes remain unsupported until a reviewed contract exists. Preparation scope is limited to explicitly chosen active mappings and is not auto-issued later.

Rollback: revert UI/HTTP/runtime first; retain 0015 revision fields and append-only preparation/admin audit history. Do not drop history or modify historical migration checksums.
