import { describe, expect, test } from "bun:test";
import { followUpTimestamp, leadStatuses, parseLeadId } from "@/lib/lead-rules";

describe("lead rules", () => {
  test("normalizes a follow-up day without a daylight-saving offset", () => {
    expect(followUpTimestamp("2026-01-15")).toBe("2026-01-15T12:00:00.000Z");
    expect(followUpTimestamp("2026-07-15")).toBe("2026-07-15T12:00:00.000Z");
  });

  test("rejects malformed and impossible dates", () => {
    expect(followUpTimestamp("2026-02-30")).toBeNull();
    expect(followUpTimestamp("01/15/2026")).toBeNull();
    expect(followUpTimestamp(null)).toBeNull();
  });

  test("only exposes supported pipeline stages", () => {
    expect(leadStatuses.has("proposal")).toBeTrue();
    expect(leadStatuses.has("deleted" as never)).toBeFalse();
  });

  test("accepts only positive decimal inquiry IDs", () => {
    expect(parseLeadId("42")).toBe(42);
    for (const value of [null, "", "0", "-2", "1.5", "1e3", "9007199254740992"]) {
      expect(parseLeadId(value)).toBeNull();
    }
  });
});
