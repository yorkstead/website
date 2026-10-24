# CC-012 — Customer communications and account recovery

Base: authoritative GitHub main b8e317b408ea8fd1c818d9d43fa15c33e1e49ff8, verified 2026-10-24. Feature branch feat/cc-012-customer-email-recovery. No production activation.

## Requirements
Provider-neutral, typed invitation/proof/recovery/security templates; deterministic fake and disabled Resend transport; durable immutable queue intent, idempotency, leases, bounded retries, redacted audit, cancellation on invalid authority. Only trusted services enqueue. No public sending or dispatch endpoint. Owner-only read-only Customer Communications in navigation/sidebar/palette. Raw tokens, bodies and credentials never enter queue/audit/webhook records. Separate encrypted secret custody expires within ten minutes. No actionable enqueue without renderable custody in the same transaction.

Reuse CC-006 issuance and CC-007 proof through optional trusted transaction hooks, without replacing their authorization. Existing default behavior is preserved. Recovery uses existing customer_auth credential accounts and Better Auth password hashing only in disposable rehearsals; no new login authority, identity, membership or grants. Generic account responses and distributed account/network throttles; one-time challenges with tenant/identity rechecks, session revocation and audit. Unsupported passwordless/lost-mailbox identities require reviewed support, never automatic enrollment.

Resend webhook signatures verified by installed SDK (Svix), timestamp bounded, event IDs deduplicated, no raw payload retention. Terminal complaint/bounce dominates earlier events. Production webhook route always returns disabled. Existing contact-inquiry webhook remains unchanged.

Readiness distinguishes inspected infrastructure from production-qualified sender/provider/webhook/proof/recovery/operations evidence. All production qualifications stay blocked/unverified. Schema manifest advances additively; historical context/evidence preserved.

## Non-goals
No live provider request, real customer/Adorned operation, production data mutation, secret/config change, deployment/migration, customer-route activation or merge. Deliver tests, verification evidence and unmerged PR.
