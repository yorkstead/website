import { expect, test } from "bun:test";
import { getAllDemoModules, getDemoModuleBySlug } from "./scenarios/demo-registry";

test("scenario registry exposes modules with ordered walkthrough steps", () => {
  const modules = getAllDemoModules();
  expect(modules.length).toBeGreaterThanOrEqual(3);
  for (const mod of modules) {
    expect(mod.walkthroughSteps.length).toBeGreaterThan(1);
    expect(getDemoModuleBySlug(mod.slug)).toBe(mod);
  }
});
