import { readinessMigrationManifest } from "@/lib/portal-readiness-migrations";

type QueryRows = Record<string, unknown>[];
export type ReadOnlyDatabase = {
  query(statement: string, parameters?: unknown[]): Promise<QueryRows>;
};

const MAX_MIGRATIONS = 128;
const MAX_ENTRIES = 100;

export function neonEndpointId(databaseURL: string): string | null {
  try {
    const firstHostLabel = new URL(databaseURL).hostname.split(".")[0] ?? "";
    const endpoint = firstHostLabel.replace(/-pooler$/, "");
    return /^ep-[a-z0-9-]{1,80}$/.test(endpoint) ? endpoint : null;
  } catch {
    return null;
  }
}

export function createOnePerWindowLimiter(windowMs = 60_000) {
  let nextAllowedAt = 0;
  return (now = Date.now()) => {
    if (now < nextAllowedAt) return false;
    nextAllowedAt = now + windowMs;
    return true;
  };
}

export function summarizeMigrationLedger(
  rows: readonly { version: unknown; checksum: unknown }[],
  totalCount: number,
) {
  const expected = new Map<string, string>(readinessMigrationManifest);
  const applied = rows.map((row) => {
    const version = typeof row.version === "string" && /^\d{4}$/.test(row.version)
      ? row.version
      : null;
    const expectedChecksum = version ? expected.get(version) : undefined;
    return {
      version: version ?? "invalid",
      checksumMatchesRepository:
        expectedChecksum !== undefined && row.checksum === expectedChecksum,
      knownToRepository: expectedChecksum !== undefined,
    };
  });
  const seen = new Set(applied.map((row) => row.version));
  const missingVersions = [...expected.keys()].filter((version) => !seen.has(version));
  const unexpectedVersions = applied
    .filter((row) => !row.knownToRepository)
    .map((row) => row.version);
  const mismatch = applied.some((row) => !row.checksumMatchesRepository);
  const truncated = totalCount > MAX_MIGRATIONS || rows.length < totalCount;
  const exactMatch = !truncated
    && totalCount === expected.size
    && missingVersions.length === 0
    && unexpectedVersions.length === 0
    && !mismatch;

  return {
    state: exactMatch ? "matches_repository" : "mismatch_or_incomplete",
    expectedCount: expected.size,
    appliedCount: totalCount,
    truncated,
    applied,
    missingVersions,
    unexpectedVersions,
    required: ["0020", "0022"].map((version) => {
      const row = applied.find((item) => item.version === version);
      return {
        version,
        applied: row !== undefined,
        checksumMatchesRepository: row?.checksumMatchesRepository ?? false,
      };
    }),
  };
}

export async function readSystemsDirectoryPreflight(
  sql: ReadOnlyDatabase,
  databaseURL: string,
) {
  const identityRows = await sql.query(
    "SELECT current_database() AS database_name, current_schema() AS current_schema, current_setting('server_version_num')::int AS server_version_num",
  );
  const identity = identityRows[0] ?? {};

  const catalogRows = await sql.query(`SELECT
    to_regclass('public.system_directory_entries') IS NOT NULL AS entries_table_present,
    to_regclass('public.system_directory_audit') IS NOT NULL AS audit_table_present,
    to_regclass('public.application_migrations') IS NOT NULL AS migrations_table_present`);
  const catalog = catalogRows[0] ?? {};

  let migrations: ReturnType<typeof summarizeMigrationLedger> | {
    state: "missing" | "unavailable";
    expectedCount: number;
    appliedCount: null;
    applied: [];
    missingVersions: [];
    unexpectedVersions: [];
    required: { version: string; applied: false; checksumMatchesRepository: false }[];
  };
  if (catalog.migrations_table_present === true) {
    try {
      const counts = await sql.query(
        "SELECT count(*)::int AS total_count FROM public.application_migrations",
      );
      const rows = await sql.query(
        `SELECT version, checksum FROM public.application_migrations
         ORDER BY version LIMIT ${MAX_MIGRATIONS}`,
      );
      migrations = summarizeMigrationLedger(
        rows as { version: unknown; checksum: unknown }[],
        Number(counts[0]?.total_count ?? 0),
      );
    } catch {
      migrations = {
        state: "unavailable",
        expectedCount: readinessMigrationManifest.length,
        appliedCount: null,
        applied: [],
        missingVersions: [],
        unexpectedVersions: [],
        required: ["0020", "0022"].map((version) => ({
          version,
          applied: false as const,
          checksumMatchesRepository: false as const,
        })),
      };
    }
  } else {
    migrations = {
      state: "missing",
      expectedCount: readinessMigrationManifest.length,
      appliedCount: null,
      applied: [],
      missingVersions: [],
      unexpectedVersions: [],
      required: ["0020", "0022"].map((version) => ({
        version,
        applied: false as const,
        checksumMatchesRepository: false as const,
      })),
    };
  }

  const entriesPresent = catalog.entries_table_present === true;
  const auditPresent = catalog.audit_table_present === true;
  let directory: Record<string, unknown> = {
    entriesTablePresent: entriesPresent,
    auditTablePresent: auditPresent,
    entryCount: null,
    auditCount: null,
    orphanAuditCount: null,
    entryListTruncated: false,
    entries: [],
  };

  if (entriesPresent && auditPresent) {
    const summaryRows = await sql.query(`SELECT
      (SELECT count(*)::int FROM public.system_directory_entries) AS entry_count,
      (SELECT count(*)::int FROM public.system_directory_audit) AS audit_count,
      (SELECT count(*)::int FROM public.system_directory_audit a
        WHERE NOT EXISTS (SELECT 1 FROM public.system_directory_entries e WHERE e.id = a.entry_id)) AS orphan_audit_count`);
    const perEntry = await sql.query(`SELECT
      e.id::text AS id,
      e.revision,
      (e.archived_at IS NOT NULL) AS archived,
      md5(to_jsonb(e)::text) AS entry_fingerprint,
      count(a.id)::int AS audit_count,
      md5(coalesce(string_agg(to_jsonb(a)::text, E'\\n' ORDER BY a.id)
        FILTER (WHERE a.id IS NOT NULL), '')) AS audit_fingerprint
      FROM public.system_directory_entries e
      LEFT JOIN public.system_directory_audit a ON a.entry_id = e.id
      GROUP BY e.id
      ORDER BY e.id
      LIMIT ${MAX_ENTRIES}`);
    const triggers = await sql.query(`SELECT
      coalesce(bool_or(t.tgname = 'system_directory_audit_entry' AND t.tgenabled IN ('O','A')), false) AS audit_append_enabled,
      coalesce(bool_or(t.tgname = 'system_directory_audit_immutable' AND t.tgenabled IN ('O','A')), false) AS audit_immutability_enabled,
      coalesce(bool_or(t.tgname = 'system_directory_revision' AND t.tgenabled IN ('O','A')), false) AS revision_trigger_enabled
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('system_directory_entries','system_directory_audit')
        AND NOT t.tgisinternal`);
    const constraints = await sql.query(`SELECT
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
        WHERE n.nspname='public' AND r.relname='system_directory_entries' AND c.contype='p') AS entries_primary_keys,
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
        WHERE n.nspname='public' AND r.relname='system_directory_entries' AND c.contype='c') AS entries_check_constraints,
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
        WHERE n.nspname='public' AND r.relname='system_directory_audit' AND c.contype='p') AS audit_primary_keys,
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
        WHERE n.nspname='public' AND r.relname='system_directory_audit' AND c.contype='c') AS audit_check_constraints,
      (SELECT count(*)::int FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
        WHERE n.nspname='public' AND r.relname='system_directory_audit' AND c.contype='f'
          AND c.confrelid = 'public.system_directory_entries'::regclass) AS audit_entry_foreign_keys`);
    const count = Number(summaryRows[0]?.entry_count ?? 0);
    directory = {
      entriesTablePresent: true,
      auditTablePresent: true,
      entryCount: count,
      auditCount: Number(summaryRows[0]?.audit_count ?? 0),
      orphanAuditCount: Number(summaryRows[0]?.orphan_audit_count ?? 0),
      entryListTruncated: count > MAX_ENTRIES,
      entries: perEntry.map((row) => ({
        id: row.id,
        revision: Number(row.revision),
        archived: row.archived === true,
        entryFingerprint: row.entry_fingerprint,
        auditCount: Number(row.audit_count),
        auditFingerprint: row.audit_fingerprint,
      })),
      auditProtection: {
        appendTriggerEnabled: triggers[0]?.audit_append_enabled === true,
        immutabilityTriggerEnabled: triggers[0]?.audit_immutability_enabled === true,
        revisionTriggerEnabled: triggers[0]?.revision_trigger_enabled === true,
      },
      constraints: {
        entriesPrimaryKeyCount: Number(constraints[0]?.entries_primary_keys ?? 0),
        entriesCheckCount: Number(constraints[0]?.entries_check_constraints ?? 0),
        auditPrimaryKeyCount: Number(constraints[0]?.audit_primary_keys ?? 0),
        auditCheckCount: Number(constraints[0]?.audit_check_constraints ?? 0),
        auditEntryForeignKeyCount: Number(constraints[0]?.audit_entry_foreign_keys ?? 0),
      },
    };
  }

  return {
    identity: {
      provider: neonEndpointId(databaseURL) ? "neon" : "unresolved",
      endpointId: neonEndpointId(databaseURL),
      databaseName: identity.database_name ?? null,
      currentSchema: identity.current_schema ?? null,
      serverVersionNum: Number(identity.server_version_num ?? 0) || null,
    },
    migrations,
    systemDirectory: directory,
    fingerprintAlgorithm: "md5(postgresql_jsonb_text_ordered_by_stable_key)",
  };
}
