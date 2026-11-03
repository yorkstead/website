# Decision 0003: Explicit dependency traversal and readiness evidence

- **Status:** Accepted for YS-SYS-001 dependency-impact/readiness slice
- **Date:** 2026-11-03

## Context

Migrations 0023 and 0024 provide six canonical classes and six explicit relationship kinds, plus source-backed verification, billing and monitoring. The Registry needs impact and release-readiness views without manufacturing dependency facts or displacing CC-023.

## Decision

Keep CC-023 as the single record authority. Analyze only active, explicitly stored relationships. `depends_on`, `runs_on`, `uses`, and `integrates_with` are directed operational links for upstream and reverse-impact traversal. `owns` and `billed_through` are visible context but excluded from outage traversal. Display edge state and provenance class. A path is verified only when all edges are owner-reviewed; unknown/candidate paths remain visible and explicitly unverified. Report cycles without changing graph data.

Use a bounded, minimal, read-only consistent snapshot in a new owner/feature-flag gated endpoint. Do not expose account labels, notes, evidence contents or charge values. Display a vector/SVG relationship view beside semantic keyboard-accessible navigation/table. Show truncation and incomplete coverage.

Readiness is a transparent evidence roll-up with critical and informational categories; it is not certification or authorization. Unknown never becomes healthy, zero, independent, or complete. A separate explicit owner release gate remains mandatory for Production migrations and activation.

## Consequences

- No schema change, migration, provider call, probe, scheduled monitoring, mutation, or inferred relationship is added.
- Boundedness can prevent full assessment of a very large inventory; the UI must report that as a blocker.
- Operational edge semantics are directionally defined by the relationship source and target. Owner-facing documentation must preserve this contract.
