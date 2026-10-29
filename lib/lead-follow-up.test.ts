import { describe, expect, test } from "bun:test";
import { rescheduleLeadFollowUpRecord, updateLeadStatusRecord } from "@/lib/lead-follow-up";

describe("owner lead status persistence", () => {
  test("rejects invalid IDs without querying storage", async () => {
    let calls = 0;
    const client = { query: async () => { calls += 1; return { rows: [{ id: 1 }] }; } };
    expect(await updateLeadStatusRecord(client, 0, "qualified")).toBe(false);
    expect(await updateLeadStatusRecord(client, Number.MAX_SAFE_INTEGER + 1, "qualified")).toBe(false);
    expect(calls).toBe(0);
  });

  test("returns false when the record is unavailable or retired", async () => {
    let query = "";
    const client = { query: async (sql: string) => { query = sql; return { rows: [] }; } };
    expect(await updateLeadStatusRecord(client, 42, "qualified")).toBe(false);
    expect(query).toContain("NOT EXISTS (SELECT 1 FROM inquiry_retirements");
    expect(query).toContain("RETURNING id");
  });

  test("reschedules only active non-retired inquiries with a valid date", async () => {
    let query = "";
    const client = { query: async (sql: string) => { query = sql; return { rows: [{ id: 42 }] }; } };
    expect(await rescheduleLeadFollowUpRecord(client, 42, "2026-10-30T12:00:00.000Z")).toBe(true);
    expect(query).toContain("status NOT IN ('won', 'lost', 'archived')");
    expect(query).toContain("NOT EXISTS (SELECT 1 FROM inquiry_retirements");
    expect(await rescheduleLeadFollowUpRecord(client, 0, "2026-10-30T12:00:00.000Z")).toBe(false);
    expect(await rescheduleLeadFollowUpRecord(client, 42, "invalid")).toBe(false);
  });
});
