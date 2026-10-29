import { describe, expect, test } from "bun:test";
import { buildCommandCenterQueries, buildContactInquiryPageQueries, normalizeCommandCenterCrmSnapshot, normalizeLeadSummary } from "@/lib/contact-inquiries";

describe("contact inquiry summaries", () => {
  test("normalizes separate overdue, today, and future counts", () => {
    expect(normalizeLeadSummary({ open_count: 7, overdue_count: "2", due_today_count: "1", upcoming_count: 4, won_count: 2 })).toEqual({
      open: 7,
      overdue: 2,
      dueToday: 1,
      upcoming: 4,
      won: 2,
    });
  });

  test("falls back safely for missing or invalid aggregate values", () => {
    expect(normalizeLeadSummary({ open_count: -1, overdue_count: 1.5, due_today_count: "invalid", upcoming_count: null, won_count: "invalid" })).toEqual({
      open: 0,
      overdue: 0,
      dueToday: 0,
      upcoming: 0,
      won: 0,
    });
  });
});

describe("contact inquiry follow-up query construction", () => {
  test("uses disjoint Denver-date buckets with the same lifecycle exclusions", () => {
    const overdue = buildContactInquiryPageQueries({ followUp: "overdue" });
    const today = buildContactInquiryPageQueries({ followUp: "today" });
    const upcoming = buildContactInquiryPageQueries({ followUp: "upcoming" });
    for (const query of [overdue, today, upcoming]) {
      expect(query.count.text).toBe(query.records.text.replace(/^SELECT \* /, "SELECT COUNT(*)::int AS count ").replace(/ ORDER BY follow_up_at ASC, id ASC LIMIT \$1 OFFSET \$2$/, ""));
      expect(query.count.text).toContain("NOT EXISTS (SELECT 1 FROM inquiry_retirements");
      expect(query.count.text).toContain("status NOT IN ('won', 'lost', 'archived')");
      expect(query.count.text).toContain("follow_up_at IS NOT NULL");
    }
    expect(overdue.count.text).toContain(")::date < (NOW()");
    expect(today.count.text).toContain(")::date = (NOW()");
    expect(upcoming.count.text).toContain(")::date > (NOW()");
  });

  test("keeps status and pagination values parameterized", () => {
    const queries = buildContactInquiryPageQueries({ status: "proposal", page: 3, pageSize: 20 });
    expect(queries.count.params).toEqual(["proposal"]);
    expect(queries.records.params).toEqual(["proposal", 20, 40]);
    expect(queries.records.text).toContain("status = $1");
  });
});

describe("Command Center CRM snapshot", () => {
  test("uses existing active inquiry stages and excludes retired and closed leads", () => {
    const queries = buildCommandCenterQueries();
    expect(queries.stages.text).toContain("GROUP BY status");
    for (const query of [queries.stages, queries.due, queries.stalled]) {
      expect(query.text).toContain("NOT EXISTS (SELECT 1 FROM inquiry_retirements");
      expect(query.text).toContain("status NOT IN ('won', 'lost', 'archived')");
    }
    expect(queries.due.text).toContain("AT TIME ZONE 'America/Denver'");
    expect(queries.stalled.text).toContain("status IN ('qualified', 'proposal')");
    expect(queries.stalled.text).toContain("AND follow_up_at IS NULL");
    expect(queries.stalled.text).toContain("LIMIT 5");
    expect(queries.due.text).toContain("LIMIT 8");
    expect(queries.sales.text).toContain("p.amount_cents");
    expect(queries.sales.text).not.toContain("budget");
    expect(queries.sales.text).toContain("NOT EXISTS (SELECT 1 FROM inquiry_retirements");
  });

  test("normalizes only safe fields and initializes missing pipeline stages to zero", () => {
    const result = normalizeCommandCenterCrmSnapshot(
      [{ status: "proposal", count: "2" }, { status: "won", count: 3 }],
      [{ id: "42", name: "Avery", company: "Example Co", project_type: "Audit", status: "proposal", follow_up_at: "2026-10-29T18:00:00.000Z", updated_at: "2026-10-28T18:00:00.000Z", email: "private@example.test", notes: "private" }],
      [],
      { pending_count: "2", pipeline_cents: "150000", won_cents: "35000", won_count: 1, lost_count: 3 },
      [{ lead_id: "42", name: "Avery", company: "Example Co", state: "sent", next_action: "Review final scope", next_action_at: "2026-10-30T18:00:00.000Z", email: "private@example.test" }],
    );
    expect(result.stageCounts).toEqual({ new: 0, contacted: 0, qualified: 0, proposal: 2 });
    expect(result.dueFollowUps[0]).not.toHaveProperty("email");
    expect(result.dueFollowUps[0]).not.toHaveProperty("notes");
    expect(result.pendingProposalCount).toBe(2);
    expect(result.pipelineValueCents).toBe(150000);
    expect(result.wonValueCents).toBe(35000);
    expect(result.conversionRate).toBe(25);
    expect(result.proposalNextActions[0]).toMatchObject({ leadId: 42, nextAction: "Review final scope", state: "sent" });
    expect(result.proposalNextActions[0]).not.toHaveProperty("email");
  });
});
