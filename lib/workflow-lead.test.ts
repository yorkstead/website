import { describe, expect, test } from "bun:test";
import { processWorkflowLead, validateWorkflowLead, workflowLeadPayload } from "@/lib/workflow-lead";

const valid = {
  name: "Alex Rivera",
  company: "Rivera Fabrication",
  email: "  ALEX@EXAMPLE.COM  ",
  phone: "303-555-0182",
  description: "Our production status lives in three spreadsheets and half the team is still calling to ask what is open.",
  problemAreas: ["Production", "Scheduling", "Reporting"],
  website: "",
  utm_source: "facebook",
  utm_medium: "paid_social",
  utm_campaign: "workflow_sep_2026",
  utm_content: "operational_chaos_01",
  utm_term: "",
};

describe("workflow lead funnel", () => {
  test("normalizes and validates workflow submissions", () => {
    const payload = workflowLeadPayload(new FormData());
    payload.name = valid.name;
    payload.company = valid.company;
    payload.email = valid.email;
    payload.phone = valid.phone;
    payload.description = valid.description;
    payload.problemAreas = valid.problemAreas;
    payload.utm_source = valid.utm_source;
    payload.utm_medium = valid.utm_medium;
    payload.utm_campaign = valid.utm_campaign;
    payload.utm_content = valid.utm_content;
    expect(payload.email).toBe("alex@example.com");
    expect(validateWorkflowLead(payload)).toEqual({});
  });

  test("rejects invalid submissions and missing problem areas", () => {
    const errors = validateWorkflowLead({ ...valid, name: "A", email: "bad", phone: "", description: "short", problemAreas: [] as string[], website: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" });
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.problemAreas).toBeDefined();
  });

  test("covers successful, duplicate, spam, rate-limited, and server-error paths", async () => {
    expect(await processWorkflowLead({ ...valid, email: "alex@example.com", website: "" }, { countRecent: async () => 0, insert: async () => 21 })).toMatchObject({ status: "success", id: 21 });
    expect(await processWorkflowLead({ ...valid, email: "alex@example.com", website: "" }, { countRecent: async () => 0, insert: async () => null })).toEqual({ status: "duplicate" });
    expect(await processWorkflowLead({ ...valid, email: "alex@example.com", website: "bot.example" }, { countRecent: async () => 0, insert: async () => 1 })).toEqual({ status: "spam" });
    expect(await processWorkflowLead({ ...valid, email: "alex@example.com", website: "" }, { countRecent: async () => 3, insert: async () => 1 })).toEqual({ status: "rate_limited" });
    expect(await processWorkflowLead({ ...valid, email: "alex@example.com", website: "" }, { countRecent: async () => { throw new Error("offline"); }, insert: async () => 1 })).toEqual({ status: "server_error" });
  });
});
