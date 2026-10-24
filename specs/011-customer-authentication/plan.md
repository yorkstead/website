# Plan

1. Preserve the owner authenticator and introduce a separately configured customer Better Auth instance.
2. Add an ordered migration for dedicated customer auth core tables.
3. Add a disabled route boundary and a server-only verified-session-to-project authorization service.
4. Test configuration isolation, disabled provisioning, session denial, identity binding, and tenant/project boundaries.
5. Re-run the existing owner/CRM suite and the complete CI verification matrix.
6. Record the handoff and open an unmerged pull request.

## Recovery and rollback

Keep the additive tables if a rollback occurs; removing application use is sufficient and preserves any future records. Revert the code and route changes. Any later table cleanup requires a separately reviewed migration after confirming the tables contain no records.
