import { EVIDENCE_FORMAT, canonicalFingerprint, type CanonicalValue } from "./canonical";

const EXPECTED_ENTRIES = 7;
const EXPECTED_AUDITS = 11;
const EXPECTED_LATEST_MIGRATION = "0022";
const REQUIRED_ROLE = "ys_sys_001_baseline_reader";
const TENANT_ID = "yorkstead-owner";

export type QueryResult = { rows: Record<string, unknown>[] };
export type CaptureClient = {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  release(): void;
};
export type CapturePool = { connect(): Promise<CaptureClient> };
export type RepositoryMigration = { version: string; name: string; checksum: string };

export type SourceAttestation = {
  provider: "neon";
  project: "website";
  branch: "production";
  endpointId: string;
  hostname: string;
  database: "neondb";
  deploymentSha: string;
  verifiedAtUtc: string;
};

export type CaptureOptions = {
  pool: CapturePool;
  migrations: RepositoryMigration[];
  source: SourceAttestation;
  connectedHostname: string;
  capturedAtUtc: string;
  operatorLabel: string;
};

export class CaptureError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "CaptureError";
  }
}

function fail(code: string): never {
  throw new CaptureError(code);
}

function rowDocument(value: unknown): Record<string, CanonicalValue> {
  if (typeof value !== "string") fail("row_serialization_invalid");
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { fail("row_serialization_invalid"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("row_serialization_invalid");
  return parsed as Record<string, CanonicalValue>;
}

function validateRepositoryLedger(migrations: RepositoryMigration[], rows: Record<string, unknown>[]) {
  const expected = [...migrations].sort((a, b) => a.version.localeCompare(b.version));
  if (expected.length !== 23 || expected.at(-1)?.version !== "0023" || expected.at(-2)?.version !== EXPECTED_LATEST_MIGRATION) {
    fail("repository_migration_baseline_invalid");
  }
  const appliedMigrations = expected.filter((migration) => migration.version !== "0023");
  if (rows.length !== appliedMigrations.length) fail("migration_ledger_mismatch");
  for (let index = 0; index < appliedMigrations.length; index += 1) {
    const actual = rows[index];
    const wanted = appliedMigrations[index];
    if (actual.version !== wanted.version || actual.name !== wanted.name || actual.checksum !== wanted.checksum) {
      fail("migration_ledger_mismatch");
    }
  }
}

async function assertReadOnlyRole(client: CaptureClient) {
  const result = await client.query(`
    SELECT current_user AS role_name,
      current_database() AS database_name,
      current_setting('transaction_read_only') AS transaction_read_only,
      r.rolsuper AS is_superuser,
      r.rolcreatedb AS can_create_database,
      r.rolcreaterole AS can_create_role,
      r.rolreplication AS can_replicate,
      r.rolbypassrls AS bypasses_rls,
      has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
      has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public,
      has_table_privilege(current_user, 'public.system_directory_entries', 'SELECT') AS can_read_entries,
      has_table_privilege(current_user, 'public.system_directory_audit', 'SELECT') AS can_read_audit,
      has_table_privilege(current_user, 'public.application_migrations', 'SELECT') AS can_read_migrations,
      (has_table_privilege(current_user, 'public.system_directory_entries', 'INSERT') OR has_table_privilege(current_user, 'public.system_directory_entries', 'UPDATE') OR has_table_privilege(current_user, 'public.system_directory_entries', 'DELETE') OR has_table_privilege(current_user, 'public.system_directory_entries', 'TRUNCATE') OR has_table_privilege(current_user, 'public.system_directory_entries', 'REFERENCES') OR has_table_privilege(current_user, 'public.system_directory_entries', 'TRIGGER')) AS can_write_entries,
      (has_table_privilege(current_user, 'public.system_directory_audit', 'INSERT') OR has_table_privilege(current_user, 'public.system_directory_audit', 'UPDATE') OR has_table_privilege(current_user, 'public.system_directory_audit', 'DELETE') OR has_table_privilege(current_user, 'public.system_directory_audit', 'TRUNCATE') OR has_table_privilege(current_user, 'public.system_directory_audit', 'REFERENCES') OR has_table_privilege(current_user, 'public.system_directory_audit', 'TRIGGER')) AS can_write_audit,
      (has_table_privilege(current_user, 'public.application_migrations', 'INSERT') OR has_table_privilege(current_user, 'public.application_migrations', 'UPDATE') OR has_table_privilege(current_user, 'public.application_migrations', 'DELETE') OR has_table_privilege(current_user, 'public.application_migrations', 'TRUNCATE') OR has_table_privilege(current_user, 'public.application_migrations', 'REFERENCES') OR has_table_privilege(current_user, 'public.application_migrations', 'TRIGGER')) AS can_write_migrations,
      pg_has_role(current_user, 'pg_read_all_data', 'MEMBER') AS has_broad_read_role,
      pg_has_role(current_user, 'pg_write_all_data', 'MEMBER') AS has_broad_write_role,
      pg_has_role(current_user, 'pg_execute_server_program', 'MEMBER') AS can_execute_server_program,
      EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE pg_catalog.pg_get_userbyid(m.member) = current_user) AS has_role_memberships
    FROM pg_roles r WHERE r.rolname = current_user
  `);
  const role = result.rows[0];
  if (!role || role.role_name !== REQUIRED_ROLE || role.database_name !== "neondb" || role.transaction_read_only !== "on") fail("read_only_role_invalid");
  if (role.is_superuser || role.can_create_database || role.can_create_role || role.can_replicate || role.bypasses_rls
      || role.can_create_schema || role.can_create_in_public || role.can_write_entries || role.can_write_audit
      || role.can_write_migrations || role.has_broad_read_role || role.has_broad_write_role || role.can_execute_server_program
      || role.has_role_memberships) {
    fail("read_only_role_overprivileged");
  }
  if (!role.can_read_entries || !role.can_read_audit || !role.can_read_migrations) fail("read_only_role_missing_scope");
  const visibleRelations = await client.query(`
    SELECT n.nspname AS schema_name, c.relname AS relation_name
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_table_privilege(current_user, c.oid, 'SELECT')
    ORDER BY n.nspname, c.relname
  `);
  const visibleNames = visibleRelations.rows.map((row) => `${row.schema_name}.${row.relation_name}`).sort();
  const requiredNames = [
    "public.application_migrations",
    "public.system_directory_audit",
    "public.system_directory_entries",
  ];
  if (JSON.stringify(visibleNames) !== JSON.stringify(requiredNames)) fail("read_only_role_scope_expanded");
  return {
    roleName: role.role_name as string,
    superuser: false,
    databaseCreate: false,
    roleCreate: false,
    replication: false,
    bypassRls: false,
    createSchema: false,
    broadReadRole: false,
    broadWriteRole: false,
    roleMemberships: false,
    readScopes: ["system_directory_entries", "system_directory_audit", "application_migrations"],
    effectiveReadableRelations: visibleNames,
    writePrivileges: false,
  };
}

const entryQuery = `
  SELECT e.id::text AS id,
    jsonb_object_agg(j.key, to_jsonb(j.value) ORDER BY j.key)::text AS row_json
  FROM public.system_directory_entries e
  CROSS JOIN LATERAL jsonb_each_text(to_jsonb(e)) AS j(key, value)
  WHERE e.tenant_id = $1
  GROUP BY e.id
  ORDER BY e.id
`;

const auditQuery = `
  SELECT a.id::text AS id, a.entry_id::text AS entry_id,
    jsonb_object_agg(j.key, to_jsonb(j.value) ORDER BY j.key)::text AS row_json
  FROM public.system_directory_audit a
  CROSS JOIN LATERAL jsonb_each_text(to_jsonb(a)) AS j(key, value)
  WHERE a.tenant_id = $1
  GROUP BY a.id, a.entry_id
  ORDER BY a.id
`;

const triggersQuery = `
  SELECT c.relname AS table_name, t.tgname AS trigger_name, t.tgenabled AS enabled,
    t.tgtype AS trigger_type, p.proname AS function_name, p.prosrc AS function_source,
    pg_get_triggerdef(t.oid, true) AS trigger_definition,
    c.relrowsecurity AS row_security, c.relforcerowsecurity AS force_row_security
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND c.relname IN ('system_directory_entries', 'system_directory_audit')
    AND NOT t.tgisinternal
  ORDER BY c.relname, t.tgname
`;

function verifyTriggers(rows: Record<string, unknown>[]) {
  const expected = new Map([
    ["system_directory_revision", { table: "system_directory_entries", type: 23, fn: "system_directory_revision" }],
    ["system_directory_audit_entry", { table: "system_directory_entries", type: 21, fn: "system_directory_write_audit" }],
    ["system_directory_audit_immutable", { table: "system_directory_audit", type: 58, fn: "system_directory_audit_immutable" }],
  ]);
  if (rows.length !== expected.size) fail("protection_trigger_set_mismatch");
  const checked = rows.map((row) => {
    const wanted = expected.get(String(row.trigger_name));
    if (!wanted || row.table_name !== wanted.table || Number(row.trigger_type) !== wanted.type || row.function_name !== wanted.fn || row.enabled !== "O") {
      fail("protection_trigger_invalid");
    }
    const definition = String(row.trigger_definition).toUpperCase();
    if (wanted.fn === "system_directory_audit_immutable" && !["UPDATE", "DELETE", "TRUNCATE"].every((event) => definition.includes(event))) fail("audit_immutability_trigger_invalid");
    if (wanted.fn === "system_directory_revision" && (!definition.includes("BEFORE") || !definition.includes("UPDATE"))) fail("revision_trigger_invalid");
    if (wanted.fn === "system_directory_write_audit" && (!definition.includes("AFTER") || !definition.includes("UPDATE"))) fail("audit_append_trigger_invalid");
    const functionSource = String(row.function_source).toLowerCase().replace(/\s+/g, " ").trim();
    const requiredFunctionFragments: Record<string, string[]> = {
      system_directory_revision: ["new.revision := 1", "old.revision + 1", "new.updated_at := clock_timestamp()", "return new"],
      system_directory_write_audit: ["current_setting('yorkstead.system_directory_actor', true)", "insert into system_directory_audit", "new.revision", "return new"],
      system_directory_audit_immutable: ["raise exception", "system directory audit history is immutable", "errcode='23514'"],
    };
    if (!(requiredFunctionFragments[wanted.fn] ?? []).every((fragment) => functionSource.includes(fragment))) fail("protection_function_invalid");
    return {
      table: row.table_name as string,
      name: row.trigger_name as string,
      enabled: row.enabled as string,
      type: Number(row.trigger_type),
      function: row.function_name as string,
      definition: row.trigger_definition as string,
      functionSourceSha256: canonicalFingerprint(String(row.function_source) as CanonicalValue),
      rowSecurity: Boolean(row.row_security),
      forceRowSecurity: Boolean(row.force_row_security),
    };
  });
  return checked;
}

export async function captureSystemDirectoryBaseline(options: CaptureOptions) {
  if (options.source.provider !== "neon" || options.source.project !== "website" || options.source.branch !== "production"
      || options.source.database !== "neondb" || !options.source.endpointId || !options.source.deploymentSha
      || options.connectedHostname !== options.source.hostname) fail("source_identity_unverified");
  if (!Number.isFinite(Date.parse(options.source.verifiedAtUtc)) || !Number.isFinite(Date.parse(options.capturedAtUtc))) fail("source_attestation_timestamp_invalid");

  const client = await options.pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '15000'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30000'");
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL DateStyle = 'ISO, YMD'");
    await client.query("SET LOCAL row_security = on");
    await client.query("SET LOCAL search_path = pg_catalog, public");
    const connection = await client.query("SELECT current_database() AS database_name, current_user AS role_name, current_setting('server_version') AS server_version");
    const actual = connection.rows[0];
    if (actual?.database_name !== options.source.database || actual?.role_name !== REQUIRED_ROLE) fail("source_database_or_role_mismatch");
    const role = await assertReadOnlyRole(client);

    const migrationRows = await client.query("SELECT version, name, checksum, applied_at::text AS applied_at_utc FROM public.application_migrations ORDER BY version");
    validateRepositoryLedger(options.migrations, migrationRows.rows);
    if (migrationRows.rows.some((row) => row.version === "0023")) fail("migration_0023_already_applied");

    const entryRows = await client.query(entryQuery, [TENANT_ID]);
    const entries = entryRows.rows.map((row) => ({ id: String(row.id), value: rowDocument(row.row_json) }));
    if (entries.length !== EXPECTED_ENTRIES || new Set(entries.map((row) => row.id)).size !== EXPECTED_ENTRIES) fail("entry_count_or_identity_mismatch");
    const auditRows = await client.query(auditQuery, [TENANT_ID]);
    const audits = auditRows.rows.map((row) => ({ id: String(row.id), entryId: String(row.entry_id), value: rowDocument(row.row_json) }));
    if (audits.length !== EXPECTED_AUDITS) fail("audit_count_mismatch");
    const entryIds = new Set(entries.map((entry) => entry.id));
    const orphanAuditCount = audits.filter((audit) => !entryIds.has(audit.entryId)).length;
    if (orphanAuditCount !== 0) fail("orphan_audit_detected");

    const triggerRows = await client.query(triggersQuery);
    const triggers = verifyTriggers(triggerRows.rows);
    const auditCounts = new Map(entries.map((entry) => [entry.id, 0]));
    for (const audit of audits) auditCounts.set(audit.entryId, (auditCounts.get(audit.entryId) ?? 0) + 1);
    const entryEvidence = entries.map((entry) => ({
      id: entry.id,
      revision: entry.value.revision,
      archivedAt: entry.value.archived_at,
      auditCount: auditCounts.get(entry.id) ?? 0,
      fingerprintSha256: canonicalFingerprint(entry.value as CanonicalValue),
      fields: entry.value,
    }));
    const auditEvidence = audits.map((audit) => ({
      id: audit.id,
      entryId: audit.entryId,
      fields: audit.value,
    }));
    const auditFingerprints = [...auditCounts.keys()].sort().map((entryId) => ({
      entryId,
      eventCount: auditCounts.get(entryId) ?? 0,
      fingerprintSha256: canonicalFingerprint(audits.filter((audit) => audit.entryId === entryId).map((audit) => audit.value) as unknown as CanonicalValue),
    }));
    const sourceIdentity = {
      provider: options.source.provider,
      project: options.source.project,
      branch: options.source.branch,
      endpointId: options.source.endpointId,
      hostname: options.source.hostname,
      database: actual.database_name as string,
      deploymentSha: options.source.deploymentSha,
      identityVerifiedAtUtc: options.source.verifiedAtUtc,
      serverVersion: actual.server_version as string,
    };
    const body = {
      format: EVIDENCE_FORMAT,
      methodology: {
        transaction: "REPEATABLE READ READ ONLY; UTC timezone; ISO YMD dates; row security on; fixed search path",
        canonicalization: "UTF-8 JSON; recursive lexicographic object keys; arrays preserve explicit SQL order; database JSON/JSONB values serialized as text before application parsing",
        fingerprint: "SHA-256 over canonical JSON UTF-8; per-entry full row; per-entry ordered audit row array",
        queryScope: ["public.application_migrations", "public.system_directory_entries WHERE tenant_id = fixed owner scope", "public.system_directory_audit WHERE tenant_id = fixed owner scope", "pg_catalog trigger metadata for the two directory tables"],
      },
      capturedAtUtc: options.capturedAtUtc,
      operatorLabel: options.operatorLabel,
      sourceIdentity,
      roleVerification: role,
      migrationState: {
        appliedCount: migrationRows.rows.length,
        latestVersion: EXPECTED_LATEST_MIGRATION,
        migration0023Applied: false,
      pendingMigration0023: options.migrations.find((migration) => migration.version === "0023") ?? null,
        migrations: migrationRows.rows,
      },
      preservation: {
        entryCount: entries.length,
        auditEventCount: audits.length,
        orphanAuditCount,
        entries: entryEvidence,
        audits: auditEvidence,
        auditFingerprints,
      },
      protectionTriggers: triggers,
    };
    const evidenceSha256 = canonicalFingerprint(body as unknown as CanonicalValue);
    await client.query("COMMIT");
    transactionOpen = false;
    return { evidence: { ...body, evidenceSha256 }, evidenceSha256 };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof CaptureError) throw error;
    // Driver errors can embed host, role, database, SQL, or values. Never forward them.
    throw new CaptureError("database_capture_failed");
  } finally {
    client.release();
  }
}

export function verifyEvidenceIntegrity(evidence: Record<string, unknown>) {
  const { evidenceSha256, ...body } = evidence;
  if (typeof evidenceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(evidenceSha256)) return false;
  return canonicalFingerprint(body as CanonicalValue) === evidenceSha256;
}
