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
export const registryProvenanceKinds = ["owner_observation", "provider_export", "invoice", "contract", "vendor_document", "manual_entry", "unknown"] as const;
export const registryRelationshipKinds = ["owns", "billed_through", "runs_on", "depends_on", "uses", "integrates_with"] as const;
const privateMaterial = /(?:\b(?:password|credential|secret|api[_ -]?key|access[_ -]?token|auth[_ -]?token|recovery[_ -]?code)\s*[:=]|\bbearer\s+[a-z0-9._~+/=-]{12,}|\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|sk_(?:live|test)_[a-z0-9]{12,}|rk_(?:live|test)_[a-z0-9]{12,}|re_[a-z0-9]{16,}|whsec_[a-z0-9]{16,}|xox[baprs]-[a-z0-9-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const safeRole = z.string().trim().min(1).max(120).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields").nullable();
export const safeRegistryReference = z.string().trim().min(1).max(512).refine(value => !privateMaterial.test(value), "Credentials cannot be stored in Registry fields").nullable();

export const systemRegistryInputSchema = z.object({
  entityClass: z.enum(systemEntityClasses),
  details: systemDirectoryInputSchema,
  responsibleRole: safeRole,
  recoveryRole: safeRole,
  verificationState: z.enum(registryVerificationStates),
  provenanceKind: z.enum(registryProvenanceKinds),
  provenanceReference: safeRegistryReference,
  observedAt: z.string().datetime({ offset: true }).nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.verificationState === "unknown") {
    if (value.provenanceKind !== "unknown" && value.provenanceKind !== "manual_entry") {
      ctx.addIssue({ code: "custom", path: ["provenanceKind"], message: "Unknown verification must use unknown or manual-entry provenance" });
    }
    if (value.provenanceReference !== null) ctx.addIssue({ code: "custom", path: ["provenanceReference"], message: "Unknown verification cannot have a confirming evidence reference" });
  } else {
    if (value.provenanceKind === "unknown" || !value.provenanceReference) {
      ctx.addIssue({ code: "custom", path: ["provenanceReference"], message: "Candidate and reviewed records need a provenance type and evidence reference" });
    }
  }
});

export type SystemRegistryInput = z.infer<typeof systemRegistryInputSchema>;
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

