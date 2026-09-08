import { describe, expect, it } from "bun:test";
import { caseStudies } from "./case-studies";

describe("Public /work Case Studies Catalog & Review Rules", () => {
  it("defines all six project profiles with complete sections", () => {
    expect(caseStudies.length).toBe(6);

    for (const study of caseStudies) {
      expect(study.title.length).toBeGreaterThan(3);
      expect(study.summary.length).toBeGreaterThan(20);
      expect(study.problem.length).toBeGreaterThan(20);
      expect(study.solution.length).toBeGreaterThan(20);
      expect(study.capabilities.length).toBeGreaterThanOrEqual(3);
      expect(study.technologies.length).toBeGreaterThanOrEqual(3);
      expect(study.outcome.length).toBeGreaterThan(20);
      expect(study.limitations.length).toBeGreaterThan(20);
    }
  });

  it("distinguishes live systems from working prototypes with honest outcome labels", () => {
    const liveSystems = caseStudies.filter((s) => s.status === "Live system");
    const prototypes = caseStudies.filter((s) => s.status === "In development" || s.status === "Concept prototype");

    expect(liveSystems.length).toBe(1);
    expect(prototypes.length).toBe(4);

    for (const live of liveSystems) {
      expect(live.outcomeLabel).toBe("Operational outcome");
    }

    for (const proto of prototypes) {
      expect(proto.outcomeLabel).toBe("Intended outcome");
    }
  });
});
