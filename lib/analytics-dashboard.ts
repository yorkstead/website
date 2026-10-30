import { contactDatabase } from "@/lib/contact-inquiries";

export const analyticsRanges = [1, 7, 30, 90] as const;
export type AnalyticsRange = typeof analyticsRanges[number];

export type AnalyticsBreakdown = { label: string; secondary?: string; sessions: number; conversions: number; rate: number };
export type AnalyticsDashboardData = {
  generatedAt: string;
  rangeDays: AnalyticsRange;
  summary: { sessions: number; pageViews: number; conversions: number; ctaClicks: number; conversionRate: number; errors: number; activeLastHour: number; previousSessions: number; previousInquiries: number; inquiryChangePercent: number | null; lastEventAt: string | null; unlinkedHistoricalOutcomes: number };
  funnel: Array<{ event: string; label: string; sessions: number; rateFromTop: number }>;
  timeline: Array<{ date: string; sessions: number; pageViews: number; conversions: number }>;
  sources: AnalyticsBreakdown[];
  campaigns: AnalyticsBreakdown[];
  landingPages: AnalyticsBreakdown[];
  ctas: Array<{ label: string; count: number }>;
  interests: Array<{ label: string; count: number }>;
  devices: Array<{ label: string; count: number }>;
  geographies: Array<{ label: string; count: number }>;
  webVitals: Array<{ metric: string; p75: number; samples: number; poor: number }>;
  leadPipeline: Array<{ status: string; count: number }>;
  alerts: Array<{ level: "attention" | "info"; message: string }>;
};

export type AnalyticsOverviewSnapshot = {
  sessions: number;
  inquiries: number;
  previousInquiries: number;
  changePercent: number | null;
  lastEventAt: string | null;
};

function count(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function text(value: unknown, fallback = "Unknown") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

export function parseAnalyticsRange(value: string | string[] | undefined): AnalyticsRange {
  const requested = Number(Array.isArray(value) ? value[0] : value);
  return analyticsRanges.includes(requested as AnalyticsRange) ? requested as AnalyticsRange : 30;
}

export function conversionRate(conversions: number, sessions: number) {
  return sessions > 0 ? (conversions / sessions) * 100 : 0;
}

export async function getAnalyticsOverviewSnapshot(now = new Date()): Promise<AnalyticsOverviewSnapshot> {
  const sql = await contactDatabase();
  const nowAt = now.toISOString();
  const currentSince = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const previousSince = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const rows = await sql`SELECT
    COUNT(DISTINCT COALESCE(session_hash, visitor_hash)) FILTER (WHERE event_name = 'page_view' AND created_at >= ${currentSince} AND created_at < ${nowAt})::int AS sessions,
    COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL AND created_at >= ${currentSince} AND created_at < ${nowAt})::int AS inquiries,
    COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL AND created_at >= ${previousSince} AND created_at < ${currentSince})::int AS previous_inquiries,
    MAX(created_at)::text AS last_event_at
    FROM conversion_events WHERE created_at >= ${previousSince} AND created_at < ${nowAt} AND device_type IS DISTINCT FROM 'bot'`;
  const row = rows[0] ?? {};
  const inquiries = count(row.inquiries);
  const previousInquiries = count(row.previous_inquiries);
  return { sessions: count(row.sessions), inquiries, previousInquiries, changePercent: previousInquiries > 0 ? ((inquiries - previousInquiries) / previousInquiries) * 100 : inquiries > 0 ? null : 0, lastEventAt: row.last_event_at ? String(row.last_event_at) : null };
}

function breakdown(rows: Record<string, unknown>[]): AnalyticsBreakdown[] {
  return rows.map((row) => {
    const sessions = count(row.sessions);
    const conversions = count(row.conversions);
    return { label: text(row.label), secondary: row.secondary ? text(row.secondary) : undefined, sessions, conversions, rate: conversionRate(conversions, sessions) };
  });
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function completeTimeline(rows: Record<string, unknown>[], days: AnalyticsRange, now: Date) {
  const values = new Map(rows.map((row) => [String(row.day).slice(0, 10), row]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const key = dayKey(date);
    const row = values.get(key) ?? {};
    return { date: key, sessions: count(row.sessions), pageViews: count(row.page_views), conversions: count(row.conversions) };
  });
}

export async function getAnalyticsDashboard(rangeDays: AnalyticsRange, now = new Date()): Promise<AnalyticsDashboardData> {
  const sql = await contactDatabase();
  const since = new Date(now.getTime() - rangeDays * 86_400_000).toISOString();
  const previousSince = new Date(now.getTime() - rangeDays * 2 * 86_400_000).toISOString();
  const nowAt = now.toISOString();
  const [summaryRows, funnelRows, timelineRows, sourceRows, landingRows, campaignRows, ctaRows, interestRows, deviceRows, geographyRows, vitalRows, pipelineRows] = await Promise.all([
    sql`SELECT
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash)) FILTER (WHERE event_name = 'page_view' AND created_at >= ${since} AND created_at < ${nowAt})::int AS sessions,
      COUNT(*) FILTER (WHERE event_name = 'page_view' AND created_at >= ${since} AND created_at < ${nowAt})::int AS page_views,
      COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL AND created_at >= ${since} AND created_at < ${nowAt})::int AS conversions,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash)) FILTER (WHERE event_name = 'page_view' AND created_at >= ${previousSince} AND created_at < ${since})::int AS previous_sessions,
      COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL AND created_at >= ${previousSince} AND created_at < ${since})::int AS previous_conversions,
      COUNT(*) FILTER (WHERE event_name IN ('workflow_audit_cta_click', 'email_link_click', 'phone_link_click', 'external_booking_link_click', 'schedule_start') AND created_at >= ${since} AND created_at < ${nowAt})::int AS cta_clicks,
      COUNT(*) FILTER (WHERE event_name IN ('client_error', 'server_error') AND created_at >= ${since} AND created_at < ${nowAt})::int AS errors,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash)) FILTER (WHERE created_at >= ${nowAt}::timestamptz - INTERVAL '1 hour' AND created_at < ${nowAt})::int AS active_last_hour,
      MAX(created_at) FILTER (WHERE created_at >= ${since} AND created_at < ${nowAt})::text AS last_event_at,
      COUNT(*) FILTER (WHERE contact_inquiry_id IS NULL AND event_name IN ('contact_form_submission', 'workflow_audit_submission_success', 'lead', 'qualified_lead') AND created_at >= ${since} AND created_at < ${nowAt})::int AS unlinked_historical_outcomes
      FROM conversion_events WHERE created_at >= ${previousSince} AND created_at < ${nowAt} AND device_type IS DISTINCT FROM 'bot'`,
    sql`SELECT CASE
        WHEN contact_inquiry_id IS NOT NULL AND event_name IN ('contact_form_submission', 'workflow_audit_submission_success', 'lead', 'qualified_lead') THEN 'stored_inquiry'
        WHEN contact_inquiry_id IS NULL AND event_name IN ('contact_form_submission', 'workflow_audit_submission_success', 'lead', 'qualified_lead') THEN 'unlinked_historical_outcome'
        ELSE event_name
      END AS event_name,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash))::int AS sessions
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND device_type IS DISTINCT FROM 'bot'
      AND event_name IN ('page_view', 'service_page_view', 'case_study_view', 'contact_form_start', 'contact_form_submission', 'workflow_audit_submission_success', 'lead', 'qualified_lead')
      GROUP BY 1`,
    sql`SELECT created_at::date::text AS day,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash)) FILTER (WHERE event_name = 'page_view')::int AS sessions,
      COUNT(*) FILTER (WHERE event_name = 'page_view')::int AS page_views,
      COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL AND created_at >= ${since} AND created_at < ${nowAt})::int AS conversions
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND device_type IS DISTINCT FROM 'bot' GROUP BY created_at::date ORDER BY created_at::date`,
    sql`SELECT COALESCE(NULLIF(utm_source, ''), NULLIF(referrer_host, ''), 'direct') AS label,
      COALESCE(NULLIF(utm_medium, ''), CASE WHEN referrer_host IS NOT NULL THEN 'referral' ELSE 'none' END) AS secondary,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash))::int AS sessions,
      COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL)::int AS conversions
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND device_type IS DISTINCT FROM 'bot'
      GROUP BY 1, 2 ORDER BY sessions DESC LIMIT 10`,
    sql`SELECT COALESCE(NULLIF(landing_page, ''), path, '/') AS label,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash))::int AS sessions,
      COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL)::int AS conversions
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND device_type IS DISTINCT FROM 'bot'
      GROUP BY 1 ORDER BY sessions DESC LIMIT 10`,
    sql`SELECT utm_campaign AS label, COALESCE(NULLIF(utm_source, ''), 'unknown source') AS secondary,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash))::int AS sessions,
      COUNT(DISTINCT contact_inquiry_id) FILTER (WHERE contact_inquiry_id IS NOT NULL)::int AS conversions
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND NULLIF(utm_campaign, '') IS NOT NULL AND device_type IS DISTINCT FROM 'bot'
      GROUP BY 1, 2 ORDER BY sessions DESC LIMIT 10`,
    sql`SELECT event_name AS label, COUNT(*)::int AS count FROM conversion_events
      WHERE created_at >= ${since} AND created_at < ${nowAt} AND event_name IN ('workflow_audit_cta_click', 'contact_form_start', 'email_link_click', 'phone_link_click', 'external_booking_link_click', 'schedule_start')
      GROUP BY event_name ORDER BY count DESC`,
    sql`SELECT COALESCE(NULLIF(metadata->>'projectType', ''), NULLIF(metadata->>'service', ''), NULLIF(metadata->>'caseStudy', ''), 'General inquiry') AS label,
      COUNT(*)::int AS count FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt}
      AND event_name IN ('service_page_view', 'case_study_view', 'contact_form_start', 'contact_form_submission', 'lead', 'qualified_lead')
      GROUP BY 1 ORDER BY count DESC LIMIT 10`,
    sql`SELECT COALESCE(NULLIF(device_type, ''), 'unknown') AS label, COUNT(DISTINCT COALESCE(session_hash, visitor_hash))::int AS count
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND event_name = 'page_view' AND device_type IS DISTINCT FROM 'bot'
      GROUP BY 1 ORDER BY count DESC`,
    sql`SELECT CONCAT(COALESCE(NULLIF(country_code, ''), 'Unknown'), CASE WHEN region_code IS NOT NULL AND region_code <> '' THEN CONCAT(' · ', region_code) ELSE '' END) AS label,
      COUNT(DISTINCT COALESCE(session_hash, visitor_hash))::int AS count FROM conversion_events
      WHERE created_at >= ${since} AND created_at < ${nowAt} AND event_name = 'page_view' AND device_type IS DISTINCT FROM 'bot'
      GROUP BY country_code, region_code ORDER BY count DESC LIMIT 10`,
    sql`SELECT metadata->>'metric' AS metric,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY (metadata->>'value')::double precision) AS p75,
      COUNT(*)::int AS samples,
      COUNT(*) FILTER (WHERE metadata->>'rating' = 'poor')::int AS poor
      FROM conversion_events WHERE created_at >= ${since} AND created_at < ${nowAt} AND event_name = 'web_vital'
      AND metadata->>'value' ~ '^-?[0-9]+([.][0-9]+)?$' GROUP BY metadata->>'metric' ORDER BY metric`,
    sql`SELECT status, COUNT(*)::int AS count FROM contact_inquiries WHERE created_at >= ${since} AND created_at < ${nowAt} GROUP BY status ORDER BY count DESC`,
  ]);

  const summaryRow = summaryRows[0] ?? {};
  const sessions = count(summaryRow.sessions);
  const conversions = count(summaryRow.conversions);
  const previousInquiries = count(summaryRow.previous_conversions);
  const previousSessions = count(summaryRow.previous_sessions);
  const inquiryChangePercent = previousInquiries > 0 ? ((conversions - previousInquiries) / previousInquiries) * 100 : conversions > 0 ? null : 0;
  const funnelLabels: Record<string, string> = {
    page_view: "Visited site", service_page_view: "Viewed a service", case_study_view: "Viewed a case study",
    contact_form_start: "Started contact", stored_inquiry: "Stored inquiry outcome",
    unlinked_historical_outcome: "Unlinked historical outcome (not a conversion)",
  };
  const funnelMap = new Map(funnelRows.map((row) => [String(row.event_name), count(row.sessions)]));
  const funnelOrder = ["page_view", "service_page_view", "case_study_view", "contact_form_start", "stored_inquiry", "unlinked_historical_outcome"];
  const webVitals = vitalRows.map((row) => ({ metric: text(row.metric), p75: count(row.p75), samples: count(row.samples), poor: count(row.poor) }));
  const errors = count(summaryRow.errors);
  const lastEventAt = summaryRow.last_event_at ? String(summaryRow.last_event_at) : null;
  const poorSamples = webVitals.reduce((total, item) => total + item.poor, 0);
  const totalVitalSamples = webVitals.reduce((total, item) => total + item.samples, 0);
  const alerts: AnalyticsDashboardData["alerts"] = [];
  if (errors > 0) alerts.push({ level: "attention", message: `${errors} client or server error signal${errors === 1 ? "" : "s"} in this period.` });
  if (totalVitalSamples >= 20 && poorSamples / totalVitalSamples > 0.25) alerts.push({ level: "attention", message: "More than 25% of sampled Web Vitals are rated poor." });
  if (sessions >= 50 && conversionRate(conversions, sessions) < 1) alerts.push({ level: "info", message: "Measured inquiry conversion is below 1%; review acquisition quality and the contact path." });
  if (count(summaryRow.unlinked_historical_outcomes) > 0) alerts.push({ level: "info", message: `${count(summaryRow.unlinked_historical_outcomes)} legacy or ambiguous submission event(s) are excluded because they cannot be verified against a stored inquiry.` });
  if (lastEventAt && now.getTime() - Date.parse(lastEventAt) > 24 * 60 * 60 * 1000) alerts.push({ level: "info", message: "No analytics event has arrived in the last 24 hours; verify collection status if traffic is expected." });

  return {
    generatedAt: now.toISOString(), rangeDays,
    summary: { sessions, pageViews: count(summaryRow.page_views), conversions, ctaClicks: count(summaryRow.cta_clicks), conversionRate: conversionRate(conversions, sessions), errors, activeLastHour: count(summaryRow.active_last_hour), previousSessions, previousInquiries, inquiryChangePercent, lastEventAt, unlinkedHistoricalOutcomes: count(summaryRow.unlinked_historical_outcomes) },
    funnel: funnelOrder.map((event) => ({ event, label: funnelLabels[event], sessions: funnelMap.get(event) ?? 0, rateFromTop: conversionRate(funnelMap.get(event) ?? 0, sessions) })),
    timeline: completeTimeline(timelineRows, rangeDays, now),
    sources: breakdown(sourceRows), landingPages: breakdown(landingRows), campaigns: breakdown(campaignRows),
    ctas: ctaRows.map((row) => ({ label: text(row.label).replaceAll("_", " "), count: count(row.count) })),
    interests: interestRows.map((row) => ({ label: text(row.label), count: count(row.count) })),
    devices: deviceRows.map((row) => ({ label: text(row.label), count: count(row.count) })),
    geographies: geographyRows.map((row) => ({ label: text(row.label), count: count(row.count) })),
    webVitals,
    leadPipeline: pipelineRows.map((row) => ({ status: text(row.status), count: count(row.count) })),
    alerts,
  };
}
