# Plan

1. Define the event/property and attribution contracts as provider-neutral TypeScript.
2. Extend `conversion_events` with indexed session, acquisition, device, geography, and idempotency fields.
3. Enrich the existing client/API/server helpers; add route, Web Vital, and sanitized error collection.
4. Carry first-touch attribution into the existing lead row on successful contact intake.
5. Add a server-rendered owner analytics query layer and responsive authenticated dashboard.
6. Document the provider architecture and privacy controls, then run focused and full verification.

## Architecture decision

Neon/Postgres remains the canonical product, conversion, attribution, and business-KPI store. External tools are specialists rather than parallel truth stores: Search Console for Google organic-search visibility, Sentry for stack traces and release diagnostics, and optionally PostHog for consent-gated replay and advanced behavioral analysis. Vercel deployment telemetry remains operational infrastructure; Vercel Web Analytics and GA4 are intentionally not installed because they duplicate the implemented pageview layer.

The dashboard query layer returns JSON-safe provider-neutral view models. A future Expo owner app can consume the same aggregation through an authenticated API without changing event semantics or business definitions.
