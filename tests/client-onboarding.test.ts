import { describe, expect, test } from "bun:test";
import { createClientOnboardingService, createInvitationToken, invitationVerifier } from "@/lib/client-onboarding";
import { customerPortalCapabilities } from "@/lib/customer-portal-authorization";
import { documentCapabilities } from "@/lib/document-approval";

const headers = new Headers({ "x-user-id": "forged", "x-role": "owner", "x-tenant-id": "forged" });
const database = { connect: async () => { throw new Error("Database must not be reached"); } };
const value = { tenantId: "fictional", recipientEmail: "fictional@example.test", projectIds: ["fictional-project"] };

describe("invitation boundary", () => {
  test("tokens have 256-bit entropy, canonical opaque format and nonreversible fixed-size verifiers", () => {
    const tokens = Array.from({ length: 100 }, createInvitationToken);
    expect(new Set(tokens).size).toBe(100);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
      expect(invitationVerifier(token)).toMatch(/^[a-f0-9]{64}$/);
      expect(invitationVerifier(token)).not.toContain(token);
    }
  });
  test("all customer and document capabilities remain frozen and disabled", () => {
    for (const capabilities of [customerPortalCapabilities, documentCapabilities]) {
      expect(Object.isFrozen(capabilities)).toBe(true);
      expect(Object.values(capabilities).every(v => v === false)).toBe(true);
    }
  });
  test("forged headers and malformed verified owner actors fail before database", async () => {
    for (const session of [null, { user: { id: "" } }, { user: { id: " forged " } }, { user: { id: "x".repeat(256) } }]) {
      const service = createClientOnboardingService(database, async () => session);
      await expect(service.issue(headers, value)).rejects.toThrow("access denied");
      await expect(service.inspect(headers, "fictional")).rejects.toThrow("access denied");
      await expect(service.revoke(headers, crypto.randomUUID())).rejects.toThrow("access denied");
    }
  });
  test("caller cannot supply actor, identity, role or invalid project/expiry scope", async () => {
    const service = createClientOnboardingService(database, async () => ({ user: { id: "fictional-owner" } }));
    for (const extra of [{ actorId: "forged" }, { identityId: "forged" }, { role: "admin" }, { projectIds: [] }, { projectIds: ["p", "p"] }, { expiresInSeconds: 604801 }]) {
      await expect(service.issue(headers, { ...value, ...extra })).rejects.toThrow();
    }
  });
  test("missing customer session and malformed tokens fail without leaking tokens or reaching database", async () => {
    const service = createClientOnboardingService(database, undefined, async () => null);
    for (const token of [createInvitationToken(), "bad-secret-token", "x".repeat(10000)]) {
      await expect(service.redeem(headers, token)).rejects.toThrow("Invitation access denied");
    }
  });
});
