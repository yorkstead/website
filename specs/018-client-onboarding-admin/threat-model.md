# Threat model

Untrusted browser input crosses owner-session, HTTP schema and trusted database boundaries. Deny missing owner at page/API/service. Do not accept actor, role, arbitrary SQL, authority, publication payload, token or credential. CSRF: configured Origin equality, reject cross-site, JSON only and bounded stream. SQL parameters only. Explicit tenant predicates/composite FKs prevent mismatched grant scope. CAS plus tenant/row locks rejects stale/conflicting revocations; repeated operations cannot restore access. No reactivation operations exist.

Prepared invitations cannot issue, redeem or deliver. Administration never selects verifier/password/email-proof columns; no auth credential table reads. Explicit DTOs and generic errors prevent secret leakage. Pagination bounds operational PII; no-store/no-referrer/nosniff controls apply to errors too. The database/service are trusted server construction dependencies. Audit immutability protects app-level history, not a malicious database superuser. Production mutation denial is enforced independently of client state. Legacy trusted services remain responsible for their existing lifecycle controls.

Risks: real-record writes and identity suspension require a separate reviewed activation; delivery state is unavailable; preparation is not launch readiness; inactive/orphaned records require manual review. No domain/name matching. No customer route or authentication changes.

Environment routing ambiguity: reject every disposable connection-string query parameter and fragment, including encoded/repeated host and database/port options. Never infer the effective pg destination from hostname alone when query options are present. Production remains readonly independently of this validation.
