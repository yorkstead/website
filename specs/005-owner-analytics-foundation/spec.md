# Owner analytics foundation

## User value

Yorkstead's owner needs one mobile-friendly view that connects public-site attention to qualified inquiries and won work without introducing advertising identifiers or parallel sources of truth.

## Scope

- Govern public analytics with a typed event and property contract.
- Preserve first-touch session attribution across public route changes and contact submission.
- Store only short-lived, pseudonymous session and request hashes plus coarse device and Vercel geography.
- Capture route views, Core Web Vitals, public conversion actions, successful server-side submissions, and sanitized client/server error signals.
- Provide an authenticated, responsive analytics dashboard with date filters, funnel, acquisition, content, lead, performance, error, geography, and device views.
- Document production architecture, provider boundaries, environment settings, consent posture, and future mobile reuse.

## Acceptance criteria

1. Public page views and Web Vitals use the same typed event helper as existing conversion events.
2. Event payloads reject unknown names and discard properties not allowlisted for that event.
3. Raw network addresses, full referrer URLs, query strings, form contents, names, emails, and persistent advertising identifiers are not stored in analytics.
4. A random browser session identifier lives only in `sessionStorage`; the server stores only its salted hash.
5. Successful contact submissions persist first-touch UTM, landing-page, and referrer-host context with the lead.
6. `/dashboard/analytics` requires the owner session and provides 1-, 7-, 30-, and 90-day views.
7. The dashboard degrades explicitly when analytics storage is unavailable.
8. Ordered migrations, task-specific tests, repository checks, and documentation are updated.

## Non-goals

- Recording form fields, DOM text, keystrokes, or session replay.
- Installing GA4, a tag manager, advertising pixels, or duplicate pageview collectors.
- Building Search Console OAuth ingestion or a native Expo application in this slice.
- Replacing Vercel deployment logs or a future specialist error tracker with raw stack storage in the analytics table.
