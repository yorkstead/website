import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ellwoodWalkthroughSteps } from "@/lib/ellwood-walkthrough";
import { getCaseStudy } from "@/lib/case-studies";

test("every Ellwood walkthrough step has a real screen, alt text and a matching case-study link", () => {
  const ids = ellwoodWalkthroughSteps.map((step) => step.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const step of ellwoodWalkthroughSteps) {
    expect(existsSync(join(process.cwd(), "public", step.image.src))).toBeTrue();
    expect(step.image.alt.length).toBeGreaterThan(20);
  }
  const study = getCaseStudy("ellwood-flow")!;
  const hrefs = study.workflowStory!.scenarios.map((scenario) => scenario.href);
  expect(hrefs).toHaveLength(ids.length);
  for (const href of hrefs) expect(ids).toContain(href!.replace("/demos/ellwood#", ""));
  expect(study.paths.map((path) => path.href)).toContain("/demos/ellwood");
});
