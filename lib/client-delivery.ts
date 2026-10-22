import { z } from "zod";
import { isValidDateKey } from "@/lib/date-time";

const idSchema = z.string().trim().min(1).max(80);
const titleSchema = z.string().trim().min(1).max(300);
const descriptionSchema = z.string().trim().max(5000).optional();
const dateSchema = z.string().trim().refine(isValidDateKey, "Invalid calendar date").optional();
const timestampSchema = z.string().datetime({ offset: true });

export const deliveryMilestoneStatuses = ["planned", "in_progress", "blocked", "complete"] as const;
export const deliverableStatuses = ["planned", "in_progress", "complete", "removed"] as const;
export const clientDecisionStatuses = ["pending", "accepted", "rejected", "deferred"] as const;
export const documentLinkKinds = ["document", "design", "contract", "invoice", "other"] as const;
export const paymentStatuses = ["not_due", "invoiced", "partially_paid", "paid", "overdue", "disputed", "waived"] as const;

export const scopedDeliverableSchema = z.object({
  id: idSchema,
  title: titleSchema,
  description: descriptionSchema,
  status: z.enum(deliverableStatuses),
});

export const deliveryMilestoneSchema = z.object({
  id: idSchema,
  title: titleSchema,
  targetDate: dateSchema,
  acceptanceCriteria: descriptionSchema,
  status: z.enum(deliveryMilestoneStatuses),
});

export const clientDecisionSchema = z.object({
  id: idSchema,
  title: titleSchema,
  notes: descriptionSchema,
  status: z.enum(clientDecisionStatuses),
  decidedAt: timestampSchema.optional(),
});

export const externalDocumentLinkSchema = z.object({
  id: idSchema,
  title: titleSchema,
  kind: z.enum(documentLinkKinds),
  url: z.string().trim().url().max(2000).refine((value) => value.startsWith("https://"), "Only HTTPS links are allowed"),
});

export const paymentReferenceSchema = z.object({
  status: z.enum(paymentStatuses),
  reference: z.string().trim().max(200).optional(),
  updatedAt: timestampSchema,
});

export const deliveryActivitySchema = z.object({
  id: idSchema,
  message: z.string().trim().min(1).max(1000),
  createdAt: timestampSchema,
});

export const clientDeliverySchema = z.object({
  deliverables: z.array(scopedDeliverableSchema).max(250).default([]),
  milestones: z.array(deliveryMilestoneSchema).max(250).default([]),
  decisions: z.array(clientDecisionSchema).max(250).default([]),
  links: z.array(externalDocumentLinkSchema).max(250).default([]),
  payment: paymentReferenceSchema.optional(),
  activity: z.array(deliveryActivitySchema).max(500).default([]),
});

export type ClientDelivery = z.infer<typeof clientDeliverySchema>;
export type ScopedDeliverable = z.infer<typeof scopedDeliverableSchema>;
export type DeliveryMilestone = z.infer<typeof deliveryMilestoneSchema>;
export type ClientDecision = z.infer<typeof clientDecisionSchema>;
export type ExternalDocumentLink = z.infer<typeof externalDocumentLinkSchema>;
export type PaymentReference = z.infer<typeof paymentReferenceSchema>;
export type DeliveryActivity = z.infer<typeof deliveryActivitySchema>;

export const emptyClientDelivery: ClientDelivery = clientDeliverySchema.parse({});

export function parseClientDelivery(value: unknown): ClientDelivery | undefined {
  if (value === undefined || value === null) return undefined;
  const result = clientDeliverySchema.safeParse(value);
  return result.success ? result.data : undefined;
}
