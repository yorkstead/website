import { describe, expect, test } from "bun:test";
import {
  firstVisiblePortalSection,
  portalSectionObserverRootMargin,
} from "@/components/customer-portal/portal-navigation";

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

  test("uses viewport-height pixel insets that leave an observation area on desktop and mobile", () => {
    expect(portalSectionObserverRootMargin(900)).toBe("-88px 0px -612px 0px");
    expect(portalSectionObserverRootMargin(844)).toBe("-88px 0px -573px 0px");
    expect(portalSectionObserverRootMargin(600)).toBe("-88px 0px -408px 0px");
    expect(portalSectionObserverRootMargin(120)).toBe("-56px 0px 0px 0px");
  });
});
