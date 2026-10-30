import { z } from "zod";
import { isValidDateKey } from "@/lib/date-time";

export const systemCategories = ["hosting","database","development","productivity","payments","communications","analytics","automation","security","infrastructure","other"] as const;
export const healthStates = ["healthy","degraded","down","unknown","stale","not_monitored"] as const;
export const billingCadences = ["monthly","annual","quarterly","weekly","usage_based","free","promotional","unknown"] as const;
export const providers = ["GitHub","Vercel","Neon","Google Workspace","Stripe","Resend","Twilio","Sentry","Cloudflare","Other"] as const;

export type SystemRelationship = { kind: "project" | "repository" | "domain" | "infrastructure" | "integration"; name: string; url?: string };
const relationshipSchema = z.object({
  kind: z.enum(["project","repository","domain","infrastructure","integration"]),
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().max(2048).optional().refine((value) => !value || safeHttpsURL(value), "Use a valid HTTPS URL"),
}).strict();

const secretLike = /(?:\b(?:password|credential|secret|api[_ -]?key|access[_ -]?token|auth[_ -]?token|recovery[_ -]?code)\s*[:=]|\bbearer\s+[a-z0-9._~+/=-]{12,}|\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|sk_(?:live|test)_[a-z0-9]{12,}|rk_(?:live|test)_[a-z0-9]{12,}|re_[a-z0-9]{16,}|whsec_[a-z0-9]{16,}|xox[baprs]-[a-z0-9-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const safeText = (max: number) => z.string().trim().max(max).refine((value) => !secretLike.test(value), "Credentials cannot be stored in directory fields");

export function safeHttpsURL(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password && url.href.length <= 2048;
  } catch { return false; }
}

export const systemDirectoryInputSchema = z.object({
  name: safeText(120).pipe(z.string().min(1)),
  category: z.enum(systemCategories),
  provider: safeText(80).pipe(z.string().min(1)),
  purpose: safeText(1000),
  dashboardURL: z.string().trim().max(2048).optional().transform((value) => value || undefined).refine((value) => !value || safeHttpsURL(value), "Use a valid HTTPS dashboard URL"),
  documentationURL: z.string().trim().max(2048).optional().transform((value) => value || undefined).refine((value) => !value || safeHttpsURL(value), "Use a valid HTTPS documentation URL"),
  accountIdentity: safeText(320).refine((value)=>value===""||/^[A-Za-z0-9._%+@-]+$/.test(value),"Enter one email address or username"),
  billingEntity: safeText(160),
  notes: safeText(2000),
  relationships: z.array(relationshipSchema).max(40),
  billingCadence: z.enum(billingCadences),
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number().finite().multipleOf(0.01).min(0).max(1_000_000_000).nullable(),
  amountBasis: z.enum(["actual","estimated","unknown"]),
  costConfirmation: z.enum(["confirmed","unverified"]),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateKey,"Enter a real calendar date").nullable(),
  pinned: z.boolean(),
  manualHealth: z.enum(["healthy","degraded","down","unknown","not_monitored"]),
  manualHealthSummary: safeText(500),
  manualHealthCheckedAt: z.string().datetime({ offset: true }).nullable(),
}).strict().superRefine((value, ctx) => {
  if (["free","unknown"].includes(value.billingCadence) && value.amount !== null && value.amount !== 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "Amount must be blank or zero for this cadence" });
  if (value.amountBasis === "unknown" && value.amount !== null) ctx.addIssue({ code: "custom", path: ["amount"], message: "An unknown amount must be blank" });
  if (value.amount === null && value.costConfirmation === "confirmed") ctx.addIssue({ code: "custom", path: ["costConfirmation"], message: "An unknown amount cannot be marked confirmed" });
  if (value.manualHealth === "not_monitored" && value.manualHealthCheckedAt !== null) ctx.addIssue({ code: "custom", path: ["manualHealthCheckedAt"], message: "Not monitored entries cannot have a check timestamp" });
  if (value.manualHealth !== "not_monitored" && value.manualHealthCheckedAt === null) ctx.addIssue({ code: "custom", path: ["manualHealthCheckedAt"], message: "Add the time of the manual observation" });
  for (const [index, relation] of value.relationships.entries()) if (relation.kind === "domain" && !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(relation.name)) ctx.addIssue({ code: "custom", path: ["relationships", index, "name"], message: "Enter a valid domain name" });
});

export type SystemDirectoryInput = z.infer<typeof systemDirectoryInputSchema>;
export type SystemDirectoryEntry = SystemDirectoryInput & { id: string; revision: number; archivedAt: string | null; createdAt: string; updatedAt: string };

export type ProviderSuggestion = { provider: typeof providers[number]; category: typeof systemCategories[number]; dashboardURL: string; documentationURL?: string };
export const providerSuggestions: ProviderSuggestion[] = [
  { provider: "GitHub", category: "development", dashboardURL: "https://github.com" },
  { provider: "Vercel", category: "hosting", dashboardURL: "https://vercel.com/dashboard" },
  { provider: "Neon", category: "database", dashboardURL: "https://console.neon.tech" },
  { provider: "Google Workspace", category: "productivity", dashboardURL: "https://admin.google.com" },
  { provider: "Stripe", category: "payments", dashboardURL: "https://dashboard.stripe.com" },
  { provider: "Resend", category: "communications", dashboardURL: "https://resend.com/overview" },
  { provider: "Twilio", category: "communications", dashboardURL: "https://console.twilio.com" },
  { provider: "Cloudflare", category: "infrastructure", dashboardURL: "https://dash.cloudflare.com" },
];

export function monthlyEquivalent(cadence: typeof billingCadences[number], amount: number | null) {
  if (amount === null || !Number.isFinite(amount) || ["usage_based","free","promotional","unknown"].includes(cadence)) return null;
  const factors:Partial<Record<typeof billingCadences[number],number>>={monthly:1,annual:1/12,quarterly:1/3,weekly:52/12};
  return Math.round(amount * (factors[cadence] ?? 0) * 100) / 100;
}

export function summarizeCosts(entries: Array<Pick<SystemDirectoryEntry,"billingCadence"|"amount"|"amountBasis"|"costConfirmation"|"currency"|"renewalDate"|"name">>, now = new Date()) {
  const totals = new Map<string,{ monthlyEquivalent: number; annualized: number; actual: number; estimated: number; confirmed: number; unverified: number }>();
  for (const entry of entries) {
    const monthly = monthlyEquivalent(entry.billingCadence, entry.amount);
    if (monthly === null) continue;
    const total = totals.get(entry.currency) ?? { monthlyEquivalent: 0, annualized: 0, actual: 0, estimated: 0, confirmed: 0, unverified: 0 };
    total.monthlyEquivalent += monthly; total.annualized += monthly * 12;
    total[entry.amountBasis === "actual" ? "actual" : "estimated"] += monthly;
    total[entry.costConfirmation === "confirmed" ? "confirmed" : "unverified"] += monthly;
    totals.set(entry.currency, total);
  }
  const cutoff = new Date(now.getTime() + 45 * 86_400_000).toISOString().slice(0,10);
  const today = now.toISOString().slice(0,10);
  return { totals: Object.fromEntries([...totals].map(([currency,total]) => [currency, Object.fromEntries(Object.entries(total).map(([key,value]) => [key, Math.round(value*100)/100]))])), renewals: entries.filter((entry) => entry.renewalDate && entry.renewalDate >= today && entry.renewalDate <= cutoff).sort((a,b) => a.renewalDate!.localeCompare(b.renewalDate!)).map(({name,renewalDate,currency,amountBasis,costConfirmation}) => ({name,renewalDate,currency,amountBasis,costConfirmation})) };
}

export type HealthObservation = { id: string; status: typeof healthStates[number]; source: string; checkedAt: string | null; summary: string; affected: string[] };
export function servicesLinkedToProject(entries:Array<{name:string;relationships:SystemRelationship[]}>,projectName:string) {
  const key=projectName.trim().toLowerCase();
  return entries.filter((entry)=>entry.relationships.some((relationship)=>relationship.kind==="project"&&relationship.name.trim().toLowerCase()===key)).map((entry)=>entry.name);
}
export function staleHealth(observation: HealthObservation, now: Date, maxAgeMs = 15 * 60_000): HealthObservation {
  if (!observation.checkedAt || !Number.isFinite(Date.parse(observation.checkedAt))) return { ...observation, status: observation.status === "not_monitored" ? "not_monitored" : "unknown" };
  const age=now.getTime()-Date.parse(observation.checkedAt);
  if(age < -60_000)return {...observation,status:"unknown"};
  if (age > maxAgeMs && ["healthy","degraded","down"].includes(observation.status)) return { ...observation, status: "stale" };
  return observation;
}

export function orderExceptions(observations: HealthObservation[]) {
  const priority = { down: 0, degraded: 1, stale: 2, unknown: 3, not_monitored: 4, healthy: 5 };
  return [...observations].sort((a,b) => priority[a.status] - priority[b.status] || (b.checkedAt ?? "").localeCompare(a.checkedAt ?? ""));
}
