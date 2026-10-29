# CC-021 implementation plan

## Delivery architecture

1. Add a separately coordinated Hub PR for `GET /api/integrations/website-automations`, a versioned read-only projection from existing tables and bounded Google Tasks GETs, dedicated bearer auth, bounded queries, private cache headers, sanitized DTO, and route-level contract tests.
2. In the website PR, add server-only `lib/automation-hub-data.ts` to call the fixed Hub URL with the dedicated shared token, timeout, no-store, and strict Zod parsing. It maps missing credentials, malformed responses, upstream errors and timeouts into explicit safe states.
3. Add owner-authenticated `GET /api/dashboard/automation-hub` as a BFF. Verify `getOwnerSession(await headers())` on every request before contacting Hub; return private no-store JSON only.
4. Add a responsive client presentation in the existing Automations workspace. Show capture classifications, activity, review, tasks/commitments, and connection-status sections with source-native labels, IDs and times. Maintain section-level empty/error/partial states and retry only through the read BFF.
5. Keep CC-020 website liveness, `/api/operations`, website CRM/project storage and all Hub/Tasker/Google/morning-briefing APIs unchanged.
6. Document the dedicated secret, backend-first release, required separately authorized config setup, validation, unavailable behavior, external dependencies and rollback. No database migration or production operation.

## Files

### Website PR

- `lib/automation-hub-data.ts` and focused tests
- `app/api/dashboard/automation-hub/route.ts`
- `components/dashboard/automation-hub-records.tsx`
- `components/dashboard/operations.tsx`
- `tests/e2e-cc017/navigation.e2e.ts` (or adjacent focused Automations browser test)
- `specs/030-cc-021-automation-hub-data-integration/*`
- `docs/handoffs/CURRENT.md`

### Coordinated Hub PR

- `app/api/integrations/website-automations/route.ts`
- a reusable Google access-token/bounded task-list helper only if existing Hub source has no reusable read helper
- focused contract/auth tests and API contract/credential documentation
- no schema migration and no edits to existing capture, Google, briefing, Tasker, or playback routes

## Safe rollout

The new website UI remains explicit about unavailable/unconfigured Hub data until the dedicated secret and compatible deployed backend exist. No production configuration is changed in these PRs. Normal Hub release must precede website release; a separate owner authorization is needed for secret provisioning or any manual deployment.
