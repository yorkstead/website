"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { attributionFromLocation } from "@/lib/analytics-attribution";
import type { AnalyticsAttribution, AnalyticsEventName, AnalyticsEventProperties } from "@/lib/analytics-contract";

const sessionStorageKey = "yorkstead.analytics.session.v1";
const privatePaths = ["/api", "/account", "/dashboard", "/login"];

export type BrowserAnalyticsSession = { sessionId: string; attribution: AnalyticsAttribution };

export function getBrowserAnalyticsSession(): BrowserAnalyticsSession | null {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_FIRST_PARTY_ANALYTICS === "disabled") return null;
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(sessionStorageKey) ?? "null") as BrowserAnalyticsSession | null;
    const sessionId = existing?.sessionId && /^[0-9a-f-]{36}$/i.test(existing.sessionId) ? existing.sessionId : crypto.randomUUID();
    const session = { sessionId, attribution: attributionFromLocation(window.location.href, document.referrer, existing?.attribution) };
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
    return session;
  } catch {
    return { sessionId: crypto.randomUUID(), attribution: attributionFromLocation(window.location.href, document.referrer) };
  }
}

export function trackConversionEvent(event: AnalyticsEventName, metadata: AnalyticsEventProperties | string = {}) {
  if (typeof window === "undefined" || privatePaths.some((prefix) => window.location.pathname.startsWith(prefix))) return;
  const session = getBrowserAnalyticsSession();
  if (!session) return;
  const body = JSON.stringify({
    event,
    path: window.location.pathname,
    metadata: typeof metadata === "string" ? { field: metadata } : metadata,
    context: { eventId: crypto.randomUUID(), ...session },
  });
  if (navigator.sendBeacon && navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }))) {
    return;
  }
  void fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}

function reportWebVital(metric: { name: string; value: number; rating: "good" | "needs-improvement" | "poor"; navigationType: string }) {
  trackConversionEvent("web_vital", { metric: metric.name, value: metric.value, rating: metric.rating, navigationType: metric.navigationType });
}

export function AnalyticsRuntime() {
  const pathname = usePathname();
  useReportWebVitals(reportWebVital);

  useEffect(() => {
    if (!privatePaths.some((prefix) => pathname.startsWith(prefix))) trackConversionEvent("page_view");
  }, [pathname]);

  useEffect(() => {
    const reportError = (event: ErrorEvent) => trackConversionEvent("client_error", {
      errorType: event.error instanceof Error ? event.error.name : "Error",
      sourcePath: event.filename ? (() => { try { return new URL(event.filename).pathname; } catch { return "unknown"; } })() : "unknown",
      line: event.lineno,
      column: event.colno,
    });
    const reportRejection = (event: PromiseRejectionEvent) => trackConversionEvent("client_error", {
      errorType: event.reason instanceof Error ? event.reason.name : "UnhandledRejection",
      sourcePath: "promise",
    });
    window.addEventListener("error", reportError);
    window.addEventListener("unhandledrejection", reportRejection);
    return () => {
      window.removeEventListener("error", reportError);
      window.removeEventListener("unhandledrejection", reportRejection);
    };
  }, []);
  return null;
}

export function WorkflowAuditViewTracker() {
  useEffect(() => { trackConversionEvent("workflow_audit_view"); }, []);
  return null;
}

export function ConversionViewTracker({ event, field, value }: { event: "service_page_view" | "case_study_view"; field: "service" | "caseStudy"; value: string }) {
  useEffect(() => { trackConversionEvent(event, { [field]: value }); }, [event, field, value]);
  return null;
}

type TrackedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  href: string;
  event: AnalyticsEventName;
  metadata?: AnalyticsEventProperties;
  children: ReactNode;
};

export function TrackedLink({ href, event, metadata, children, ...props }: TrackedLinkProps) {
  const handleClick = () => trackConversionEvent(event, metadata);
  // File downloads skip client-side navigation, which only handles pages.
  if ((href.startsWith("/") || href.startsWith("#")) && !props.download) return <Link href={href} onClick={handleClick} {...props}>{children}</Link>;
  return <a href={href} onClick={handleClick} {...props}>{children}</a>;
}
