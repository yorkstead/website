import { describe, expect, test } from "bun:test";
import { attributionFromLocation, normalizeAnalyticsAttribution, publicAnalyticsPath, referrerHost } from "@/lib/analytics-attribution";
import { isAnalyticsEventName, sanitizeAnalyticsProperties } from "@/lib/analytics-contract";
import { conversionRate, parseAnalyticsRange } from "@/lib/analytics-dashboard";
import { analyticsDeviceType } from "@/lib/analytics-request-context";

describe("analytics contract", () => {
  test("accepts governed events and rejects arbitrary names", () => {
    expect(isAnalyticsEventName("page_view")).toBe(true);
    expect(isAnalyticsEventName("password_captured")).toBe(false);
  });

  test("keeps only event-specific properties with bounded values", () => {
    expect(sanitizeAnalyticsProperties("web_vital", { metric: "LCP", value: 2400.5, rating: "good", email: "private@example.com", fields: ["x"] })).toEqual({ metric: "LCP", value: 2400.5, rating: "good" });
    expect(sanitizeAnalyticsProperties("contact_form_start", { projectType: "x".repeat(200) }).projectType).toHaveLength(160);
  });
});

describe("anonymous attribution", () => {
  test("captures first-touch UTM and external referrer without queries", () => {
    const first = attributionFromLocation("https://yorkstead.com/services/workflow?utm_source=linkedin&utm_medium=social&utm_campaign=fall", "https://www.google.com/search?q=yorkstead");
    expect(first).toEqual({ landingPath: "/services/workflow", referrerHost: "google.com", utmSource: "linkedin", utmMedium: "social", utmCampaign: "fall", utmContent: undefined, utmTerm: undefined });
    const later = attributionFromLocation("https://yorkstead.com/about?utm_source=overwrite", "", first);
    expect(later.utmSource).toBe("linkedin");
    expect(later.landingPath).toBe("/services/workflow");
  });

  test("normalizes untrusted paths and hosts", () => {
    expect(publicAnalyticsPath("https://example.com/path?secret=yes")).toBe("/path");
    expect(referrerHost("https://www.yorkstead.com/a", "yorkstead.com")).toBeUndefined();
    expect(normalizeAnalyticsAttribution({ landingPath: "https://evil.example/x?q=1", referrerHost: "evil.example/?token=x" })).toEqual({ landingPath: "/x", referrerHost: undefined, utmSource: undefined, utmMedium: undefined, utmCampaign: undefined, utmContent: undefined, utmTerm: undefined });
  });
});

describe("dashboard inputs", () => {
  test("uses supported date windows and safe ratios", () => {
    expect(parseAnalyticsRange("7")).toBe(7);
    expect(parseAnalyticsRange("365")).toBe(30);
    expect(conversionRate(2, 40)).toBe(5);
    expect(conversionRate(2, 0)).toBe(0);
  });

  test("uses coarse device classes", () => {
    expect(analyticsDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(analyticsDeviceType("Googlebot/2.1")).toBe("bot");
    expect(analyticsDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });
});
