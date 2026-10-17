import { sanitizedErrorCode } from "@/lib/operational-observability";
import { briefingDateKeys, composeMorningBriefing } from "@/lib/morning-briefing/compose";
import { loadGoogleSources } from "@/lib/morning-briefing/sources/google";
import { loadNewsSource } from "@/lib/morning-briefing/sources/news";
import { loadOpportunitySource } from "@/lib/morning-briefing/sources/opportunities";
import { loadWeatherSource } from "@/lib/morning-briefing/sources/weather";
import { claimBriefingGeneration, getLatestReadyBriefing, getReadyBriefing, markBriefingFailed, saveReadyBriefing } from "@/lib/morning-briefing/store";
import type { BriefingInputs, StoredBriefing } from "@/lib/morning-briefing/types";

export const morningBriefingTimeZone = "America/Denver";

export async function collectMorningBriefingInputs(now = new Date()): Promise<BriefingInputs> {
  const { dateKey, tomorrowDateKey } = briefingDateKeys(now, morningBriefingTimeZone);
  const googlePromise = loadGoogleSources(dateKey, tomorrowDateKey, morningBriefingTimeZone, now);
  const [weather, google, opportunities, news] = await Promise.all([
    loadWeatherSource(),
    googlePromise,
    loadOpportunitySource(),
    loadNewsSource(now),
  ]);
  return { dateKey, tomorrowDateKey, timeZone: morningBriefingTimeZone, weather, calendar: google.calendar, tasks: google.tasks, gmail: google.gmail, opportunities, news };
}

export type BriefingGenerationResult = {
  briefing: StoredBriefing | null;
  generated: boolean;
  stale: boolean;
};

export async function generateMorningBriefing(now = new Date()): Promise<BriefingGenerationResult> {
  const { dateKey } = briefingDateKeys(now, morningBriefingTimeZone);
  const existing = await getReadyBriefing(dateKey);
  if (existing) return { briefing: existing, generated: false, stale: false };
  const claimed = await claimBriefingGeneration(dateKey);
  if (!claimed) {
    const available = await getLatestReadyBriefing(dateKey);
    return { briefing: available, generated: false, stale: available?.briefingDate !== dateKey };
  }
  try {
    const inputs = await collectMorningBriefingInputs(now);
    const composed = composeMorningBriefing(inputs);
    await saveReadyBriefing(dateKey, composed);
    const stored = await getReadyBriefing(dateKey);
    return { briefing: stored, generated: true, stale: false };
  } catch (error) {
    await markBriefingFailed(dateKey, sanitizedErrorCode(error));
    const fallback = await getLatestReadyBriefing(dateKey);
    return { briefing: fallback, generated: false, stale: Boolean(fallback) };
  }
}

export function isMorningBriefingHour(now = new Date(), timeZone = morningBriefingTimeZone) {
  const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now);
  return hour === "07";
}
