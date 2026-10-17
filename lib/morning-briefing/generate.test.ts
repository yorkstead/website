import { describe, expect, test } from "bun:test";
import { isMorningBriefingHour } from "@/lib/morning-briefing/generate";

describe("Denver morning briefing schedule", () => {
  test("selects the daylight-time UTC invocation", () => {
    expect(isMorningBriefingHour(new Date("2026-07-15T13:15:00.000Z"))).toBeTrue();
    expect(isMorningBriefingHour(new Date("2026-07-15T14:15:00.000Z"))).toBeFalse();
  });

  test("selects the standard-time UTC invocation", () => {
    expect(isMorningBriefingHour(new Date("2026-12-15T13:15:00.000Z"))).toBeFalse();
    expect(isMorningBriefingHour(new Date("2026-12-15T14:15:00.000Z"))).toBeTrue();
  });
});
