import { expect, test } from "bun:test";
import { stateAtStep } from "./scenarios/use-demo-controller";
import { getAllDemoModules, getDemoModuleBySlug } from "./scenarios/demo-registry";

test("scenario registry exposes modules with ordered walkthrough steps", () => {
  const modules = getAllDemoModules();
  expect(modules.length).toBeGreaterThanOrEqual(3);
  for (const mod of modules) {
    expect(mod.walkthroughSteps.length).toBeGreaterThan(1);
    expect(getDemoModuleBySlug(mod.slug)).toBe(mod);
  }
});

test("stepping back restores the earlier step's state and step 1 is applied up front", () => {
  const mfg = getDemoModuleBySlug("drawing-revision-barrier")!;
  expect(stateAtStep(mfg, 0).machineStatus).toBe("VERIFYING_REVISION");
  expect(stateAtStep(mfg, 1).interlockActive).toBe(true);
  expect(stateAtStep(mfg, 0).interlockActive).toBe(false);
  expect(stateAtStep(mfg, 0).scannedTravelerRev).toBe("Rev_C");
  const rest = getDemoModuleBySlug("kitchen-86-pos-sync")!;
  expect(stateAtStep(rest, 1).portionsRemaining).toBe(0);
});
