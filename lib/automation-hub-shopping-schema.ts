import { z } from 'zod';
const base={contractVersion:z.literal(2),idempotencyKey:z.uuid()};
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const parsed=new Date(`${value}T00:00:00.000Z`);return Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value;});
const changes=z.object({name:z.string().trim().min(1).max(160).optional(),category:z.string().trim().max(80).nullable().optional(),estimatedAmount:z.number().min(0).nullable().optional(),currency:z.string().regex(/^[A-Z]{3}$/).nullable().optional(),priority:z.enum(['essential','need','want']).optional(),priorityConfirmed:z.boolean().optional(),scope:z.enum(['personal','business']).nullable().optional(),scopeConfirmed:z.boolean().optional(),timingIntent:z.enum(['next_payday','this_week','specific_date','unscheduled']).optional(),targetDate:date.nullable().optional(),recurrenceRule:z.enum(['week','month','quarter','year']).nullable().optional()}).strict();
const itemCommand=z.object({...base,action:z.enum(['review','update','purchase','unpurchase','postpone','cancel','skip','repeat']),itemId:z.uuid(),expectedRevision:z.number().int().positive(),changes:changes.optional()}).strict();
const splitCommand=z.object({...base,action:z.literal('split'),itemId:z.uuid(),expectedRevision:z.number().int().positive(),names:z.array(z.string().trim().min(1).max(160)).min(2).max(8)}).strict();
const mergeCommand=z.object({...base,action:z.literal('merge'),itemId:z.uuid(),expectedRevision:z.number().int().positive(),name:z.string().trim().min(1).max(160),otherItems:z.array(z.object({id:z.uuid(),revision:z.number().int().positive()}).strict()).min(1).max(7)}).strict();
const reserve=z.object({label:z.string().trim().min(1).max(100),amount:z.number().min(0),currency:z.string().regex(/^[A-Z]{3}$/),essential:z.boolean()}).strict();
export const AutomationHubShoppingCommand=z.discriminatedUnion('action',[
 itemCommand,splitCommand,mergeCommand,
 z.object({...base,action:z.literal('set_payday'),expectedRevision:z.number().int().min(0),enabled:z.boolean(),expectedAmount:z.number().min(0).nullable(),currency:z.string().regex(/^[A-Z]{3}$/).nullable(),nextPayday:date.refine(value=>new Date(`${value}T12:00:00Z`).getUTCDay()===1).nullable()}).strict().refine(value=>!value.enabled||value.nextPayday!==null),
 z.object({...base,action:z.literal('confirm_payday'),expectedRevision:z.number().int().min(0),paydayDate:date,confirmedAmount:z.number().min(0),currency:z.string().regex(/^[A-Z]{3}$/),variableIncome:z.boolean(),reservesConfirmed:z.literal(true),reserves:z.array(reserve).max(20)}).strict(),
 z.object({...base,action:z.literal('set_reserves'),paydayId:z.uuid(),expectedRevision:z.number().int().positive(),reservesConfirmed:z.literal(true),reserves:z.array(reserve).max(20)}).strict(),
]);
export type AutomationHubShoppingCommandInput=z.infer<typeof AutomationHubShoppingCommand>;

export const AutomationHubShoppingResult=z.object({contractVersion:z.literal(2),commandId:z.string().uuid().optional(),itemId:z.string().uuid().optional(),status:z.string().max(32).optional(),resultCode:z.string().max(80).optional(),retrySafe:z.boolean().optional(),idempotentReplay:z.boolean().optional(),error:z.string().max(80).optional()}).strip();
