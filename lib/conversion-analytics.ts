import { contactDatabase } from "@/lib/contact-inquiries";
import { analyticsEventNames, sanitizeAnalyticsProperties, type AnalyticsAttribution, type AnalyticsEventName, type AnalyticsEventProperties } from "@/lib/analytics-contract";

export const conversionEventNames = analyticsEventNames;
export type ConversionEventName = AnalyticsEventName;

export type ConversionEvent = {
  event: ConversionEventName;
  path: string;
  visitorHash: string;
  metadata?: AnalyticsEventProperties;
  eventId?: string;
  contactInquiryId?: number | null;
  sessionHash?: string | null;
  attribution?: AnalyticsAttribution;
  deviceType?: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  countryCode?: string;
  regionCode?: string;
};

export function isConversionEventName(value: unknown): value is ConversionEventName {
  return conversionEventNames.includes(value as ConversionEventName);
}

function retentionDays() {
  const configured = Number(process.env.ANALYTICS_RETENTION_DAYS ?? 90);
  return Number.isSafeInteger(configured) && configured >= 30 && configured <= 730 ? configured : 90;
}

export async function recordConversionEvent({ event, path, visitorHash, metadata = {}, eventId = crypto.randomUUID(), contactInquiryId = null, sessionHash = null, attribution = {}, deviceType = "unknown", countryCode = "", regionCode = "" }: ConversionEvent) {
  const sql = await contactDatabase();
  const recent = await sql`SELECT COUNT(*)::int AS count FROM conversion_events WHERE visitor_hash = ${visitorHash} AND created_at > NOW() - INTERVAL '1 hour'`;
  if (Number(recent[0]?.count ?? 0) >= 100) return false;
  await sql`INSERT INTO conversion_events (
    event_id, event_name, path, metadata, visitor_hash, session_hash, contact_inquiry_id, landing_page, referrer_host,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, device_type, country_code, region_code
  ) VALUES (
    ${eventId}, ${event}, ${path.slice(0, 200)}, ${JSON.stringify(sanitizeAnalyticsProperties(event, metadata))}::jsonb,
    ${visitorHash}, ${sessionHash}, ${contactInquiryId}, ${attribution.landingPath ?? null}, ${attribution.referrerHost ?? null},
    ${attribution.utmSource ?? null}, ${attribution.utmMedium ?? null}, ${attribution.utmCampaign ?? null},
    ${attribution.utmContent ?? null}, ${attribution.utmTerm ?? null}, ${deviceType},
    ${countryCode.slice(0, 8) || null}, ${regionCode.slice(0, 24) || null}
  ) ON CONFLICT DO NOTHING`;
  await sql`DELETE FROM conversion_events WHERE created_at < NOW() - (${retentionDays()} * INTERVAL '1 day')`;
  return true;
}
