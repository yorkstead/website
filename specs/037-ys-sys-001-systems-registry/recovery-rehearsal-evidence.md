# YS-SYS-001 recovery rehearsal evidence — 2026-11-07

**Evidence provenance:** owner-reported execution summary. Raw archive, private logs, source connection details, row-level data, storage object identifiers, and local paths remain in owner-controlled private custody and were not accessed for this documentation update.

This record distinguishes recovery of the database from readiness of the application. It does not declare the complete recovery exercise or 60-minute RTO passed.

## Sanitized result

| Gate | Result | Evidence summary |
| --- | --- | --- |
| Encrypted artifact retrieval and validation | PASS — owner-reported | Retrieved from private R2; artifact identity, age decryption, ciphertext SHA-256, and custom-format archive validation passed. |
| First isolated restore attempt | FAIL — stopped | Target lacked the Neon-managed `neon_superuser` role required by an archive dependency. |
| Second isolated database restore | PASS — owner-reported | Completed in a fresh network-isolated Docker container running PostgreSQL 18.6. |
| Restore operation timing | RECORDED — partial | 2026-11-07 00:54:49–00:54:50 UTC. This is the restore operation window only, not the full incident-to-service RTO. |
| Database inventory | PASS — owner-reported | 55 application tables and 532 rows inventoried; `neondb_owner` read all reported tables and rows. No row-level values are included here. |
| Migration checksums | PASS — owner-reported | All 22 applied migration checksums match repository revision `ecfb120230013b21689aab866e1d7dbf8d675053`. |
| Migration 0023/0024 state | PASS — owner-reported | Both remain unapplied in the restored state. |
| Directory integrity checks | PASS — owner-reported | Revision, audit creation, audit immutability, and owner-tenant constraint tests passed. Synthetic transactions rolled back; Directory entries and audit rows remain empty. |
| Application startup and smoke tests | NOT RUN | No application-readiness test was performed against the restored database. |
| Authentication, tenant isolation, side-effect isolation | NOT RUN | No application authentication or workflow exercise was performed. |
| Complete 60-minute RTO | NOT DEMONSTRATED | The end-to-end clock and verified application-ready endpoint have not been recorded. |
| Production or R2 mutation | NONE REPORTED | Owner reports no Production mutation or R2 object modification. |

## Interpretation and limits

- The successful restore establishes a database-level recovery result for this rehearsal, based on the owner's report. It does not establish that the restored database can serve the application.
- The first failed restore is a real compatibility finding: the archive references a Neon-managed global role that a generic PostgreSQL container does not provide. The safe response is to use a provider-supported role/restore mapping or an explicitly reviewed least-privilege restore plan. Never create a same-named role with elevated privileges to bypass the failure.
- The second restore's success does not, by itself, document how the role dependency was resolved. Keep the exact private method in owner-held evidence; before relying on it operationally, document and review the role/ownership/ACL mapping without exposing secrets.
- The 55-table/532-row inventory and empty Directory aggregate are aggregate evidence only. They are not a historical parity claim and do not expose application records.
- A one-second restore operation is not a 60-minute RTO measurement. The RTO includes the incident declaration, retrieval, decryption, role/extension prerequisites, restore, application configuration, smoke tests, and verified service readiness.

## Next gate

Prepare a fresh disposable copy of the restored database for an application-readiness rehearsal with external egress blocked and all jobs, queues, webhooks, email, payment, analytics, and external integrations disabled or mocked. Validate synthetic authentication, owner authorization, essential read-only dashboard and legacy Directory workflows, tenant isolation, no persistent side effects, and readiness logging. Keep migrations 0023/0024 unapplied during this phase. Measure the complete RTO from incident declaration through the ready decision. See [`recovery-runbook.md`](recovery-runbook.md).

**Overall recovery exercise:** INCOMPLETE. **Production migrations 0023/0024 and Registry activation:** NO-GO pending separate authorization and all release gates.

## Synthetic application-readiness CI — 2026-11-07

This evidence is separate from the owner-reported Production-derived database restore above. On PR #111 head `290e058a818456d02156aa113ed8c358066e39a5`, exact-head GitHub Actions run [#42353868907](https://github.com/yorkstead/website/actions/runs/42353868907) passed the disposable PostgreSQL 18 restore and application-readiness checks. The app authenticated a synthetic owner, passed owner authorization, read the dashboard and empty legacy Directory, denied anonymous and invalid tenant access, and passed the existing cross-tenant integration suite against synthetic sessions. Before/after database integrity summaries matched; migrations 0023/0024 remained unapplied; internal Docker network checks and the app-container egress probe passed. No external service credentials or side effects were enabled.

The sanitized CI artifact recorded 147 seconds for the synthetic rehearsal. This is not a Production recovery measurement. Full application readiness against the separately restored Production-derived database and the 60-minute RTO remain **NOT RUN / NOT DEMONSTRATED**. The former source schema-preparation failure occurred once without a safe stage diagnostic and did not recur; its cause remains unconfirmed. Subsequent CI corrections addressed Docker membership-output formatting and the synthetic proxy's custom-port incompatibility with production authentication validation. No Production configuration or authentication behavior changed.
