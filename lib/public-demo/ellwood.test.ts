import { expect, test } from "bun:test";
import { seedRelease, transition, scenarios } from "./ellwood/workflow";

test("revision approval requires review and preserves an obsolete-identifier boundary", () => {
  let release = seedRelease();
  expect(transition(release, "approve").ok).toBe(false);
  expect(transition(release, "handoff").ok).toBe(false);
  expect(transition(release, "scan-current").ok).toBe(false);
  release = transition(release, "review").release;
  release = transition(release, "approve").release;
  expect(release.current).toBe("B");
  expect(transition(release, "scan-old").message).toContain("superseded");
  expect(transition(release, "scan-old").release).toBe(release);
  release = transition(release, "handoff").release;
  expect(transition(release, "scan-current").ok).toBe(true);
  expect(release.history).toHaveLength(4);
  expect(transition(release, "approve").release).toBe(release);
});

test("every scenario can resolve its own gates without changing another session", () => {
  for (const scenario of scenarios) {
    let release = seedRelease(scenario.id);
    const other = seedRelease(scenario.id);
    if (!release.drawing) {
      expect(transition(release, "review").ok).toBe(false);
      release = transition(release, "attach").release;
    }
    if (release.hold) {
      expect(transition(release, "review").ok).toBe(false);
      release = transition(release, "resolve").release;
    }
    release = transition(release, "review").release;
    release = transition(release, "approve").release;
    release = transition(release, "handoff").release;
    expect(release.handedOff).toBe(true);
    expect(other.handedOff).toBe(false);
    expect(seedRelease(scenario.id)).toEqual(other);
  }
  expect(seedRelease("unknown").scenarioId).toBe("revision-change");
});
