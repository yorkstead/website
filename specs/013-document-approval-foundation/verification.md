# Verification and security review

Local environment: disposable PostgreSQL 18.4, Bun 1.3.14; fictional fixtures only. CI uses its existing PostgreSQL 16 disposable service. Production credentials, data and feature gates were not used or changed.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| Additive schema, repeatable upgrade, existing data preserved | `tests/document-approval-database.test.ts`: isolated 0001–0010 upgrade with existing workspace/delivery/auth rows; 0011 creates no customer/document backfill; migration runner twice retains identical history |
| Explicit scope and authorization | Owner session verifier is the default dependency; tests deny missing/invalid actors and forged browser headers; composite FK failures for crossed tenant/project references; owner scope denial for mismatched projects and suspended mapping/tenant |
| Customer foundation preserved | Existing CC-003 tests plus missing/revoked grants, disabled identity, suspended membership/tenant, archived project and cross-project checks in PostgreSQL; all document capabilities false |
| Immutable identity/history | SQL trigger tests reject version update/delete, scope changes, document delete, audit update/delete/direct insertion and all four table truncations |
| Controlled decisions and races | Draft/pending/terminal transitions, duplicate open requests, concurrent conflicting decisions, concurrent version appends, decision/new-version race, old-version creation/decision rejection, supersession and archival |
| Accurate internal evidence | Actor/role/server timestamps and comments stored on decision; generated audit excludes comment/metadata; internal approval never represents customer consent |
| Owner compatibility and disabled public scope | Full existing auth/workspace suite; fictional preview render test; Playwright owner redirect, disabled login and absent customer document/approval endpoints |

## Security findings and tradeoffs

No unresolved exploitable issue identified within the disabled-customer milestone boundary. Schema-owner credentials remain a privileged trust boundary: a DBA can disable triggers or forge transaction context. No claim of RLS or cryptographic tamper evidence. Services receive trusted server dependencies; the test verifier must never come from browser input. Future customer read/decision support requires a separately reviewed redacted projection, session-derived identity/grant revalidation and an explicit capability change; there is no reusable customer consent in this milestone. Audit excludes free text and secrets. Restrictive FKs intentionally block deletion of mapped tenants/projects with history. Metadata has no storage/download fields.

## Matrix

- Scaffold and ordered migration validation: passed (13 specs, 11 migrations).
- Migrations: fresh application and repeat application passed; automated upgrade/preservation and repeat-history tests passed.
- Unit/PostgreSQL integration suite: passed; final count recorded in handoff.
- Lint: zero errors; existing `components/login-panel.tsx:62` navigation warning.
- Typecheck: passed.
- Critical dependency audit: passed.
- Production build: passed without production secrets.
- Playwright: browser runtime installation/rerun in progress.
- Final commit/clean worktree and CI: pending PR creation.

Spec convergence: all seven criteria mapped above; non-goals untouched. Rollback retains additive database history. No production/manual deployment or merge performed.
