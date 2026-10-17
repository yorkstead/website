import { createOperationalContext } from "@/lib/operational-observability";
import { hasBearerAuthorization } from "@/lib/morning-briefing/auth";
import { briefingDateKeys } from "@/lib/morning-briefing/compose";
import { generateMorningBriefing, morningBriefingTimeZone } from "@/lib/morning-briefing/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

function textResponse(context: { requestId: string }, body: string, status: number, metadata: { briefingDate?: string; stale?: boolean } = {}) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Authorization",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Request-Id": context.requestId,
  });
  if (metadata.briefingDate) headers.set("X-Briefing-Date", metadata.briefingDate);
  if (metadata.stale !== undefined) headers.set("X-Briefing-Stale", String(metadata.stale));
  return new Response(body, { status, headers });
}

export async function GET(request: Request) {
  const context = createOperationalContext(request, "/api/morning-briefing");
  if (!hasBearerAuthorization(request, process.env.MORNING_BRIEFING_ACCESS_TOKEN)) {
    context.completed(401, { status: "unauthorized" });
    return textResponse(context, "Unauthorized", 401);
  }
  if (!process.env.DATABASE_URL) {
    context.failed(503, { code: "database_unavailable" }, { dependency: "database" });
    return textResponse(context, "The morning briefing is temporarily unavailable.", 503);
  }
  try {
    const today = briefingDateKeys(new Date(), morningBriefingTimeZone).dateKey;
    const result = await generateMorningBriefing();
    if (!result.briefing) {
      context.failed(503, { code: "briefing_unavailable" }, { operation: "morning_briefing_delivery" });
      return textResponse(context, "The morning briefing is still being prepared. Please try again shortly.", 503);
    }
    const stale = result.stale || result.briefing.briefingDate !== today;
    const body = stale
      ? `Today's live briefing is unavailable. Here is the latest successful briefing, from ${result.briefing.briefingDate}.\n\n${result.briefing.spokenText}`
      : result.briefing.spokenText;
    context.completed(200, { status: stale ? "stale" : "ok", itemCount: result.briefing.wordCount });
    return textResponse(context, body, 200, { briefingDate: result.briefing.briefingDate, stale });
  } catch (error) {
    context.failed(503, error, { operation: "morning_briefing_delivery" });
    return textResponse(context, "The morning briefing is temporarily unavailable.", 503);
  }
}
