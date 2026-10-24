import type { Pool } from "pg";
import { z } from "zod";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import { CommunicationsUnavailable } from "@/lib/customer-communications-policy";
import { mailTransaction } from "@/lib/customer-mail-queue";
export const communicationsSelection = z
  .object({ page: z.coerce.number().int().min(0).max(10000).default(0) })
  .strict();
export type CommunicationsView = {
  readOnly: true;
  productionDelivery: false;
  productionRecovery: false;
  provider: "Blocked — sender and provider require separate qualification";
  recovery: "Blocked — disposable password rehearsal only; lost-mailbox recovery unsupported";
  queue: { state: string; count: number; retries: number }[];
  delivery: { status: string; count: number }[];
  suppressions: { reason: string; count: number }[];
  jobs: {
    id: string;
    type: string;
    state: string;
    attempts: number;
    delivery: string;
    failure: string | null;
    createdAt: string;
    expiresAt: string;
  }[];
  audit: { id: string; event: string; at: string }[];
  page: number;
  hasMore: boolean;
};
export function createCustomerCommunicationsService(
  pool: Pick<Pool, "connect">,
  verifyOwner: DocumentOwnerVerifier,
) {
  return {
    async inspect(
      headers: Headers,
      value: unknown = {},
    ): Promise<CommunicationsView> {
      if (!(await verifyOwner(headers))?.user.id)
        throw new CommunicationsUnavailable();
      const { page } = communicationsSelection.parse(value);
      return mailTransaction(pool, async (client) => {
        await client.query(
          "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY",
        );
        const queue = (
          await client.query<{ state: string; count: number; retries: number }>(
            "SELECT state,count(*)::int AS count,COALESCE(sum(GREATEST(attempts-1,0)),0)::int AS retries FROM customer_mail_jobs GROUP BY state ORDER BY state",
          )
        ).rows;
        const delivery = (
          await client.query<{ status: string; count: number }>(
            "SELECT delivery AS status,count(*)::int AS count FROM customer_mail_jobs GROUP BY delivery ORDER BY delivery",
          )
        ).rows;
        const suppressions = (
          await client.query<{ reason: string; count: number }>(
            "SELECT reason,count(*)::int AS count FROM customer_mail_suppressions GROUP BY reason ORDER BY reason",
          )
        ).rows;
        const jobs = (
          await client.query<{
            id: string;
            type: string;
            state: string;
            attempts: number;
            delivery: string;
            failure: string | null;
            created_at: Date;
            expires_at: Date;
          }>(
            "SELECT id,type,state,attempts,delivery,failure,created_at,expires_at FROM customer_mail_jobs ORDER BY created_at DESC,id LIMIT 26 OFFSET $1",
            [page * 25],
          )
        ).rows;
        const audit = (
          await client.query<{ id: string; event: string; at: Date }>(
            "SELECT id::text,event,created_at AS at FROM customer_mail_audit ORDER BY customer_mail_audit.id DESC LIMIT 51 OFFSET $1",
            [page * 50],
          )
        ).rows;
        return {
          readOnly: true,
          productionDelivery: false,
          productionRecovery: false,
          provider:
            "Blocked — sender and provider require separate qualification",
          recovery:
            "Blocked — disposable password rehearsal only; lost-mailbox recovery unsupported",
          queue,
          delivery,
          suppressions,
          jobs: jobs.slice(0, 25).map((j) => ({
            id: j.id,
            type: j.type,
            state: j.state,
            attempts: j.attempts,
            delivery: j.delivery,
            failure: j.failure,
            createdAt: j.created_at.toISOString(),
            expiresAt: j.expires_at.toISOString(),
          })),
          audit: audit.slice(0, 50).map((a) => ({
            id: a.id,
            event: a.event,
            at: a.at.toISOString(),
          })),
          page,
          hasMore: jobs.length > 25 || audit.length > 50,
        };
      });
    },
  };
}
export function createCustomerCommunicationsController(deps: {
  verifyOwner: DocumentOwnerVerifier;
  service: ReturnType<typeof createCustomerCommunicationsService>;
}) {
  return async (request: Request) => {
    const json = (value: unknown, status = 200) =>
      Response.json(value, {
        status,
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      });
    try {
      if (!(await deps.verifyOwner(request.headers)))
        return json({ error: "Owner access required" }, 401);
      if (request.headers.get("sec-fetch-site") === "cross-site")
        return json({ error: "Request unavailable" }, 403);
      if (request.method !== "GET")
        return json({ error: "Communications are read-only" }, 405);
      const url = new URL(request.url);
      if (
        [...url.searchParams.keys()].some(
          (k) => url.searchParams.getAll(k).length !== 1,
        )
      )
        return json({ error: "Invalid request" }, 400);
      return json(
        await deps.service.inspect(
          request.headers,
          Object.fromEntries(url.searchParams),
        ),
      );
    } catch (error) {
      if (error instanceof z.ZodError)
        return json({ error: "Invalid request" }, 400);
      if (error instanceof CommunicationsUnavailable)
        return json({ error: "Owner access required" }, 403);
      return json({ error: "Communications temporarily unavailable" }, 503);
    }
  };
}
