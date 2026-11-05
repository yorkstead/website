import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, lstat, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalize, sha256, type CanonicalValue } from "./canonical";
import { CaptureError, verifyEvidenceIntegrity } from "./capture";

export type PrivateObjectStore = {
  put(key: string, filePath: string): Promise<void>;
  get(key: string, filePath: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export type AgeCommands = {
  encrypt(plainPath: string, cipherPath: string, recipient: string): Promise<void>;
  decrypt(cipherPath: string, plainPath: string, identityPath: string): Promise<void>;
};

function safeFailure(code: string): CaptureError {
  return new CaptureError(code);
}

function runAge(args: string[]) {
  const result = spawnSync("age", args, {
    encoding: "utf8",
    stdio: ["ignore", "ignore", "ignore"],
    timeout: 60_000,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", LANG: "C.UTF-8", NODE_ENV: "production" },
  });
  if (result.error || result.status !== 0) throw safeFailure("encryption_operation_failed");
}

export const systemAgeCommands: AgeCommands = {
  async encrypt(plainPath, cipherPath, recipient) {
    if (!/^age1[0-9a-z]{50,}$/.test(recipient)) throw safeFailure("age_recipient_invalid");
    runAge(["--encrypt", "--recipient", recipient, "--output", cipherPath, plainPath]);
  },
  async decrypt(cipherPath, plainPath, identityPath) {
    runAge(["--decrypt", "--identity", identityPath, "--output", plainPath, cipherPath]);
  },
};

async function assertPrivateDirectory(path: string) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw safeFailure("private_workspace_permissions_invalid");
  await chmod(path, 0o700);
}

export type PipelineOptions = {
  evidence: Record<string, unknown>;
  privateDirectory: string;
  objectKey: string;
  recipient: string;
  identityPath: string;
  store: PrivateObjectStore;
  age?: AgeCommands;
  now?: Date;
};

export type RedactedBaselineReport = {
  status: "PASS";
  capturedAtUtc: string;
  sourceVerification: "PASS";
  counts: { entries: 7; auditEvents: 11; orphanAudits: 0; migrations: 22; latestMigration: "0022"; migration0023Applied: false };
  integrity: { localCiphertext: "PASS"; independentRetrieval: "PASS"; decryption: "PASS"; evidenceFingerprint: "PASS"; triggerProtections: "PASS" };
  verificationMethod: "R2 GET + ciphertext SHA-256 + age decryption + canonical evidence SHA-256";
};

function validateBaselineEvidence(evidence: Record<string, unknown>) {
  const source = evidence.sourceIdentity as Record<string, unknown> | undefined;
  const migration = evidence.migrationState as Record<string, unknown> | undefined;
  const preservation = evidence.preservation as Record<string, unknown> | undefined;
  const role = evidence.roleVerification as Record<string, unknown> | undefined;
  const triggers = evidence.protectionTriggers;
  if (evidence.format !== "ys-sys-001-preservation-baseline/v1"
      || source?.provider !== "neon" || source.project !== "website" || source.branch !== "production" || typeof source.database !== "string" || !source.database
      || migration?.appliedCount !== 22 || migration.latestVersion !== "0022" || migration.migration0023Applied !== false
      || !Array.isArray(migration.migrations) || migration.migrations.length !== 22
      || preservation?.entryCount !== 7 || preservation.auditEventCount !== 11 || preservation.orphanAuditCount !== 0
      || !Array.isArray(preservation.entries) || preservation.entries.length !== 7
      || !Array.isArray(preservation.audits) || preservation.audits.length !== 11
      || !Array.isArray(preservation.auditFingerprints) || preservation.auditFingerprints.length !== 7
      || role?.writePrivileges !== false || !Array.isArray(triggers) || triggers.length !== 3
      || triggers.some((trigger) => !(trigger && typeof trigger === "object" && (trigger as Record<string, unknown>).enabled === "O"))) {
    throw safeFailure("baseline_evidence_scope_invalid");
  }
}

export async function encryptUploadRetrieveVerify(options: PipelineOptions): Promise<{ report: RedactedBaselineReport; ciphertextSha256: string; encryptedPath: string }> {
  if (!verifyEvidenceIntegrity(options.evidence)) throw safeFailure("evidence_fingerprint_invalid");
  validateBaselineEvidence(options.evidence);
  if (!/^ys-sys-001\/preservation-baseline\/v1\/[a-zA-Z0-9_-]+\.json\.age$/.test(options.objectKey)) throw safeFailure("object_key_invalid");
  await assertPrivateDirectory(options.privateDirectory);
  const age = options.age ?? systemAgeCommands;
  const runId = randomUUID();
  const plainPath = join(options.privateDirectory, `.capture-${runId}.json.partial`);
  const cipherPartial = join(options.privateDirectory, `.capture-${runId}.age.partial`);
  const cipherPath = join(options.privateDirectory, `capture-${runId}.json.age`);
  const retrievedPath = join(options.privateDirectory, `.retrieve-${runId}.age.partial`);
  const decryptedPath = join(options.privateDirectory, `.verify-${runId}.json.partial`);
  try {
    const plainBytes = Buffer.from(canonicalize(options.evidence as CanonicalValue), "utf8");
    await writeFile(plainPath, plainBytes, { flag: "wx", mode: 0o600 });
    await age.encrypt(plainPath, cipherPartial, options.recipient);
    const ciphertext = await readFile(cipherPartial);
    if (!ciphertext.subarray(0, 21).toString("utf8").startsWith("age-encryption.org/v1")) throw safeFailure("ciphertext_format_invalid");
    const ciphertextSha256 = sha256(ciphertext);
    await chmod(cipherPartial, 0o600);
    const { rename } = await import("node:fs/promises");
    await rename(cipherPartial, cipherPath);
    await rm(plainPath, { force: true });

    await options.store.put(options.objectKey, cipherPath);
    await options.store.get(options.objectKey, retrievedPath);
    const returnedCiphertext = await readFile(retrievedPath);
    if (sha256(returnedCiphertext) !== ciphertextSha256) throw safeFailure("retrieved_ciphertext_mismatch");
    await age.decrypt(retrievedPath, decryptedPath, options.identityPath);
    const decrypted = await readFile(decryptedPath);
    if (sha256(decrypted) !== sha256(plainBytes)) throw safeFailure("decrypted_evidence_mismatch");
    let checked: Record<string, unknown>;
    try { checked = JSON.parse(decrypted.toString("utf8")) as Record<string, unknown>; } catch { throw safeFailure("decrypted_evidence_invalid"); }
    if (!verifyEvidenceIntegrity(checked)) throw safeFailure("decrypted_evidence_fingerprint_invalid");
    const capturedAtUtc = String(checked.capturedAtUtc ?? "");
    if (!Number.isFinite(Date.parse(capturedAtUtc))) throw safeFailure("capture_timestamp_invalid");
    const report: RedactedBaselineReport = {
      status: "PASS",
      capturedAtUtc,
      sourceVerification: "PASS",
      counts: { entries: 7, auditEvents: 11, orphanAudits: 0, migrations: 22, latestMigration: "0022", migration0023Applied: false },
      integrity: { localCiphertext: "PASS", independentRetrieval: "PASS", decryption: "PASS", evidenceFingerprint: "PASS", triggerProtections: "PASS" },
      verificationMethod: "R2 GET + ciphertext SHA-256 + age decryption + canonical evidence SHA-256",
    };
    return { report, ciphertextSha256, encryptedPath: cipherPath };
  } catch (error) {
    // The provider may have accepted an object before a client-side interruption.
    // Delete only this run's unpredictable key on any failed round trip.
    await options.store.remove(options.objectKey).catch(() => undefined);
    if (error instanceof CaptureError) throw error;
    throw safeFailure("evidence_storage_verification_failed");
  } finally {
    await Promise.all([plainPath, cipherPartial, retrievedPath, decryptedPath].map((path) => rm(path, { force: true }).catch(() => undefined)));
  }
}
