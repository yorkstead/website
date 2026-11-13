# Tasks

- [x] Discovery and specification before implementation
- [x] Additive schema and audit/immutability constraints
- [x] Authorized document/version/approval/history services
- [x] Fictional owner-only preview
- [x] Unit and disposable PostgreSQL security/concurrency tests
- [x] Full verification matrix and spec convergence
- [x] Handoff, feature commit, PR and CI evidence

## Reconciliation — 2026-11-11

Every item above shipped long ago; the checklist was never updated. Evidence on `main`:

- Additive migration `0011` and the document approval schema are applied by the ordered migration set, with checksums validated by `bun run db:migrate:check`.
- `tests/document-approval.test.ts` and `tests/document-approval-database.test.ts` cover authorization, concurrency, supersession, and history preservation.
- The feature is a working dependency of owner publishing (CC-008/CC-009) and the later customer-release and communications work.
- The historical note in `verification.md` about a pending PR describes the state before delivery, not current status.

No product change accompanies this reconciliation; it only corrects the record.
