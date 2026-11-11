import { describe, expect, test } from "bun:test";
import { companyKey, findOverlapCandidates, parseOverlapQuery, type OverlapRecord } from "@/lib/overlap-review";

const record = (source: OverlapRecord["source"], id: string, company: string, email = ""): OverlapRecord => ({ source, id, company, email, href: "/dashboard", crmLeadId: null });

describe("bounded overlap review", () => {
  test("rejects short, long and non-string searches", () => {
    expect(parseOverlapQuery("ab")).toBeNull();
    expect(parseOverlapQuery("x".repeat(81))).toBeNull();
    expect(parseOverlapQuery(["acme"])).toBeNull();
    expect(parseOverlapQuery("  Acme   Labs  ")).toBe("Acme Labs");
  });

  test("does not turn substring, generic names, or one-source duplicates into candidates", () => {
    expect(companyKey("test")).toBeNull();
    expect(findOverlapCandidates([
      record("Marketing", "a", "Acme Labs"), record("Discovery", "b", "Acme Laboratory"),
      record("CRM", "c", "Unknown"), record("Marketing", "d", "Unknown"),
      record("Marketing", "e", "Beacon Works"), record("Marketing", "f", "Beacon Works"),
    ])).toEqual([]);
  });

  test("labels company-only matches as weak even when contacts differ", () => {
    const candidates = findOverlapCandidates([record("Marketing", "a", "Acme Labs", "first@example.test"), record("CRM", "2", "ACME-LABS", "other@example.test")]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.signal).toBe("company only");
  });

  test("recognizes exact email and company across sources without changing records", () => {
    const inputs = Object.freeze([Object.freeze(record("Marketing", "a", "Acme Labs", "A@example.test")), Object.freeze(record("CRM", "2", "Acme Labs", "a@example.test"))]);
    expect(findOverlapCandidates([...inputs])[0]?.signal).toBe("email");
    expect(inputs[0].email).toBe("A@example.test");
    expect(inputs[0].crmLeadId).toBeNull();
  });

  test("limits candidate evaluation and output", () => {
    const many = Array.from({ length: 60 }, (_, i) => [record("Marketing", String(i), `Company ${i} Works`), record("CRM", String(i), `Company ${i} Works`)]).flat();
    expect(findOverlapCandidates(many).length).toBeLessThanOrEqual(50);
  });
});
