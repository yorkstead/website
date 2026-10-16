import { describe, expect, test } from "bun:test";
import { generateSystemFormTargets, systemFormSequence } from "./system-form";

describe("SystemForm geometry", () => {
  test("uses the approved reversible form sequence", () => {
    expect(systemFormSequence).toEqual(["core", "architecture", "disorder", "flow", "structure", "network", "core"]);
  });

  test("generates a stable, finite population for every form", () => {
    const first = generateSystemFormTargets(84);
    const second = generateSystemFormTargets(84);

    expect(second).toEqual(first);
    for (const particles of Object.values(first)) {
      expect(particles).toHaveLength(84);
      for (const particle of particles) {
        expect([...particle.position, ...particle.tangent, ...particle.spread, particle.phase, particle.length].every(Number.isFinite)).toBe(true);
        expect(particle.length).toBeGreaterThan(0);
      }
    }
  });

  test("rejects invalid particle counts", () => {
    expect(() => generateSystemFormTargets(0)).toThrow(RangeError);
    expect(() => generateSystemFormTargets(2.5)).toThrow(RangeError);
  });
});
