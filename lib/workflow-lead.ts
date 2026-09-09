import { createHash } from "node:crypto";
import { isValidEmailAddress } from "@/lib/semantic-validation";

export const workflowProblemAreas = [
  "Production",
  "Inventory",
  "Scheduling",
  "Customer service",
  "Documents",
  "Sales",
  "Shipping / logistics",
  "Reporting",
  "Communication",
  "Something else",
] as const;

export type WorkflowProblemArea = typeof workflowProblemAreas[number];

export type WorkflowLeadField = "name" | "company" | "email" | "phone" | "description" | "problemAreas" | "website" | "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term";
export type WorkflowLeadErrors = Partial<Record<WorkflowLeadField, string>>;

export type WorkflowLeadValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  description: string;
  problemAreas: string[];
  website: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
};

export type WorkflowLeadPayload = WorkflowLeadValues;

function normalizeText(value: unknown, maximum = 500) {
  return String(value ?? "").trim().slice(0, maximum);
}

function normalizeProblemAreas(value: unknown) {
  const collected = new Set<string>();
  const add = (entry: unknown) => {
    if (typeof entry !== "string") return;
    const cleaned = entry.trim();
    if (!cleaned) return;
    if (workflowProblemAreas.includes(cleaned as WorkflowProblemArea)) collected.add(cleaned);
    else if (!workflowProblemAreas.some((item) => item.toLowerCase() === cleaned.toLowerCase())) collected.add(cleaned.slice(0, 120));
  };

  if (Array.isArray(value)) value.forEach(add);
  else if (typeof value === "string") {
    value.split(",").map((entry) => entry.trim()).filter(Boolean).forEach(add);
    if (value.includes("|") || value.includes(";")) {
      value.split(/[|;]+/).map((entry) => entry.trim()).filter(Boolean).forEach(add);
    }
  }

  return Array.from(collected).slice(0, 10);
}

export function workflowLeadPayload(input: FormData | Record<string, unknown>): WorkflowLeadPayload {
  const read = (key: string) => input instanceof FormData ? input.getAll(key) : Array.isArray(input[key]) ? input[key] : [input[key]];
  const problemAreas = read("problemAreas").flatMap((entry) => typeof entry === "string" ? entry.split(",") : []);
  const base: WorkflowLeadValues = {
    name: normalizeText(input instanceof FormData ? input.get("name") : input.name, 100),
    company: normalizeText(input instanceof FormData ? input.get("company") : input.company, 150),
    email: normalizeText(input instanceof FormData ? input.get("email") : input.email, 181).toLowerCase(),
    phone: normalizeText(input instanceof FormData ? input.get("phone") : input.phone, 40),
    description: normalizeText(input instanceof FormData ? input.get("description") : input.description, 4000),
    problemAreas: normalizeProblemAreas(problemAreas.length ? problemAreas : (input instanceof FormData ? input.get("problemAreas") : input.problemAreas)),
    website: normalizeText(input instanceof FormData ? input.get("website") : input.website, 200),
    utm_source: normalizeText(input instanceof FormData ? input.get("utm_source") : input.utm_source, 120),
    utm_medium: normalizeText(input instanceof FormData ? input.get("utm_medium") : input.utm_medium, 120),
    utm_campaign: normalizeText(input instanceof FormData ? input.get("utm_campaign") : input.utm_campaign, 200),
    utm_content: normalizeText(input instanceof FormData ? input.get("utm_content") : input.utm_content, 200),
    utm_term: normalizeText(input instanceof FormData ? input.get("utm_term") : input.utm_term, 120),
  };

  return new Proxy(base, {
    set(target, property, value) {
      if (typeof property !== "string") return Reflect.set(target, property, value);
      switch (property) {
        case "name":
          target.name = normalizeText(value, 100);
          return true;
        case "company":
          target.company = normalizeText(value, 150);
          return true;
        case "email":
          target.email = normalizeText(value, 181).toLowerCase();
          return true;
        case "phone":
          target.phone = normalizeText(value, 40);
          return true;
        case "description":
          target.description = normalizeText(value, 4000);
          return true;
        case "problemAreas":
          target.problemAreas = normalizeProblemAreas(value);
          return true;
        case "website":
          target.website = normalizeText(value, 200);
          return true;
        case "utm_source":
          target.utm_source = normalizeText(value, 120);
          return true;
        case "utm_medium":
          target.utm_medium = normalizeText(value, 120);
          return true;
        case "utm_campaign":
          target.utm_campaign = normalizeText(value, 200);
          return true;
        case "utm_content":
          target.utm_content = normalizeText(value, 200);
          return true;
        case "utm_term":
          target.utm_term = normalizeText(value, 120);
          return true;
        default:
          return Reflect.set(target, property, value);
      }
    },
  }) as WorkflowLeadPayload;
}

export function validateWorkflowLead(values: WorkflowLeadValues): WorkflowLeadErrors {
  const errors: WorkflowLeadErrors = {};
  if (values.name.length < 2) errors.name = "Tell me what to call you.";
  if (values.company.length < 2) errors.company = "Enter the company or business name.";
  if (!isValidEmailAddress(values.email, 180)) errors.email = "Enter a valid email address.";
  if (!values.phone || !/^[+()\-\.\s\d]{7,40}$/.test(values.phone)) errors.phone = "Add a valid phone number so we can follow up.";
  if (values.description.length < 20) errors.description = "Give us a few details about the bottleneck you need fixed.";
  if (!values.problemAreas.length) errors.problemAreas = "Select at least one area where the problem is showing up.";
  if (values.website) errors.website = "Unexpected input.";
  return errors;
}

export function workflowLeadSubmissionKey(values: WorkflowLeadValues, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const canonical = [day, values.email.toLowerCase(), values.company.toLowerCase(), values.description.toLowerCase()].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export type WorkflowLeadResult =
  | { status: "success"; id: number; values: WorkflowLeadValues }
  | { status: "invalid"; errors: WorkflowLeadErrors }
  | { status: "duplicate" }
  | { status: "spam" }
  | { status: "rate_limited" }
  | { status: "server_error" };

type WorkflowLeadStore = {
  countRecent: () => Promise<number>;
  insert: (values: WorkflowLeadValues, submissionKey: string) => Promise<number | null>;
};

export async function processWorkflowLead(payload: WorkflowLeadPayload, store: WorkflowLeadStore): Promise<WorkflowLeadResult> {
  if (payload.website) return { status: "spam" };
  const errors = validateWorkflowLead(payload);
  if (Object.keys(errors).length) return { status: "invalid", errors };
  try {
    if (await store.countRecent() >= 3) return { status: "rate_limited" };
    const id = await store.insert(payload, workflowLeadSubmissionKey(payload));
    return id ? { status: "success", id, values: payload } : { status: "duplicate" };
  } catch {
    return { status: "server_error" };
  }
}
