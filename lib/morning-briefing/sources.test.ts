import { describe, expect, test } from "bun:test";
import { followUpFromThread, normalizeCalendarEvents, normalizeTasks } from "@/lib/morning-briefing/sources/google";
import { parseTrustedFeed, trustedNewsFeeds } from "@/lib/morning-briefing/sources/news";
import { normalizeForecastPeriods } from "@/lib/morning-briefing/sources/weather";

describe("morning briefing source normalization", () => {
  test("normalizes NWS periods without carrying long forecast bodies", () => {
    expect(normalizeForecastPeriods([{ name: "Today", temperature: 70, temperatureUnit: "F", shortForecast: "Sunny", windSpeed: "5 mph", windDirection: "W" }]))
      .toEqual([{ name: "Today", temperature: 70, temperatureUnit: "F", shortForecast: "Sunny", wind: "5 mph W" }]);
  });

  test("keeps calendar dates in Denver across the UTC boundary", () => {
    const events = normalizeCalendarEvents([{ id: "1", summary: "Evening call", start: { dateTime: "2026-10-18T01:00:00Z" } }], "America/Denver");
    expect(events[0]?.dateKey).toBe("2026-10-17");
  });

  test("includes overdue through tomorrow tasks and excludes later or completed tasks", () => {
    const tasks = normalizeTasks([
      { id: "1", title: "Overdue", due: "2026-10-16T00:00:00.000Z" },
      { id: "2", title: "Tomorrow", due: "2026-10-18T00:00:00.000Z" },
      { id: "3", title: "Later", due: "2026-10-19T00:00:00.000Z" },
      { id: "4", title: "Done", due: "2026-10-17T00:00:00.000Z", status: "completed" },
    ], { id: "list", title: "Work" }, "2026-10-17", "2026-10-18");
    expect(tasks.map((task) => task.title)).toEqual(["Overdue", "Tomorrow"]);
  });

  test("creates a follow-up only when the authorized account sent the last metadata-only message", () => {
    const now = new Date("2026-10-17T14:00:00.000Z");
    const sent = { id: "thread", messages: [{ labelIds: ["SENT"], internalDate: String(now.getTime() - 5 * 86_400_000), payload: { headers: [{ name: "From", value: "Brandon <owner@example.com>" }, { name: "Subject", value: "Re: Workflow" }] } }] };
    expect(followUpFromThread(sent, now)).toEqual({ threadId: "thread", subject: "Workflow", waitingDays: 5 });
    const replied = { ...sent, messages: [...sent.messages, { labelIds: ["INBOX"], internalDate: String(now.getTime() - 1 * 86_400_000), payload: { headers: [{ name: "From", value: "Client <client@example.com>" }, { name: "Subject", value: "Re: Workflow" }] } }] };
    expect(followUpFromThread(replied, now)).toBeNull();
  });

  test("accepts only recent same-publisher HTTPS feed links", () => {
    const now = new Date("2026-10-17T14:00:00.000Z");
    const feed = trustedNewsFeeds.find((item) => item.key === "manufacturing")!;
    const xml = `<rss><channel>
      <item><title>Trusted story</title><link>https://www.manufacturingdive.com/news/story/123/</link><pubDate>Fri, 17 Oct 2026 12:00:00 GMT</pubDate></item>
      <item><title>Wrong host</title><link>https://attacker.example/story</link><pubDate>Fri, 17 Oct 2026 12:00:00 GMT</pubDate></item>
      <item><title>Old story</title><link>https://www.manufacturingdive.com/news/old/</link><pubDate>Thu, 01 Oct 2026 12:00:00 GMT</pubDate></item>
    </channel></rss>`;
    expect(parseTrustedFeed(xml, feed, now).map((story) => story.title)).toEqual(["Trusted story"]);
  });
});
