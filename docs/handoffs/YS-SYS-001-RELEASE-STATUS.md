# YS-SYS-001 release status — 2026-11-02

This is a redacted status supplement for issue [#86](https://github.com/yorkstead/website/issues/86). Historical `docs/handoffs/CURRENT.md` remains unchanged while its approved update method is resolved. Verify live GitHub and Vercel state before acting; the SHA and check results below are a dated snapshot.

## Current decision

- PRs #87–#91 are merged. PR #90 is deployed at production source `94e3f5a64210cb4936b98eb89bc6f0379b801947`; the owner reports all nine post-deployment checks passed. The build wrapper does not execute migrations.
- PR #90 retired the temporary diagnostic mode while preserving the ordinary owner diagnostic. The remaining release order is #93 → #92, with separate authorization for each deployment.
- The owner-reported diagnostic matched the production Neon endpoint to the website production branch and database. It reported 22 matching migrations, seven Systems Directory entries and eleven audit events. Private row-level parity has not been independently reviewed.
- PR 1 design and disposable-database tests may proceed. **Production export, backup, restore and migration 0023 are NO-GO** pending private parity, approved recoverable artifact, isolated restore rehearsal, RPO/storage/operator decisions and separate owner authorization.
- PR #93 prepares a synthetic recovery rehearsal and records the owner-approved planning targets: encrypted custom-format dump, 30-day retention and a 60-minute RTO. Its scripts do not authorize a production export or restore; recovery evidence and owner decisions remain open in the runbook.
- The owner reports both temporary Production flags disabled and an owner-authenticated HTTP 404 after the cleanup deployment. No protected value or private diagnostic response belongs in GitHub.

## Next exact action

For PR #93, verify the proposed merge checks and request separate release authorization. See `specs/037-ys-sys-001-systems-registry/operations.md` and `recovery-runbook.md`; the older `CURRENT.md` link to the removed activation guide is historical. A main merge creates a Production deployment. Keep #92 unmerged.

## Isolation hardening implementation — 2026-11-02

The PR #93 recovery rehearsal has been changed to run only in a dedicated Actions container job with an ephemeral PostgreSQL peer on a Docker internal network, a read-only image filesystem, tmpfs-only writable mounts, and an unprivileged process. The helper now uses generated database names and credentials, fixed workspace paths, no cloud/provider access, and fail-closed environment checks. Local negative tests and repository checks pass; exact-head Actions disposable PostgreSQL, browser and build checks plus Preview readiness are still required. Historical `CURRENT.md` remains untouched. No production operation is authorized.
