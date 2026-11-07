const phases = [
  "initial connection",
  "empty source verification",
  "repository migration range verification",
  "synthetic ledger creation",
  "synthetic migration application",
  "canonical migration ledger verification",
] as const;

type PreparationPhase = (typeof phases)[number];

export function formatPreparationFailure(phase: string, migrationVersion: string | undefined, error: unknown) {
  const safePhase = phases.includes(phase as PreparationPhase) ? phase : "unexpected phase";
  const candidate = error as { code?: unknown } | null;
  const rawCode = typeof candidate?.code === "string" ? candidate.code : "";
  const sqlstate = /^[0-9A-Z]{5}$/.test(rawCode) ? rawCode : undefined;
  const category = categoryFor(safePhase, rawCode, sqlstate);
  const version = migrationVersion && /^\d{4}$/.test(migrationVersion) ? `; migration ${migrationVersion}` : "";
  const state = sqlstate ? `; SQLSTATE ${sqlstate}` : "";
  return `Synthetic application database preparation failed; category ${category}; phase ${safePhase}${version}${state}; private details suppressed.`;
}

function categoryFor(phase: string, rawCode: string, sqlstate: string | undefined) {
  if (sqlstate) {
    const categories: Record<string, string> = {
      "08": "connection_failure",
      "22": "invalid_data",
      "23": "integrity_violation",
      "28": "authentication_failure",
      "3D": "invalid_database",
      "3F": "invalid_schema",
      "40": "transaction_failure",
      "42": "syntax_or_access_failure",
      "53": "resource_failure",
      "54": "program_limit",
      "55": "object_state_failure",
      "57": "operator_intervention",
      "58": "system_failure",
    };
    return categories[sqlstate.slice(0, 2)] ?? "database_failure";
  }
  if (["ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH"].includes(rawCode)) return "connection_failure";
  if (phase === "empty source verification") return "precondition_failure";
  if (phase === "repository migration range verification") return "repository_validation_failure";
  if (phase === "synthetic migration application") return "migration_execution_failure";
  if (phase === "synthetic ledger creation") return "schema_preparation_failure";
  if (phase === "canonical migration ledger verification") return "integrity_verification_failure";
  return "unexpected_failure";
}
