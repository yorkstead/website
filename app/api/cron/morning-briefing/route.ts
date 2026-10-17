import { createOperationalContext, jsonWithRequestId } from "@/lib/operational-observability";
import { hasBearerAuthorization } from "@/lib/morning-briefing/auth";
import { generateMorningBriefing, isMorningBriefingHour } from "@/lib/morning-briefing/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const context = createOperationalContext(request, "/api/cron/morning-briefing");
  if (!hasBearerAuthorization(request, process.env.CRON_SECRET)) {
    context.completed(401, { status: "unauthorized" });
    return jsonWithRequestId(context, { error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    context.failed(503, { code: "database_unavailable" }, { dependency: "database" });
    return jsonWithRequestId(context, { error: "Database unavailable" }, { status: 503 });
  }
  if (!isMorningBriefingHour()) {
    context.completed(200, { status: "outside_local_window" });
    return jsonWithRequestId(context, { ok: true, skipped: true, reason: "outside_local_window" });
  }
  try {
    const result = await generateMorningBriefing();
    if (!result.briefing) {
      context.failed(503, { code: "briefing_unavailable" }, { operation: "morning_briefing_generation" });
      return jsonWithRequestId(context, { error: "Briefing unavailable" }, { status: 503 });
    }
    context.completed(200, { status: result.stale ? "stale" : "ok", itemCount: result.briefing.wordCount });
    return jsonWithRequestId(context, { ok: true, generated: result.generated, stale: result.stale, briefingDate: result.briefing.briefingDate });
  } catch (error) {
    context.failed(503, error, { operation: "morning_briefing_generation" });
    return jsonWithRequestId(context, { error: "Briefing generation is temporarily unavailable" }, { status: 503 });
  }
}
