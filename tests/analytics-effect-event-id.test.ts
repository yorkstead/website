import { describe, expect, test } from "bun:test";
import { createEffectEventIdGenerator } from "@/lib/analytics-effect-event-id";

describe("effect-scoped analytics event ids", () => {
  test("reuses an id when the same mounted view effect is replayed", () => {
    const eventIdForView = createEffectEventIdGenerator();

    const firstEffect = eventIdForView("service_page_view:/services/operations:{\"service\":\"operations\"}");
    const replayedEffect = eventIdForView("service_page_view:/services/operations:{\"service\":\"operations\"}");

    expect(replayedEffect).toBe(firstEffect);
  });

  test("uses a new id for a later visit to the same view and for changed view data", () => {
    const firstVisit = createEffectEventIdGenerator();
    const laterVisit = createEffectEventIdGenerator();
    const viewKey = "case_study_view:/work/project:{\"caseStudy\":\"project\"}";

    expect(laterVisit(viewKey)).not.toBe(firstVisit(viewKey));

    const newView = createEffectEventIdGenerator();
    const originalId = newView(viewKey);
    const otherViewId = newView("case_study_view:/work/another:{\"caseStudy\":\"another\"}");
    expect(otherViewId).not.toBe(originalId);
    expect(newView(viewKey)).not.toBe(originalId);
  });
});
