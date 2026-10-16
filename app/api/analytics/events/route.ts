import { normalizeAnalyticsAttribution } from "@/lib/analytics-attribution";
import { isAnalyticsEventName, sanitizeAnalyticsProperties } from "@/lib/analytics-contract";
import { analyticsDeviceType } from "@/lib/analytics-request-context";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { hashedAnalyticsSession, hashedRequestAddress } from "@/lib/request-privacy";

export const runtime = "nodejs";

const privatePaths = ["/api", "/account", "/dashboard", "/login"];

function safePath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || privatePaths.some((prefix) => value.startsWith(prefix))) return "/";
  return value.slice(0, 200);
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_FIRST_PARTY_ANALYTICS === "disabled") return new Response(null, { status: 204 });
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "[SENSITIVE]") return new Response(null, { status: 204 });
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return new Response(null, { status: 413 });
  try {
    const body = await request.json() as { event?: unknown; path?: unknown; metadata?: unknown; context?: { eventId?: unknown; sessionId?: unknown; attribution?: unknown } };
    if (!isAnalyticsEventName(body.event)) return new Response(null, { status: 400 });
    const eventId = typeof body.context?.eventId === "string" && /^[0-9a-f-]{36}$/i.test(body.context.eventId) ? body.context.eventId : undefined;
    const sessionId = typeof body.context?.sessionId === "string" ? body.context.sessionId : undefined;
    await recordConversionEvent({
      event: body.event,
      path: safePath(body.path),
      metadata: sanitizeAnalyticsProperties(body.event, body.metadata),
      visitorHash: hashedRequestAddress(request.headers, "conversion-analytics", true),
      eventId,
      sessionHash: hashedAnalyticsSession(sessionId),
      attribution: normalizeAnalyticsAttribution(body.context?.attribution),
      deviceType: analyticsDeviceType(request.headers.get("user-agent")),
      countryCode: request.headers.get("x-vercel-ip-country") ?? "",
      regionCode: request.headers.get("x-vercel-ip-country-region") ?? "",
    });
    return new Response(null, { status: 202 });
  } catch (error) {
    console.error("Conversion event unavailable", error instanceof Error ? error.message : "unknown error");
    return new Response(null, { status: 202 });
  }
}
