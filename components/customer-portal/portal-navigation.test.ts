import { describe, expect, test } from "bun:test";
import { firstVisiblePortalSection } from "@/components/customer-portal/portal-navigation";

describe("customer portal section navigation", () => {
  test("selects the first visible section from the top of the viewport", () => {
    expect(firstVisiblePortalSection([
      { isIntersecting: true, target: { id: "updates" }, boundingClientRect: { top: 320 } },
      { isIntersecting: false, target: { id: "timeline" }, boundingClientRect: { top: 60 } },
      { isIntersecting: true, target: { id: "deliverables" }, boundingClientRect: { top: 180 } },
    ])).toBe("deliverables");
  });

  test("leaves the server-rendered Overview default when no section intersects", () => {
    expect(firstVisiblePortalSection([
      { isIntersecting: false, target: { id: "timeline" }, boundingClientRect: { top: 60 } },
    ])).toBeUndefined();
  });
});
