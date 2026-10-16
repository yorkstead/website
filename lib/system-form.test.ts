import { describe, expect, test } from "bun:test";
import {
  generateSystemFormTargets,
  generateTypeScriptFragmentTargets,
  systemFormSequence,
  systemFormSubjects,
  typescriptFragments,
} from "./system-form";

describe("SystemForm geometry", () => {
  test("uses the approved reversible form sequence", () => {
    expect(systemFormSequence).toEqual([
      "core",
      "architecture",
      "core",
      "flow",
      "core",
      "network",
      "core",
      "disorder",
      "core",
      "structure",
      "core",
      "core",
    ]);
  });

  test("maps scroll states to recognizable operational drawings", () => {
    expect(systemFormSubjects).toEqual({
      architecture: "shop-drawing",
      disorder: "clipboard",
      flow: "shopfloor-layout",
      structure: "assembly-drawing",
      network: "pos-terminal",
    });
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

  test("uses readable TypeScript fragments with stable targets", () => {
    expect(typescriptFragments.some((fragment) => fragment.includes("interface Workflow"))).toBe(true);
    expect(typescriptFragments.some((fragment) => fragment.includes("await step.execute()"))).toBe(true);

    const first = generateTypeScriptFragmentTargets();
    const second = generateTypeScriptFragmentTargets();
    expect(second).toEqual(first);
    for (const fragments of Object.values(first)) {
      expect(fragments).toHaveLength(typescriptFragments.length);
      for (const fragment of fragments) {
        expect([...fragment.position, ...fragment.spread].every(Number.isFinite)).toBe(true);
      }
    }
  });
});
