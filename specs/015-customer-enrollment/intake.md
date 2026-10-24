# CC-007 — specification intake

Status: resolved. The full assignment was supplied after initial intake; spec.md, plan.md, tasks.md, threat-model.md and release-gates.md now define the implementation. This file retains the original base and safety constraints.

## Base

- Implement from verified PR #57 merge `40428915677364b023d747ca052e968dc7da1f39` on branch `feat/cc-007-customer-enrollment`.
- Preserve the CC-006 foundation, including `migrations/0012_client-onboarding.sql`.
- Do not reset to the cached `origin/main`.

## Confirmed constraints

- Implement and test against disposable data.
- Preserve existing security gates and production configuration.
- Do not merge or deploy.
- Report unresolved proxy connectivity separately.
- If GitHub remains unavailable, retain the work locally and report that no PR could be opened.

## Missing requirements

The full assignment is now available and authorizes a narrowly invitation-controlled bootstrap. Global Better Auth creation restrictions remain in place. See spec.md for the approved scope.

## Connectivity observation

The preceding `git fetch origin main` failed with `Failed to connect to proxy port 8080 after 0 ms: Could not connect to server`. Live remote currency was not verified. The user explicitly authorized the verified local HEAD as the base.
