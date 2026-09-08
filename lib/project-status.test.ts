import { describe, expect, test } from "bun:test";
import { projectStatusDefinitions } from "@/lib/project-status";

describe("public project statuses", () => {
  test("uses the approved definitions", () => {
    expect(projectStatusDefinitions["Live system"].description).toBe("Currently used to run a real business");
    expect(projectStatusDefinitions["In development"].description).toBe("Being built and refined; may already be online");
    expect(projectStatusDefinitions["Concept prototype"].description).toBe("A working exploration of an idea, not a customer deployment");
    expect(projectStatusDefinitions["Previously used"].description).toBe("Used in a real workplace in the past; not currently in active use");
  });

  test("gives every status a distinct visual treatment", () => {
    const styles = Object.values(projectStatusDefinitions).map((definition) => definition.className);
    expect(new Set(styles).size).toBe(styles.length);
  });
});
