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
    "Start a 14-Day Trial",
    "Launch Restaurant Demo",
    "See How It Works",
    "Architecture & Hardware",
  ]);
  expect(tableOs.paths[0].href).toBe("/work/table-os#trial-intake");
  expect(tableOs.paths[1].href).toBe("https://240.yorkstead.com");
  expect(tableOs.paths[2].href).toBe("/work/table-os#workflow");
  expect(tableOs.paths[3].href).toBe("/work/table-os#architecture");
  expect(tableOs.cta.href).toBe("/workflow-audit#audit-intake");
  expect(tableOs.capabilities.length).toBeGreaterThanOrEqual(8);
  expect(tableOs.capabilities.some((c) => c.includes("commercial hardware"))).toBeTrue();
  expect(tableOs.capabilities.some((c) => c.includes("offline"))).toBeTrue();
  expect(tableOs.limitations).toContain("240 Union");
  expect(tableOs.outcomeLabel).toBe("Intended outcome");
  expect(tableOs.outcome).toContain("5.42 to 6.08 months");
  expect(JSON.stringify(getCaseStudyStructuredData(tableOs))).toContain("table-os");
  expect(new Set(caseStudies.map((entry) => entry.slug)).size).toBe(caseStudies.length);
});

test("Restaurant 14-Day Trial intake validates required restaurant qualification fields", async () => {
  const { validateRestaurantTrial, restaurantTrialPayload } = await import("@/lib/restaurant-trial-intake");

  const emptyPayload = restaurantTrialPayload({});
  const initialErrors = validateRestaurantTrial(emptyPayload);
  expect(initialErrors.restaurantName).toBeDefined();
  expect(initialErrors.contactName).toBeDefined();
  expect(initialErrors.email).toBeDefined();
  expect(initialErrors.cityState).toBeDefined();

  const validPayload = restaurantTrialPayload({
    restaurantName: "Union Cellar & Hearth",
    contactName: "Michael Thorne",
    email: "gm@unioncellar.com",
    phone: "(303) 555-0192",
    cityState: "Lakewood, CO",
    approximateSeats: "101–200 seats",
    posTerminals: "3–4 terminals",
    currentPos: "Toast",
    kitchenSetup: "Kitchen Display Screens (KDS)",
    hasPrivateDining: "Yes",
    biggestPainPoint: "Dinner rush coursing screen lag and 8-way split checks",
    preferredTiming: "Immediate (within 2 weeks)",
    notes: "Need 2 bar terminals, 2 dining room terminals, 1 expo KDS",
  });
  const validErrors = validateRestaurantTrial(validPayload);
  expect(Object.keys(validErrors)).toHaveLength(0);

  const { restaurantTrialIntake } = await import("@/lib/restaurant-trial-intake");
  const intake = restaurantTrialIntake(validPayload);
  expect(intake.restaurantName).toBe("Union Cellar & Hearth");
  expect(intake.contactName).toBe("Michael Thorne");
  expect(intake.offer).toBe("14-day-on-site-trial");
  expect(intake.approximateSeats).toBe("101–200 seats");
  expect(intake.posTerminals).toBe("3–4 terminals");
  expect(intake.currentPos).toBe("Toast");
  expect(intake.kitchenSetup).toBe("Kitchen Display Screens (KDS)");
  expect(intake.hasPrivateDining).toBe("Yes");
  expect(intake.submittedAt).toBeDefined();
});

