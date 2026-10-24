import { createHash } from "node:crypto";

export const statementBreakpoint = "--> statement-breakpoint";
const migrationFilePattern = /^(\d{4})_([a-z0-9-]+)\.sql$/;

export type Migration = {
  version: string;
  name: string;
  checksum: string;
  statements: string[];
};

export function canonicalMigrationSource(source: string) {
  return source.replace(/\r\n?/g, "\n");
}

// Historic 0011 groups one-line trigger declarations in one breakpoint block.
// Neon HTTP prepares each execution item and rejects multi-command items. Expand
// only this unambiguous form; never split semicolons inside PL/pgSQL bodies or
// quoted SQL. Keep the checksum based on the original, unchanged source bytes.
function expandTriggerBlock(statement: string): string[] {
  const lines = statement.split("\n").map(line => line.trim());
  if (lines.length > 1 && lines.every(line => /^CREATE TRIGGER [^\r\n]+;$/.test(line))) return lines;
  return [statement];
}

export function parseMigration(fileName: string, source: string): Migration {
  const match = migrationFilePattern.exec(fileName);
  if (!match) throw new Error(`Invalid migration filename: ${fileName}`);
  const canonicalSource = canonicalMigrationSource(source);
  const statements = canonicalSource.split(statementBreakpoint).map((statement) => statement.trim()).filter(Boolean).flatMap(expandTriggerBlock);
  if (!statements.length) throw new Error(`Migration ${fileName} contains no SQL statements`);
  return {
    version: match[1],
    name: match[2],
    checksum: createHash("sha256").update(canonicalSource).digest("hex"),
    statements,
  };
}

export function validateMigrationPlan(migrations: Migration[]) {
  if (!migrations.length) throw new Error("No application migrations were found");
  const versions = migrations.map((migration) => migration.version);
  if (new Set(versions).size !== versions.length) throw new Error("Application migration versions must be unique");
  const sortedVersions = [...versions].sort((left, right) => left.localeCompare(right));
  if (!versions.every((version, index) => version === sortedVersions[index])) throw new Error("Application migrations must be ordered by version");
}
