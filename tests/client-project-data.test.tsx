import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientProjectPreview, ClientProjectState } from "@/components/customer-portal/client-project-preview";
import { clientProjectDemo } from "@/lib/client-project-demo";
import { assembleClientProjectProjection, prepareSourceContent, safePublication, toCustomerPortalView, type VisiblePublication } from "@/lib/client-project-projection";
import { clientProjectCapabilities, createClientProjectReader, getClientProjectProjection } from "@/lib/client-project-data";
import type { Pool } from "pg";
import type { Workspace } from "@/lib/workspace";

test("strict customer schema rejects internal and administrative fields", () => {
  expect(safePublication.safeParse({ ...clientProjectDemo.overview, note: "private" }).success).toBe(false);
  expect(assembleClientProjectProjection("x", [{ kind: "project", source_id: "x", payload: { kind: "project", note: "private" } }])).toBeNull();
  expect(assembleClientProjectProjection("x", [])).toBeNull();
  expect(prepareSourceContent({ projects: [], tasks: [], activity: [] } as Workspace, "missing", "project", "missing")).toBeNull();
  expect(JSON.stringify(toCustomerPortalView(clientProjectDemo))).not.toContain("PRIVATE SENTINEL");
});

test("fictional source projection renders existing contract and safe states without fallback", () => {
  const html = renderToStaticMarkup(<ClientProjectPreview />);
  for (const label of ["Fictional delivery integration", "Fictional delivery review", "Fictional workflow", "Project update", "Nov 15", "Customer access remains disabled"]) expect(html).toContain(label);
  expect(html).not.toContain("PRIVATE SENTINEL");
  expect(html).not.toContain("Northline Workshop");
  expect(html.match(/id="portal-content"/g)).toHaveLength(1);
  for (const state of ["loading", "empty", "unavailable", "revoked"] as const) {
    const output = renderToStaticMarkup(<ClientProjectState state={state} />);
    expect(output).toContain('role="status"');
    expect(output).not.toContain("Fictional delivery integration");
  }
});

test("production service denies before provider/database access and bad sessions fail closed", async () => {
  let queries = 0;
  const database = { query: async () => { queries++; return { rows: [] }; } } as unknown as Pick<Pool, "query">;
  expect(clientProjectCapabilities.customerRead).toBe(false);
  expect(await getClientProjectProjection(database, new Headers(), "project")).toBeNull();
  for (const session of [null, { user: { id: " spaced " }, session: { expiresAt: new Date(Date.now()+60_000) } }, { user: { id: "subject" }, session: { expiresAt: "invalid" } }, { user: { id: "subject" }, session: { expiresAt: new Date(0) } }]) {
    expect(await createClientProjectReader(database, async () => session)(new Headers(), "project")).toBeNull();
  }
  expect(queries).toBe(0);
});


test("multiple published updates are chronological regardless of source ID or input order", () => {
  const rows: VisiblePublication[] = [
    { kind: "project", source_id: "project", payload: clientProjectDemo.overview },
    { kind: "update", source_id: "a-newest", payload: { kind: "update", detail: "Latest", createdAt: "2026-10-03T12:00:00Z" } },
    { kind: "update", source_id: "z-oldest", payload: { kind: "update", detail: "First", createdAt: "2026-10-01T12:00:00Z" } },
    // The offset represents an instant before Latest, despite its larger local hour.
    { kind: "update", source_id: "m-middle", payload: { kind: "update", detail: "Middle", createdAt: "2026-10-03T13:00:00+02:00" } },
  ];
  const before = JSON.stringify(rows);
  for (const input of [rows, [...rows].reverse()]) {
    const projection = assembleClientProjectProjection("project", input)!;
    expect(projection.updates.map(u => u.id)).toEqual(["z-oldest", "m-middle", "a-newest"]);
    expect(toCustomerPortalView(projection).activity.map(u => u.detail)).toEqual(["First", "Middle", "Latest"]);
  }
  expect(JSON.stringify(rows)).toBe(before);
});

test("equal update instants use source ID as a deterministic, locale-independent tiebreaker", () => {
  const overview: VisiblePublication = { kind: "project", source_id: "project", payload: clientProjectDemo.overview };
  const updates: VisiblePublication[] = [
    { kind: "update", source_id: "z-tied", payload: { kind: "update", detail: "Z", createdAt: "2026-10-01T12:00:00Z" } },
    { kind: "update", source_id: "a-tied", payload: { kind: "update", detail: "A", createdAt: "2026-10-01T12:00:00Z" } },
    { kind: "update", source_id: "m-tied", payload: { kind: "update", detail: "M", createdAt: "2026-10-01T14:00:00+02:00" } },
  ];
  for (const input of [updates, [...updates].reverse(), [updates[1], updates[0], updates[2]]]) {
    const projection = assembleClientProjectProjection("project", [overview, ...input])!;
    expect(projection.updates.map(u => u.id)).toEqual(["a-tied", "m-tied", "z-tied"]);
    expect(toCustomerPortalView(projection).activity.map(u => u.id)).toEqual(["a-tied", "m-tied", "z-tied"]);
  }
});
