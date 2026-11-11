import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UnifiedAttentionView, describeHubSectionStates, safeGitHubUrl } from "@/components/dashboard/unified-attention-view";
import type { CommandCenterCrmSnapshot } from "@/lib/contact-inquiries";

const crm: CommandCenterCrmSnapshot = {
  stageCounts: { new: 0, contacted: 0, qualified: 0, proposal: 1 }, dueFollowUps: [{ id: 42, name: "Ada Owner", company: "Northstar", projectType: "Workflow", status: "qualified", followUpAt: "2026-11-06T18:00:00.000Z", updatedAt: "2026-11-06T17:00:00.000Z", nextStep: "Review canonical workflow scope" }], stalledOpportunities: [], pendingProposalCount: 0, pipelineValueCents: 0, wonValueCents: 0, conversionRate: null, proposalNextActions: [],
};

const baseProps = { automationHub: { state: "unavailable" as const, checkedAt: "2026-11-07T18:00:00.000Z" }, crm, crmUnavailable: false, crmReadAt: "2026-11-11T18:00:00.000Z", research: { items: [], unavailable: false, truncated: false, readAt: "2026-11-11T18:00:01.000Z" }, projects: [], tasks: [], intelligence: {}, ready: true };

describe("Unified attention", () => {
  test("shows canonical CRM status, due date, and the existing record link", () => {
    const html = renderToStaticMarkup(createElement(UnifiedAttentionView, baseProps));
    expect(html).toContain("Review canonical workflow scope");
    expect(html).toContain("qualified");
    expect(html).toContain("2026-11-06");
    expect(html).toContain("/dashboard/leads?lead=42");
    expect(html).toContain("Website CRM");
  });

  test("identifies research records and links to their authoritative workflow", () => {
    const html = renderToStaticMarkup(createElement(UnifiedAttentionView, { ...baseProps, research: { items: [{ id: "abc-123", business_name: "Northstar", industry: "manufacturing", next_action: "Validate shift handoff", next_action_at: "2026-11-05", research_status: "validated" }], unavailable: false, truncated: false, readAt: null } }));
    expect(html).toContain("Opportunity Discovery");
    expect(html).toContain("validated");
    expect(html).toContain("/dashboard/opportunities?id=abc-123");
  });

  test("distinguishes an available empty CRM queue from a source failure and flags capped reads", () => {
    const emptyHtml = renderToStaticMarkup(createElement(UnifiedAttentionView, { ...baseProps, crm: { ...crm, dueFollowUps: [], stalledOpportunities: [], proposalNextActions: [] } }));
    expect(emptyHtml).toContain("0 action records reported · available, empty");

    const cappedHtml = renderToStaticMarkup(createElement(UnifiedAttentionView, { ...baseProps, research: { items: Array.from({ length: 25 }, (_, index) => ({ id: `research-${index}`, business_name: "Northstar", industry: "Manufacturing", next_action: "Verify process", next_action_at: "2026-11-01", research_status: "validated" })), unavailable: false, truncated: true, readAt: null } }));
    expect(cappedHtml).toContain("At query limit");
    expect(cappedHtml).toContain("The result may be incomplete.");
  });

  test("shows dashboard read times while failed sources remain timestamp-free", () => {
    const html = renderToStaticMarkup(createElement(UnifiedAttentionView, baseProps));
    expect(html).toContain("Read at 2026-11-11T18:00:00.000Z (dashboard source read time)");
    expect(html).toContain("Read at 2026-11-11T18:00:01.000Z (dashboard source read time)");
    const unavailable = renderToStaticMarkup(createElement(UnifiedAttentionView, { ...baseProps, crm: null, crmUnavailable: true, crmReadAt: null, research: { ...baseProps.research, unavailable: true, readAt: null } }));
    expect(unavailable).toContain("CRM summary did not load; this is not an empty queue.");
    expect(unavailable).toContain("Research follow-ups did not load; this is not an empty queue.");
    expect(unavailable).not.toContain("Read at 2026-11-11T18:00");
  });

  test("rejects non-GitHub and non-HTTPS external destinations", () => {
    expect(safeGitHubUrl("https://github.com/yorkstead/website/issues/1")).toBe("https://github.com/yorkstead/website/issues/1");
    expect(safeGitHubUrl("https://attacker.example/yorkstead/website/issues/1")).toBeNull();
    expect(safeGitHubUrl("javascript:alert(1)")).toBeNull();
    expect(safeGitHubUrl("http://github.com/yorkstead/website/issues/1")).toBeNull();
    expect(safeGitHubUrl("https://user@github.com/yorkstead/website/issues/1")).toBeNull();
  });

  test("labels last-known GitHub results with their source freshness timestamp", () => {
    const html = renderToStaticMarkup(createElement(UnifiedAttentionView, {
      ...baseProps,
      projects: [{ id: "project-1", name: "Yorkstead Website", eyebrow: "Software", description: "", status: "Active", kind: "Software", stack: [], repo: "https://github.com/yorkstead/website", updatedAt: "2026-11-06T00:00:00.000Z", updatedLabel: "", note: "", progress: 0, accent: "cyan" }],
      intelligence: { "project-1": { status: "stale", data: { github: { available: true, issues: [{ number: 7, title: "Review attention panel", url: "https://github.com/yorkstead/website/issues/7", updatedAt: "2026-11-06T00:00:00.000Z" }], pullRequests: [] }, vercel: null, integrations: { github: { status: "ok", authenticated: true }, vercel: { status: "not_configured", authenticated: false } }, fetchedAt: "2026-11-06T12:30:00.000Z" } } },
    }));
    expect(html).toContain("Last known data");
    expect(html).toContain("Last checked 2026-11-06T12:30:00.000Z");
    expect(html).toContain("https://github.com/yorkstead/website/issues/7");
  });

  test("distinguishes Hub loading, empty/available, unavailable, and truncated sources", () => {
    expect(describeHubSectionStates(null, false).tone).toBe("loading");
    const sections = {
      tasks: { source: "Google Tasks", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
      reviewQueue: { source: "Automation Hub", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
      captures: { source: "Automation Hub", state: "available", checkedAt: "2026-11-07T18:00:00.000Z", truncated: false, errorCode: null, items: [] },
    };
    const available = { state: "available", checkedAt: "2026-11-07T18:00:00.000Z", data: sections } as unknown as import("@/lib/automation-hub-data").AutomationHubDataResult;
    expect(describeHubSectionStates(available, false).text).toBe("Available");
    expect(describeHubSectionStates({ state: "not_configured", checkedAt: available.checkedAt }, false).tone).toBe("unavailable");
    const truncated = { state: "available", checkedAt: "2026-11-07T18:00:00.000Z", data: { ...sections, tasks: { ...sections.tasks, truncated: true } } } as unknown as import("@/lib/automation-hub-data").AutomationHubDataResult;
    expect(describeHubSectionStates(truncated, false).text).toBe("At query limit");
    expect(describeHubSectionStates(null, true).tone).toBe("unavailable");
  });

  test("keeps attention rows read-only and does not add copy or completion controls", () => {
    const html = renderToStaticMarkup(createElement(UnifiedAttentionView, baseProps));
    expect(html).toContain("Read-only view of source records");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Complete");
    expect(html).not.toContain("Reschedule");
    expect(html).not.toContain("/api/dashboard/automation-hub/actions");
  });
});
