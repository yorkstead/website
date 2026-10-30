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
- [x] Add focused unit, API, migration/database, attribution, security, CRM and owner-browser regressions (database/e2e remaining to run).
- [x] Update privacy, architecture, operations, verification and this checklist with final evidence.
- [ ] Run focused checks and all applicable repository verification; record unavailable environment checks.
- [ ] Review diff for privacy, security and spec convergence; commit and push this branch.
- [ ] Open `CC-024: Restore First-Party Analytics & Conversion Intelligence`; do not merge or deploy.
