# CC-022B — Voice Shopping & Payday Planning

## Goal

Give the owner a private, auditable planner for purchase intentions captured by voice, including explicit timing, optional payday planning and a responsive Command Center workflow. Hub remains the source of truth for raw captures, purchase items and payday records. Shopping items never enter Google Tasks or CRM.

## Scope and boundaries

- Recognize explicit shopping/purchase intent deterministically before the existing model/task/calendar/CRM dispatch paths. Extract multiple distinct items from one capture. Unclear item boundaries, personal/business scope, or non-deterministic interpretations remain visibly pending owner review.
- Keep raw voice text only in the existing private Hub capture record and retention boundary. Expose only bounded, sanitized item fields through the dedicated CC-021 read section.
- Store each item with UUID, capture linkage, normalized name, optional category, estimate/currency, priority, scope, timing, target date/payday, explicit recurrence rule, state, timestamps and provenance. Use additive ordered migrations and immutable audit history.
- Support owner correction, split/recombine, review, reclassification, edit, postpone, purchase/unpurchase, cancel, skip and occasional repeat. Protect accidental duplicates with capture identity and bounded same-scope matching; keep intentional repeats possible and do not merge scopes.
- Add optional weekly Monday payday schedule in America/Denver, expected amount clearly labeled informational, explicit receipt confirmation, and explicit bill/essential reserves before showing discretionary availability. Never infer bank balances, received income or spendable cash.
- Extend CC-021 v1 read shape optionally with a bounded `shopping` section and availability/truncation/timestamp metadata. Add a versioned private write contract with its own server-to-server credential and idempotency/CAS/audit protections. The Website BFF must retain its Better Auth owner check and same-origin validation.
- Add a concise optional shopping line to the existing spoken briefing; preserve audio payload/playback and omit amounts by default. Add an optional Sunday planning view only; no scheduler or notification.
- Provide an owner-only Website planner with honest loading, empty, unavailable, partial and disconnected states; 390px/mobile and desktop layouts; inbox, filters, edits, timing/payday groups, history and audit.

## Non-goals

No automatic purchase, price scraping, bank connection, Google Task/Calendar creation, CRM writes, customer messaging, customer/tenant/public analytics exposure, production data changes, secrets/configuration changes, merges or manual deployment. No changes to Tasker/audio contracts, voice playback stitching, unrelated Command Center redesign, or scheduled automation.

## Acceptance criteria

1. Explicit shopping phrases take the purchase path before existing task, Calendar and CRM paths. Ambiguous intent is preserved for review and does not silently become another record type.
2. One capture can yield multiple bounded items with one-to-many traceability; partial parsing is returned as review-needed without discarding safely extracted items.
3. Item and payday data are stored transactionally in additive migrations; state transitions use conditional writes, idempotency, optimistic concurrency and append-only audit provenance.
4. Duplicate detection uses a stable ingestion identity plus bounded match, respects scope, preserves a manual keep-both/repeat path, and never merges personal/business records.
5. Owner workflows cover corrections, split/recombine/edit, scope/priority/timing review, postpone/carry-forward/history, purchase/unpurchase, skip and repeat.
6. CC-021 v1 remains backward-compatible; sanitized shopping data is optional, capped, timestamped, availability-aware and does not grant write access.
7. Versioned shopping writes require the dedicated write credential through the owner-gated Website BFF; same key retries are safe and conflicts are visible.
8. Payday summary separates expected, confirmed and available-to-plan amounts; available-to-plan requires explicit confirmed income and explicit reserves. Variable income is entered/confirmed separately.
9. Briefing remains available when shopping storage is empty/unavailable, adds only a concise optional section, and does not speak income/reserve amounts.
10. No purchases are auto-created; no external provider writes or messages occur; no private data crosses into public/customer routes.
11. Tests cover classification, extraction, dates/payday, ambiguous scope, duplicates/repeats, edits/splits, carry-forward, priority confirmation, recurrence, migration/concurrency/audit/isolation, provider non-dispatch, BFF owner authorization, recovery and mobile/desktop UI.
12. Rollout docs describe backend-first release, disabled flags, safe rollback and a synthetic manual acceptance path. Exact CI evidence is linked; unavailable checks are labeled.
13. An item editor captures the Hub revision when opened. If a refresh observes a newer revision, the stale draft cannot be saved or split; the owner must load and review the latest values. Commands still use the opening revision so an unseen concurrent update receives the Hub conflict response.
14. An unresolved payday command and its exact idempotency key survive ShoppingPlanner unmount/remount in page memory when sessionStorage writes fail. An unavailable/degraded Hub refresh cannot clear the parent-held recovery command; retries resend the original payload/key, and conflicting shopping actions remain blocked until reconciliation.
