import { customerCommunicationsCapabilities } from "@/lib/customer-communications-policy";
import type { PoolClient } from "pg";
import { customerPortalCapabilities } from "@/lib/customer-portal-authorization";
import { clientProjectCapabilities } from "@/lib/client-project-data";
import { documentCapabilities } from "@/lib/document-approval";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { customerEnrollmentEnabled } from "@/lib/customer-enrollment-gate";
import { readinessWritesEnabled } from "@/lib/portal-readiness-schema";
import { readinessMigrationManifest } from "@/lib/portal-readiness-migrations";
import { readinessCatalog } from "@/lib/portal-readiness-catalog";
import {
  readinessDigest,
  type ReadinessInspection,
  type TechnicalFact,
} from "@/lib/portal-readiness-model";
export function createReadinessInspector(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return async (client: PoolClient): Promise<ReadinessInspection> => {
    const code = environment.VERCEL_GIT_COMMIT_SHA ?? environment.GITHUB_SHA;
    const configuration = environment.PORTAL_RELEASE_CONFIGURATION_ID;
    const disposable = readinessWritesEnabled(environment);
    const context = {
      releaseId: "customer-portal-v1" as const,
      codeRevision: code && /^[a-f0-9]{40}$/.test(code) ? code : null,
      schemaVersion: "0018" as const,
      schemaIdentity: readinessDigest(readinessMigrationManifest),
      configurationIdentity:
        configuration && /^[a-f0-9]{64}$/.test(configuration)
          ? configuration
          : null,
      environment: disposable
        ? ("disposable" as const)
        : ("unverified" as const),
    };
    const facts: TechnicalFact[] = readinessCatalog
      .filter((r) => r.kind === "technical" && r.scope === "global")
      .map((r) => ({
        id: r.id,
        status: "not_verified",
        fingerprint: readinessDigest([r.id, "unavailable"]),
        source: "unavailable-adapter",
      }));
    function set(
      id: string,
      status: TechnicalFact["status"],
      source: TechnicalFact["source"],
      fingerprint: unknown,
      justification?: TechnicalFact["justification"],
    ) {
      const at = facts.findIndex((f) => f.id === id);
      facts[at] = {
        id,
        status,
        source,
        fingerprint: readinessDigest(fingerprint),
        ...(justification ? { justification } : {}),
      };
    }
    set(
      "release.identity",
      context.codeRevision && context.configurationIdentity
        ? "passed"
        : "not_verified",
      "code-inspection",
      [context.codeRevision, context.configurationIdentity],
    );
    const disabled =
      Object.values(customerPortalCapabilities).every((v) => v === false) &&
      !clientProjectCapabilities.customerRead &&
      Object.values(documentCapabilities).every((v) => v === false) &&
      !customerEnrollmentEnabled({ NODE_ENV: "production" }) &&
      Object.values(customerCommunicationsCapabilities).every(
        (v) => v === false,
      );
    set(
      "code.disabled-routes",
      disabled ? "passed" : "blocked",
      "code-inspection",
      [
        customerPortalCapabilities,
        clientProjectCapabilities,
        documentCapabilities,
        customerCommunicationsCapabilities,
      ],
    );
    const isolated =
      customerAuthBoundary.databaseSchema === "customer_auth" &&
      customerAuthBoundary.cookiePrefix === "yorkstead-customer" &&
      customerAuthBoundary.basePath === "/api/customer-auth";
    set(
      "auth.isolation",
      isolated ? "passed" : "blocked",
      "code-inspection",
      customerAuthBoundary,
    );
    if (Object.values(documentCapabilities).every((v) => v === false))
      set(
        "documents.excluded",
        "not_applicable",
        "code-inspection",
        documentCapabilities,
        "documents-excluded",
      );
    for (const id of [
      "email.provider",
      "email.proof",
      "recovery.account",
      "email.webhook",
      "email.failure-handling",
      "email.controls",
    ])
      set(id, "blocked", "unavailable-adapter", [id, "no-live-integration"]);
    set("email.infrastructure", "not_verified", "code-inspection", [
      "cc012",
      "implemented-not-production-qualified",
      "0017",
    ]);
    if (disposable) {
      await client.query("SAVEPOINT readiness_schema");
      try {
        const rows = (
          await client.query<{ version: string; checksum: string }>(
            "SELECT version,checksum FROM application_migrations ORDER BY version LIMIT 19",
          )
        ).rows;
        const ledger = rows.map((r) => [r.version, r.checksum]);
        set(
          "schema.applied",
          JSON.stringify(ledger) === JSON.stringify(readinessMigrationManifest)
            ? "passed"
            : "blocked",
          "disposable-schema",
          ledger,
        );
        await client.query("RELEASE SAVEPOINT readiness_schema");
      } catch {
        await client.query("ROLLBACK TO SAVEPOINT readiness_schema");
        await client.query("RELEASE SAVEPOINT readiness_schema");
        set("schema.applied", "not_verified", "unavailable-adapter", [
          "schema",
          "unavailable",
        ]);
      }
    }
    return { context, facts };
  };
}
