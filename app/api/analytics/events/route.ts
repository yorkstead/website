import { normalizeAnalyticsAttribution } from "@/lib/analytics-attribution";
import { isAnalyticsEventName, isPublicAnalyticsPath, sanitizeAnalyticsProperties } from "@/lib/analytics-contract";
import { analyticsDeviceType } from "@/lib/analytics-request-context";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { hashedAnalyticsSession, hashedRequestAddress } from "@/lib/request-privacy";

export const runtime = "nodejs";

const maxBodyBytes = 4096;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTopLevel = new Set(["event", "path", "metadata", "context"]);
const allowedContext = new Set(["eventId", "sessionId", "attribution"]);
const allowedAttribution = new Set(["landingPath", "referrerHost", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"]);
const serverOnlyEvents = new Set(["contact_form_submission", "workflow_audit_submission_success", "lead", "qualified_lead", "schedule_complete"]);

function response(status: number) {
  return new Response(null, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

function sameOriginBrowserRequest(request: Request) {
  let requestOrigin: string;
  try { requestOrigin = new URL(request.url).origin; } catch { return false; }
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (origin ? origin !== requestOrigin : fetchSite !== "same-origin") return false;
  const referrer = request.headers.get("referer");
  if (referrer) {
    try { if (new URL(referrer).origin !== requestOrigin) return false; }
    catch { return false; }
  }
  return true;
}

async function readBoundedJson(request: Request): Promise<unknown | null | "too-large"> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) return null;
    if (Number(declaredLength) > maxBodyBytes) return "too-large";
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" || !request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        return "too-large";
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

function recordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(value).every((key) => allowed.has(key));
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_FIRST_PARTY_ANALYTICS === "disabled") return response(204);
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "[SENSITIVE]") return response(204);
  if (!sameOriginBrowserRequest(request)) return response(403);

  const body = await readBoundedJson(request);
  if (body === "too-large") return response(413);
  if (!recordObject(body) || !hasOnlyKeys(body, allowedTopLevel) || !isAnalyticsEventName(body.event) || serverOnlyEvents.has(body.event)) return response(400);
  if (typeof body.path !== "string" || body.path.length > 2048 || !body.path.startsWith("/") || body.path.startsWith("//") || body.path.includes("\\") || /[\u0000-\u001f\u007f]/.test(body.path)) return response(400);
  if (body.metadata !== undefined && !recordObject(body.metadata)) return response(400);
  if (body.context !== undefined && !recordObject(body.context)) return response(400);

  const context = (body.context ?? {}) as Record<string, unknown>;
  if (!hasOnlyKeys(context, allowedContext)) return response(400);
  if (typeof context.eventId !== "string" || !uuidPattern.test(context.eventId)) return response(400);
  if (typeof context.sessionId !== "string" || !uuidPattern.test(context.sessionId)) return response(400);
  if (context.attribution !== undefined && (!recordObject(context.attribution) || !hasOnlyKeys(context.attribution, allowedAttribution))) return response(400);

  let path: string;
  try { path = new URL(body.path, new URL(request.url).origin).pathname; }
  catch { return response(400); }
  if (!isPublicAnalyticsPath(path)) return response(400);
  const sessionHash = hashedAnalyticsSession(context.sessionId);
  if (!sessionHash) return response(204);

  try {
    await recordConversionEvent({
      event: body.event,
      path: path.slice(0, 200),
      metadata: sanitizeAnalyticsProperties(body.event, body.metadata),
      visitorHash: hashedRequestAddress(request.headers, "conversion-analytics", true),
      eventId: context.eventId,
      sessionHash,
      attribution: normalizeAnalyticsAttribution(context.attribution),
      deviceType: analyticsDeviceType(request.headers.get("user-agent")),
      countryCode: request.headers.get("x-vercel-ip-country") ?? "",
      regionCode: request.headers.get("x-vercel-ip-country-region") ?? "",
    });
    return response(202);
  } catch (error) {
    console.error("Conversion event unavailable", error instanceof Error ? error.message : "unknown error");
    return response(202);
  }
}
