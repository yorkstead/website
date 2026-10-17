import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

describe("Command Center dialog mounting", () => {
  test("does not isolate the dashboard behind an empty sync-conflict dialog", () => {
    const source = readFileSync(new URL("../dashboard.tsx", import.meta.url), "utf8");

    expect(source).toContain('{conflict && <DialogBoundary label="Sync conflict resolution"');
    expect(source).not.toContain('<DialogBoundary label="Sync conflict resolution" onClose={() => setConflict(null)}>{conflict &&');
  });
});
