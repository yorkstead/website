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
