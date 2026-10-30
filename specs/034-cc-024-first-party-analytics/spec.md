# CC-024 — First-Party Analytics & Conversion Intelligence

## User value

Yorkstead's owner can understand privacy-safe site activity, valid inquiries, and acquisition performance from the existing Neon-backed analytics system, with metrics that reflect stored business records rather than attempted form interactions.

## Verified baseline

- The App Router root mounts the existing `AnalyticsRuntime`; collection is active unless `NEXT_PUBLIC_FIRST_PARTY_ANALYTICS` is exactly `disabled`.
- `conversion_events` and its event-name constraint were introduced by migrations 0001 and 0005–0007. Migration 0007 adds event IDs, session hashes, attribution, coarse device/geography fields and indexes. Retain these rows and meanings; do not backfill unsupported historical interpretations.
- The current event contract already covers route views, conversion intent, successful submission events, qualified leads, Web Vitals and sanitized error signals. Public and server-side paths use the same recorder.
- The owner-only `/dashboard/analytics` exists and provides 1/7/30/90-day windows, funnel, daily movement, acquisition, landing-page, CTA, interest, device, geography, Web Vitals, lead pipeline and storage-unavailable UI.
- Existing privacy rules prohibit advertising identifiers, raw addresses, cookies, full referrer URLs, query strings and form contents in analytics. Google Search Console metadata and Workspace/OAuth integrations are outside this change.

## Scope

- Harden the existing public event endpoint with a bounded streaming body reader, strict JSON/content type and schema validation, safe public paths without query/fragment/private routes, same-origin/fetch-metadata checks where browser context exists, and bounded per-address ingestion.
- Preserve owner/customer route exclusions in both client and server tracking. Keep database access server-only and the public writer limited to the governed event contract.
- Make repeat effects, remounts, navigation, transport retries and conversion retries idempotent without suppressing legitimate separate visits or clicks. Add durable linkage from server-confirmed inquiry outcomes to their existing CRM inquiry rows, while leaving historical events unlinked and unchanged.
- Store no contact or operational form values in analytics. Keep event metadata allowlisted, UTM values normalized and bounded, and attribution first-touch semantics explicit. Distinguish direct/unknown/blocked attribution instead of fabricating a source.
- Correct metrics so sessions are anonymous tab sessions, page views are page-view events, CTA clicks are intent signals, and inquiries are persisted records. State numerator/denominator and legacy-record handling. Include period-over-period changes for 1/7/30/90-day ranges.
- Improve the existing Insights page with campaign/UTM performance, inquiry-linkage where reliable, top pages/case studies, data freshness/partial/unavailable states, and responsive timeline/funnel views.
- Add a compact 7-day analytics snapshot and meaningful trend/exception cues to the existing Command Center Overview, linked to the existing Insights page.
- Document event definitions, privacy behavior, retention, rollout and rollback. Add an additive ordered migration only for the inquiry link/indexes needed by the approved design.

## Acceptance criteria

1. The existing first-party runtime remains the sole browser analytics collector. No GA4, GTM, pixel, Vercel Web Analytics or duplicate tracker is introduced; Google Search Console verification, Google Workspace and OAuth remain intact.
2. Public request bodies and individual values have enforced byte/count/length limits even without trustworthy `Content-Length`. Invalid, unknown, private, cross-origin, oversized and malformed input causes no database read or write.
3. Public paths cannot persist query strings, fragments, credentials or owner/customer paths. Server and client exclusions agree.
4. Same-request retries and repeated React effects/remounts are idempotent. Distinct route visits and intentional repeated clicks remain countable. Successful inquiry events link only to the server-created inquiry ID; public clients cannot supply that link.
5. Analytics metadata contains no names, email, form text, restaurant or operating details, raw addresses, full referrers, secrets, query strings, cookies or persistent identifiers. Existing raw CRM records and historical analytics are not modified or deleted.
6. Conversion totals count stored inquiry outcomes once, exclude validation failures, and distinguish measured/linkable inquiries from legacy/unlinked activity. CTA clicks never count as inquiries. Session counts never claim unique people.
7. Attribution values are normalized and bounded. First-touch attribution stays stable within the tab; unknown/blocked values remain honestly labeled. No ROI is inferred from unmatched campaign, event or research-contact records.
8. Insights provides 1/7/30/90-day periods, prior-period comparisons, definitions, timeline, funnel, landing pages, acquisition/UTM campaign details, device/Web Vitals only when reliable, top Yorkstead pages/case studies, CRM links only for securely linked inquiries, and clear empty/delayed/stale/partial/unavailable states.
9. Command Center Overview adds a compact owner-only snapshot with trend/exception details and a link to Insights without displacing core actions.
10. Ordered migration checks and unit, database, ingestion, attribution, idempotency, privacy/security, owner/browser, CRM and dashboard regressions pass where environment permits. Full repository verification and remaining gaps are recorded.
11. One PR titled `CC-024: Restore First-Party Analytics & Conversion Intelligence` is opened from `feat/cc-024-first-party-analytics`; no merge, manual deployment, production database mutation or production configuration/secret change occurs.

## Non-goals

- A separate analytics service, dashboard or data store.
- Client-side database access, advertising identifiers, cookies, session replay or third-party analytics.
- Joining a session to an inquiry by email, IP address, inferred timing, fuzzy attribution or other personal-data matching.
- Treating CTA activity, validation attempts, research contacts or marketing prospects as qualified leads, customers or revenue.
- Production migration, secret/configuration changes, manual deployment or destructive historical data operations.
