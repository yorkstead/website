import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientProjectPreview, ClientProjectState } from "@/components/customer-portal/client-project-preview";
import { clientProjectDemo } from "@/lib/client-project-demo";
import { assembleClientProjectProjection, prepareSourceContent, safePublication, toCustomerPortalView } from "@/lib/client-project-projection";
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
