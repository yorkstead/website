import { readFile, readdir } from "node:fs/promises";
import { isIPv4 } from "node:net";
import { resolve } from "node:path";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";

const mode = process.env.YS_APP_RECOVERY_MODE;
const host = process.env.YS_APP_RECOVERY_DB_HOST ?? "";
const port = process.env.YS_APP_RECOVERY_DB_PORT ?? "";
const user = process.env.YS_APP_RECOVERY_DB_USER ?? "";
const password = process.env.YS_APP_RECOVERY_DB_PASSWORD ?? "";
const database = process.env.YS_APP_RECOVERY_DB_NAME ?? "";
const phase = process.env.YS_APP_RECOVERY_PHASE;
function isPrivateIPv4(value: string) {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
if (process.env.CI !== "true" || process.env.GITHUB_ACTIONS !== "true" || mode !== "synthetic-internal-docker-v1" || !["before", "after"].includes(phase ?? "")
  || !isPrivateIPv4(host) || !/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535
  || !/^recovery_[a-f0-9]{24}$/.test(database) || !/^recovery_[a-f0-9]{16}$/.test(user) || !/^[a-f0-9]{64}$/.test(password)) {
  throw new Error("Synthetic application recovery verification requires generated internal-container inputs");
}

const pool = new Pool({ host, port: Number(port), user, password, database, connectionTimeoutMillis: 5_000, max: 1 });
try {
  const filenames = (await readdir(resolve(import.meta.dir, "../../migrations"))).filter((f) => /^00(?:0[1-9]|1[0-9]|2[0-2])_[a-z0-9-]+\.sql$/.test(f)).sort();
  const expected = await Promise.all(filenames.map(async (file) => parseMigration(file, await readFile(resolve(import.meta.dir, `../../migrations/${file}`), "utf8"))));
  if (expected.length !== 22) throw new Error("expected migration list invalid");
  const ledger = await pool.query<{ version: string; checksum: string }>("SELECT version,checksum FROM application_migrations ORDER BY version");
  const checksumsMatch = ledger.rows.length === expected.length && expected.every((m, i) => ledger.rows[i]?.version === m.version && ledger.rows[i]?.checksum === m.checksum);
  const futureRows = await pool.query("SELECT count(*)::int AS count FROM application_migrations WHERE version IN ('0023','0024')");
  const futureObjects = await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM (
    SELECT 1 FROM pg_class WHERE oid=to_regclass('public.system_directory_relationships')
    UNION ALL SELECT 1 FROM pg_class WHERE oid=to_regclass('public.system_directory_relationship_audit')
    UNION ALL SELECT 1 FROM pg_class WHERE oid=to_regclass('public.system_directory_billing_evidence')
    UNION ALL SELECT 1 FROM pg_class WHERE oid=to_regclass('public.system_directory_billing_allocations')
    UNION ALL SELECT 1 FROM pg_class WHERE oid=to_regclass('public.system_directory_billing_audit')
    UNION ALL SELECT 1 FROM pg_attribute WHERE attrelid='public.system_directory_entries'::regclass AND attname = ANY(ARRAY[
      'entity_class','verification_state','provenance_kind','provenance_reference','observed_at','confirmed_at',
      'responsible_role','recovery_role','legacy_directory_entry','verification_status','verification_subject',
      'verification_method','verification_reference','verification_observed_at','verification_review_due',
      'verification_reviewed_at','monitoring_configuration','monitoring_outcome','monitoring_method',
      'monitoring_reference','monitoring_observed_at','monitoring_review_due','monitoring_reviewed_at','monitoring_summary'
    ]) AND NOT attisdropped
  ) objects`);
  const directory = await pool.query<{ entries: number; audits: number; orphans: number }>(`SELECT
    (SELECT count(*)::int FROM system_directory_entries) AS entries,
    (SELECT count(*)::int FROM system_directory_audit) AS audits,
    (SELECT count(*)::int FROM system_directory_audit a LEFT JOIN system_directory_entries e ON e.id=a.entry_id WHERE e.id IS NULL) AS orphans`);
  const triggers = await pool.query<{ trigger_name: string; enabled: string }>(`SELECT t.tgname AS trigger_name,t.tgenabled AS enabled
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('system_directory_entries','system_directory_audit') AND NOT t.tgisinternal`);
  const expectedTriggers = new Set(["system_directory_write_audit", "system_directory_audit_immutable", "system_directory_revision"]);
  const enabledTriggers = triggers.rows.length === expectedTriggers.size && triggers.rows.every((t) => expectedTriggers.has(t.trigger_name) && t.enabled === "O");
  const dbVersion = await pool.query<{ version: string }>("SHOW server_version");
  const version18 = /^18\./.test(dbVersion.rows[0]?.version ?? "");
  const state = directory.rows[0];
  const valid = checksumsMatch && futureRows.rows[0]?.count === 0 && futureObjects.rows[0]?.count === 0
    && state?.entries === 0 && state.audits === 0 && state.orphans === 0 && enabledTriggers && version18;
  const report = {
    phase,
    postgres18: version18 ? "PASS" : "FAIL",
    migrationLedgerThrough0022: checksumsMatch ? "PASS" : "FAIL",
    migrations0023And0024Unapplied: futureRows.rows[0]?.count === 0 && futureObjects.rows[0]?.count === 0 ? "PASS" : "FAIL",
    legacyDirectoryEmpty: state?.entries === 0 && state.audits === 0 ? "PASS" : "FAIL",
    directoryAuditOrphans: state?.orphans === 0 ? "PASS" : "FAIL",
    directoryProtectionTriggers: enabledTriggers ? "PASS" : "FAIL",
    appliedMigrationCount: ledger.rows.length,
  };
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (!valid) process.exitCode = 1;
} catch (error) {
  const rawCode = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  const code = typeof rawCode === "string" && /^[0-9A-Z]{5}$/.test(rawCode) ? `SQLSTATE ${rawCode}`
    : typeof rawCode === "string" && ["ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH"].includes(rawCode) ? "connection unavailable"
    : "fixed query failed";
  process.stderr.write(`Synthetic database integrity verification failed (${code}); private details suppressed.\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
