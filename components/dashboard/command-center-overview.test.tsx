import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandCenterOverview } from "@/components/dashboard/command-center-overview";

const baseProps = {
  crm: null,
  crmUnavailable: false,
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
};

describe("Command Center Overview states", () => {
  test("shows clear empty states without adding activity", () => {
    const html = renderToStaticMarkup(createElement(CommandCenterOverview, baseProps));
    expect(html).toContain("You’re clear for now");
    expect(html).toContain("No saved activity yet.");
    expect(html).toContain("No open inquiries in the pipeline.");
    expect(html).not.toContain("Activity appears as you work");
  });

  test("keeps CRM and pipeline errors distinct from an empty pipeline", () => {
    const html = renderToStaticMarkup(createElement(CommandCenterOverview, { ...baseProps, crmUnavailable: true }));
    expect(html).toContain("CRM actions are unavailable");
    expect(html).toContain("Pipeline data is unavailable right now.");
    expect(html).not.toContain("No open inquiries in the pipeline.");
  });
});
