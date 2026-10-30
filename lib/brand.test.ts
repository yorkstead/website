import { describe, expect, test } from "bun:test";
import manifest from "@/app/manifest";
import { brand } from "@/lib/brand";
import { founderStructuredData } from "@/lib/founder";
import { getServiceStructuredData, publicServices } from "@/lib/services";

describe("public brand positioning", () => {
  test("makes the software and automation category explicit", () => {
    expect(brand.descriptor).toBe("Tailored business software and workflow systems");
    expect(brand.positioning.toLowerCase()).toContain("software");
    expect(brand.positioning.toLowerCase()).toContain("automation");
    expect(brand.audienceLine.toLowerCase()).toContain("manufactur");
    expect(brand.socialTitle.startsWith(brand.name)).toBe(true);
  });

  test("keeps the identity clear of cannabis category language", () => {
    const identity = JSON.stringify(brand).toLowerCase();
    for (const term of ["cannabis", "marijuana", "dispensary", "weed", "hemp", "leaf"]) expect(identity).not.toContain(term);
  });

  test("keeps the Command Center install name and public structured data positioning", () => {
    const appManifest = manifest();
    expect(appManifest.name).toBe("Yorkstead Command Center");
    expect(appManifest.short_name).toBe("Yorkstead");
    expect(appManifest.description).toBe(brand.positioning);
    const organization = founderStructuredData["@graph"].find((item) => item["@type"] === "Organization");
    expect(organization?.description).toBe(brand.positioning);
    expect(organization?.email).toBe(brand.email);
    for (const service of publicServices) expect(JSON.stringify(getServiceStructuredData(service))).toContain(brand.name);
  });
});
