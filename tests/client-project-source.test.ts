import { expect, test } from "bun:test";
import { parsePublicationWorkspace } from "@/lib/client-project-source";
import { prepareSourceContent } from "@/lib/client-project-projection";

const note = (id: string, createdAt?: unknown) => ({ id, projectId: "project", type: "Update", content: `Fictional update ${id}`, ...(createdAt === undefined ? {} : { createdAt }) });
const source = (notes: unknown[]) => ({ projects: [{ id: "project", name: "Fictional project" }], tasks: [], activity: [], notes });
test("publication source retains valid dates and offsets but excludes invalid or missing timestamps without clock repair", () => {
  const parsed = parsePublicationWorkspace(source([note("date", "2026-10-01"), note("zone", "2026-10-02T09:30:00-06:00"), note("invalid", "not-a-date"), note("missing"), note("calendar", "2026-02-30")]));
  expect(parsed.workspace!.notes!.map(n => [n.id, n.createdAt])).toEqual([["date", "2026-10-01"], ["zone", "2026-10-02T09:30:00-06:00"]]);
  expect(parsed.excludedUpdates.map(n => n.sourceId)).toEqual(["invalid", "missing", "calendar"]);
  expect(prepareSourceContent(parsed.workspace!, "project", "update", "date")).toMatchObject({ createdAt: "2026-10-01T00:00:00.000Z" });
  expect(prepareSourceContent(parsed.workspace!, "project", "update", "zone")).toMatchObject({ createdAt: "2026-10-02T09:30:00-06:00" });
  expect(prepareSourceContent(parsed.workspace!, "project", "update", "invalid")).toBeNull();
});
test("first-ID-wins source selection cannot use a valid duplicate to repair an invalid earlier note", () => {
  const parsed = parsePublicationWorkspace(source([note("duplicate", "invalid"), note("duplicate", "2026-10-01T12:00:00Z")]));
  expect(parsed.workspace!.notes).toEqual([]);
  expect(parsed.excludedUpdates.map(n => n.sourceId)).toEqual(["duplicate"]);
  expect(parsePublicationWorkspace(null)).toEqual({ workspace: null, excludedUpdates: [] });
});
