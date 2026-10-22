import { describe, expect, test } from "bun:test";
import { clientDeliverySchema, parseClientDelivery } from "@/lib/client-delivery";
import { readVersionedWorkspace, saveVersionedWorkspace } from "@/lib/versioned-workspace-client";
import { normalizeWorkspace } from "@/lib/workspace-validation";

const delivery = {
  deliverables: [{ id: "scope-1", title: "Storefront", description: "Approved catalog experience", status: "in_progress" as const }],
  milestones: [{ id: "milestone-1", title: "Client review", targetDate: "2026-12-04", acceptanceCriteria: "Written acceptance", status: "planned" as const }],
  decisions: [{ id: "decision-1", title: "Approve navigation", status: "pending" as const }],
  links: [{ id: "link-1", title: "Signed scope", kind: "contract" as const, url: "https://example.com/scope" }],
  payment: { status: "invoiced" as const, reference: "INV-100", updatedAt: "2026-10-22T18:00:00.000Z" },
  activity: [{ id: "activity-1", message: "Delivery workspace created", createdAt: "2026-10-22T18:00:00.000Z" }],
};

describe("client delivery schema", () => {
  test("keeps existing projects compatible when delivery is absent", () => {
    const workspace = normalizeWorkspace({
      projects: [{ id: "legacy", name: "Legacy project" }],
      tasks: [],
      activity: [],
    });
    expect(workspace.projects[0]?.name).toBe("Legacy project");
    expect(workspace.projects[0]?.delivery).toBeUndefined();
  });

  test("survives workspace serialization and reload", () => {
    const workspace = normalizeWorkspace({
      projects: [{ id: "p1", name: "Client project", delivery }],
      tasks: [],
      activity: [],
    });
    const reloaded = normalizeWorkspace(JSON.parse(JSON.stringify(workspace)));
    expect(reloaded.projects[0]?.delivery).toEqual(delivery);
  });

  test("allows only HTTPS links and strips fields outside the payment contract", () => {
    expect(parseClientDelivery({ ...delivery, links: [{ ...delivery.links[0], url: "http://example.com" }] })).toBeUndefined();
    const parsed = clientDeliverySchema.parse({
      ...delivery,
      payment: { ...delivery.payment, cardNumber: "never-store-this" },
    });
    expect(parsed.payment).toEqual(delivery.payment);
    expect(parsed.payment).not.toHaveProperty("cardNumber");
  });

  test("preserves delivery data through an explicit workspace version conflict", async () => {
    const original = normalizeWorkspace({ projects: [{ id: "p1", name: "Client project" }], tasks: [], activity: [] });
    const edited = normalizeWorkspace({ projects: [{ id: "p1", name: "Client project", delivery }], tasks: [], activity: [] });
    let cloud = original;
    let version = "v1";
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") return Response.json({ workspace: cloud, updatedAt: version });
      if (new Headers(init.headers).get("x-workspace-version") !== version) return Response.json({ error: "conflict" }, { status: 409 });
      cloud = JSON.parse(String(init.body));
      version = "v2";
      return Response.json({ updatedAt: version });
    };
    expect(await saveVersionedWorkspace("/workspace", original, "stale", fetcher)).toEqual({ status: "conflict" });
    expect(await saveVersionedWorkspace("/workspace", edited, "v1", fetcher)).toEqual({ status: "saved", updatedAt: "v2" });
    const read = await readVersionedWorkspace("/workspace", (value) => normalizeWorkspace(value), fetcher);
    expect(read.status).toBe("loaded");
    if (read.status === "loaded") expect(read.workspace?.projects[0]?.delivery).toEqual(delivery);
  });
});
