# YS-SYS-001 — trusted baseline runner handoff

**Observed:** 2026-11-03. **Branch:** `feat/ys-sys-001-preservation-runner`, based on verified GitHub main `5a06dc0e70fac2186a3acf8dd59d9ddb40eaad46`.

## Current work

- Adds an owner-operated Ubuntu WSL selective baseline CLI and a synthetic-only PostgreSQL/object-storage verification path.
- The runner captures only the seven Systems Directory entries, associated audit events, migration ledger, role permissions and protection trigger metadata in a repeatable-read/read-only transaction.
- The private artifact uses versioned canonical UTF-8 JSON and SHA-256 fingerprints. It is locally age-encrypted before R2 upload, independently retrieved, hash-checked, privately decrypted and revalidated. Output is aggregate/redacted only.
- The dedicated reader role and exact database grants are documented but not created. Private target/storage attestations, a separate one-time capture authorization and interactive confirmation are required before the owner CLI can query Production.
- Historical row-level baseline remains unavailable. No historical parity is claimed.

## Current verification

- Focused pure tests: PASS, 2 tests / 22 expectations.
- Full unit suite: 438 pass, 117 skip, 0 fail. Database-dependent skips are not treated as completed integration verification.
- Typecheck: PASS. Focused ESLint: PASS. Full ESLint: 0 errors and 1 existing warning in `components/login-panel.tsx`.
- Production build: PASS on final code. `yorkstead:check`: PASS. `db:migrate:check`: PASS for repository migrations 0001–0023. `git diff --check`: PASS.
- PostgreSQL integration: NOT RUN locally because no PostgreSQL server is installed and the Docker command is unavailable (`snap-confine` refuses execution in this environment). The existing `recovery-rehearsal` CI job has been extended to run the synthetic integration but has not yet run on this branch. Exact synthetic database/storage results therefore remain unverified.
- No Production records, credentials, roles, R2 objects, configuration, backups, or migration 0023 were accessed or changed.
- `docs/handoffs/CURRENT.md` remains untouched due the historical-content restriction.

## Next exact action

Run the branch in the isolated `recovery-rehearsal` GitHub Actions job and review its exact-head result before treating synthetic end-to-end verification as complete. This worktree has not been pushed and no PR/CI run has been initiated. Production role creation and capture require separate approvals and fresh owner attestations.
