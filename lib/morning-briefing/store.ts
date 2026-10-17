import { neon } from "@neondatabase/serverless";
import { withOperationTimeout } from "@/lib/operational-observability";
import { briefingSourceKeys, type BriefingSourceStatus, type ComposedBriefing, type StoredBriefing } from "@/lib/morning-briefing/types";

function database() {
  const databaseURL = process.env.DATABASE_URL;
  if (!databaseURL || databaseURL === "[SENSITIVE]") throw new Error("DATABASE_URL is not configured");
  return neon(databaseURL);
}

function statusRecord(value: unknown): StoredBriefing["sourceStatus"] {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const allowed = new Set<BriefingSourceStatus>(["ok", "partial", "not_configured", "unauthorized", "unavailable"]);
  return Object.fromEntries(briefingSourceKeys.map((key) => [key, allowed.has(candidate[key] as BriefingSourceStatus) ? candidate[key] : "unavailable"])) as StoredBriefing["sourceStatus"];
}

function mapStored(row: Record<string, unknown>): StoredBriefing | null {
  if (typeof row.spoken_text !== "string" || !row.spoken_text.trim() || !row.generated_at) return null;
  return {
    briefingDate: String(row.briefing_date).slice(0, 10),
    generatedAt: new Date(String(row.generated_at)).toISOString(),
    spokenText: row.spoken_text,
    wordCount: Number(row.word_count),
    sourceStatus: statusRecord(row.source_status),
  };
}

export async function claimBriefingGeneration(dateKey: string) {
  const sql = database();
  const rows = await withOperationTimeout(sql`
    INSERT INTO morning_briefings (briefing_date, status, updated_at)
    VALUES (${dateKey}::date, 'generating', NOW())
    ON CONFLICT (briefing_date) DO UPDATE SET
      status = 'generating',
      updated_at = NOW(),
      error_code = NULL
    WHERE morning_briefings.status = 'failed'
       OR (morning_briefings.status = 'generating' AND morning_briefings.updated_at < NOW() - INTERVAL '5 minutes')
    RETURNING briefing_date
  `);
  return rows.length > 0;
}

export async function saveReadyBriefing(dateKey: string, briefing: ComposedBriefing) {
  const sql = database();
  const sourceStatus = JSON.stringify(briefing.sourceStatus);
  await withOperationTimeout(sql`
    UPDATE morning_briefings SET
      status = 'ready',
      spoken_text = ${briefing.spokenText},
      word_count = ${briefing.wordCount},
      source_status = ${sourceStatus}::jsonb,
      generated_at = NOW(),
      updated_at = NOW(),
      error_code = NULL
    WHERE briefing_date = ${dateKey}::date AND status = 'generating'
  `);
}

export async function markBriefingFailed(dateKey: string, errorCode: string) {
  const sql = database();
  await withOperationTimeout(sql`
    UPDATE morning_briefings SET
      status = 'failed',
      updated_at = NOW(),
      error_code = ${errorCode.slice(0, 80)}
    WHERE briefing_date = ${dateKey}::date AND status = 'generating'
  `);
}

export async function getReadyBriefing(dateKey: string) {
  const sql = database();
  const rows = await withOperationTimeout(sql`
    SELECT briefing_date, spoken_text, word_count, source_status, generated_at
    FROM morning_briefings
    WHERE briefing_date = ${dateKey}::date AND status = 'ready'
    LIMIT 1
  `);
  return rows.length ? mapStored(rows[0]) : null;
}

export async function getLatestReadyBriefing(onOrBeforeDateKey: string) {
  const sql = database();
  const rows = await withOperationTimeout(sql`
    SELECT briefing_date, spoken_text, word_count, source_status, generated_at
    FROM morning_briefings
    WHERE briefing_date <= ${onOrBeforeDateKey}::date AND status = 'ready'
    ORDER BY briefing_date DESC
    LIMIT 1
  `);
  return rows.length ? mapStored(rows[0]) : null;
}
