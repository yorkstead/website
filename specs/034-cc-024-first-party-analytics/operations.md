# CC-024 operations and rollout

## Runtime controls

- Neon/PostgreSQL remains the source of truth; no provider credentials are added.
- `ANALYTICS_HASH_SALT` should be a high-entropy server-only value. When no valid configured salt exists, hashes use a cryptographically random process-local salt; cross-process session linkage then resets rather than relying on a weak shared fallback.
- `ANALYTICS_RETENTION_DAYS` remains bounded by the existing supported 30–730 day range and defaults to 90 days. Retention deletes only expired raw event rows through the existing maintenance path; no historical backfill or destructive migration is part of CC-024.
- `NEXT_PUBLIC_FIRST_PARTY_ANALYTICS=disabled` disables browser collection and public event ingestion. Current production value is not inspected or changed by this work.

## Migration and rollout

1. Review the additive migration and checksum with the CC-024 PR.
2. Merge through the normal repository release process only after separate approval; the standard trusted build migration path applies the migration in order.
3. Confirm schema revision and owner dashboard behavior through approved nonproduction/CI evidence before any separate production review.
4. Existing events remain unchanged. New inquiry links are written only by server submission flows after a successful idempotent CRM insert.

## Rollback

Revert application code through a reviewed PR. Retain the nullable inquiry-link column and event history; do not drop tables, delete old analytics or rewrite prior event meanings. If ingestion needs to stop urgently, use the existing disable flag only with separate production configuration authorization.

## Privacy and incident response

Never copy public form values, raw addresses, full referrers or query strings into analytics. Owner-only insights remain private/no-store. Investigate an unexpected event volume through bounded aggregate queries and existing Vercel/Neon operational tooling; do not emit synthetic events into production. Production configuration, database, retention execution and deployment remain outside this PR's authorization.
