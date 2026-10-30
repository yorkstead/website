import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import {
  assessReadiness,
  readinessDigest,
  type ReadinessDecision,
} from "@/lib/portal-readiness-model";
import { readinessWritesEnabled } from "@/lib/portal-readiness-schema";
import { readinessCatalog } from "@/lib/portal-readiness-catalog";
import { readinessMigrationManifest } from "@/lib/portal-readiness-migrations";
import { parseMigration } from "@/scripts/migration-plan";
import {
  syntheticEvidence,
  syntheticInspection,
} from "./fixtures/portal-readiness-synthetic";
const now = new Date("2026-10-24T12:00:00Z");
const none: ReadinessDecision = {
  state: "none",
  digest: null,
  expiresAt: null,
  actor: null,
  at: null,
};
describe("versioned deterministic release readiness", () => {
  test("mandatory missing evidence blocks; no customer becomes eligible; reproducible contract", () => {
    const i = syntheticInspection(),
      a = assessReadiness(i, [], none, now);
    expect(a.globalReady).toBe(false);
    expect(a.launchReady).toBe(false);
    expect(a.customerAccessEnabled).toBe(false);
    expect(a.customerBlockers).toHaveLength(3);
    expect(a).toEqual(assessReadiness(i, [], none, now));
    expect(new Set(readinessCatalog.map((r) => r.id)).size).toBe(
      readinessCatalog.length,
    );
  });
  test("complete global evidence permits review approval while customer blockers remain", () => {
    const i = syntheticInspection(),
      e = syntheticEvidence(i, now),
      a = assessReadiness(i, e, none, now);
    expect(a.globalReady).toBe(true);
    expect(
      a.requirements.find((r) => r.id === "documents.excluded")?.status,
    ).toBe("not_applicable");
    const approved = assessReadiness(
      i,
      e,
      {
        state: "approved",
        digest: a.digest,
        expiresAt: a.expiresAt,
        actor: "fictional-owner",
        at: now.toISOString(),
      },
      now,
    );
    expect(approved.decision.current).toBe(true);
    expect(approved.launchReady).toBe(false);
    expect(approved.customerBlockers).toHaveLength(3);
  });
  test("expiry and changed observations invalidate exact approval without writes", () => {
    const i = syntheticInspection(),
      e = syntheticEvidence(i, now),
      a = assessReadiness(i, e, none, now),
      decision: ReadinessDecision = {
        state: "approved",
        digest: a.digest,
        expiresAt: a.expiresAt,
        actor: "fictional-owner",
        at: now.toISOString(),
      };
    expect(
      assessReadiness(i, e, decision, new Date(now.getTime() + 3600001))
        .decision.state,
    ).toBe("stale");
    for (const status of ["blocked", "not_verified"] as const) {
      const changed = {
        ...i,
        facts: i.facts.map((f) =>
          f.id === "email.provider" ? { ...f, status } : f,
        ),
      };
      const b = assessReadiness(changed, e, decision, now);
      expect(b.globalReady).toBe(false);
      expect(b.decision.state).toBe("stale");
    }
    const fingerprint = {
      ...i,
      facts: i.facts.map((f) =>
        f.id === "email.provider"
          ? { ...f, fingerprint: readinessDigest("changed") }
          : f,
      ),
    };
    expect(assessReadiness(fingerprint, e, decision, now).globalReady).toBe(
      false,
    );
  });
  test("commit/schema/configuration changes cannot reuse evidence or approvals", () => {
    const i = syntheticInspection(),
      e = syntheticEvidence(i, now),
      a = assessReadiness(i, e, none, now),
      decision: ReadinessDecision = {
        state: "approved",
        digest: a.digest,
        expiresAt: a.expiresAt,
        actor: "owner",
        at: now.toISOString(),
      };
    for (const key of [
      "codeRevision",
      "schemaIdentity",
      "configurationIdentity",
    ] as const) {
      const changed = {
        ...i,
        context: {
          ...i.context,
          [key]: key === "codeRevision" ? "f".repeat(40) : "f".repeat(64),
        },
      };
      const b = assessReadiness(changed, e, decision, now);
      expect(b.globalReady).toBe(false);
      expect(b.decision.state).toBe("stale");
    }
    expect(() =>
      assessReadiness(
        { ...i, context: { ...i.context, schemaVersion: "0019" } as never },
        e,
        decision,
        now,
      ),
    ).toThrow();
  });
  test("manual technical substitution, future evidence, duplicate observations and critical N/A fail closed", () => {
    const i = syntheticInspection(),
      e = syntheticEvidence(i, now);
    for (const change of [
      { kind: "manual" as const, source: "owner-attestation" as const },
      { verifiedAt: new Date(now.getTime() + 1000).toISOString() },
      { expiresAt: now.toISOString() },
    ]) {
      const rows = e.map((r) =>
        r.requirementId === "email.provider" ? { ...r, ...change } : r,
      );
      expect(assessReadiness(i, rows, none, now).globalReady).toBe(false);
    }
    const duplicates = { ...i, facts: [...i.facts, i.facts[0]] };
    expect(assessReadiness(duplicates, e, none, now).globalReady).toBe(false);
    const na = {
      ...i,
      facts: i.facts.map((f) =>
        f.id === "email.provider"
          ? {
              ...f,
              status: "not_applicable" as const,
              justification: "documents-excluded" as const,
            }
          : f,
      ),
    };
    expect(assessReadiness(na, e, none, now).globalReady).toBe(false);
  });
  test("missing context identity and acknowledgments cannot manufacture readiness", () => {
    const i = syntheticInspection(),
      e = syntheticEvidence(i, now),
      a = assessReadiness(i, [], none, now);
    const ack = assessReadiness(
      i,
      [],
      {
        state: "acknowledged",
        digest: a.digest,
        expiresAt: new Date(now.getTime() + 3600000).toISOString(),
        actor: "owner",
        at: now.toISOString(),
      },
      now,
    );
    expect(ack.decision.current).toBe(true);
    expect(ack.globalReady).toBe(false);
    expect(
      assessReadiness(
        { ...i, context: { ...i.context, configurationIdentity: null } },
        e,
        none,
        now,
      ).globalReady,
    ).toBe(false);
  });
  test("disposable writes reject production, remote routing and absent opt-in", () => {
    const env = {
      NODE_ENV: "development" as const,
      PORTAL_READINESS_DISPOSABLE: "enabled",
      DATABASE_URL: "postgresql://localhost/portal_test",
      TEST_DATABASE_URL: "postgresql://localhost/portal_test",
    };
    expect(readinessWritesEnabled(env)).toBe(true);
    expect(readinessWritesEnabled({ ...env, NODE_ENV: "production" })).toBe(
      false,
    );
    for (const url of [
      "postgresql://remote.test/portal_test",
      "postgresql://localhost/portal_test?host=remote.test",
      "postgresql://localhost/portal_test?%68ost=remote.test",
      "postgresql://localhost/portal_test#fragment",
    ])
      expect(
        readinessWritesEnabled({
          ...env,
          DATABASE_URL: url,
          TEST_DATABASE_URL: url,
        }),
      ).toBe(false);
    expect(
      readinessWritesEnabled({
        ...env,
        PORTAL_READINESS_DISPOSABLE: undefined,
      }),
    ).toBe(false);
  });
  test("release manifest matches every original migration checksum exactly", async () => {
    const files = (await readdir("migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const actual = [];
    for (const file of files) {
      const m = parseMigration(
        file,
        await readFile(`migrations/${file}`, "utf8"),
      );
      actual.push([m.version, m.checksum]);
    }
    expect(actual).toEqual(readinessMigrationManifest.map((row) => [...row]));
    expect(actual).toHaveLength(21);
  });
});

test("same-status observation changes invalidate acknowledgments and assessment preconditions", () => {
  for (const status of ["blocked", "not_verified"] as const) {
    const initial = syntheticInspection();
    const inspection = {
      ...initial,
      facts: initial.facts.map((f) =>
        f.id === "email.provider" ? { ...f, status } : f,
      ),
    };
    for (const evidence of [
      [],
      syntheticEvidence(inspection, now).map((e) =>
        e.requirementId === "email.provider" ? { ...e, status } : e,
      ),
    ]) {
      const before = assessReadiness(inspection, evidence, none, now);
      const decision: ReadinessDecision = {
        state: "acknowledged",
        digest: before.digest,
        expiresAt: new Date(now.getTime() + 3600000).toISOString(),
        actor: "fictional-owner",
        at: now.toISOString(),
      };
      expect(
        assessReadiness(inspection, evidence, decision, now).decision.current,
      ).toBe(true);
      const changed = {
        ...inspection,
        facts: inspection.facts.map((f) =>
          f.id === "email.provider"
            ? { ...f, fingerprint: readinessDigest("new-observation") }
            : f,
        ),
      };
      const after = assessReadiness(changed, evidence, decision, now);
      expect(
        after.requirements.find((r) => r.id === "email.provider")?.status,
      ).toBe(status);
      expect(after.digest).not.toBe(before.digest);
      expect(after.decision.state).toBe("stale");
    }
  }
});

test("selected evidence fingerprints stale same-status acknowledgments independently of live observations", () => {
  for (const status of ["blocked", "not_verified"] as const) {
    const initial = syntheticInspection();
    const inspection = {
      ...initial,
      facts: initial.facts.map((f) =>
        f.id === "email.provider" ? { ...f, status } : f,
      ),
    };
    const rows = syntheticEvidence(inspection, now).map((e) =>
      e.requirementId === "email.provider" ? { ...e, status } : e,
    );
    const before = assessReadiness(inspection, rows, none, now);
    const decision: ReadinessDecision = {
      state: "acknowledged",
      digest: before.digest,
      expiresAt: new Date(now.getTime() + 3600000).toISOString(),
      actor: "fictional-owner",
      at: now.toISOString(),
    };
    const changed = rows.map((e) =>
      e.requirementId === "email.provider"
        ? { ...e, fingerprint: readinessDigest("changed-evidence-only") }
        : e,
    );
    const after = assessReadiness(inspection, changed, decision, now);
    expect(
      after.requirements.find((r) => r.id === "email.provider")?.status,
    ).toBe(status);
    expect(after.digest).not.toBe(before.digest);
    expect(after.decision.state).toBe("stale");
  }
});

test("material attestation identity changes invalidate approved reviews while global statuses remain passed", () => {
  const inspection = syntheticInspection(),
    rows = syntheticEvidence(inspection, now),
    before = assessReadiness(inspection, rows, none, now);
  const approved: ReadinessDecision = {
    state: "approved",
    digest: before.digest,
    expiresAt: before.expiresAt,
    actor: "fictional-owner",
    at: now.toISOString(),
  };
  const after = assessReadiness(
    inspection,
    rows.map((e) =>
      e.requirementId === "security.review"
        ? { ...e, fingerprint: readinessDigest("new-attestation-identity") }
        : e,
    ),
    approved,
    now,
  );
  expect(after.globalReady).toBe(true);
  expect(after.digest).not.toBe(before.digest);
  expect(after.decision.state).toBe("stale");
});

test("digest is deterministic across observation ordering, duplicate ordering and property ordering", () => {
  const inspection = syntheticInspection(),
    rows = syntheticEvidence(inspection, now);
  const before = assessReadiness(inspection, rows, none, now);
  const reordered = {
    context: { ...inspection.context },
    facts: [...inspection.facts].reverse().map((f) => ({
      source: f.source,
      fingerprint: f.fingerprint,
      status: f.status,
      id: f.id,
      ...(f.justification ? { justification: f.justification } : {}),
    })),
  };
  const reorderedEvidence = [...rows].reverse().map((e) => ({
    actor: e.actor,
    expiresAt: e.expiresAt,
    verifiedAt: e.verifiedAt,
    source: e.source,
    contextDigest: e.contextDigest,
    fingerprint: e.fingerprint,
    status: e.status,
    kind: e.kind,
    requirementId: e.requirementId,
    id: e.id,
  }));
  expect(assessReadiness(reordered, reorderedEvidence, none, now).digest).toBe(
    before.digest,
  );
  const duplicates = {
    ...inspection,
    facts: [
      ...inspection.facts,
      inspection.facts[0],
      { ...inspection.facts[0], fingerprint: "f".repeat(64) },
    ],
  };
  expect(
    assessReadiness(
      { ...duplicates, facts: [...duplicates.facts].reverse() },
      rows,
      none,
      now,
    ).digest,
  ).toBe(assessReadiness(duplicates, rows, none, now).digest);
});

test("refreshing evidence invalidates approval without changing live facts or passed requirement statuses", () => {
  const inspection = syntheticInspection(),
    rows = syntheticEvidence(inspection, now),
    before = assessReadiness(inspection, rows, none, now);
  const approved: ReadinessDecision = {
    state: "approved",
    digest: before.digest,
    expiresAt: before.expiresAt,
    actor: "fictional-owner",
    at: now.toISOString(),
  };
  const refreshed = rows.map((e) => ({
    ...e,
    id: `renewed-${e.id}`,
    verifiedAt: new Date(now.getTime() + 1000).toISOString(),
    expiresAt: new Date(Date.parse(e.expiresAt) + 1000).toISOString(),
  }));
  const after = assessReadiness(
    inspection,
    refreshed,
    approved,
    new Date(now.getTime() + 2000),
  );
  expect(after.globalReady).toBe(true);
  expect(after.requirements.map((r) => r.status)).toEqual(
    before.requirements.map((r) => r.status),
  );
  expect(after.digest).not.toBe(before.digest);
  expect(after.decision.state).toBe("stale");
});
