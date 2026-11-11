import { describe, expect, test } from "bun:test";
import { preserveLinkedIdentity, type ConsultationInput } from "@/lib/consultation-model";

function input(overrides: Partial<ConsultationInput> = {}): ConsultationInput {
  return {
    leadId: 42,
    serviceSlug: "workflow-automation",
    clientName: "Edited Name",
    business: "Edited Co",
    email: "edited@example.test",
    consultationDate: "2026-11-11",
    status: "discovery",
    responses: { trigger: "edited" },
    ...overrides,
  };
}

const storedLinked = {
  leadId: 42,
  clientName: "Meeting Name",
  business: "Meeting Co",
  email: "meeting@example.test",
};

describe("consultation identity snapshot (CC-028 T103)", () => {
  test("linked consultations keep the recorded identity and link when the request edits them", () => {
    const merged = preserveLinkedIdentity(storedLinked, input());

    expect(merged.clientName).toBe("Meeting Name");
    expect(merged.business).toBe("Meeting Co");
    expect(merged.email).toBe("meeting@example.test");
    expect(merged.leadId).toBe(42);
  });

  test("linked consultations still accept non-identity edits", () => {
    const merged = preserveLinkedIdentity(storedLinked, input({ status: "scoped", consultationDate: "2026-12-01", responses: { trigger: "later" } }));

    expect(merged.status).toBe("scoped");
    expect(merged.consultationDate).toBe("2026-12-01");
    expect(merged.responses).toEqual({ trigger: "later" });
  });

  test("a linked consultation cannot be repointed at a different CRM lead", () => {
    const merged = preserveLinkedIdentity(storedLinked, input({ leadId: 99 }));

    expect(merged.leadId).toBe(42);
  });

  test("unlinked consultations keep existing editable identity behavior", () => {
    const merged = preserveLinkedIdentity({ ...storedLinked, leadId: null }, input({ leadId: null }));

    expect(merged.clientName).toBe("Edited Name");
    expect(merged.business).toBe("Edited Co");
    expect(merged.email).toBe("edited@example.test");
    expect(merged.leadId).toBeNull();
  });
});
