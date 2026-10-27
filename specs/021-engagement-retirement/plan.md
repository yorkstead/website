# Implementation plan

1. Verify encrypted custody and recovery outside Git; audit published documentation using path/line reports without repeating values.
2. Add ordered migration: append-only registry plus trigger-generated event audit, relational fingerprint, trusted operator function, immutable retention guards. Preserve all historical migrations.
3. Add parent serialization and old/new scope checks to Hub child writes. Retirement changes operational states before recording the tombstone inside one transaction. Any error rolls back every change. Reject external task mappings requiring reconciliation.
4. Update existing server-side reads and website retention/conversion to exclude tombstones. Keep authorization and private responses. No public retirement endpoint, feature switch, provisioning, new credentials or production writes.
5. Test synthetic fresh/upgrade schemas, successful retirement, unchanged financial history, stale/replayed authorization, rollback, direct mutation/truncate denial, unrelated records and competing transactions. Run both repository baselines.
6. Publish separate draft PRs; preserve existing PRs and unrelated working edits. Record tested heads, limitations and explicit deployment/data authorization checkpoint.

## Rollback

Before commit: transaction ROLLBACK, validated in disposable testing. After commit: permanent tombstones remain. Roll back application presentation only while retaining database deny/retention guards and audit; never restore a pre-retirement application that leaks retired data without compatible filters. Any mistaken identity requires incident review and a new compensating design, not deleting audit/unretiring. Rehearse backup restore in isolation; no whole-production reset.
