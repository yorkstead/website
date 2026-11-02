# YS-SYS-001 recovery decisions still needed

**Planning accepted:** encrypted custom-format `pg_dump`, 30-day artifact retention, and a 60-minute incident-to-service RTO target. None authorizes a production export, restore, migration, or deployment.

- [ ] **RPO and cadence:** maximum acceptable loss for ongoing website writes; compare 15 minutes, one hour and 24 hours against feasible frequency and cost. A one-time pre-migration dump has no ongoing RPO.
- [ ] **Storage and keys:** exact private provider/account/region/bucket/path, price, client-side age recipient and recoverable key custody, server-side encryption, access audit, 30-day expiry/deletion proof and legal-hold handling.
- [ ] **People:** primary/secondary backup and restore operators, independent parity reviewer, approval authority and out-of-band contact/credential recovery.
- [ ] **Coverage:** confirm this policy covers only the Website production database; inventory other Yorkstead databases separately.
- [ ] **Execution:** after reviewing the exact source identity, dry-run procedure, expected impact/exposure and cost, approve a specific production export separately. A later production migration requires its own approval.

Until these decisions, independent private seven/eleven parity and a successful isolated restore rehearsal are recorded, production migration 0023 remains **NO-GO**.
