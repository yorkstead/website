import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { barcodesWalkthroughSteps } from "@/lib/barcodes-walkthrough";
import { freightFlowWalkthroughSteps } from "@/lib/freight-flow-walkthrough";
import { leadsRescueWalkthroughSteps } from "@/lib/leads-rescue-walkthrough";
import { sicPizzaWalkthroughSteps } from "@/lib/sic-pizza-walkthrough";

const walkthroughs = {
  barcodes: barcodesWalkthroughSteps,
  "freight-flow": freightFlowWalkthroughSteps,
  "leads-rescue": leadsRescueWalkthroughSteps,
  "sic-pizza": sicPizzaWalkthroughSteps,
};

for (const [slug, steps] of Object.entries(walkthroughs)) {
  test(`${slug} walkthrough steps are unique and each has a real screen and alt text`, () => {
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    for (const step of steps) {
      expect(existsSync(join(process.cwd(), "public", step.image.src))).toBeTrue();
      expect(step.image.src.startsWith(`/media/${slug}/walkthrough/`)).toBeTrue();
      expect(step.image.alt.length).toBeGreaterThan(20);
    }
  });
}
