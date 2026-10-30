import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

type ExecutedQuery = {
  text: string;
  values: unknown[];
};

const executedQueries: ExecutedQuery[] = [];
let queryHandler: (text: string, values: unknown[]) => Promise<unknown[]> = async () => [];
const previousDatabaseURL = process.env.DATABASE_URL;

mock.module("@neondatabase/serverless", () => ({
  neon: () => async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    executedQueries.push({ text, values });
    return queryHandler(text, values);
  },
}));

beforeEach(() => {
  executedQueries.length = 0;
  process.env.DATABASE_URL = "postgres://test.invalid/analytics";
  // Default mock handler: returns count 0 for recent checks, empty rows for others
  queryHandler = async (text) => {
    if (text.includes("SELECT COUNT(*)")) {
      return [{ count: 0 }];
    }
    return [];
  };
});

afterAll(() => {
  process.env.DATABASE_URL = previousDatabaseURL;
});

describe("Analytics persistence and API route", () => {
  test("persists valid conversion event to database via recordConversionEvent", async () => {
    const { recordConversionEvent } = await import("@/lib/conversion-analytics");
    const result = await recordConversionEvent({
      event: "case_study_view",
      path: "/work/rework-flow",
      visitorHash: "test-visitor-hash-123",
      metadata: { caseStudy: "rework-flow" },
    });

    expect(result).toBe(true);
    expect(executedQueries.length).toBe(3); // COUNT, INSERT, DELETE (pruning)

    const insertQuery = executedQueries.find((q) => q.text.includes("INSERT INTO conversion_events"));
    expect(insertQuery).toBeDefined();
    expect(insertQuery!.values[1]).toBe("case_study_view");
    expect(insertQuery!.values[2]).toBe("/work/rework-flow");
    expect(insertQuery!.values[3]).toBe(JSON.stringify({ caseStudy: "rework-flow" }));
    expect(insertQuery!.values[4]).toBe("test-visitor-hash-123");
  });

  test("recordConversionEvent enforces 100/hr rate limit per visitor hash", async () => {
    const { recordConversionEvent } = await import("@/lib/conversion-analytics");
    queryHandler = async (text) => {
      if (text.includes("SELECT COUNT(*)")) {
        return [{ count: 100 }];
      }
      return [];
    };

    const result = await recordConversionEvent({
      event: "case_study_view",
      path: "/work/rework-flow",
      visitorHash: "test-visitor-hash-123",
    });

    expect(result).toBe(false);
    // Should NOT have run INSERT
    const insertQuery = executedQueries.find((q) => q.text.includes("INSERT INTO conversion_events"));
    expect(insertQuery).toBeUndefined();
  });

  test("recordConversionEvent throws on database query failure", async () => {
    const { recordConversionEvent } = await import("@/lib/conversion-analytics");
    queryHandler = async () => {
      throw new Error("Neon connection failed");
    };

    await expect(
      recordConversionEvent({
        event: "case_study_view",
        path: "/work/rework-flow",
        visitorHash: "test-visitor-hash-123",
      })
    ).rejects.toThrow("Neon connection failed");
  });

  test("POST /api/analytics/events returns 202 on valid event and triggers database persistence", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const payload = {
      event: "workflow_audit_cta_click",
      path: "/workflow-audit",
      metadata: { placement: "hero" },
    };
    const bodyStr = JSON.stringify({ ...payload, context: { eventId: "123e4567-e89b-42d3-a456-426614174000", sessionId: "123e4567-e89b-42d3-a456-426614174001", attribution: { utmCampaign: "spring" } } });

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
        origin: "https://yorkstead.test",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "203.0.113.195",
      },
      body: bodyStr,
    });

    const response = await POST(request);
    expect(response.status).toBe(202);

    const insertQuery = executedQueries.find((q) => q.text.includes("INSERT INTO conversion_events"));
    expect(insertQuery).toBeDefined();
    expect(insertQuery!.values[1]).toBe("workflow_audit_cta_click");
    expect(insertQuery!.values[2]).toBe("/workflow-audit");
  });

  test("accepts same-origin Fetch Metadata when the browser omits Origin", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({
        event: "page_view",
        path: "/",
        context: {
          eventId: "123e4567-e89b-42d3-a456-426614174050",
          sessionId: "123e4567-e89b-42d3-a456-426614174051",
        },
      }),
    }));

    expect(response.status).toBe(202);
    expect(executedQueries.some((query) => query.text.includes("INSERT INTO conversion_events"))).toBe(true);
  });

  test("rejects cross-origin and private-path events before any database access", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const event = { event: "page_view", path: "/dashboard", context: { eventId: "123e4567-e89b-42d3-a456-426614174000", sessionId: "123e4567-e89b-42d3-a456-426614174001" } };
    const crossOrigin = await POST(new Request("https://yorkstead.test/api/analytics/events", { method: "POST", headers: { "content-type": "application/json", origin: "https://attacker.test" }, body: JSON.stringify(event) }));
    const privatePath = await POST(new Request("https://yorkstead.test/api/analytics/events", { method: "POST", headers: { "content-type": "application/json", origin: "https://yorkstead.test" }, body: JSON.stringify({ ...event, path: "/customer/orders" }) }));
    expect(crossOrigin.status).toBe(403);
    expect(privatePath.status).toBe(400);
    expect(executedQueries).toHaveLength(0);
  });

  test("does not let public clients manufacture server-confirmed business outcomes", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(new Request("https://yorkstead.test/api/analytics/events", { method: "POST", headers: { "content-type": "application/json", origin: "https://yorkstead.test" }, body: JSON.stringify({ event: "lead", path: "/workflow", metadata: { source: "attacker", campaign: "fake" }, context: { eventId: "123e4567-e89b-42d3-a456-426614174030", sessionId: "123e4567-e89b-42d3-a456-426614174031" } }) }));
    expect(response.status).toBe(400);
    expect(executedQueries).toHaveLength(0);
  });

  test("strips path query strings and rejects oversized streamed input", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const payload = { event: "page_view", path: "/work?email=private@example.com#contact", context: { eventId: "123e4567-e89b-42d3-a456-426614174000", sessionId: "123e4567-e89b-42d3-a456-426614174001" } };
    const accepted = await POST(new Request("https://yorkstead.test/api/analytics/events", { method: "POST", headers: { "content-type": "application/json", origin: "https://yorkstead.test" }, body: JSON.stringify(payload) }));
    expect(accepted.status).toBe(202);
    expect(executedQueries.find((query) => query.text.includes("INSERT INTO conversion_events"))?.values[2]).toBe("/work");
    executedQueries.length = 0;
    const oversized = await POST(new Request("https://yorkstead.test/api/analytics/events", { method: "POST", headers: { "content-type": "application/json", origin: "https://yorkstead.test" }, body: "{" + " ".repeat(5000) + "}" }));
    expect(oversized.status).toBe(413);
    expect(executedQueries).toHaveLength(0);
  });

  test("links stored outcomes and strips unapproved restaurant details", async () => {
    const { recordConversionEvent } = await import("@/lib/conversion-analytics");
    await recordConversionEvent({ event: "qualified_lead", path: "/work/table-os", visitorHash: "visitor", contactInquiryId: 42, metadata: { type: "restaurant_trial", restaurantName: "private detail" } as never });
    const insert = executedQueries.find((query) => query.text.includes("INSERT INTO conversion_events"));
    expect(insert?.values[6]).toBe(42);
    expect(insert?.values[3]).toBe(JSON.stringify({ type: "restaurant_trial" }));
    expect(insert?.text).toContain("ON CONFLICT DO NOTHING");
  });

  test("dashboard inquiry totals use linked records and include comparison context", async () => {
    queryHandler = async (text) => {
      if (text.includes("COUNT(DISTINCT contact_inquiry_id)") && text.includes("unlinked_historical_outcomes")) {
        return [{ sessions: 20, page_views: 30, conversions: 2, previous_sessions: 15, previous_conversions: 1, cta_clicks: 8, errors: 0, active_last_hour: 1, last_event_at: "2026-10-30T10:00:00.000Z", unlinked_historical_outcomes: 3 }];
      }
      return [];
    };
    const { getAnalyticsDashboard } = await import("@/lib/analytics-dashboard");
    const result = await getAnalyticsDashboard(7, new Date("2026-10-30T12:00:00.000Z"));
    expect(result.summary.sessions).toBe(20);
    expect(result.summary.conversions).toBe(2);
    expect(result.summary.conversionRate).toBe(10);
    expect(result.summary.inquiryChangePercent).toBe(100);
    expect(result.summary.unlinkedHistoricalOutcomes).toBe(3);
    expect(result.alerts.some((alert) => alert.message.includes("legacy or ambiguous submission event"))).toBe(true);
    expect(result.funnel.at(-1)?.label).toBe("Stored inquiry outcome");
    expect(result.campaigns).toEqual([]);
  });

  test("POST /api/analytics/events returns 202 when database storage fails without claiming event was saved", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    queryHandler = async () => {
      throw new Error("Database timeout or storage outage");
    };

    const payload = {
      event: "service_page_view",
      path: "/services/company-operations",
      context: { eventId: "123e4567-e89b-42d3-a456-426614174010", sessionId: "123e4567-e89b-42d3-a456-426614174011" },
    };
    const bodyStr = JSON.stringify(payload);

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
        origin: "https://yorkstead.test",
      },
      body: bodyStr,
    });

    const response = await POST(request);
    // Endpoint catches error and returns 202 (accepted for processing, no 500 error to client)
    expect(response.status).toBe(202);
  });

  test("POST /api/analytics/events returns 400 on invalid or disallowed event name", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const payload = {
      event: "unapproved_custom_event_name",
      path: "/services",
    };
    const bodyStr = JSON.stringify(payload);

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
        origin: "https://yorkstead.test",
      },
      body: bodyStr,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    // Should NOT have attempted any database query
    expect(executedQueries.length).toBe(0);
  });

  test("POST /api/analytics/events returns 413 when content-length exceeds 4096 bytes", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "4097",
        origin: "https://yorkstead.test",
      },
      body: JSON.stringify({ event: "page_view" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(executedQueries.length).toBe(0);
  });

  test("POST /api/analytics/events rejects private paths before storage", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const payload = {
      event: "page_view",
      path: "/dashboard/leads", // Private path should be sanitized to "/"
      metadata: {
        title: "Public page", // Allowed for page_view
        maliciousKey: "secret_data", // Disallowed key, should be stripped
      },
      context: { eventId: "123e4567-e89b-42d3-a456-426614174020", sessionId: "123e4567-e89b-42d3-a456-426614174021" },
    };
    const bodyStr = JSON.stringify(payload);

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
        origin: "https://yorkstead.test",
      },
      body: bodyStr,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(executedQueries).toHaveLength(0);
  });
});
