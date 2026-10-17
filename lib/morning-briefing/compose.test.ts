import { describe, expect, test } from "bun:test";
import { composeMorningBriefing, maximumBriefingWords } from "@/lib/morning-briefing/compose";
import type { BriefingInputs } from "@/lib/morning-briefing/types";

const input: BriefingInputs = {
  dateKey: "2026-10-17",
  tomorrowDateKey: "2026-10-18",
  timeZone: "America/Denver",
  weather: { status: "ok", value: [
    { city: "Golden", periods: [{ name: "Today", temperature: 62, temperatureUnit: "F", shortForecast: "Sunny", wind: "West 5 mph" }] },
    { city: "Denver", periods: [{ name: "Today", temperature: 65, temperatureUnit: "F", shortForecast: "Mostly sunny", wind: "Calm" }] },
  ] },
  calendar: { status: "ok", value: [{ id: "event-1", title: "Discovery call", start: "2026-10-17T09:00:00-06:00", allDay: false, dateKey: "2026-10-17" }] },
  tasks: { status: "ok", value: [{ id: "task-1", title: "Send proposal", list: "Yorkstead", dueDate: "2026-10-17" }] },
  gmail: { status: "ok", value: [{ threadId: "thread-1", subject: "Production workflow follow-up", waitingDays: 5 }] },
  opportunities: { status: "ok", value: [{ id: 7, name: "Avery", company: "Golden Fabrication", projectType: "workflow audit", status: "proposal", qualificationStatus: "qualified", followUpAt: "2026-10-17T14:00:00.000Z", createdAt: "2026-10-01T12:00:00.000Z" }] },
  news: { status: "ok", value: [
    { title: "Manufacturers modernize planning systems", url: "https://example.com/one", source: "Manufacturing Dive", category: "manufacturing", publishedAt: "2026-10-17T10:00:00.000Z" },
    { title: "Freight networks improve visibility", url: "https://example.com/two", source: "FreightWaves", category: "logistics", publishedAt: "2026-10-17T09:00:00.000Z" },
  ] },
};

describe("spoken morning briefing", () => {
  test("prioritizes revenue, stays within budget, and leaves news last", () => {
    const briefing = composeMorningBriefing(input);
    expect(briefing.spokenText.indexOf("Top priorities.")).toBeLessThan(briefing.spokenText.indexOf("Weather."));
    expect(briefing.spokenText).toContain("Highest-value revenue move. Contact Golden Fabrication");
    expect(briefing.spokenText.lastIndexOf("Industry news.")).toBeGreaterThan(briefing.spokenText.indexOf("Source note."));
    expect(briefing.spokenText.endsWith("Category: logistics.")).toBeTrue();
    expect(briefing.wordCount).toBeLessThanOrEqual(maximumBriefingWords);
  });

  test("states degraded sources without dropping available sections", () => {
    const briefing = composeMorningBriefing({
      ...input,
      calendar: { status: "unavailable", value: [] },
      gmail: { status: "not_configured", value: [] },
    });
    expect(briefing.spokenText).toContain("calendar unavailable");
    expect(briefing.spokenText).toContain("Gmail not configured");
    expect(briefing.spokenText).toContain("Golden. Today: 62 degrees F");
  });
});
