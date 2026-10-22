# Plan

1. Extract and database-test the lead conversion operation without changing its atomic claim semantics.
2. Add an optional Zod client-delivery schema and normalize it through existing workspace validation.
3. Add deterministic project deep-link resolution and a recoverable not-found state.
4. Add a private read-only project-linkage route using the website lead record and existing CRM bridge.
5. Extend ProjectWorkspace with delivery editing, linkage visibility, and the existing undo/versioned-save path.
6. Add unit/integration tests for compatibility, serialization, conflicts, links, and conversion idempotency.
7. Update handoff state, run the repository verification matrix, and compare every acceptance criterion with evidence.

## Data approach

No SQL migration is required. `workspaces.data` is already JSONB and legacy parsing is additive. The new `delivery` property is optional, validated, bounded, and removed when malformed. CRM data is fetched on demand and is never persisted into the workspace.

## Recovery and rollback

Revert the feature commit. Existing JSON records remain valid because delivery is optional. Records saved with delivery data remain harmless unknown JSON to older code; no production table or live CRM mutation needs reversal.
