# Threat model

- Customer/anonymous actors must not access candidate prose, publication state or audit. Gate page, HTTP controller and service; never accept owner identity/tenant/role from request data. Production uses existing Better Auth owner verification.
- Browser payloads and selectors are hostile. Exact schemas, bounded byte streams, configured origin/Fetch Metadata checks and JSON-only mutations prevent injection and CSRF. No arbitrary source JSON, bulk operations or data-source writes exist.
- Concurrent source changes and owner edits: preserve source-first locks and CC-008 revision checks; approval requires a current prepared revision. Invalidation remains global. A browser review can become stale at any time; fail conflicts closed and clear old approved preview on refresh/error/selection changes.
- Preview: approved-only scoped query and shared strict projection assembler; active tenant/mapping plus approved overview required. Draft review stays separate from the customer-safe preview. No customer session or customer capability override is introduced.
- Cache/leakage: private/no-store JSON, no-store client fetch, noindex page, no error internals, no payload logging. Only customer-safe fields are previewed; owner audit is never passed into the portal.
- Browser unsaved data is not authoritative. Explain save/refresh flow and global invalidation. Partial network failure after mutation requires refresh, never automatic replay or approval retry.
- Database administrators and compromised owner sessions remain outside this application trust boundary. Retain history and disabled customer routes on rollback; reverting UI/adapters leaves CC-008 persistence intact.

Security review: no schema/state-machine/capability/CSP relaxation; the full preview authenticates independently and emits only the shared safe portal DTO. Repreparation intentionally removes existing approval immediately; UI warns before that action. Recent audit display is capped at 200 entries and preserves all underlying history. The browser test fixture creates only fictional owner credentials in a matching loopback disposable database and cannot run in production.
