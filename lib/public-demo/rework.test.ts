import { describe, expect, test } from "bun:test";
import { getScenario, scenarios } from "@/lib/public-demo/rework/manifest";
import { seedJob, transition, jobTotal, type DemoJob, type Action } from "@/lib/public-demo/rework/workflow";

function apply(job: DemoJob, ...actions: Action[]): DemoJob {
  return actions.reduce((current, action) => {
    const result = transition(current, action);
    expect(result.ok).toBe(true);
    return result.job;
  }, job);
}
function documented(job: DemoJob) {
  return apply(job, { type: "arrive" }, { type: "before" }, { type: "after" }, { type: "sign" });
}

describe("isolated public Rework Flow model", () => {
  test("normal job carries evidence to a calculated invoice and becomes immutable", () => {
    const initial = seedJob("normal");
    const final = apply(documented(initial), { type: "complete" }, { type: "invoice" });
    expect(initial.stage).toBe("Reserved");
    expect(initial.events).toHaveLength(1);
    expect(final.stage).toBe("Billed");
    expect(jobTotal(final)).toBe(384.25);
    expect(transition(final, { type: "quantity", value: 99 }).ok).toBe(false);
    expect(transition(final, { type: "invoice" }).ok).toBe(false);
  });
  test("completion and billing cannot skip arrival, evidence, or signature", () => {
    let job = seedJob("normal");
    for (const type of ["complete", "invoice", "sign", "after"] as const) expect(transition(job, { type }).ok).toBe(false);
    job = apply(job, { type: "arrive" });
    expect(transition(job, { type: "complete" }).message).toContain("evidence");
    job = apply(job, { type: "before" }, { type: "after" });
    expect(transition(job, { type: "complete" }).message).toContain("sign-off");
  });
  test("quantity dispute requires review and edits invalidate stale approval", () => {
    let job = documented(seedJob("quantity-dispute"));
    expect(transition(job, { type: "complete" }).message).toContain("quantity");
    job = apply(job, { type: "review-quantity" }, { type: "quantity", value: 7 });
    expect(job.quantityReviewed).toBe(false); expect(job.after).toBe(false); expect(job.signature).toBe("pending");
    job = apply(job, { type: "review-quantity" }, { type: "after" }, { type: "sign" }, { type: "complete" });
    expect(jobTotal(job)).toBe(439.75);
  });
  test("invalid numeric values do not mutate the job", () => {
    const job = apply(seedJob("normal"), { type: "arrive" });
    for (const value of [NaN, Infinity, -1, 101, 1.5]) {
      const result = transition(job, { type: "quantity", value });
      expect(result.ok).toBe(false); expect(result.job).toBe(job);
    }
  });
  test("arrival damage must be acknowledged after evidence", () => {
    let job = apply(seedJob("damaged-material"), { type: "arrive" });
    expect(transition(job, { type: "review-damage" }).ok).toBe(false);
    job = apply(job, { type: "before" }, { type: "after" }, { type: "sign" });
    expect(transition(job, { type: "complete" }).message).toContain("damage");
    expect(apply(job, { type: "review-damage" }, { type: "complete" }).stage).toBe("Completed");
  });
  test("expired hold cannot arrive until reassigned", () => {
    const job = seedJob("late-arrival");
    expect(transition(job, { type: "arrive" }).ok).toBe(false);
    const renewed = apply(job, { type: "renew" }, { type: "arrive" });
    expect(renewed.bay).toBe("Bay 3");
    expect(transition({ ...seedJob("normal"), elapsedMinutes: 45 }, { type: "arrive" }).ok).toBe(false);
  });
  test("signature refusal holds billing until a later synthetic sign-off", () => {
    const refused = apply(seedJob("signature-refusal"), { type: "arrive" }, { type: "before" }, { type: "after" }, { type: "refuse" });
    expect(transition(refused, { type: "complete" }).message).toContain("refused");
    expect(transition(refused, { type: "invoice" }).ok).toBe(false);
    expect(apply(refused, { type: "sign" }, { type: "complete" }, { type: "invoice" }).stage).toBe("Billed");
  });
  test("all six fixtures reset independently, with safe unknown-scenario fallback", () => {
    expect(scenarios).toHaveLength(6);
    for (const scenario of scenarios) {
      const first = seedJob(scenario.id); const second = seedJob(scenario.id);
      first.events.push("local change"); expect(second.events).not.toContain("local change");
      expect(second.carrier).toContain("fictional");
    }
    expect(seedJob("completed-invoice").stage).toBe("Billed");
    expect(getScenario("../../api/jobs").id).toBe("normal");
  });
});
