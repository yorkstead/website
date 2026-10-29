import { z } from "zod";

const identifier = z.string().min(1).max(160);
const shortText = z.string().max(240);
const summaryText = z.string().max(700);
const isoTimestamp = z.string().datetime({ offset: true });

const SectionState = z.enum(["available", "unavailable"]);
const SectionBase = z.object({
  source: z.string().min(1).max(120),
  state: SectionState,
  checkedAt: isoTimestamp,
  truncated: z.boolean(),
  errorCode: z.string().max(80).nullable(),
});

const Capture = z.object({
  id: identifier,
  createdAt: isoTimestamp,
  status: z.string().max(40),
  classification: z.object({
    kind: z.string().max(40),
    title: shortText,
    summary: summaryText.nullable(),
    dueDate: z.string().max(40).nullable(),
    requiresConfirmation: z.boolean(),
  }),
});

const Activity = z.object({
  id: identifier,
  createdAt: isoTimestamp,
  automation: z.string().max(100),
  runId: z.string().max(160).nullable(),
  level: z.enum(["info", "warning", "error"]),
  stage: z.string().max(120),
  outcome: z.string().max(60),
  durationMs: z.number().int().nonnegative().nullable(),
  errorCode: z.string().max(100).nullable(),
});

const Review = z.object({
  id: identifier,
  createdAt: isoTimestamp,
  status: z.string().max(40),
  kind: z.string().max(40),
  title: shortText,
  summary: summaryText.nullable(),
});

const Task = z.object({
  id: identifier,
  listId: identifier,
  title: shortText,
  status: z.string().max(40),
  dueAt: isoTimestamp.nullable(),
  updatedAt: isoTimestamp,
});

const CaptureAction = z.object({
  id: identifier,
  commandId: identifier,
  captureId: identifier,
  createdAt: isoTimestamp,
  action: z.string().max(40),
  event: z.string().max(40),
  priorStatus: z.string().max(40).nullable(),
  resultingStatus: z.string().max(40).nullable(),
  destination: z.string().max(40).nullable(),
  resultCode: z.string().max(80).nullable(),
});

const ShoppingItem = z.object({
  id: identifier, captureId: identifier, name: z.string().max(160), category: z.string().max(80).nullable(),
  estimatedAmount: z.number().nonnegative().nullable(), currency: z.string().max(3).nullable(),
  priority: z.enum(["essential", "need", "want"]), priorityConfirmed: z.boolean(),
  scope: z.enum(["personal", "business"]).nullable(), scopeConfirmed: z.boolean(),
  timingIntent: z.enum(["next_payday", "this_week", "specific_date", "unscheduled"]), targetDate: z.string().max(10).nullable(),
  recurrenceRule: z.string().max(16).nullable(), state: z.enum(["planned", "purchased", "postponed", "cancelled"]),
  reviewState: z.enum(["needs_review", "approved"]), reviewReason: z.string().max(80).nullable(), revision: z.number().int().positive(),
  createdAt: isoTimestamp, completedAt: isoTimestamp.nullable(),
});
const Payday = z.object({
  timezone: z.string().max(40), weekday: z.number().int().min(1).max(7), enabled: z.boolean(),
  expectedAmount: z.number().nonnegative().nullable(), currency: z.string().max(3).nullable(), nextPayday: z.string().max(10).nullable(),
  revision: z.number().int().positive(), updatedAt: isoTimestamp.nullable(),
  records: z.array(z.object({id:identifier,date:z.string().max(10),status:z.enum(["expected","confirmed","skipped"]),expectedAmount:z.number().nonnegative().nullable(),confirmedAmount:z.number().nonnegative().nullable(),currency:z.string().max(3).nullable(),variableIncome:z.boolean(),receivedAt:isoTimestamp.nullable(),reservesConfirmed:z.boolean(),reserveAmount:z.number().nonnegative(),reserveCount:z.number().int().nonnegative(),revision:z.number().int().positive(),createdAt:isoTimestamp.nullable()})).max(13),
});
const ShoppingAudit = z.object({id:identifier,itemId:identifier.nullable(),paydayId:identifier.nullable(),actor:z.string().max(40),event:z.string().max(80),priorRevision:z.number().int().nullable(),resultingRevision:z.number().int().nullable(),priorState:z.string().max(24).nullable(),resultingState:z.string().max(24).nullable(),metadata:z.record(z.string(),z.unknown()),createdAt:isoTimestamp});

const AutomationHubSnapshot = z.object({
  contractVersion: z.literal(1),
  source: z.literal("Automation Hub"),
  generatedAt: isoTimestamp,
  captures: SectionBase.extend({ items: z.array(Capture).max(20) }),
  captureActions: SectionBase.extend({ items: z.array(CaptureAction).max(20) }).optional(),
  shopping: SectionBase.extend({ items: z.array(ShoppingItem).max(20) }).optional(),
  payday: SectionBase.extend({ items: z.array(Payday).max(20) }).optional(),
  shoppingAudit: SectionBase.extend({ items: z.array(ShoppingAudit).max(20) }).optional(),
  activity: SectionBase.extend({ items: z.array(Activity).max(20) }),
  integrationHealth: z.object({
    source: z.string().min(1).max(120),
    state: SectionState,
    checkedAt: isoTimestamp,
    database: z.enum(["healthy", "unavailable"]),
    googleTasks: z.enum(["healthy", "degraded", "not_configured", "not_checked"]),
    errorCode: z.string().max(80).nullable(),
  }),
  reviewQueue: SectionBase.extend({ items: z.array(Review).max(20) }),
  tasks: SectionBase.extend({ items: z.array(Task).max(20) }),
}).strip();

export type AutomationHubSnapshot = z.infer<typeof AutomationHubSnapshot>;
export type AutomationHubSection<T> = {
  source: string;
  state: "available" | "unavailable";
  checkedAt: string;
  truncated: boolean;
  errorCode: string | null;
  items: T[];
};

export type AutomationHubDataResult =
  | { state: "available"; checkedAt: string; data: AutomationHubSnapshot }
  | { state: "not_configured" | "unavailable" | "degraded"; checkedAt: string };

const HUB_ENDPOINT = "https://cal.yorkstead.com/api/integrations/website-automations";
const MAX_RESPONSE_BYTES = 256 * 1024;

async function readJsonLimited(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("response_too_large");
  if (!response.body) throw new Error("empty_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("response_too_large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

export async function getAutomationHubData(): Promise<AutomationHubDataResult> {
  const checkedAt = new Date().toISOString();
  const token = process.env.YORKSTEAD_AUTOMATIONS_READ_SECRET;
  if (!token || token.length < 32) return { state: "not_configured", checkedAt };

  try {
    const response = await fetch(HUB_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      // The Hub performs bounded OAuth and Google Tasks reads (up to 8s per provider hop).
      // Leave room for those reads while retaining a hard ceiling on this server request.
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return { state: response.status >= 500 ? "unavailable" : "degraded", checkedAt };
    const parsed = AutomationHubSnapshot.safeParse(await readJsonLimited(response));
    if (!parsed.success) return { state: "degraded", checkedAt };
    return { state: "available", checkedAt, data: parsed.data };
  } catch {
    return { state: "unavailable", checkedAt };
  }
}
