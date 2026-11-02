# YS-SYS-001 release status — 2026-11-02

This is a redacted status supplement for issue [#86](https://github.com/yorkstead/website/issues/86). Historical `docs/handoffs/CURRENT.md` remains unchanged while its approved update method is resolved. Verify live GitHub and Vercel state before acting; the SHA and check results below are a dated snapshot.

## Current decision

- PRs #87–#89 are merged. The production source is currently at `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`.
- PR #91 is the first release candidate in the reviewed order #91 → #90 → #93 → #92. Its checked-in Vercel build wrapper removes automatic production migration execution. No PR in this sequence has been merged or deployed under this release plan.
- The owner-reported diagnostic matched the production Neon endpoint to the website production branch and database. It reported 22 matching migrations, seven Systems Directory entries and eleven audit events. Private row-level parity has not been independently reviewed.
- PR 1 design and disposable-database tests may proceed. **Production export, backup, restore and migration 0023 are NO-GO** pending private parity, approved recoverable artifact, isolated restore rehearsal, RPO/storage/operator decisions and separate owner authorization.
- PR #90's temporary diagnostic cleanup is not live. The two protected Production flags and an owner-authenticated HTTP 404 still require owner verification. No protected value or private diagnostic response belongs in GitHub.

## Next exact action

For PR #91, obtain owner/admin read-only verification of Vercel Production Build/Install settings and deploy hooks, confirm both preflight flags are disabled and the authenticated preflight mode returns HTTP 404, and resolve the handoff review comment. Then recheck the exact proposed merge SHA and required checks before requesting authorization for **PR #91 only**. A main merge creates a Production deployment even though its repository build wrapper no longer runs migrations. Keep #90, #93 and #92 unmerged.
