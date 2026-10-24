import { describe, expect, test } from "bun:test";
import { approvalTransitions, canTransitionApproval, createDocumentService, documentCapabilities } from "@/lib/document-approval";

const headers = new Headers({ "x-user-id": "forged", "x-role": "owner", "x-tenant-id": "other" });
const noDatabase = { connect: async () => { throw new Error("Database must not be reached"); } };

describe("document boundary", () => {
  test("all customer capabilities are immutable and disabled", async () => {
    expect(Object.isFrozen(documentCapabilities)).toBe(true);
    expect(Object.values(documentCapabilities).every(value => value === false)).toBe(true);
    const service = createDocumentService(noDatabase);
    await expect(service.customerDecision()).rejects.toThrow("access denied");
    await expect(service.customerHistory(headers, "p", crypto.randomUUID())).rejects.toThrow("access denied");
  });
  test("forged request headers and invalid verified actors never reach database", async () => {
    for (const session of [null, { user: { id: "" } }, { user: { id: " forged " } }, { user: { id: "x".repeat(256) } }]) {
      const service = createDocumentService(noDatabase, async () => session);
      await expect(service.createDocument(headers, "p", { documentType: "document", displayName: "Test" })).rejects.toThrow("access denied");
      await expect(service.history(headers, "p", crypto.randomUUID())).rejects.toThrow("access denied");
    }
  });
  test("actor, scope authority, file bytes and arbitrary metadata are not accepted as inputs", async () => {
    const service = createDocumentService(noDatabase, async () => null);
    for (const extra of [{ actorId: "forged" }, { tenantId: "other" }, { role: "owner" }, { file: "bytes" }, { metadata: { secret: "forged" } }]) {
      await expect(service.createDocument(headers, "p", { documentType: "document", displayName: "Test", ...extra })).rejects.toThrow();
    }
  });
  test("terminal decisions cannot transition and drafts cannot skip review", () => {
    for (const from of Object.keys(approvalTransitions) as Array<keyof typeof approvalTransitions>) {
      expect(canTransitionApproval(from, from)).toBe(false);
    }
    for (const from of ["approved", "changes_requested", "cancelled", "superseded"] as const) {
      for (const to of Object.keys(approvalTransitions) as Array<keyof typeof approvalTransitions>) expect(canTransitionApproval(from, to)).toBe(false);
    }
    expect(canTransitionApproval("draft", "approved")).toBe(false);
    expect(canTransitionApproval("draft", "pending")).toBe(true);
    expect(canTransitionApproval("pending", "approved")).toBe(true);
  });
});
