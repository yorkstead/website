import { expect, test } from "bun:test";
import { caseStudies, getCaseStudy, getCaseStudyStructuredData } from "@/lib/case-studies";

test("TableOS profile is placed directly under Rework Flow with discoverable demo paths and honest evidence boundaries", () => {
  const rework = getCaseStudy("rework-flow")!;
  const tableOs = getCaseStudy("table-os")!;

  expect(caseStudies[0]).toBe(rework);
  expect(caseStudies[1]).toBe(tableOs);
  expect(tableOs.status).toBe("In development");
  expect(tableOs.workflowStory?.handoffs).toHaveLength(4);
  expect(tableOs.workflowStory?.scenarios).toHaveLength(6);
  expect(tableOs.workflowStory?.architecture).toHaveLength(4);
  expect(tableOs.paths.map((path) => path.label)).toEqual([
    "Guided Walkthrough",
    "Open Interactive Sandbox",
    "Architecture & Hardware",
  ]);
  expect(tableOs.paths[0].href).toBe("https://ops.yorkstead.com/restaurant?mode=guided");
  expect(tableOs.paths[1].href).toBe("https://ops.yorkstead.com/restaurant");
  expect(tableOs.paths[2].href).toBe("/work/table-os#architecture");
  expect(tableOs.capabilities.length).toBeGreaterThanOrEqual(8);
  expect(tableOs.capabilities.some((c) => c.includes("$160"))).toBeTrue();
  expect(tableOs.capabilities.some((c) => c.includes("offline"))).toBeTrue();
  expect(tableOs.outcomeLabel).toBe("Intended outcome");
  expect(tableOs.outcome).toContain("5.42 to 6.08 months");
  expect(JSON.stringify(getCaseStudyStructuredData(tableOs))).toContain("table-os");
  expect(new Set(caseStudies.map((entry) => entry.slug)).size).toBe(caseStudies.length);
});
