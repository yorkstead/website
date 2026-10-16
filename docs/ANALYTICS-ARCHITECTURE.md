# Yorkstead analytics architecture

## Decision

Use the existing Neon/Postgres database as Yorkstead's canonical measurement layer. Public interactions, server-confirmed conversions, lead status, and future revenue facts share governed definitions and can be joined without exporting contact records to a marketing vendor.

The owner view is `/dashboard/analytics`. It is protected by the existing Better Auth owner session, rendered by the Next.js App Router, and responsive enough for the installed PWA. Its query layer returns provider-neutral JSON-safe data so the same model can later back a small authenticated API for an Expo/React Native owner app.

## Current architecture

- Next.js 16 App Router and React 19 on Vercel.
- Neon/Postgres through the serverless driver for application data; no public database client.
- Better Auth with passkeys and an owner allowlist for all private routes.
- Resend for transactional inquiry notifications.
- Vercel cron routes for reminders and retention.
- A service worker and web manifest for PWA installation.
- First-party `conversion_events` and `contact_inquiries` tables. No tag manager, advertising pixel, GA4, or third-party replay script.

## Canonical data path

1. A public browser creates one random UUID per tab session in `sessionStorage`.
2. The browser records the first public path, external referrer hostname, and allowlisted UTM values. Query strings and full referrer URLs are discarded.
3. The typed client helper sends an allowlisted event and event-specific properties to the same-origin analytics route.
4. The server hashes the session UUID, creates a rotating one-way request hash, classifies only a coarse device type, and reads coarse Vercel country/region headers.
5. Postgres stores the event. A unique event ID makes retries idempotent and indexed acquisition/session columns support dashboard queries.
6. Successful lead submissions are recorded server-side and carry the same first-touch attribution into `contact_inquiries`.

No analytics event contains a name, email, form text, raw network address, full referrer URL, advertising ID, or persistent cross-session browser identifier.

## Event taxonomy

- Traffic: `page_view`
- Content intent: `service_page_view`, `case_study_view`, `view_content`, `demo_view`
- Conversion intent: CTA, contact-start, scheduling, workflow-audit, rescue-check, card-scan, and contact-save events
- Business outcomes: `contact_form_submission`, `lead`, `qualified_lead`, `schedule_complete`
- Experience: `web_vital`
- Reliability: `client_error`, `server_error`

The runtime contract in `lib/analytics-contract.ts` is the registry. Each event has its own property allowlist. Add or rename events there first, then update the database constraint and tests in a new ordered migration.

## KPI hierarchy

Primary outcomes:

- Qualified leads: inquiries moved to `qualified` (weekly operating review).
- Won work: inquiries moved to `won` and, later, booked project value (monthly review).
- Visit-to-lead conversion: server-confirmed leads divided by distinct anonymous public sessions (weekly acquisition review).

Drivers:

- CTA-to-contact-start and contact-start-to-submission progression.
- Acquisition cohort conversion by first-touch source/medium.
- Landing-page conversion and project/service interest.

Guardrails:

- Core Web Vitals at the 75th percentile, with poor-sample share.
- Client/server reliability signals and lead-notification failures.
- Spam, rate-limited, and duplicate submissions remain excluded from successful-conversion counts.

Do not set hard growth targets until at least four complete weeks of baseline traffic are available. The first operating targets should be based on Yorkstead's observed volume and lead quality, not generic marketing benchmarks.

## Provider boundaries

| Capability | Decision | Reason |
| --- | --- | --- |
| Product/web/conversion analytics | First-party Postgres | Canonical join from session intent to lead and won work; no duplicate behavioral store. |
| Core Web Vitals | First-party `useReportWebVitals` now | Feeds the owner dashboard with route-level real-user samples. Vercel Speed Insights is optional if its managed percentile and deployment views justify a second performance surface. |
| Error diagnostics | Add Sentry as the next specialist | The first-party layer intentionally stores only counts and sanitized fingerprints. Sentry adds stack traces, releases, traces, and alert routing. Keep Sentry Replay off if PostHog Replay is ever enabled. |
| Session replay / advanced cohorts | Optional PostHog, consent-gated | Add only when replay or path/cohort investigation has a concrete operating use. Disable broad autocapture, mask text and inputs, sample recordings, exclude forms/private routes, and keep Postgres as the business source of truth. PostHog has a React Native SDK path for a future owner/product app. |
| SEO | Google Search Console | Unique source for Google queries, impressions, clicks, average position, indexing, and search Core Web Vitals. Pull its API into a daily aggregate table later; never infer query performance from pageviews. |
| GA4 | Do not add now | It duplicates traffic, attribution, funnels, geography, and device reporting. Revisit only for a required Google Ads audience/conversion workflow. |
| Vercel Web Analytics | Do not add now | It duplicates first-party pageviews. It is useful as a low-maintenance fallback only if Yorkstead chooses to stop owning traffic ingestion. |

## Dashboard and mobile path

The owner dashboard includes date windows, headline outcomes, a session funnel, daily movement, acquisition cohorts, landing pages, CTAs, service/project interest, geography, devices, Web Vitals, the lead pipeline, near-real-time activity, and threshold alerts. Empty and unavailable states remain distinct from measured zero.

For Expo, expose the existing `AnalyticsDashboardData` from an owner-authenticated route, preserve the event names and KPI formulas, and render native cards/charts. Do not give the mobile app direct Postgres credentials. Mobile product events can call the same server ingestion contract or a versioned `/api/analytics/events` endpoint with app-specific authentication.

## Environment and operations

- `ANALYTICS_HASH_SALT`: independent high-entropy server secret used to hash anonymous browser sessions and rotating request addresses.
- `ANALYTICS_RETENTION_DAYS`: event retention from 30 to 730 days; defaults to 90.
- `NEXT_PUBLIC_FIRST_PARTY_ANALYTICS`: set to `disabled` to stop public collection at both client and route layers; any other value keeps the documented first-party collection enabled.

Apply `bun run db:migrate` before relying on the dashboard. The dashboard is near-real-time because it reads Postgres on request. For higher traffic, add daily/hourly rollup tables and refresh them from Vercel Cron rather than scanning raw events indefinitely.

## Privacy and consent

This implementation is deliberately cookieless and uses tab-scoped session storage, data minimization, short retention, same-origin transport, server-side hashing, bot exclusion, and owner-only reporting. Laws vary by visitor and business location; this is an engineering posture, not legal advice. If replay, GA4, advertising identifiers, cross-session identity, or marketing cookies are introduced, add an explicit consent system before loading those tools and update the privacy notice and deletion process.

## Alerting roadmap

The dashboard surfaces threshold alerts for error volume, poor Web Vitals, and low conversion at a meaningful sample size. Production paging should come from the system that owns the diagnostic: Sentry for exceptions/regressions, Vercel for function/deployment health, Neon for database health, and a Yorkstead cron check for funnel/KPI anomalies. Send alerts only when they identify an owner action; avoid duplicating the same incident across every provider.
