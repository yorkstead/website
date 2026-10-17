# Yorkstead morning briefing

## User value

Yorkstead's owner receives one concise, spoken-friendly operating briefing every morning before work begins, even when one upstream provider is temporarily unavailable.

## Scope

- Generate a daily briefing for `America/Denver` at approximately 7:15 AM and serve it to the owner's Pixel at 7:30 AM.
- Read Golden and Denver forecasts from the National Weather Service.
- Read today's and tomorrow's Google Calendar events and Google Tasks through one single-user, offline OAuth grant.
- Identify Gmail follow-up signals from message metadata only; never retrieve or persist message bodies.
- Rank Yorkstead's qualified and due lead-pipeline opportunities and identify one highest-value revenue move.
- Select two or three recent stories from an allowlisted set of ERP, manufacturing, SaaS, restaurant-technology, and logistics feeds, and place news last.
- Persist the generated text and source health in Neon so the protected endpoint can return a cached fallback.
- Protect both the cron route and Tasker route with independent bearer secrets.

## Acceptance criteria

1. Cron scheduling remains correct through Mountain Time daylight-saving changes.
2. The service uses read-only Calendar and Tasks scopes plus Gmail's metadata-only scope, and cannot request, retrieve, store, or log Gmail message bodies.
3. A source outage produces an explicit, useful partial briefing instead of failing the whole briefing.
4. One successful briefing is stored per Denver calendar date; concurrent or repeated requests do not create duplicate records.
5. The Tasker endpoint requires an authorization header, returns plain text by default, disables shared caching, and never accepts secrets in the URL.
6. The spoken text is no more than 1,800 words, has priorities near the beginning, includes exactly one revenue move, and places two or three news items last when recent verified items are available.
7. If today's generation is unavailable, the endpoint returns the latest successful cached briefing with a clear stale notice.
8. Secret values remain server-only and are absent from source, responses, and logs.
9. Ordered migration checks, focused tests, repository checks, and setup documentation are updated.

## Non-goals

- Sending email, changing calendar events or tasks, or editing lead records.
- Reading Gmail message bodies or attachments.
- Discovering or scraping cold prospects from the public web in the first release.
- Using an LLM or sending private account data to another inference provider.
- Producing or hosting an audio file; Tasker continues to speak the protected plain-text response locally.
- Deploying, migrating production, or completing Google authorization without explicit owner confirmation.
