import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandCenterOverview } from "@/components/dashboard/command-center-overview";

const baseProps = {
  automationHub: { state: "unavailable" as const, checkedAt: "2026-10-29T10:00:00.000Z" },
  crm: null,
  crmUnavailable: false,
  analyticsSnapshot: { sessions: 21, inquiries: 3, previousInquiries: 2, changePercent: 50, lastEventAt: "2026-10-29T10:00:00.000Z" },
  analyticsUnavailable: false,
  projects: [],
  tasks: [],
  googleTasks: [],
  activity: [],
  today: "2026-10-29",
  staleProjectDays: 14,
  ready: true,
  onCompleteTask: () => undefined,
  onOpenTask: () => undefined,
  onCompleteGoogleTask: () => undefined,
  onCreateTask: () => undefined,
  researchActions: [],
  researchUnavailable: false,
  researchTruncated: false,
  intelligence: {},
};

describe("Command Center Overview states", () => {
  test("shows clear empty states without adding activity", () => {
    const html = renderToStaticMarkup(createElement(CommandCenterOverview, baseProps));
    expect(html).toContain('id="focus"');
    expect(html).toContain("Unified attention");
    expect(html).toContain("You’re clear for now");
    expect(html).toContain("No saved activity yet.");
    expect(html).toContain("No open inquiries in the pipeline.");
    expect(html).toContain("Website intelligence · 7 days");
    expect(html).toContain("3 linked stored inquiries");
    expect(html).toContain("/dashboard/analytics?days=7");
    expect(html).not.toContain("Activity appears as you work");
  });

  test("keeps CRM and pipeline errors distinct from an empty pipeline", () => {
    const html = renderToStaticMarkup(createElement(CommandCenterOverview, { ...baseProps, crmUnavailable: true }));
    expect(html).toContain("CRM actions are unavailable");
    expect(html).toContain("Pipeline data is unavailable right now.");
    expect(html).not.toContain("No open inquiries in the pipeline.");
  });

  test("shows unavailable source states distinctly in unified attention", () => {
    const html = renderToStaticMarkup(createElement(CommandCenterOverview, { ...baseProps, crmUnavailable: true, researchUnavailable: true }));
    expect(html).toContain("Website CRM");
    expect(html).toContain("Opportunity Discovery");
    expect(html).toContain("One or more sources are unavailable");
    expect(html).toContain("this is not an empty queue");
  });
});
