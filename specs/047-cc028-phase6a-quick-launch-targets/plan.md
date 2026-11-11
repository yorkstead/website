# CC-028 Phase 6a — implementation plan

**Specification:** [`spec.md`](spec.md)

## Approach

Replace the retired account in every default, and prove explicit overrides still work.

1. `components/dashboard/quick-launch.tsx` — `resolveProjectLinks` and `QuickLaunch` prop defaults become `yorkstead`.
2. `lib/workspace.ts` — `defaultWorkspaceSettings.githubUsername` and `.vercelTeam` become `yorkstead`, which also changes what `workspace-validation.ts` falls back to for missing values.
3. `app/api/project-import/route.ts` — the unauthenticated public-repo listing targets `yorkstead`.
4. `components/dashboard/quick-launch.test.ts` — defaults asserted as `yorkstead`, plus a new case proving explicit overrides still apply.

## Boundaries

- No URL shape, slug, or link-generation logic change.
- Stored workspace settings are untouched: a workspace that literally contains `4twentydev` keeps it until the owner edits Settings, which is deliberate — silently rewriting preferences would hide the change.
- No token, secret, or provider configuration change.

## Rollback

Revert the four files. No persisted state depends on the defaults.
