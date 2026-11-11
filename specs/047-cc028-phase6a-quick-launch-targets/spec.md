# CC-028 Phase 6a — Quick Launch account targets

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Parent:** [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/spec.md) (task T106a)
**Owner confirmation, 2026-11-11:** `4twentydev` is retired for GitHub and Vercel. Those targets are `yorkstead`; the Neon organization may still be named 4twenty and is unrelated to these links.

## Problem

Quick Launch generated GitHub and Vercel console links from a hard-coded `4twentydev` fallback in two places: the component props and `defaultWorkspaceSettings`. The project-import route used the same account for its unauthenticated public-repo listing. With that account retired, every fallback link pointed at the wrong organisation, and project import listed the wrong repositories.

## Decision

- Default GitHub username and Vercel team slug are `yorkstead`.
- Saved workspace settings still override the defaults, because per-project targets remain possible.
- No credentials, tokens, or provider configuration are touched.

## Requirements

- R1: Component defaults and `defaultWorkspaceSettings` both use `yorkstead`.
- R2: Explicit values passed by a caller or stored in workspace settings still win.
- R3: The unauthenticated project-import listing targets `yorkstead`.
- R4: No change to URL shape, project slug derivation, or link behavior.

## Acceptance

- A1: A project without an explicit repo renders `https://github.com/yorkstead/<slug>` and `https://vercel.com/yorkstead/<slug>`.
- A2: Explicit `githubUsername`/`vercelTeam` arguments still produce their own URLs.
- A3: No `4twentydev` reference remains in application defaults or the import route.
- A4: No schema, migration, or stored-workspace rewrite.

## Non-goals

- Rewriting a saved workspace that already contains literal `4twentydev` values; that is an owner settings change.
- The navigation regrouping (T106b), which needs owner acceptance of a proposed taxonomy.
- Any Neon project naming change.
