// Trusted global review registry only; never queries/mutates customer records or feature gates.
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import {
  readinessCatalog,
  readinessRunbookSummary,
} from "@/lib/portal-readiness-catalog";
import {
  readinessOperation,
  digestSchema,
} from "@/lib/portal-readiness-schema";
import {
  assessReadiness,
  readinessDigest,
  releaseContextDigest,
  releaseContextSchema,
  type ReadinessEvidence,
  type ReadinessDecision,
  type ReadinessInspection,
} from "@/lib/portal-readiness-model";
export class ReadinessDenied extends Error {
  constructor() {
    super("Readiness operation unavailable");
  }
}
export class ReadinessConflict extends Error {
  constructor() {
    super("Readiness changed");
  }
}
export type ReadinessInspector = (
  client: PoolClient,
) => Promise<ReadinessInspection>;
const factSchema = z.object({
  id: z.string().max(80),
  status: z.enum(["passed", "blocked", "not_verified", "not_applicable"]),
  fingerprint: digestSchema,
  source: z.enum([
    "code-inspection",
    "disposable-schema",
    "unavailable-adapter",
    "isolated-test-adapter",
  ]),
  justification: z.literal("documents-excluded").optional(),
});
const noDecision: ReadinessDecision = {
  state: "none",
  digest: null,
  expiresAt: null,
  actor: null,
  at: null,
};
async function ownerSession(headers: Headers) {
  const { getOwnerSession } = await import("@/lib/owner-session");
  return getOwnerSession(headers);
}
export function createPortalReadinessService(
  pool: Pick<Pool, "connect">,
  inspector: ReadinessInspector,
  verifyOwner: DocumentOwnerVerifier = ownerSession,
  writesEnabled = false,
  clock = () => new Date(),
) {
  async function inspectSafe(client: PoolClient): Promise<ReadinessInspection> {
    const raw = await inspector(client);
    const parsed = z.array(factSchema).max(30).safeParse(raw.facts);
    return {
      context: releaseContextSchema.parse(raw.context),
      facts: parsed.success ? parsed.data : [],
    };
  }
  async function transaction<T>(
    headers: Headers,
    write: boolean,
    work: (client: PoolClient, actor: string) => Promise<T>,
  ) {
    const actor = (await verifyOwner(headers))?.user.id;
    if (
      !actor ||
      actor !== actor.trim() ||
      actor.length > 255 ||
      (write && !writesEnabled)
    )
      throw new ReadinessDenied();
    const client = await pool.connect();
    try {
      await client.query(
        write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      if (write)
        await client.query(
          "SELECT set_config('yorkstead.readiness_actor',$1,true)",
          [actor],
        );
      const result = await work(client, actor);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async function stored(
    client: PoolClient,
    contextDigest: string,
    lock = false,
  ) {
    return (
      await client.query(
        `SELECT id,revision,decision,decision_digest,decision_expires_at,actor_id,updated_at FROM portal_release_reviews WHERE context_digest=$1${lock ? " FOR UPDATE" : ""}`,
        [contextDigest],
      )
    ).rows[0];
  }
  async function assessment(
    client: PoolClient,
    inspection: ReadinessInspection,
    review: Awaited<ReturnType<typeof stored>>,
    now: Date,
  ) {
    const rows = review
      ? (
          await client.query(
            `SELECT DISTINCT ON(requirement_id) id::text,requirement_id,kind,status,fingerprint,context_digest,source,verified_at,expires_at,actor_id FROM portal_release_evidence WHERE review_id=$1 ORDER BY requirement_id,portal_release_evidence.id DESC`,
            [review.id],
          )
        ).rows
      : [];
    // Unknown rows cannot become evidence or leak payload; the registry has no arbitrary evidence payload column.
    const evidence: ReadinessEvidence[] = rows.map((r) => ({
      id: r.id,
      requirementId: r.requirement_id,
      kind: r.kind,
      status: r.status,
      fingerprint: r.fingerprint,
      contextDigest: r.context_digest,
      source: r.source,
      verifiedAt: r.verified_at.toISOString(),
      expiresAt: r.expires_at.toISOString(),
      actor: r.actor_id,
    }));
    const decision: ReadinessDecision =
      review && review.decision !== "none"
        ? {
            state: review.decision,
            digest: review.decision_digest,
            expiresAt: review.decision_expires_at?.toISOString() ?? null,
            actor: review.actor_id,
            at: review.updated_at.toISOString(),
          }
        : noDecision;
    return assessReadiness(inspection, evidence, decision, now);
  }
  return {
    async inspect(headers: Headers, page = 0) {
      z.number().int().min(0).max(10000).parse(page);
      return transaction(headers, false, async (client) => {
        const inspection = await inspectSafe(client),
          contextDigest = releaseContextDigest(inspection.context),
          review = await stored(client, contextDigest);
        const current = await assessment(client, inspection, review, clock());
        const history = (
          await client.query(
            "SELECT id,context_digest,code_revision,schema_version,schema_identity,configuration_identity,environment,revision,decision,actor_id,updated_at FROM portal_release_reviews ORDER BY updated_at DESC,id LIMIT 26 OFFSET $1",
            [page * 25],
          )
        ).rows;
        const audit = review
          ? (
              await client.query(
                "SELECT id::text,revision,event,from_decision,to_decision,assessment_digest,actor_id,created_at FROM portal_release_audit WHERE review_id=$1 ORDER BY portal_release_audit.id DESC LIMIT 26 OFFSET $2",
                [review.id, page * 25],
              )
            ).rows
          : [];
        return {
          assessment: current,
          revision: review?.revision ?? 0,
          writesEnabled,
          page,
          more: history.length > 25 || audit.length > 25,
          runbook: readinessRunbookSummary,
          history: history.slice(0, 25).map((r) => ({
            id: r.id,
            codeRevision: r.code_revision,
            schemaVersion: r.schema_version,
            schemaIdentity: r.schema_identity,
            configurationIdentity: r.configuration_identity,
            environment: r.environment,
            revision: r.revision,
            decision:
              r.context_digest === contextDigest
                ? current.decision.state
                : r.decision === "none"
                  ? "none"
                  : "stale",
            recordedDecision: r.decision,
            currentContext: r.context_digest === contextDigest,
            actor: r.actor_id,
            at: r.updated_at.toISOString(),
          })),
          audit: audit.slice(0, 25).map((a) => ({
            id: a.id,
            revision: a.revision,
            event: a.event,
            from: a.from_decision,
            to: a.to_decision,
            digest: a.assessment_digest,
            actor: a.actor_id,
            at: a.created_at.toISOString(),
          })),
        };
      });
    },
    async mutate(headers: Headers, value: unknown) {
      const input = readinessOperation.parse(value);
      return transaction(headers, true, async (client, actor) => {
        const first = await inspectSafe(client),
          contextDigest = releaseContextDigest(first.context);
        if (input.contextDigest !== contextDigest)
          throw new ReadinessConflict();
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [contextDigest],
        );
        let review = await stored(client, contextDigest, true);
        const inspection = await inspectSafe(client);
        if (
          releaseContextDigest(inspection.context) !== contextDigest ||
          (review?.revision ?? 0) !== input.expectedRevision
        )
          throw new ReadinessConflict();
        const now = clock(),
          current = await assessment(client, inspection, review, now);
        if (current.digest !== input.assessmentDigest)
          throw new ReadinessConflict();
        if (input.action === "approve" && !current.globalReady)
          throw new ReadinessDenied();
        if (
          input.action === "withdraw" &&
          (!review || ["none", "withdrawn"].includes(review.decision))
        )
          throw new ReadinessDenied();
        if (!review) {
          const c = inspection.context;
          review = (
            await client.query(
              `INSERT INTO portal_release_reviews(context_digest,release_id,code_revision,schema_version,schema_identity,configuration_identity,environment,actor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,revision`,
              [
                contextDigest,
                c.releaseId,
                c.codeRevision,
                c.schemaVersion,
                c.schemaIdentity,
                c.configurationIdentity,
                c.environment,
                actor,
              ],
            )
          ).rows[0];
        }
        const evidence = async (
          id: string,
          kind: "technical" | "manual",
          status: string,
          fingerprint: string,
          source: string,
          ttl: number,
        ) =>
          client.query(
            `INSERT INTO portal_release_evidence(review_id,context_digest,review_revision,requirement_id,kind,status,fingerprint,source,actor_id,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp()+$10*interval '1 second')`,
            [
              review.id,
              contextDigest,
              review.revision + 1,
              id,
              kind,
              status,
              fingerprint,
              source,
              actor,
              ttl,
            ],
          );
        if (input.action === "verify") {
          for (const def of readinessCatalog.filter(
            (r) => r.scope === "global" && r.kind === "technical",
          )) {
            const found = inspection.facts.filter((f) => f.id === def.id);
            const fact = found.length === 1 ? found[0] : undefined;
            const validNA =
              def.id === "documents.excluded" &&
              fact?.justification === "documents-excluded";
            await evidence(
              def.id,
              "technical",
              fact?.status === "not_applicable" && !validNA
                ? "not_verified"
                : (fact?.status ?? "not_verified"),
              fact?.fingerprint ?? readinessDigest([def.id, "missing"]),
              fact?.source ?? "unavailable-adapter",
              def.ttlSeconds,
            );
          }
        } else if (input.action === "attest") {
          const def = readinessCatalog.find(
            (r) => r.id === input.requirementId && r.kind === "manual",
          )!;
          await evidence(
            def.id,
            "manual",
            "passed",
            readinessDigest(["owner-attestation", def.id, contextDigest]),
            "owner-attestation",
            def.ttlSeconds,
          );
        }
        const event =
          input.action === "verify"
            ? "verified"
            : input.action === "attest"
              ? "attested"
              : input.action === "acknowledge"
                ? "acknowledged"
                : input.action === "approve"
                  ? "approved"
                  : "withdrawn";
        await client.query(
          "SELECT set_config('yorkstead.readiness_event',$1,true)",
          [event],
        );
        const decision = ["verified", "attested"].includes(event)
          ? "none"
          : event;
        const expiry =
          decision === "approved"
            ? current.expiresAt
            : new Date(now.getTime() + 3600000).toISOString();
        await client.query(
          "UPDATE portal_release_reviews SET decision=$2,decision_digest=$3,decision_expires_at=$4 WHERE id=$1",
          [
            review.id,
            decision,
            decision === "none" ? null : current.digest,
            decision === "none" ? null : expiry,
          ],
        );
      });
    },
  };
}
export type PortalReadinessView = Awaited<
  ReturnType<ReturnType<typeof createPortalReadinessService>["inspect"]>
>;
