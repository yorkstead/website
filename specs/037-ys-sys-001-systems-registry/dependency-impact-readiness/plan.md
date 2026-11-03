# Dependency impact and activation readiness plan

## Architecture

Add a fixed-path read-only analysis method to the existing Registry service. It obtains a bounded, minimal projection of active entry, relationship, and subscription billing evidence rows in a single `REPEATABLE READ, READ ONLY` transaction. The API reuses the same server-derived owner session and exact default-off feature gate as the existing typed APIs. No caller supplies SQL, tenant, table names or traversal limits.

Pure domain functions classify relationship display and traversal semantics, compute deterministic bounded upstream/downstream reachability, identify cycle paths, and produce readiness gaps. UI components consume this typed response; they do not query the database directly. Relationship evidence reference and note fields are not returned by this analysis route.

## File-level work

1. `lib/system-registry-analysis.ts`: bounded pure traversal, cycle detection, record classification and readiness issues.
2. `lib/system-registry-service.ts`: minimal consistent snapshot and verified subscription billing evidence summaries.
3. `lib/system-registry-analysis-http.ts`, `lib/system-registry-runtime.ts`, and `app/api/systems-registry/analysis/route.ts`: private/no-store, owner/flag-gated GET only.
4. `components/dashboard/systems-registry-navigation.tsx`, `components/dashboard/systems-registry-impact.tsx`, and `components/dashboard/systems-registry-readiness.tsx`; add links to the existing record cards without changing Directory DTOs.
5. `/dashboard/systems/registry/impact` and `/dashboard/systems/registry/readiness`: authenticated, default-off pages following the existing App Router boundary.
6. Tests: pure analysis, access/controller, disposable PostgreSQL projection, browser flows at desktop/tablet, graph filters, empty/partial states, cycles/limits/readiness, plus legacy route regression.
7. Update root spec/plan/tasks, ADR, roadmap, operations runbook and a narrow current handoff.

## Transaction and limits

Load no more than 501 active entries and 3001 active edges to determine whether hard ceilings (500/3000) truncate the snapshot. The same read-only transaction loads active subscription billing evidence and allocations. Expose only aggregate evidence readiness flags, not provider/account labels, raw references, private notes or amounts. API result indicates collection and per-traversal truncation.

The selected-node walk follows at most eight hops and returns at most 100 nodes in each direction. Include a path's edge IDs/types and verified-path boolean. A verified path requires every edge to be owner-reviewed. Cycles are calculated over the recorded operational-edge subgraph and report whether every edge in each cycle is owner-reviewed.

## Readiness approach

Use the explicit blocker/informational definitions in `spec.md`. A stored verified status with an elapsed review date is stale (calculated server-side against UTC date). A subscription counts as billing-ready only when it has a current verified evidence source allocated to it, or a verified in-record source with a non-unknown amount. Do not expose amounts or source references in this dashboard. Operationally connected nodes with missing/stale/unhealthy monitoring block readiness; non-connected monitoring gaps remain informational. The view always states Production migration and feature activation require separate approval.

## Recovery and rollback

The feature is additive application code only and reuses already-present schema. Revert the pages, navigation, service projection, and endpoint if necessary; the old typed Registry and legacy Directory behavior remain. Keep the feature gate default-off. This change does not apply migrations 0023/0024 to any environment and does not authorize merge or deployment.
