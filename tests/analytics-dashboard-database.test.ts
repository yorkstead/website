import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";

const databaseURL = disposableTestDatabaseURL();
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;
const originalNodeEnv = process.env.NODE_ENV;
const originalDatabaseURL = process.env.DATABASE_URL;
const environment = process.env as Record<string, string | undefined>;

afterAll(async () => {
  await pool?.end();
  environment.NODE_ENV = originalNodeEnv;
  process.env.DATABASE_URL = originalDatabaseURL;
});

describe("analytics dashboard PostgreSQL reporting windows", () => {
  databaseTest("counts linked inquiries only in their own bounded period and excludes unlinked outcomes from conversions", async () => {
    environment.NODE_ENV = "development";
    process.env.DATABASE_URL = databaseURL!;
    const { getAnalyticsDashboard } = await import("@/lib/analytics-dashboard");
    const now = new Date("2026-10-30T12:00:00.000Z");
    const currentSince = new Date(now.getTime() - 7 * 86_400_000);
    const previousSince = new Date(now.getTime() - 14 * 86_400_000);
    const connection = await pool!.connect();
    const inquiries = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const eventIds = Array.from({ length: 20 }, () => randomUUID());

    try {
      const baseline = await getAnalyticsDashboard(7, now);
      await connection.query("BEGIN");
      const inquiryIds: number[] = [];
      for (const [index, createdAt] of [
        currentSince,
        new Date("2026-10-29T12:00:00.000Z"),
        previousSince,
        now,
      ].entries()) {
        const result = await connection.query<{ id: string }>(
          "INSERT INTO contact_inquiries (name,email,message,ip_hash,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id",
          ["Synthetic analytics window test", `analytics-window-${inquiries[index]}@example.test`, "Disposable analytics window regression", randomUUID(), createdAt],
        );
        inquiryIds.push(Number(result.rows[0]!.id));
      }
      const events = [
        ...Array.from({ length: 10 }, (_, index) => ({
          id: eventIds[index]!, name: "page_view", date: new Date(`2026-10-${24 + index % 6}T12:00:00.000Z`), session: `analytics-current-session-${index}`, inquiryId: null,
        })),
        ...Array.from({ length: 5 }, (_, index) => ({
          id: eventIds[index + 10]!, name: "page_view", date: new Date(`2026-10-${17 + index}T12:00:00.000Z`), session: `analytics-previous-session-${index}`, inquiryId: null,
        })),
        { id: eventIds[15]!, name: "lead", date: currentSince, session: "analytics-current-inquiry-a", inquiryId: inquiryIds[0]! },
        { id: eventIds[16]!, name: "lead", date: new Date("2026-10-29T13:00:00.000Z"), session: "analytics-current-inquiry-b", inquiryId: inquiryIds[1]! },
        { id: eventIds[17]!, name: "lead", date: previousSince, session: "analytics-previous-inquiry", inquiryId: inquiryIds[2]! },
        { id: eventIds[18]!, name: "lead", date: now, session: "analytics-at-end-exclusive", inquiryId: inquiryIds[3]! },
        { id: eventIds[19]!, name: "lead", date: new Date("2026-10-27T13:00:00.000Z"), session: "analytics-unlinked-legacy", inquiryId: null },
      ];
      for (const event of events) {
        await connection.query(
          `INSERT INTO conversion_events (event_id,event_name,path,metadata,visitor_hash,session_hash,device_type,created_at,contact_inquiry_id)
           VALUES ($1,$2,'/analytics-window-test','{}'::jsonb,$3,$3,'desktop',$4,$5)`,
          [event.id, event.name, event.session, event.date, event.inquiryId],
        );
      }
      await connection.query("COMMIT");

      const result = await getAnalyticsDashboard(7, now);
      const expectedRate = ((baseline.summary.conversions + 2) / (baseline.summary.sessions + 10)) * 100;
      const expectedChange = ((baseline.summary.previousInquiries + 1) > 0
        ? ((baseline.summary.conversions + 2 - (baseline.summary.previousInquiries + 1)) / (baseline.summary.previousInquiries + 1)) * 100
        : 0);

      expect(currentSince.toISOString()).toBe("2026-10-23T12:00:00.000Z");
      expect(previousSince.toISOString()).toBe("2026-10-16T12:00:00.000Z");
      expect(result.summary.sessions - baseline.summary.sessions).toBe(10);
      expect(result.summary.conversions - baseline.summary.conversions).toBe(2);
      expect(result.summary.previousSessions - baseline.summary.previousSessions).toBe(5);
      expect(result.summary.previousInquiries - baseline.summary.previousInquiries).toBe(1);
      expect(result.summary.conversionRate).toBeCloseTo(expectedRate, 8);
      expect(result.summary.inquiryChangePercent).toBeCloseTo(expectedChange, 8);
      expect(result.summary.unlinkedHistoricalOutcomes - baseline.summary.unlinkedHistoricalOutcomes).toBe(1);
      expect((result.funnel.find((step) => step.event === "stored_inquiry")?.sessions ?? 0) - (baseline.funnel.find((step) => step.event === "stored_inquiry")?.sessions ?? 0)).toBe(3);
      expect((result.funnel.find((step) => step.event === "unlinked_historical_outcome")?.sessions ?? 0) - (baseline.funnel.find((step) => step.event === "unlinked_historical_outcome")?.sessions ?? 0)).toBe(1);
      expect(result.funnel.find((step) => step.event === "unlinked_historical_outcome")?.label).toContain("not a conversion");
    } finally {
      await connection.query("ROLLBACK").catch(() => undefined);
      await connection.query("DELETE FROM conversion_events WHERE event_id = ANY($1::text[])", [eventIds]);
      await connection.query("DELETE FROM contact_inquiries WHERE email = ANY($1::text[])", [inquiries.map((id) => `analytics-window-${id}@example.test`)]);
      connection.release();
    }
  });
});
