import type { AnalyticsAttribution } from "@/lib/analytics-contract";

const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function limited(value: string | null | undefined, maximum = 160) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maximum) : undefined;
}

export function publicAnalyticsPath(value: string | null | undefined) {
  if (!value) return "/";
  try {
    const url = value.startsWith("/") ? new URL(value, "https://analytics.invalid") : new URL(value);
    const path = url.pathname.startsWith("/") ? url.pathname : "/";
    return path.slice(0, 200);
  } catch {
    return "/";
  }
}

export function referrerHost(value: string | null | undefined, currentHost?: string) {
  if (!value) return undefined;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const local = currentHost?.toLowerCase().replace(/^www\./, "");
    return host && host !== local ? host.slice(0, 160) : undefined;
  } catch {
    return undefined;
  }
}

export function attributionFromLocation(urlValue: string, referrerValue = "", previous: AnalyticsAttribution = {}): AnalyticsAttribution {
  const url = new URL(urlValue, "https://analytics.invalid");
  const params = url.searchParams;
  const campaign = Object.fromEntries(attributionKeys.map((key) => [key, limited(params.get(key))])) as Record<typeof attributionKeys[number], string | undefined>;
  return {
    landingPath: previous.landingPath ?? publicAnalyticsPath(url.pathname),
    referrerHost: previous.referrerHost ?? referrerHost(referrerValue, url.hostname),
    utmSource: previous.utmSource ?? campaign.utm_source,
    utmMedium: previous.utmMedium ?? campaign.utm_medium,
    utmCampaign: previous.utmCampaign ?? campaign.utm_campaign,
    utmContent: previous.utmContent ?? campaign.utm_content,
    utmTerm: previous.utmTerm ?? campaign.utm_term,
  };
}

export function normalizeAnalyticsAttribution(value: unknown): AnalyticsAttribution {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const item = value as Record<string, unknown>;
  const candidateHost = typeof item.referrerHost === "string" ? item.referrerHost.trim().toLowerCase() : "";
  return {
    landingPath: publicAnalyticsPath(typeof item.landingPath === "string" ? item.landingPath : "/"),
    referrerHost: /^[a-z0-9.-]+$/.test(candidateHost) ? limited(candidateHost) : undefined,
    utmSource: limited(typeof item.utmSource === "string" ? item.utmSource : undefined, 120),
    utmMedium: limited(typeof item.utmMedium === "string" ? item.utmMedium : undefined, 120),
    utmCampaign: limited(typeof item.utmCampaign === "string" ? item.utmCampaign : undefined, 200),
    utmContent: limited(typeof item.utmContent === "string" ? item.utmContent : undefined, 200),
    utmTerm: limited(typeof item.utmTerm === "string" ? item.utmTerm : undefined, 120),
  };
}
