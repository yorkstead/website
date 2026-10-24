# Tasks

- [x] Verify authoritative main and isolated branch; read startup instructions.
- [x] Audit/specification/threat boundaries before implementation.
- [x] Migration 0017 and retained readiness identity history.
- [x] Provider-neutral templates, custody, fake, disabled Resend.
- [x] Queue/leases/retries/suppression/audit and trusted invitation/proof hooks.
- [x] Credential-compatible disabled recovery and generic limits.
- [x] Verified-signature webhook and out-of-order deduplication.
- [x] Owner communications and navigation; production readiness blockers.
- [x] Security/concurrency/database/browser checks and full regressions (435 unit/database; 40 unique browsers across runs; production build and 29 negatives).
- [x] Handoff and full local verification evidence; required CI workflow includes CC-012.
- Delivery evidence: the unmerged feature PR carries exact-head CI/check URLs and results, keeping external verification bound to the commit without self-referential evidence-only commits.

## PR #63 review corrections

- [x] Commit admission account/network limits and request audit before challenge/enqueue work; retain generic responses and fail closed if admission cannot be recorded.
- [x] Derive shared history continuation from both bounded collections, retaining 25/50 DTO page sizes.
- [x] Verify suppressed/queue/custody/challenge failures, repeated and concurrent attempts, account/network exhaustion and audit atomicity in disposable PostgreSQL.
- [x] Verify audit-only, many-events-per-job and mixed histories; actual browser pagination and private/no-store/no-referrer headers.
- [x] Run full 447-test suite, fresh/repeat migrations and upgrades, lint/typecheck, production build, 40 browsers and 29 production-negative requests; retain evidence in review-corrections.md.
- External delivery: push to the existing PR #63 branch; exact-head Actions/Vercel checks and post-verification thread resolutions are recorded on that PR.
