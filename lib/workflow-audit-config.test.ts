import { describe, expect, test } from "bun:test";
import { defaultWorkflowAuditBookingURL, workflowAuditBookingURL } from "@/lib/workflow-audit-config";

describe("workflow audit booking configuration", () => {
  test("uses the confirmed free floor-walk page when configuration is absent or invalid", () => {
    expect(workflowAuditBookingURL("")).toBe(defaultWorkflowAuditBookingURL);
    expect(workflowAuditBookingURL("not a url")).toBe(defaultWorkflowAuditBookingURL);
    expect(workflowAuditBookingURL("http://example.com")).toBe(defaultWorkflowAuditBookingURL);
  });

  test("accepts an explicitly configured HTTPS booking page", () => {
    expect(workflowAuditBookingURL("https://cal.com/yorkstead/freefloorwalkthrough")).toBe(
      "https://cal.com/yorkstead/freefloorwalkthrough",
    );
  });
});
