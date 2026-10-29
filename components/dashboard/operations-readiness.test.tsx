import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildOperationsOverview } from "@/lib/operations-observability";
import { OperationsReadiness } from "@/components/dashboard/operations-readiness";

describe("Operations production readiness and recovery presentation", () => {
  test("shows documented target identity as unverified and backup/restore as separate controls", () => {
    const overview = buildOperationsOverview({
      now: new Date("2026-10-28T12:00:00Z"),
      authConfigurationValid: true,
      databaseStatus: "healthy",
      authSchemaPresent: true,
      briefing: null,
      briefingReadAvailable: true,
      runtimeEnvironment: "production",
      databaseConnectionConfigured: true,
    });
    const html = renderToStaticMarkup(<OperationsReadiness overview={overview} />);
    expect(html).toContain("Production readiness evidence");
    expect(html).toContain("org-aged-leaf-21920027");
    expect(html).toContain("old-boat-18584731");
    expect(html).toContain("Target identity status: Not verified");
    expect(html).toContain("Server-side database setting presence only");
    expect(html).toContain("Review secret configuration through the approved release process");
    expect(html).toContain("Backup or restore point availability");
    expect(html).toContain("Restore verification");
    expect(html).toContain("Recovery sequence");
    expect(html).toContain("No production recovery actions are available here");
    expect(html).not.toMatch(/<button|<form/);
    expect(html).not.toMatch(/postgres(?:ql)?:\/\//i);
  });
});
