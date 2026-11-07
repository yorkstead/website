import { describe, expect, test } from "bun:test";
import {
  archivedInquiryPurgeBefore,
  archivedInquiryDeleteAfter,
  archivedInquiryPurgeQuery,
  archivedInquiryRetentionDays,
  morningBriefingPurgeBefore,
  morningBriefingRetentionDays,
  workspaceSnapshotHistoryCount,
  workspaceSnapshotRetentionCount,
} from "@/lib/data-retention";

describe("data retention policy", () => {
  test("keeps more snapshots than are shown in recovery history", () => {
    expect(workspaceSnapshotRetentionCount).toBe(30);
    expect(workspaceSnapshotHistoryCount).toBe(10);
    expect(workspaceSnapshotRetentionCount).toBeGreaterThan(workspaceSnapshotHistoryCount);
  });

  test("purges inquiries only after a full archived retention year", () => {
    const now = new Date("2028-03-01T12:00:00.000Z");
    expect(archivedInquiryRetentionDays).toBe(365);
    expect(archivedInquiryPurgeBefore(now).toISOString()).toBe("2027-03-02T12:00:00.000Z");
    expect(archivedInquiryDeleteAfter("2027-03-02T12:00:00.000Z").toISOString()).toBe(now.toISOString());
  });

  test("keeps CRM inquiries linked from retained Marketing prospect JSON", () => {
    expect(archivedInquiryPurgeQuery).toContain("marketing_workspaces");
    expect(archivedInquiryPurgeQuery).toContain("p->>'crmLeadId' = i.id::text");
    expect(archivedInquiryPurgeQuery).toContain("jsonb_typeof(m.data->'prospects') = 'array'");
  });

  test("scopes Marketing retention to an exact linked inquiry and keeps normal archived eligibility", () => {
    expect(archivedInquiryPurgeQuery).toContain("p->>'crmLeadId' = i.id::text");
    expect(archivedInquiryPurgeQuery).toContain("i.status='archived' AND i.archived_at < $1::timestamptz");
    expect(archivedInquiryPurgeQuery).toContain("FOR UPDATE OF i SKIP LOCKED");
  });

  test("keeps only a short fallback window of private morning briefings", () => {
    const now = new Date("2028-03-01T12:00:00.000Z");
    expect(morningBriefingRetentionDays).toBe(35);
    expect(morningBriefingPurgeBefore(now).toISOString()).toBe("2028-01-26T12:00:00.000Z");
  });
});
