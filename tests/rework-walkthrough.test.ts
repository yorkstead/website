import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { reworkWalkthroughSteps } from "@/lib/rework-walkthrough";
import { getCaseStudy } from "@/lib/case-studies";

test("every walkthrough step has a real screen, alt text and a matching case-study link", () => {
  const ids = reworkWalkthroughSteps.map((step) => step.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const step of reworkWalkthroughSteps) {
    expect(existsSync(join(process.cwd(), "public", step.image.src))).toBeTrue();
    expect(step.image.alt.length).toBeGreaterThan(20);
  }
  const hrefs = getCaseStudy("rework-flow")!.workflowStory!.scenarios.map((scenario) => scenario.href);
  for (const href of hrefs) expect(ids).toContain(href!.replace("/demos/rework#", ""));
});
