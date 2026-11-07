# Application-recovery rehearsal tasks

- [x] Add the application-recovery spec, plan, tasks, and verification matrix before implementation.
- [x] Add a synthetic-only database preparation helper that applies and verifies migrations 0001–0022 and refuses any other target/mode.
- [x] Add sanitized before/after database integrity checks bound to canonical checksums and the legacy Directory protections.
- [x] Add an isolated production application image and TLS proxy configuration without adding a general deployment Dockerfile or Production configuration path.
- [x] Add a disposable orchestration script that creates source/target PostgreSQL 18, restores the synthetic archive, verifies Docker internal networking, and cleans every artifact on exit.
- [x] Add Playwright HTTP/browser coverage for synthetic owner authentication, owner authorization, dashboard/legacy Directory read workflows, and anonymous denial.
- [x] Run the existing actual-session cross-tenant client publication database suite against the restored synthetic target.
- [x] Add a dedicated least-permission GitHub Actions job with no secrets/deployment permissions and upload only redacted aggregate evidence.
- [x] Update recovery runbook, verification record, and the current handoff with exact results and remaining limits.
- [x] Run relevant focused checks, the full repository verification suite, Docker-backed CI, exact-head Actions, and Preview.
- [x] Confirm 0023/0024 remain unapplied, no external side effects are reachable/configured, and Production/RTO gates remain NO-GO.
- [ ] Add bounded migration-failure categories alongside the existing sanitized phase, migration version, and SQLSTATE diagnostics.
- [ ] Separate synthetic database administration credentials from the non-superuser application runtime role and verify runtime privileges.
- [ ] Assert authenticated dashboard content is visible in the isolated browser rehearsal.
- [ ] Re-run focused and repository verification, then record exact-head CI evidence and remaining limits.
