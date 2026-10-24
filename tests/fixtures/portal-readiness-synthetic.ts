// Synthetic trusted adapter/evidence only; never imported by application code.
import { readinessCatalog } from "../../lib/portal-readiness-catalog";
import {
  readinessDigest,
  releaseContextDigest,
  type ReadinessEvidence,
  type ReadinessInspection,
  type ReleaseContext,
} from "../../lib/portal-readiness-model";
export function syntheticInspection(
  seed = "fictional-release",
): ReadinessInspection {
  const context: ReleaseContext = {
    releaseId: "customer-portal-v1",
    codeRevision: readinessDigest([seed, "code"]).slice(0, 40),
    schemaVersion: "0016",
    schemaIdentity: readinessDigest([seed, "schema"]),
    configurationIdentity: readinessDigest([seed, "configuration"]),
    environment: "disposable",
  };
  return {
    context,
    facts: readinessCatalog
      .filter((r) => r.kind === "technical" && r.scope === "global")
      .map((r) => ({
        id: r.id,
        status: r.id === "documents.excluded" ? "not_applicable" : "passed",
        fingerprint: readinessDigest([seed, r.id]),
        source: "isolated-test-adapter",
        ...(r.id === "documents.excluded"
          ? { justification: "documents-excluded" as const }
          : {}),
      })),
  };
}
export function syntheticEvidence(
  inspection: ReadinessInspection,
  now: Date,
): ReadinessEvidence[] {
  return readinessCatalog
    .filter((r) => r.scope === "global")
    .map((r, n) => ({
      id: String(n + 1),
      requirementId: r.id,
      kind: r.kind,
      status: r.id === "documents.excluded" ? "not_applicable" : "passed",
      fingerprint:
        inspection.facts.find((f) => f.id === r.id)?.fingerprint ??
        readinessDigest([r.id, "manual"]),
      contextDigest: releaseContextDigest(inspection.context),
      source:
        r.kind === "manual" ? "owner-attestation" : "isolated-test-adapter",
      verifiedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + r.ttlSeconds * 1000).toISOString(),
      actor: "fictional-review-owner",
    }));
}
