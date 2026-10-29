# CC-014 production readiness and recovery notes

## Documented deployment context

- Database provider: Neon.
- Production organization ID: `org-aged-leaf-21920027`.
- Production project ID: `old-boat-18584731`.

These are documented identifiers, not a live observation. The application does not query Neon or infer project identity from `DATABASE_URL`. The Operations page may show this context to an authenticated owner, but does not display, log, parse, or return connection strings, passwords, tokens, or other credential values. A healthy database query proves only that the configured database accepted that bounded read-only query; it does not prove that the configured target is this project.

## Evidence semantics

- Runtime environment comes from the platform's non-secret `VERCEL_ENV` fact where available. Development mode can be identified from `NODE_ENV`; otherwise the environment is unknown.
- Database configuration is a boolean presence check. Database connectivity, auth configuration and schema remain separate point-in-time checks.
- Neon target identity remains `not_verified` because this application has no trusted source for mapping its configured connection to an organization/project identifier.
- Backup availability requires a dated provider observation and retention boundary. It says nothing about whether a restore works.
- Restore verification requires a separate, dated test against an isolated target, integrity results, and measured recovery time. It does not establish that a current recovery point exists.
- In CC-014 the application has no trusted source for either external backup evidence or independent restore evidence; both controls therefore remain `not_verified`.

## Recovery procedure for a separately authorized incident

This document is guidance. It does not authorize or provide a production recovery action.

1. Name the incident owner and escalation contact. Capture the incident timeline and preserve relevant logs without copying credentials or customer data into public artifacts.
2. Verify provider account, organization and project identity using an approved owner-only provider session. Compare with the documented IDs above. Do not rely on this website's status page or on an uninspected connection string for identity proof.
3. Inspect provider backup/restore-point availability and retention. Record the observation time, source and selected restore point in restricted operational evidence.
4. Restore into an isolated, non-production target. Do not overwrite or test against the production database.
5. Verify schema/migration state and application integrity with reviewed checks. Test tenant-scoped authorization and representative read paths without exposing customer records.
6. Record the restore test's data scope, integrity results, start/end times and measured recovery point/time. Keep this evidence separate from the provider backup observation.
7. Obtain explicit cutover authorization and use a reviewed cutover/rollback plan. Define the rollback trigger before changing any production route or connection configuration.
8. After any separately authorized cutover, verify service checks, owner access, tenant isolation and application behavior; preserve incident and recovery evidence.

## Rollback

Reverting CC-014 removes its readiness presentation and guidance only. It requires no database migration rollback or provider change. A future operational restore or cutover has its own rollback plan and authorization requirement; reverting application code is not a database recovery strategy.
