# Implementation plan

1. Audit existing authentication, invitation/proof, access and readiness; specify boundaries.
2. Add 0017 immutable delivery queue, custody, recovery, suppression, event and audit persistence; retain old migration bytes.
3. Implement safe templates, keyring custody, fake and gated Resend, transactional integrations, fenced dispatcher and compatible recovery rehearsal.
4. Verify documented SDK signatures and implement disabled customer-only webhook ingestion; retain contact webhook behavior.
5. Add read-only owner communications and blocked production readiness facts; preserve evidence invalidation/history.
6. Exercise disposable PostgreSQL 16, negative/security/concurrency and actual owner browsers; full regressions, production negatives and CI. Record results and limits, update handoff, open unmerged PR.
