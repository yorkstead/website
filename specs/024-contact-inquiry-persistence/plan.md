# Implementation plan: Contact inquiry persistence recovery

## Approach
Use a shared insertion helper with PostgreSQL's partial-index inference predicate, exercise that helper against the actual migration-created schema, and fix the second exact conflict target found in the nonprofit path. Keep already-compatible untargeted `ON CONFLICT DO NOTHING` paths unchanged. Make email fallback messaging explicitly distinguish email notification from CRM persistence.

## Files and boundaries
| Area | Change | Risk |
|---|---|---|
| `lib/contact-inquiry-persistence.ts` | Shared parameterized insert adapter | Low; preserves existing columns and key |
| `app/actions/contact.ts` | Use shared insert; disclose email-only fallback | Low; customer-facing wording |
| `app/actions/nonprofit.ts` | Match existing partial unique index | Low; duplicate semantics unchanged |
| `tests/contact-persistence-database.test.ts` | Transactional disposable PostgreSQL regression | Low; rollback fixture |
| `tests/contact-submission.test.ts` | Assert fallback state communicates persistence accurately | Low |

## Decisions
- Match the existing index predicate exactly: `ON CONFLICT (submission_key) WHERE submission_key IS NOT NULL DO NOTHING`.
- Do not alter schema, migrations, constraints, or production data.

## Verification strategy
- Run integration tests against CI's disposable PostgreSQL after migrations.
- Run scaffold, migration check, lint, typecheck, full tests, and production build.
- Revert the fix commit to roll back; no migration or data cleanup is required.
