export type AnalyticsPropertyValue = string | number | boolean | string[];

export const analyticsEventDefinitions = {
  page_view: { category: "traffic", properties: ["title"] },
  service_page_view: { category: "content", properties: ["service"] },
  case_study_view: { category: "content", properties: ["caseStudy"] },
  view_content: { category: "content", properties: ["content_name", "service", "caseStudy"] },
  demo_view: { category: "content", properties: ["content_name", "page"] },
  workflow_audit_cta_click: { category: "conversion", properties: ["placement"] },
  contact_form_start: { category: "conversion", properties: ["projectType"] },
  contact_form_submission: { category: "conversion", properties: ["projectType"] },
  email_link_click: { category: "conversion", properties: ["placement"] },
  phone_link_click: { category: "conversion", properties: ["placement"] },
  external_booking_link_click: { category: "conversion", properties: ["destination", "placement"] },
  workflow_audit_view: { category: "conversion", properties: [] },
  workflow_audit_form_start: { category: "conversion", properties: [] },
  workflow_audit_validation_error: { category: "diagnostic", properties: ["field", "fields"] },
  workflow_audit_submission_success: { category: "conversion", properties: ["projectType"] },
  workflow_audit_booking_click: { category: "conversion", properties: ["destination"] },
  workflow_rescue_check_start: { category: "conversion", properties: ["placement"] },
  workflow_rescue_check_complete: { category: "conversion", properties: ["band", "problemAreas"] },
  card_scan: { category: "conversion", properties: ["source", "campaign"] },
  contact_save_click: { category: "conversion", properties: ["placement"] },
  lead: { category: "business", properties: ["projectType", "source", "campaign"] },
  schedule_start: { category: "conversion", properties: ["destination", "placement"] },
  schedule_complete: { category: "business", properties: ["destination"] },
  qualified_lead: { category: "business", properties: ["projectType", "status", "type", "restaurantName", "approximateSeats", "posTerminals"] },
  web_vital: { category: "performance", properties: ["metric", "value", "rating", "navigationType"] },
  client_error: { category: "reliability", properties: ["errorType", "sourcePath", "line", "column"] },
  server_error: { category: "reliability", properties: ["digest", "routeType", "renderSource"] },
} as const satisfies Record<string, { category: "traffic" | "content" | "conversion" | "business" | "performance" | "diagnostic" | "reliability"; properties: readonly string[] }>;

export type AnalyticsEventName = keyof typeof analyticsEventDefinitions;
export const analyticsEventNames = Object.keys(analyticsEventDefinitions) as AnalyticsEventName[];

export type AnalyticsEventProperties = Partial<Record<
  | "band" | "campaign" | "caseStudy" | "column" | "content_name" | "destination"
  | "digest" | "errorType" | "field" | "fields" | "line" | "metric"
  | "navigationType" | "page" | "placement" | "problemAreas" | "projectType"
  | "rating" | "renderSource" | "routeType" | "service" | "source" | "sourcePath"
  | "status" | "title" | "type" | "restaurantName" | "approximateSeats" | "posTerminals" | "value",
  AnalyticsPropertyValue
>>;

export type AnalyticsAttribution = {
  landingPath?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export type AnalyticsClientContext = {
  eventId?: string;
  sessionId?: string;
  attribution?: AnalyticsAttribution;
};

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && value in analyticsEventDefinitions;
}

export function sanitizeAnalyticsProperties(event: AnalyticsEventName, value: unknown): AnalyticsEventProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set<string>(analyticsEventDefinitions[event].properties);
  const result: AnalyticsEventProperties = {};
  for (const [key, item] of Object.entries(value)) {
    if (!allowed.has(key)) continue;
    if (typeof item === "string") result[key as keyof AnalyticsEventProperties] = item.slice(0, 160);
    else if (typeof item === "number" && Number.isFinite(item)) result[key as keyof AnalyticsEventProperties] = Math.max(-1_000_000, Math.min(1_000_000, item));
    else if (typeof item === "boolean") result[key as keyof AnalyticsEventProperties] = item;
    else if (Array.isArray(item)) result[key as keyof AnalyticsEventProperties] = item.filter((entry): entry is string => typeof entry === "string").slice(0, 20).map((entry) => entry.slice(0, 80));
  }
  return result;
}
