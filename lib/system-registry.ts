import { z } from "zod";
import { systemDirectoryInputSchema, type SystemDirectoryInput } from "@/lib/system-directory";

export const systemEntityClasses = [
  "provider_service",
  "provider_account",
  "subscription",
  "application_workload",
  "infrastructure_asset",
  "stack_component",
] as const;
export type SystemEntityClass = (typeof systemEntityClasses)[number];

export const registryVerificationStates = ["unknown", "candidate", "owner_reviewed"] as const;
export const registryEvidenceStatuses = ["verified", "unverified", "stale", "unknown", "unavailable"] as const;
export const registryVerificationMethods = ["provider_console", "provider_export", "invoice", "contract", "vendor_document", "manual_observation", "owner_claim"] as const;
export const registryProvenanceKinds = ["owner_observation", "provider_export", "invoice", "contract", "vendor_document", "manual_entry", "unknown"] as const;
export const registryEntryProvenanceKinds = ["legacy", ...registryProvenanceKinds] as const;
export const registryRelationshipKinds = ["owns", "billed_through", "runs_on", "depends_on", "uses", "integrates_with"] as const;
export const registryMonitoringConfigurations = ["configured", "unmonitored", "unknown"] as const;
export const registryMonitoringOutcomes = ["healthy", "degraded", "down", "unknown", "stale", "unavailable"] as const;
export const registryMonitoringMethods = ["provider_console", "status_page", "manual_observation", "local_check"] as const;
export const registryBillingSourceKinds = ["invoice", "contract", "provider_export", "vendor_document", "owner_observation"] as const;
export const registryBillingAmountBases = ["actual", "estimated", "unknown"] as const;
const privateMaterial = /(?:\b(?:password|credential|secret|api[_ -]?key|access[_ -]?token|auth[_ -]?token|recovery[_ -]?code)\s*[:=]|\bbearer\s+[a-z0-9._~+/=-]{12,}|\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|sk_(?:live|test)_[a-z0-9]{12,}|rk_(?:live|test)_[a-z0-9]{12,}|re_[a-z0-9]{16,}|whsec_[a-z0-9]{16,}|xox[baprs]-[a-z0-9-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const safeRole = z.string().trim().min(1).max(120).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields").nullable();
export const safeRegistryReference = z.string().trim().min(1).max(512).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields").nullable();
const safeEvidenceSubject = z.string().trim().min(1).max(240).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields");

export const systemRegistryInputSchema = z.object({
  entityClass: z.enum(systemEntityClasses),
  details: systemDirectoryInputSchema,
  responsibleRole: safeRole,
  recoveryRole: safeRole,
  verificationState: z.enum(registryVerificationStates),
  provenanceKind: z.enum(registryEntryProvenanceKinds),
  provenanceReference: safeRegistryReference,
  observedAt: z.string().datetime({ offset: true }).nullable(),
  monitoringConfiguration: z.enum(registryMonitoringConfigurations).default("unknown"),
}).strict().superRefine((value, ctx) => {
  if (value.verificationState === "unknown") {
    if (value.provenanceKind !== "unknown" && value.provenanceKind !== "manual_entry" && value.provenanceKind !== "legacy") {
      ctx.addIssue({ code: "custom", path: ["provenanceKind"], message: "Unknown verification must use unknown or manual-entry provenance" });
    }
    if (value.provenanceReference !== null) ctx.addIssue({ code: "custom", path: ["provenanceReference"], message: "Unknown verification cannot have a confirming evidence reference" });
  } else {
    if (value.provenanceKind === "unknown" || value.provenanceKind === "legacy" || !value.provenanceReference) {
      ctx.addIssue({ code: "custom", path: ["provenanceReference"], message: "Candidate and reviewed records need a provenance type and evidence reference" });
    }
  }
});

export type SystemRegistryInput = z.infer<typeof systemRegistryInputSchema>;
export const systemRegistryVerificationInputSchema = z.object({
  status: z.enum(registryEvidenceStatuses),
  subject: safeEvidenceSubject.nullable(),
  method: z.enum(registryVerificationMethods).nullable(),
  reference: safeRegistryReference,
  observedAt: z.string().datetime({ offset: true }).nullable(),
  reviewDue: z.string().date().nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "unknown") {
    if (value.subject || value.method || value.reference || value.observedAt || value.reviewDue) ctx.addIssue({ code: "custom", path: ["status"], message: "Unknown verification cannot claim evidence" });
  } else if (!value.subject || !value.method) {
    ctx.addIssue({ code: "custom", path: ["subject"], message: "Record the verification subject and method" });
  }
  if ((value.status === "verified" || value.status === "stale") && (!value.reference || !value.observedAt || value.method === "owner_claim")) {
    ctx.addIssue({ code: "custom", path: ["reference"], message: "Verified or stale evidence needs a source reference and observation date; an owner claim alone is not verification" });
  }
});
export type SystemRegistryVerificationInput = z.infer<typeof systemRegistryVerificationInputSchema>;

export const systemRegistryMonitoringInputSchema = z.object({
  outcome: z.enum(registryMonitoringOutcomes),
  method: z.enum(registryMonitoringMethods).nullable(),
  reference: safeRegistryReference,
  observedAt: z.string().datetime({ offset: true }).nullable(),
  reviewDue: z.string().date().nullable(),
  summary: z.string().trim().max(1000).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields"),
}).strict().superRefine((value, ctx) => {
  if (value.outcome === "unknown") {
    if (value.method || value.reference || value.observedAt || value.reviewDue || value.summary) ctx.addIssue({ code: "custom", path: ["outcome"], message: "Unknown observation cannot claim a result" });
  } else if (!value.method || !value.observedAt) {
    ctx.addIssue({ code: "custom", path: ["observedAt"], message: "Record the observation method and source time" });
  }
});
export type SystemRegistryMonitoringInput = z.infer<typeof systemRegistryMonitoringInputSchema>;

export const systemRegistryBillingEvidenceSchema = z.object({
  providerAccountId: z.string().uuid().nullable(),
  sourceKind: z.enum(registryBillingSourceKinds),
  reference: safeRegistryReference,
  observedAt: z.string().datetime({ offset: true }),
  periodStart: z.string().date().nullable(),
  periodEnd: z.string().date().nullable(),
  amountBasis: z.enum(registryBillingAmountBases),
  amount: z.number().finite().nonnegative().refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Amounts must use at most two decimal places").nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  payerLabel: z.string().trim().max(160).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields").nullable(),
  status: z.enum(registryEvidenceStatuses),
  reviewDue: z.string().date().nullable(),
}).strict().superRefine((value, ctx) => {
  if (!value.reference) ctx.addIssue({ code: "custom", path: ["reference"], message: "Billing evidence requires a safe source reference" });
  if ((value.periodStart === null) !== (value.periodEnd === null) || (value.periodStart && value.periodEnd && value.periodStart > value.periodEnd)) ctx.addIssue({ code: "custom", path: ["periodEnd"], message: "Provide a valid complete billing period" });
  if (value.amountBasis === "unknown" ? value.amount !== null : value.amount === null || value.currency === null) ctx.addIssue({ code: "custom", path: ["amount"], message: "Unknown charges have no amount; actual and estimated charges need an amount and currency" });
  if (value.status === "verified" && value.amountBasis !== "unknown" && (!value.reference || !value.observedAt)) ctx.addIssue({ code: "custom", path: ["status"], message: "Verified charges need a source reference and observation date" });
});
export type SystemRegistryBillingEvidenceInput = z.infer<typeof systemRegistryBillingEvidenceSchema>;
export const systemRegistryBillingAllocationSchema = z.object({
  evidenceId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  amount: z.number().finite().nonnegative().refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Allocations must use at most two decimal places").nullable(),
}).strict();
export type SystemRegistryBillingAllocationInput = z.infer<typeof systemRegistryBillingAllocationSchema>;
export type SystemRegistryRelationshipInput = {
  targetId: string;
  kind: (typeof registryRelationshipKinds)[number];
  verificationState: (typeof registryVerificationStates)[number];
  provenanceKind: (typeof registryProvenanceKinds)[number];
  provenanceReference: string | null;
  observedAt: string | null;
};
export type SystemRegistryRecord = SystemRegistryInput["details"] & Omit<SystemRegistryInput, "details"> & {
  id: string;
  revision: number;
  confirmedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  verificationStatus: (typeof registryEvidenceStatuses)[number];
  verificationSubject: string | null;
  verificationMethod: (typeof registryVerificationMethods)[number] | null;
  verificationReference: string | null;
  verificationObservedAt: string | null;
  verificationReviewDue: string | null;
  verificationReviewedAt: string | null;
  monitoringOutcome: (typeof registryMonitoringOutcomes)[number];
  monitoringMethod: (typeof registryMonitoringMethods)[number] | null;
  monitoringReference: string | null;
  monitoringObservedAt: string | null;
  monitoringReviewDue: string | null;
  monitoringReviewedAt: string | null;
  monitoringSummary: string;
  links: Array<SystemRegistryRelationshipInput & { id: string; revision: number; targetName: string }>;
};

export const emptySystemDirectoryInput: SystemDirectoryInput = {
  name: "", category: "other", provider: "", purpose: "", dashboardURL: undefined, documentationURL: undefined,
  accountIdentity: "", billingEntity: "", notes: "", relationships: [], billingCadence: "unknown", currency: "USD",
  amount: null, amountBasis: "unknown", costConfirmation: "unverified", renewalDate: null, pinned: false,
  manualHealth: "not_monitored", manualHealthSummary: "", manualHealthCheckedAt: null,
};

export const entityClassLabels: Record<SystemEntityClass, string> = {
  provider_service: "Provider / service",
  provider_account: "Provider account",
  subscription: "Subscription",
  application_workload: "Application / workload",
  infrastructure_asset: "Infrastructure / asset",
  stack_component: "Stack component",
};

export const entityClassGuidance: Record<SystemEntityClass, string> = {
  provider_service: "A vendor or service Yorkstead uses. A catalog suggestion is not a confirmed account.",
  provider_account: "An account or tenant with an external provider. Never enter passwords, tokens, or recovery codes.",
  subscription: "A billing relationship. Record amount, currency, cadence, and evidence only when known.",
  application_workload: "A Yorkstead application or workload and its operational purpose.",
  infrastructure_asset: "A hosting, database, network, or other infrastructure asset.",
  stack_component: "A framework, library, runtime, or other technology component.",
};

