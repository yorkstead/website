import type { ServiceSlug } from "@/lib/services";

export const consultationStatuses = ["draft", "discovery", "scoped", "archived"] as const;
export type ConsultationStatus = typeof consultationStatuses[number];

export type ConsultationRecord = {
  id: string;
  leadId: number | null;
  serviceSlug: ServiceSlug;
  clientName: string;
  business: string;
  email: string;
  consultationDate: string;
  status: ConsultationStatus;
  responses: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ConsultationInput = Omit<ConsultationRecord, "id" | "createdAt" | "updatedAt">;

/**
 * CC-028 T103: a linked consultation records the identity captured at meeting
 * time. The CRM inquiry stays canonical for current contact details, so an
 * update must not overwrite the snapshot or repoint the link.
 */
export function preserveLinkedIdentity(
  existing: Pick<ConsultationRecord, "leadId" | "clientName" | "business" | "email">,
  input: ConsultationInput,
): ConsultationInput {
  if (existing.leadId === null) return input;
  return {
    ...input,
    leadId: existing.leadId,
    clientName: existing.clientName,
    business: existing.business,
    email: existing.email,
  };
}
