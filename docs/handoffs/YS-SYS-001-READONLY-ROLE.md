# YS-SYS-001 Production Read-Only Role — PUBLIC TEMP Compatibility

- Follow-up to merged reader tooling: owner-reported Production setup found no reader role and found `TEMPORARY` granted to `PUBLIC` on the target database. The failed setup rolled back; no Production role or ACL was changed by this work.
- The reviewed change permits only the existing target-database `PUBLIC TEMPORARY` grant. It rejects database `CREATE`, explicit reader `TEMPORARY`, and the existing prohibited effective data, schema, routine, ownership, membership, and cross-database privileges. It does not revoke or grant any Production-wide ACL.
- Explicit boundary exception: the reader can create and write session-local temporary tables and use temporary storage. The fixed preflight remains schema-qualified/read-only for application relations; synthetic tests cover shadow-name behavior, protected-column denial, and permanent-table write denial. Use the credential only for the fixed preflight and disable/revoke it after use.
- Removing TEMPORARY from PUBLIC would affect every database role and requires separate impact review/owner approval; it is not recommended as a prerequisite for this reader.
- Development and synthetic PostgreSQL 18 CI only. No Production connection, SQL, role, ACL, migration, backup, configuration, or Registry activation was accessed or changed.

See `specs/037-ys-sys-001-systems-registry/production-readonly-role.md` for details and residual risk.
