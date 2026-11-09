import { describe, expect, test } from "bun:test";
import { founder, founderExperience, founderProfileStructuredData, founderStructuredData, organizationId, personId, personPageUrl, profilePageId } from "@/lib/founder";

describe("public founder profile", () => {
  test("uses the approved founder identity and verified experience areas", () => {
    expect(founder.name).toBe("Brandon York");
    expect(founderExperience).toEqual([
      "Manufacturing and production management",
      "CNC operation and digital fabrication",
      "Exterior architectural panel production",
      "Inventory, shipping, packaging, and shop-floor workflows",
      "Operational metrics and process improvement",
      "Custom software, web applications, and automation",
      "Translating real production problems into usable systems",
    ]);
  });

  test("documents the expected portrait without claiming a placeholder is Brandon", () => {
    expect(founder.portrait.publicPath).toBe("/media/founder/brandon-york.jpg");
    expect(founder.portrait.aspectRatio).toBe("4:5");
    expect([founder.portrait.sourceWidth, founder.portrait.sourceHeight]).toEqual([853, 1280]);
  });

  test("connects Person and Organization structured data without invented credentials", () => {
    const [person, organization] = founderStructuredData["@graph"];
    expect(person["@type"]).toBe("Person");
    expect(person.name).toBe("Brandon York");
    expect(person.image).toBe("https://www.yorkstead.com/media/founder/brandon-york.jpg");
    expect(organization["@type"]).toBe("Organization");
    expect(organization.founder["@id"]).toBe(person["@id"]);
    expect(JSON.stringify(founderStructuredData)).not.toMatch(/employer|award|alumniOf|credential/i);
    expect(person["@id"]).toBe(personId);
    expect(personId).toBe("https://www.yorkstead.com/brandon-york#person");
    expect(organizationId).toBe("https://www.yorkstead.com/#organization");
    expect(person.url).toBe(personPageUrl);
    expect(person.jobTitle).toBe("Founder & Systems Architect");
    expect(person.worksFor["@id"]).toBe(organizationId);
    expect(organization["@id"]).toBe(organizationId);
    const [profilePage, profilePerson, profileOrganization] = founderProfileStructuredData["@graph"];
    expect(profilePage["@id"]).toBe(profilePageId);
    expect(profilePage.mainEntity["@id"]).toBe(personId);
    expect(profilePerson["@id"]).toBe(personId);
    expect(profileOrganization["@id"]).toBe(organizationId);
    expect(JSON.stringify(founderProfileStructuredData)).not.toContain("/about#brandon-york");

  });
});
