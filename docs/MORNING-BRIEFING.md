# Yorkstead morning briefing runbook

## What this release does

At approximately 7:15 AM `America/Denver`, the Yorkstead Vercel project builds one spoken-friendly briefing and stores it in Neon. At 7:30 AM, Tasker requests the protected plain-text endpoint and speaks the response over the already paired Bluetooth speaker.

The briefing orders information as follows:

1. Top ranked priorities.
2. One highest-value revenue move.
3. Golden and Denver weather.
4. Calendar for today and tomorrow.
5. Google Tasks due through tomorrow, including overdue tasks.
6. Gmail metadata follow-up signals.
7. Qualified or due Yorkstead pipeline opportunities.
8. Two or three recent trusted-feed stories, always last.

No AI provider receives the owner's data. Gmail message bodies and attachments are never requested. The generated text is capped at 1,800 words and retained for 35 days to provide a short failure fallback.

## Authorization and deployment status

Implementation is local only until all of these are confirmed:

- The intended Vercel target is the production project serving `yorkstead.com`.
- The deploy operator can view and update that project's environment variables.
- The intended Google account has granted the three read-only scopes below.
- Production migrations `0007` and `0008` can run during the trusted production build.
- Tasker has the independent playback token in a local variable.

Do not paste OAuth credentials, refresh tokens, Vercel tokens, cron secrets, or the Tasker bearer token into chat, issue trackers, screenshots, or URLs.

## Google Cloud setup

Use a Google Cloud project controlled by Yorkstead and enable:

- Google Calendar API
- Google Tasks API
- Gmail API

Configure an OAuth web client and request only:

- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/tasks.readonly`
- `https://www.googleapis.com/auth/gmail.metadata`

The Gmail metadata scope is classified by Google as restricted, but it cannot return message bodies. Before relying on it long term, choose the appropriate consent-screen publishing mode for the account. A Google Workspace internal app is the cleanest single-organization path. If an external app remains in Testing, confirm the refresh-token lifetime in the Google console; testing-mode grants are not suitable for unattended production automation.

Obtain one offline refresh token for the intended account using the OAuth authorization-code flow with `access_type=offline`. Put the client ID, client secret, and refresh token directly into Vercel's encrypted environment settings. The runtime calls Gmail's profile endpoint and uses the returned account address to identify messages sent by the authorized owner; no account email is hard-coded.

## Vercel environment

Add these server-only Production variables in the Vercel dashboard:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Existing Neon database connection |
| `CRON_SECRET` | Existing Vercel cron bearer secret; at least 16 random characters |
| `MORNING_BRIEFING_ACCESS_TOKEN` | Independent random bearer value used only by Tasker |
| `GOOGLE_CLIENT_ID` | Google OAuth client identifier |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Offline grant for the intended Google account |
| `GOOGLE_CALENDAR_IDS` | Optional comma-separated calendar IDs; defaults to `primary` |
| `MORNING_BRIEFING_NEWS_FEEDS` | Optional trusted keys; defaults to `erp,manufacturing,saas,restaurant,logistics` |

Generate the two bearer secrets independently. Never prefix any of these names with `NEXT_PUBLIC_`.

Vercel cron uses UTC. The project schedules both 13:15 and 14:15 UTC, then the route accepts only the invocation whose Denver local hour is 7. This handles Mountain Daylight and Mountain Standard Time without a seasonal configuration change. Repeated calls are idempotent for the Denver calendar date.

## Deployment and smoke check

1. Confirm the production database has a current backup or Neon restore point.
2. Add the environment variables without displaying their values.
3. Deploy the reviewed commit. The existing production build runs ordered migrations before the Next.js build.
4. In Vercel, confirm both `/api/cron/morning-briefing` schedules appear.
5. Call the Tasker endpoint with the bearer token in the `Authorization` header. A missing or wrong token must return 401; the token must never be a query parameter.
6. Confirm a successful response has `Content-Type: text/plain`, `Cache-Control: private, no-store`, `X-Briefing-Date`, and `X-Briefing-Stale: false`.
7. Temporarily run the Tasker profile a few minutes ahead, lock the Pixel, and confirm Bluetooth playback.
8. Restore the profile to 7:30 AM `America/Denver`.

Rollback is additive: remove the two morning-briefing cron entries and redeploy to stop generation, then remove the Tasker HTTP action. Migration `0008` can remain dormant; do not drop its table during an incident.

## Tasker changes

Keep the existing 7:30 AM profile and paired-speaker steps. Change the task order to:

1. **Bluetooth Connection** — connect to the soundcore speaker.
2. **Wait** — 8 seconds.
3. **HTTP Request** — method `GET`, URL `https://yorkstead.com/api/morning-briefing`, timeout at least 45 seconds.
4. In **Headers**, add `Authorization: Bearer %YORKSTEAD_BRIEFING_TOKEN`.
5. **Say** — text `%http_data`, stream **Media**.

Create `%YORKSTEAD_BRIEFING_TOKEN` locally on the Pixel with the same independent value stored in Vercel. Do not put it in the URL. Avoid exporting or sharing the Tasker task with the variable value included.

For a clearer failure path, add an `If` condition before **Say**: when `%http_response_code` is not `200`, speak “The Yorkstead briefing is unavailable. Check the dashboard when convenient.” Otherwise speak `%http_data`.

## Failure behavior

- One failed source produces a partial briefing and a short source note.
- If cron misses, the protected endpoint attempts the same idempotent generation on demand.
- If today's generation fails, the latest successful cached briefing is returned with an audible stale-date preface.
- If no successful cache exists, the endpoint returns 503 and no private diagnostic details.
- Logs include request IDs, status, duration, and sanitized error codes only; they do not include event titles, task titles, subjects, lead names, tokens, or generated text.

## Trusted news feeds

News is accepted only from HTTPS article URLs on the configured publisher's own hostname and only when dated within seven days. The default allowlist is ERP Today, Manufacturing Dive, SaaStr, Restaurant News Resource technology, and FreightWaves. Feed failures do not block the briefing.
