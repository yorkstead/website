import { Resend } from "resend";
import type { Pool } from "pg";
import { z } from "zod";
import {
  communicationsDisposableEnabled,
  CommunicationsUnavailable,
} from "@/lib/customer-communications-policy";
import { mailDigest } from "@/lib/customer-mail";
import { mailTransaction, mailAudit } from "@/lib/customer-mail-queue";
import { readRequestTextWithLimit } from "@/lib/request-body";
export type DeliveryEvent =
  | "accepted"
  | "delayed"
  | "delivered"
  | "failed"
  | "bounced"
  | "complained";
const order: Record<string, number> = {
  unknown: 0,
  accepted: 1,
  delayed: 2,
  delivered: 3,
  failed: 4,
  bounced: 5,
  complained: 6,
};
export function nextMailDelivery(current: string, event: DeliveryEvent) {
  return (order[event] ?? 0) > (order[current] ?? 0) ? event : current;
}
export function verifyCustomerMailWebhook(
  payload: string,
  headers: Headers,
  secrets: readonly string[],
  now = Date.now(),
) {
  const id = z.string().min(1).max(200).parse(headers.get("svix-id"));
  const timestamp = headers.get("svix-timestamp"),
    signature = headers.get("svix-signature");
  if (
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    !signature ||
    signature.length > 4096 ||
    Math.abs(now - Number(timestamp) * 1000) > 300000 ||
    !secrets.length ||
    secrets.length > 2
  )
    throw new CommunicationsUnavailable();
  let verified: unknown;
  // Resend documents the SDK's Svix raw-body verification. No API key/network required.
  for (const secret of secrets) {
    try {
      verified = new Resend(
        "re_cc012_local_signature_verification",
      ).webhooks.verify({
        payload,
        headers: { id, timestamp, signature },
        webhookSecret: secret,
      });
      break;
    } catch {
      /* rotation overlap: try the one explicitly configured previous signing key */
    }
  }
  if (!verified) throw new CommunicationsUnavailable();
  const envelope = z.object({ type: z.string().max(80) }).parse(verified);
  if (
    ![
      "email.sent",
      "email.delivered",
      "email.delivery_delayed",
      "email.failed",
      "email.complained",
      "email.bounced",
    ].includes(envelope.type)
  )
    return null;
  const event = z
    .object({
      type: z.string().max(80),
      created_at: z.iso.datetime({ offset: true }),
      data: z.object({
        email_id: z.string().min(1).max(200),
        bounce: z.object({ type: z.string().max(80) }).optional(),
      }),
    })
    .parse(verified);
  const types: Record<string, DeliveryEvent> = {
    "email.sent": "accepted",
    "email.delivered": "delivered",
    "email.delivery_delayed": "delayed",
    "email.failed": "failed",
    "email.complained": "complained",
  };
  const kind =
    event.type === "email.bounced"
      ? event.data.bounce?.type === "Permanent"
        ? "bounced"
        : "delayed"
      : types[event.type];
  if (!kind) return null; // No opens, clicks, unknown events or raw event bodies retained.
  return {
    id,
    providerId: event.data.email_id,
    event: kind,
    at: event.created_at,
  };
}
export function createCustomerMailEventProcessor(
  pool: Pick<Pool, "connect">,
  env: NodeJS.ProcessEnv = process.env,
  provider: "fake" | "resend" = "resend",
) {
  return async (
    event: NonNullable<ReturnType<typeof verifyCustomerMailWebhook>>,
  ) => {
    if (!communicationsDisposableEnabled(env))
      throw new CommunicationsUnavailable();
    return mailTransaction(pool, async (client) => {
      const job = (
        await client.query<{ id: string; recipient: string; delivery: string }>(
          "SELECT id,recipient,delivery FROM customer_mail_jobs WHERE provider=$1 AND provider_id=$2 AND state='accepted' FOR UPDATE",
          [provider, event.providerId],
        )
      ).rows[0];
      // Event may beat the accepted-state commit. Ask provider to retry instead of losing it.
      if (!job) throw new CommunicationsUnavailable();
      const recorded = (
        await client.query(
          "INSERT INTO customer_mail_events(id,job_id,event,provider_created_at) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id",
          [event.id, job.id, event.event, event.at],
        )
      ).rows.length;
      if (!recorded) return { duplicate: true };
      const next = nextMailDelivery(job.delivery, event.event);
      await client.query(
        "UPDATE customer_mail_jobs SET delivery=$2 WHERE id=$1",
        [job.id, next],
      );
      if (event.event === "bounced" || event.event === "complained") {
        await client.query(
          `INSERT INTO customer_mail_suppressions(recipient_digest,reason) VALUES ($1,$2) ON CONFLICT(recipient_digest) DO UPDATE SET reason=CASE WHEN customer_mail_suppressions.reason='complained' THEN 'complained' ELSE EXCLUDED.reason END`,
          [mailDigest(job.recipient), event.event],
        );
      }
      await mailAudit(client, job.id, "webhook");
      return { duplicate: false };
    });
  };
}
export function createCustomerMailWebhookController(deps: {
  secrets: readonly string[];
  process: ReturnType<typeof createCustomerMailEventProcessor>;
  environment?: NodeJS.ProcessEnv;
}) {
  return async (request: Request) => {
    const response = (status: number) =>
      Response.json(
        { received: status === 200 },
        {
          status,
          headers: {
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
          },
        },
      );
    if (!communicationsDisposableEnabled(deps.environment ?? process.env))
      return response(404);
    if (request.method !== "POST") return response(405);
    const body = await readRequestTextWithLimit(request, 65536);
    if (!body.ok) return response(413);
    let event: ReturnType<typeof verifyCustomerMailWebhook>;
    try {
      event = verifyCustomerMailWebhook(
        body.value,
        request.headers,
        deps.secrets,
      );
    } catch {
      return response(400);
    }
    try {
      if (event) await deps.process(event);
      return response(200);
    } catch {
      return response(503);
    }
  };
}
