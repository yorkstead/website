# YS-SYS-001 production database preflight — 2026-11-02

## Result

**NO-GO for PR 1 implementation.** The production database cannot be bound to a Neon project, branch and database using the current authorized provider access. The production-target portion stopped at that identity gate. No production database query, write, migration, configuration change, backup creation or restore was performed.

## Verified repository and deployment identity

- Live `origin/main`: `0d7f2379d359fa63ee7cf70e4fa49040328f30e2`, verified by `git ls-remote` at `2026-11-02T00:46Z`.
- PR #87 is merged; its merge commit is the same SHA.
- Vercel project `website` has a latest `READY` production deployment sourced from `main` at the same SHA: [deployment](https://vercel.com/yorkstead/website/B2EAmqhm5SWf2tHiSAS3nsMdVG2M).
- A dedicated clean checkout was created at that exact commit. The original dirty checkout was not changed. Direct clone/fetch could not resolve GitHub from the shell; the commit object was available locally and matched the live `ls-remote` SHA.

These facts identify deployed source, not its database connection.

## Production database binding attempt

- The Vercel connector-list endpoint returned **403 Forbidden**: the connected App installation does not have access to this project.
- The Vercel environment metadata endpoint, requested without decryption, returned **404 Project not found** under the available Vercel scope. No variable values were requested or read.
- Neon inventory contains multiple plausible projects named `website`; there is no provider connection metadata available to tie one of them to the production `DATABASE_URL`.
- `DATABASE_URL_RECOVERY` was not treated as the primary database or as proof of a valid backup.

Because the project/branch/database binding is unverified, no production SQL was run. The prior read-only counts of seven entries, eleven audit events, zero entries without audit, and 22 matching repository migrations were obtained on an unconfirmed candidate. They are **not production evidence** and are not used as the preservation baseline.

## Requested production checks

| Check | Result |
| --- | --- |
| Applied migration ledger (`0020`, `0022`) | Unverified; no confirmed production connection. Source presence is not applied-state evidence. |
| Seven record IDs, revisions, archive state and redacted material fields | Unverified; no confirmed production query. |
| Per-record audit counts and deterministic production fingerprints | Unverified; no confirmed production query. |
| Audit triggers, immutability protections, constraints and relationships | Unverified on production. Repository schema alone does not establish the deployed database state. |
| Production recovery point, retention and restore procedure | Unverified; the production Neon project/branch is unidentified. |
| Restore capability tested | No. No snapshot or restore was created or run. |

## PR 1 readiness and next evidence

The additive preservation strategy and default-off control remain proposed in the existing plan and ADR. They are not finalized against a verified production baseline. Keep implementation blocked until an authorized read-only operator/provider path supplies:

1. Non-secret metadata tying the current production deployment's `DATABASE_URL` to one Neon project, branch and database.
2. Applied migration ledger and schema protections from that exact target.
3. A redacted seven-record reconciliation, stable IDs, per-record audit counts and deterministic fingerprints.
4. The target's available recovery point, retention limits, restore procedure and evidence of whether restoration has been tested.

After those facts are supplied, review the evidence and reconcile the additive schema, compatibility tests and rollback plan before requesting separate approval to begin implementation. No production change is authorized by this report.
