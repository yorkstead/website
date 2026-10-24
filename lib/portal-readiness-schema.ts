import { z } from "zod";
import { manualReadinessIds } from "@/lib/portal-readiness-catalog";
import { clientAccessDisposableEnabled } from "@/lib/client-access-schema";
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const preconditions = {
  expectedRevision: z.number().int().nonnegative(),
  contextDigest: digestSchema,
  assessmentDigest: digestSchema,
  confirmed: z.literal(true),
};
export const readinessOperation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify"), ...preconditions }).strict(),
  ...(["acknowledge", "approve", "withdraw"] as const).map((action) =>
    z.object({ action: z.literal(action), ...preconditions }).strict(),
  ),
  z
    .object({
      action: z.literal("attest"),
      requirementId: z.enum(manualReadinessIds),
      ...preconditions,
    })
    .strict(),
]);
export type ReadinessOperation = z.infer<typeof readinessOperation>;
export function readinessWritesEnabled(env: NodeJS.ProcessEnv = process.env) {
  return clientAccessDisposableEnabled({
    ...env,
    CLIENT_ACCESS_DISPOSABLE: env.PORTAL_READINESS_DISPOSABLE,
  });
}
