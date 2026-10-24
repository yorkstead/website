import { createHash } from "node:crypto";
import { z } from "zod";
import {
  readinessCatalog,
  type ReadinessStatus,
} from "@/lib/portal-readiness-catalog";
import { digestSchema } from "@/lib/portal-readiness-schema";
export const releaseContextSchema = z
  .object({
    releaseId: z.literal("customer-portal-v1"),
    codeRevision: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .nullable(),
    schemaVersion: z.enum(["0016", "0017"]),
    schemaIdentity: digestSchema,
    configurationIdentity: digestSchema.nullable(),
    environment: z.enum(["disposable", "unverified"]),
  })
  .strict();
export type ReleaseContext = z.infer<typeof releaseContextSchema>;
export const readinessDigest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function releaseContextDigest(value: ReleaseContext) {
  const c = releaseContextSchema.parse(value);
  return readinessDigest([
    1,
    c.releaseId,
    c.codeRevision,
    c.schemaVersion,
    c.schemaIdentity,
    c.configurationIdentity,
    c.environment,
  ]);
}
export type TechnicalFact = {
  id: string;
  status: ReadinessStatus;
  fingerprint: string;
  source:
    | "code-inspection"
    | "disposable-schema"
    | "unavailable-adapter"
    | "isolated-test-adapter";
  justification?: "documents-excluded";
};
export type ReadinessEvidence = {
  id: string;
  requirementId: string;
  kind: "technical" | "manual";
  status: ReadinessStatus;
  fingerprint: string;
  contextDigest: string;
  source: TechnicalFact["source"] | "owner-attestation";
  verifiedAt: string;
  expiresAt: string;
  actor: string;
};
export type ReadinessDecision = {
  state: "none" | "acknowledged" | "approved" | "withdrawn";
  digest: string | null;
  expiresAt: string | null;
  actor: string | null;
  at: string | null;
};
export type ReadinessInspection = {
  context: ReleaseContext;
  facts: TechnicalFact[];
};
export function assessReadiness(
  inspection: ReadinessInspection,
  evidence: ReadinessEvidence[],
  decision: ReadinessDecision,
  now: Date,
) {
  const context = releaseContextSchema.parse(inspection.context),
    contextDigest = releaseContextDigest(context),
    time = now.getTime();
  if (!Number.isFinite(time)) throw new Error("Invalid trusted clock");
  const requirements = readinessCatalog.map((def) => {
    const current = inspection.facts.filter((f) => f.id === def.id);
    const fact = current.length === 1 ? current[0] : undefined;
    const latest = evidence
      .filter(
        (e) => e.requirementId === def.id && e.contextDigest === contextDigest,
      )
      .at(-1);
    const verified = latest ? Date.parse(latest.verifiedAt) : NaN,
      expires = latest ? Date.parse(latest.expiresAt) : NaN;
    const fresh = Boolean(
      latest &&
      Number.isFinite(verified) &&
      Number.isFinite(expires) &&
      verified <= time &&
      expires > time &&
      expires > verified &&
      expires - verified <= def.ttlSeconds * 1000,
    );
    let status: ReadinessStatus = "not_verified",
      reason = "Current matching evidence has not been recorded";
    if (def.scope === "customer") {
      reason =
        "Separate customer-specific review is required; global approval does not qualify a customer";
    } else if (def.kind === "manual") {
      if (
        fresh &&
        latest?.kind === "manual" &&
        latest.source === "owner-attestation" &&
        latest.status === "passed"
      ) {
        status = "passed";
        reason = "Owner attestation recorded; not a technical verification";
      } else if (latest) {
        reason = "Owner attestation is stale or expired";
      }
    } else if (fact && digestSchema.safeParse(fact.fingerprint).success) {
      if (fact.status === "blocked") {
        status = "blocked";
        reason = "Trusted adapter reports an unresolved blocker";
      } else if (fact.status === "not_verified") {
        reason =
          "Environment-specific verification is unavailable or incomplete";
      } else if (
        fresh &&
        latest?.kind === "technical" &&
        latest.status === fact.status &&
        latest.fingerprint === fact.fingerprint &&
        latest.source === fact.source
      ) {
        if (fact.status === "passed") {
          status = "passed";
          reason = "Current server verification evidence matches";
        } else if (
          !def.mandatory &&
          fact.status === "not_applicable" &&
          fact.justification === "documents-excluded"
        ) {
          status = "not_applicable";
          reason =
            "Document sharing and customer approvals are explicitly excluded from this release";
        }
      } else if (latest) {
        reason =
          "Technical evidence is stale, expired or no longer matches the trusted observation";
      }
    }
    if (
      def.id === "release.identity" &&
      (!context.codeRevision || !context.configurationIdentity)
    ) {
      status = "not_verified";
      reason =
        "Exact code revision or reviewed configuration identity is unavailable";
    }
    return {
      ...def,
      // Bind the live observation even when its derived/displayed status stays blocked/unknown.
      // Fixed-field projection plus ordinal sorting is deterministic and exposes only a digest.
      observationDigest: readinessDigest(
        current
          .map((f) =>
            JSON.stringify([
              f.status,
              f.fingerprint,
              f.source,
              f.justification ?? null,
            ]),
          )
          .sort(),
      ),
      // Bind the selected immutable evidence snapshot independently of its displayed status.
      // Actor/provenance/time/context are fixed-field inputs; no arbitrary payload is hashed.
      evidenceDigest: readinessDigest(
        latest
          ? [
              latest.id,
              latest.requirementId,
              latest.kind,
              latest.status,
              latest.fingerprint,
              latest.contextDigest,
              latest.source,
              latest.verifiedAt,
              latest.expiresAt,
              latest.actor,
            ]
          : null,
      ),
      status,
      reason,
      evidenceId: latest?.id ?? null,
      source: latest?.source ?? fact?.source ?? "unavailable-adapter",
      evidenceActor: latest?.actor ?? null,
      verifiedAt: latest?.verifiedAt ?? null,
      expiresAt: latest?.expiresAt ?? null,
    };
  });
  const globalReady = requirements
    .filter((r) => r.scope === "global" && r.mandatory)
    .every((r) => r.status === "passed");
  const digest = readinessDigest([
    1,
    readinessDigest(readinessCatalog),
    contextDigest,
    requirements.map((r) => [
      r.id,
      r.observationDigest,
      r.evidenceDigest,
      r.status,
      r.reason,
      r.evidenceId,
      r.source,
      r.verifiedAt,
      r.expiresAt,
    ]),
  ]);
  const expiresAt = globalReady
    ? new Date(
        Math.min(
          ...requirements
            .filter((r) => r.scope === "global" && r.mandatory)
            .map((r) => Date.parse(r.expiresAt!)),
        ),
      ).toISOString()
    : null;
  const decisionCurrent =
    decision.state !== "none" &&
    decision.digest === digest &&
    Boolean(decision.expiresAt && Date.parse(decision.expiresAt) > time) &&
    (decision.state !== "approved" || globalReady);
  return {
    version: 1 as const,
    context,
    contextDigest,
    digest,
    assessedAt: now.toISOString(),
    requirements,
    globalReady,
    launchReady: false as const,
    customerAccessEnabled: false as const,
    expiresAt,
    decision: {
      ...decision,
      current: decisionCurrent,
      state:
        decision.state === "none"
          ? "none"
          : decisionCurrent
            ? decision.state
            : "stale",
    },
    criticalBlockers: requirements
      .filter(
        (r) => r.scope === "global" && r.mandatory && r.status !== "passed",
      )
      .map((r) => r.id),
    customerBlockers: requirements
      .filter((r) => r.scope === "customer" && r.status !== "passed")
      .map((r) => r.id),
  };
}
export type ReadinessAssessment = ReturnType<typeof assessReadiness>;
