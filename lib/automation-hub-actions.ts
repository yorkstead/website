import { z } from 'zod';

const kinds = ['task', 'follow_up', 'calendar_request', 'lead', 'development_issue', 'idea', 'note'] as const;
export const AutomationHubCommand = z.discriminatedUnion('action', [
  z.object({ contractVersion: z.literal(1), captureId: z.uuid(), idempotencyKey: z.uuid(), expectedStatus: z.enum(['pending', 'needs_review']), expectedKind: z.enum(kinds), action: z.literal('approve_task') }).strict(),
  z.object({ contractVersion: z.literal(1), captureId: z.uuid(), idempotencyKey: z.uuid(), expectedStatus: z.enum(['pending', 'needs_review']), expectedKind: z.enum(kinds), action: z.enum(['reject', 'dismiss', 'stage_lead']) }).strict(),
  z.object({ contractVersion: z.literal(1), captureId: z.uuid(), idempotencyKey: z.uuid(), expectedStatus: z.enum(['pending', 'needs_review']), expectedKind: z.enum(kinds), action: z.literal('reclassify'), targetKind: z.enum(kinds) }).strict(),
]);

const Result = z.object({
  contractVersion: z.literal(1), commandId: z.string().uuid().optional(), auditId: z.string().uuid().optional(),
  captureId: z.string().uuid().optional(), action: z.string().max(40).optional(), status: z.string().max(40).optional(),
  destination: z.enum(['google_tasks', 'hub_crm_review', 'hub_capture_inbox']).nullable().optional(),
  resultCode: z.string().max(80).optional(), externalWriteStarted: z.boolean().optional(), retrySafe: z.boolean().optional(),
  taskId: z.string().max(160).nullable().optional(), error: z.string().max(80).optional(),
}).strip();
export type AutomationHubCommandInput = z.infer<typeof AutomationHubCommand>;
export type AutomationHubCommandResult = z.infer<typeof Result>;

const ENDPOINT = 'https://cal.yorkstead.com/api/integrations/website-automation-actions';

export async function postAutomationHubCommand(value: unknown): Promise<{ configured: boolean; httpStatus: number; result: AutomationHubCommandResult | null }> {
  const input = AutomationHubCommand.safeParse(value);
  if (!input.success) return { configured: true, httpStatus: 400, result: { contractVersion: 1, error: 'invalid_request' } };
  const token = process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET;
  if (!token || token.length < 32) return { configured: false, httpStatus: 503, result: { contractVersion: 1, error: 'integration_unconfigured' } };
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input.data), cache: 'no-store', signal: AbortSignal.timeout(18000),
    });
    const data = await response.json();
    const result = Result.safeParse(data);
    return { configured: true, httpStatus: response.status, result: result.success ? result.data : null };
  } catch {
    return { configured: true, httpStatus: 503, result: null };
  }
}
