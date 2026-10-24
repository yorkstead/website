# Acceptance criteria

- Verified latest main includes 0013; migrations 0001–0013 unchanged.
- No records visible by default; draft/private/withdrawn children excluded; project approval independently required.
- Only verified owner can prepare/approve/withdraw/inspect. Decisions retain actor and timestamp; stale revisions conflict.
- Identity, tenant, membership, mapping and grants must remain active; cross-project/tenant selection fails closed.
- Independently approved timeline dates; internal notes, decisions, activities, payments, links and administrative metadata excluded.
- Source saves/restores/deletions invalidate approval in the same database transaction; archived mapping denied.
- Concurrent actions serialize and failed writes/audit roll back together.
- Published updates sort chronologically by timestamp instant, then source ID for ties, independent of database/input order; withdrawn updates disappear without reordering the remaining history.
- Versioned allowlisted projection renders existing portal sections, safe empty/loading/unavailable/revoked states and owner-only fictional preview.
- Production customer routes remain disabled and enrollment/owner/CRM behavior preserved.
- Verification evidence and unresolved launch blockers recorded in verification.md; deliver unmerged PR and passing CI.
