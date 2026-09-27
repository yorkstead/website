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
    expect(insertQuery!.values[0]).toBe("case_study_view");
    expect(insertQuery!.values[1]).toBe("/work/rework-flow");
    expect(insertQuery!.values[2]).toBe(JSON.stringify({ caseStudy: "rework-flow" }));
    expect(insertQuery!.values[3]).toBe("test-visitor-hash-123");
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
    const bodyStr = JSON.stringify(payload);

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
        "x-forwarded-for": "203.0.113.195",
      },
      body: bodyStr,
    });

    const response = await POST(request);
    expect(response.status).toBe(202);

    const insertQuery = executedQueries.find((q) => q.text.includes("INSERT INTO conversion_events"));
    expect(insertQuery).toBeDefined();
    expect(insertQuery!.values[0]).toBe("workflow_audit_cta_click");
    expect(insertQuery!.values[1]).toBe("/workflow-audit");
  });

  test("POST /api/analytics/events returns 202 when database storage fails without claiming event was saved", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    queryHandler = async () => {
      throw new Error("Database timeout or storage outage");
    };

    const payload = {
      event: "service_page_view",
      path: "/services/company-operations",
    };
    const bodyStr = JSON.stringify(payload);

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
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
      },
      body: bodyStr,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    // Should NOT have attempted any database query
    expect(executedQueries.length).toBe(0);
  });

  test("POST /api/analytics/events returns 413 when content-length exceeds 2048 bytes", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "2049",
      },
      body: JSON.stringify({ event: "page_view" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(executedQueries.length).toBe(0);
  });

  test("POST /api/analytics/events sanitizes private paths and strips unknown metadata keys", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const payload = {
      event: "page_view",
      path: "/dashboard/leads", // Private path should be sanitized to "/"
      metadata: {
        caseStudy: "rework-flow", // Allowed key
        maliciousKey: "secret_data", // Disallowed key, should be stripped
      },
    };
    const bodyStr = JSON.stringify(payload);

    const request = new Request("https://yorkstead.test/api/analytics/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bodyStr.length),
      },
      body: bodyStr,
    });

    const response = await POST(request);
    expect(response.status).toBe(202);

    const insertQuery = executedQueries.find((q) => q.text.includes("INSERT INTO conversion_events"));
    expect(insertQuery).toBeDefined();
    expect(insertQuery!.values[1]).toBe("/"); // Sanitized path
    const parsedMetadata = JSON.parse(insertQuery!.values[2] as string);
    expect(parsedMetadata.caseStudy).toBe("rework-flow");
    expect(parsedMetadata.maliciousKey).toBeUndefined();
  });
});
