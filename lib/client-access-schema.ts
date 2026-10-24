import { z } from "zod";
export const accessId = z
  .string()
  .min(1)
  .max(128)
  .refine((v) => v === v.trim());
export const accessProjectId = z
  .string()
  .min(1)
  .max(200)
  .refine((v) => v === v.trim());
const revision = z.number().int().positive();
const confirmation = { confirmed: z.literal(true), expectedRevision: revision };
export const clientAccessOperation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("createTenant"),
      tenantId: accessId,
      name: z.string().trim().min(1).max(200),
    })
    .strict(),
  z
    .object({
      action: z.literal("renameTenant"),
      tenantId: accessId,
      name: z.string().trim().min(1).max(200),
      expectedRevision: revision,
    })
    .strict(),
  z
    .object({
      action: z.literal("createMapping"),
      tenantId: accessId,
      projectId: accessProjectId,
    })
    .strict(),
  z
    .object({
      action: z.literal("archiveMapping"),
      tenantId: accessId,
      projectId: accessProjectId,
      ...confirmation,
    })
    .strict(),
  z
    .object({
      action: z.literal("revokeInvitation"),
      tenantId: accessId,
      invitationId: z.uuid(),
      ...confirmation,
    })
    .strict(),
  z
    .object({
      action: z.literal("revokeGrant"),
      tenantId: accessId,
      projectId: accessProjectId,
      identityId: accessId,
      ...confirmation,
    })
    .strict(),
  z
    .object({
      action: z.literal("suspendMembership"),
      tenantId: accessId,
      identityId: accessId,
      ...confirmation,
    })
    .strict(),
  z
    .object({
      action: z.literal("prepareInvitation"),
      tenantId: accessId,
      preparationId: z.uuid(),
      recipientEmail: z.string().trim().toLowerCase().pipe(z.email().max(320)),
      projectIds: z
        .array(accessProjectId)
        .min(1)
        .max(100)
        .refine((v) => new Set(v).size === v.length),
      expiresInSeconds: z.number().int().min(60).max(604800),
    })
    .strict(),
]);
export type ClientAccessOperation = z.infer<typeof clientAccessOperation>;
export const accessSelection = z
  .object({
    tenantId: accessId.optional(),
    page: z.coerce.number().int().min(0).max(10000).default(0),
    organizationPage: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();
export function clientAccessDisposableEnabled(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (
    env.NODE_ENV === "production" ||
    env.CLIENT_ACCESS_DISPOSABLE !== "enabled" ||
    !env.DATABASE_URL ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL
  )
    return false;
  try {
    const url = new URL(env.DATABASE_URL);
    return (
      // pg connection-string query options can override host/database/port.
      // Disposable mode accepts only a plain URL, never alternate routing options.
      url.search === "" &&
      url.hash === "" &&
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      /(test|disposable)/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
