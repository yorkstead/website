# CC-024 tasks

- [x] Verify the clean feature checkout, merged #79/#80 base, existing analytics design, privacy requirements and user authorization.
- [x] Document the current implementation and audit findings.
- [x] Define acceptance criteria, metric semantics, migration strategy and rollout boundaries.
- [x] Add the backward-compatible inquiry-link migration and migration regressions.
- [x] Harden public event payload, path, origin, rate, privacy and response handling.
- [x] Make page-view and outcome retries/remounts idempotent without hiding legitimate visits/clicks.
- [x] Link only server-confirmed stored inquiries to analytics outcomes; remove sensitive form metadata.
- [x] Correct session, page-view, CTA, inquiry, funnel, attribution and period-comparison definitions.
- [x] Improve the existing Insights page and add a compact Command Center Overview snapshot.
- [x] Add focused unit, API, migration-manifest, attribution, security, CRM-linkage and Command Center regressions; run applicable browser checks and record environment gaps.
- [x] Update privacy, architecture, operations, verification and this checklist with final evidence.
- [x] Run focused checks and all applicable repository verification; record unavailable environment checks.
- [x] Review diff for privacy, security and spec convergence; commit and push this branch.
- [x] Update the existing CC-024 PR to `CC-024: Restore First-Party Analytics & Conversion Intelligence` and leave it as a draft pending database-backed CI; do not merge or deploy.
- [x] Correct tracker effect idempotency so replays share an ID while later visits/navigation get a new ID; add focused regressions.
- [x] Bound current and previous analytics dashboard windows explicitly, including snapshot and related reports; add metric regressions.
- [x] Count only linked inquiry outcomes in the stored-inquiry funnel step and label unlinked history separately; verify against disposable PostgreSQL.
- [x] Run full repository verification and exact-head GitHub CI, reply to the three Vercel review threads, then resolve them after evidence passes; keep PR #81 draft and do not merge or deploy.
