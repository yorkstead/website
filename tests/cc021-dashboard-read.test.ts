import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("ordinary Dashboard rendering uses one owner-gated CC-021 read and no briefing request", async () => {
  const [page, adapter, attention] = await Promise.all([
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/dashboard-google-operations.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/dashboard/unified-attention-view.tsx", import.meta.url), "utf8"),
  ]);
  expect(page.match(/getAutomationHubData\(/g)).toHaveLength(1);
  expect(page.indexOf("if (!session) redirect")).toBeLessThan(page.indexOf("getAutomationHubData()"));
  expect(page).not.toContain("/api/briefing");
  expect(adapter).not.toContain("fetch(");
  expect(adapter).not.toContain("/api/briefing");
  expect(attention).not.toContain("fetch(");
  expect(attention).not.toContain("/api/dashboard/automation-hub");
});
