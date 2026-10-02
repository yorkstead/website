import { calculateJobTotal } from "./source-pricing";
import { getScenario, type ScenarioId } from "./manifest";

export type Stage = "Reserved" | "In Progress" | "Completed" | "Billed";
export interface DemoJob {
  scenarioId: ScenarioId;
  id: string;
  carrier: string;
  driver: string;
  trailer: string;
  bay: string;
  stage: Stage;
  expectedPallets: number;
  palletsCount: number;
  wrapCount: number;
  cornersCount: number;
  laborHours: number;
  scaleCheck: boolean;
  debrisFee: boolean;
  holdMinutes: number;
  elapsedMinutes: number;
  before: boolean;
  after: boolean;
  damageReviewed: boolean;
  quantityReviewed: boolean;
  signature: "pending" | "refused" | "signed";
  events: string[];
}
export type Action =
  | { type: "arrive" | "renew" | "before" | "after" | "review-damage" | "review-quantity" | "sign" | "refuse" | "complete" | "invoice" }
  | { type: "quantity"; value: number };

export function seedJob(id: unknown): DemoJob {
  const scenarioId = getScenario(id).id;
  const billed = scenarioId === "completed-invoice";
  return {
    scenarioId, id: `JFL-${String(["normal", "quantity-dispute", "damaged-material", "late-arrival", "signature-refusal", "completed-invoice"].indexOf(scenarioId) + 101)}`,
    carrier: "Pineglass Transit (fictional)", driver: "Alex Rowan (fictional)", trailer: "DEMO-204", bay: "Bay 2",
    stage: billed ? "Billed" : "Reserved", expectedPallets: 4,
    palletsCount: scenarioId === "quantity-dispute" ? 6 : 4,
    wrapCount: 2, cornersCount: 8, laborHours: 1.25, scaleCheck: true, debrisFee: true,
    holdMinutes: 45, elapsedMinutes: scenarioId === "late-arrival" ? 52 : 18,
    before: billed, after: billed, damageReviewed: false, quantityReviewed: false,
    signature: billed ? "signed" : "pending",
    events: billed ? ["Reservation recorded · 4 pallets", "Arrival confirmed · Bay 2", "Before condition illustrated", "After condition illustrated", "Synthetic driver sign-off recorded", "Office handoff completed", "Demo invoice prepared"] : ["Reservation recorded · 4 pallets · 45-minute hold"],
  };
}

export function completionBlocker(job: DemoJob): string | null {
  if (job.stage !== "In Progress") return "Confirm arrival before completing work.";
  if (!job.before || !job.after) return "Add both before and after evidence.";
  if (job.scenarioId === "damaged-material" && !job.damageReviewed) return "Acknowledge the arrival damage.";
  if (job.palletsCount !== job.expectedPallets && !job.quantityReviewed) return "Review the quantity difference.";
  if (job.signature !== "signed") return job.signature === "refused" ? "Driver refused to sign. Office handoff is on hold." : "Record a synthetic driver sign-off.";
  return null;
}

// All mutations remain in this pure teaching model; no persistence or integration imports.
export function transition(job: DemoJob, action: Action): { job: DemoJob; message: string; ok: boolean } {
  const reject = (message: string) => ({ job, message, ok: false });
  const next = { ...job, events: [...job.events] };
  let message: string;
  if (action.type === "arrive") {
    if (job.stage !== "Reserved") return reject("This load has already arrived.");
    if (job.elapsedMinutes >= job.holdMinutes) return reject("Bay hold expired. Recheck availability first.");
    next.stage = "In Progress"; message = `Arrival confirmed · ${job.bay}`;
  } else if (action.type === "renew") {
    if (job.stage !== "Reserved" || job.elapsedMinutes < job.holdMinutes) return reject("No expired reservation needs reassignment.");
    next.bay = "Bay 3"; next.elapsedMinutes = 0; message = "Simulated availability checked · Bay 3 held for 45 minutes";
  } else if (action.type === "invoice") {
    if (job.stage !== "Completed") return reject("Complete the office handoff before preparing an invoice.");
    next.stage = "Billed"; message = "Demo invoice prepared · no payment or accounting transmission";
  } else {
    if (job.stage !== "In Progress") return reject("Only an active dock job can be changed.");
    switch (action.type) {
      case "quantity":
        if (!Number.isInteger(action.value) || action.value < 0 || action.value > 100) return reject("Enter a whole pallet count from 0 to 100.");
        if (action.value === job.palletsCount) return reject("Pallet count is unchanged.");
        next.palletsCount = action.value; next.quantityReviewed = false;
        // Changed work invalidates earlier sign-off and after evidence.
        next.signature = "pending"; next.after = false;
        message = `Actual pallet count updated · ${action.value}; after evidence and sign-off need renewal`; break;
      case "before":
        if (job.before) return reject("Before evidence is already attached.");
        next.before = true; message = "Before condition illustrated · synthetic evidence"; break;
      case "after":
        if (!job.before) return reject("Capture arrival condition before after-work evidence.");
        if (job.after) return reject("After evidence is already attached.");
        next.after = true; message = "After condition illustrated · synthetic evidence"; break;
      case "review-damage":
        if (job.scenarioId !== "damaged-material" || !job.before || job.damageReviewed) return reject("Attach arrival evidence before reviewing an outstanding damage exception.");
        next.damageReviewed = true; message = "Arrival damage acknowledged · 2 broken runners"; break;
      case "review-quantity":
        if (job.palletsCount === job.expectedPallets || job.quantityReviewed) return reject("No outstanding quantity difference to review.");
        next.quantityReviewed = true; message = `Demo dispatcher acknowledged adjustment · ${job.expectedPallets} requested / ${job.palletsCount} actual`; break;
      case "refuse":
        if (job.signature !== "pending") return reject("The current sign-off decision has already been recorded.");
        next.signature = "refused"; message = "Driver refused to sign · office handoff held"; break;
      case "sign":
        if (!job.before || !job.after) return reject("Attach before and after evidence before sign-off.");
        if (job.signature === "signed") return reject("Synthetic sign-off is already recorded.");
        next.signature = "signed"; message = "Synthetic driver sign-off recorded · Alex Rowan"; break;
      case "complete": {
        const blocker = completionBlocker(job);
        if (blocker) return reject(blocker);
        next.stage = "Completed"; message = "Office handoff completed · evidence and sign-off attached"; break;
      }
    }
  }
  next.events.push(message);
  return { job: next, message, ok: true };
}

export function jobTotal(job: DemoJob) { return calculateJobTotal(job); }
