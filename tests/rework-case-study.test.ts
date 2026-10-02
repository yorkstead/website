import { expect, test } from "bun:test";
import { caseStudies, getCaseStudy, getCaseStudyStructuredData } from "@/lib/case-studies";

test("flagship Rework profile has discoverable, consistent demo paths and honest evidence boundaries", () => {
  const study = getCaseStudy("rework-flow")!;
  expect(caseStudies[0]).toBe(study);
  expect(study.status).toBe("In development");
  expect(study.workflowStory?.handoffs).toHaveLength(4);
  expect(study.workflowStory?.scenarios).toHaveLength(6);
  expect(study.paths.map((path) => path.label)).toEqual(["Walkthrough", "Open the live app", "Architecture"]);
  expect(study.paths[0].href).toBe("/demos/rework");
  expect(study.paths[1].href).toBe("https://rework.yorkstead.com");
  expect(study.outcome).toContain("have not been measured");
  expect(JSON.stringify(getCaseStudyStructuredData(study))).toContain("rework-flow");
  expect(new Set(caseStudies.map((entry) => entry.slug)).size).toBe(caseStudies.length);
});
