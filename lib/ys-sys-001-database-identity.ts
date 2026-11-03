export type ExpectedDatabaseIdentity = {
  hostname: string;
  database: string;
};

export type DatabaseIdentityResult = "MATCH" | "MISMATCH" | "UNVERIFIED";

const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const databasePattern = /^[A-Za-z0-9_-]{1,63}$/;

function normalizedHostname(value: string) {
  const hostname = value.toLowerCase().replace(/\.$/, "");
  return hostnamePattern.test(hostname) ? hostname : null;
}

export function parseExpectedDatabaseIdentity(value: unknown): ExpectedDatabaseIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const target = value as Record<string, unknown>;
  const keys = Object.keys(target).sort();
  if (keys.length !== 2 || keys[0] !== "database" || keys[1] !== "hostname") return null;
  if (typeof target.hostname !== "string" || typeof target.database !== "string") return null;

  const hostname = normalizedHostname(target.hostname);
  if (!hostname || target.hostname !== target.hostname.trim()) return null;
  if (!databasePattern.test(target.database) || target.database !== target.database.trim()) return null;

  return { hostname, database: target.database };
}

export function parseExpectedDatabaseIdentityJson(value: string): ExpectedDatabaseIdentity | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  const target = parseExpectedDatabaseIdentity(parsed);
  if (!target) return null;

  // Require one canonical, duplicate-free representation of the two expected fields.
  // This rejects duplicate JSON keys instead of accepting JSON.parse's last value.
  const canonical = JSON.stringify({ database: target.database, hostname: target.hostname });
  let compact = "";
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (inString) {
      compact += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      compact += character;
      inString = true;
    } else if (!/\s/.test(character)) {
      compact += character;
    }
  }

  return compact === canonical ? target : null;
}

export function compareRuntimeDatabaseIdentity(
  configuredDatabaseUrl: string | undefined,
  expected: ExpectedDatabaseIdentity | null,
): DatabaseIdentityResult {
  if (!configuredDatabaseUrl || !expected || configuredDatabaseUrl !== configuredDatabaseUrl.trim()) return "UNVERIFIED";

  try {
    const configured = new URL(configuredDatabaseUrl);
    if (!["postgres:", "postgresql:"].includes(configured.protocol) || configured.hash) return "UNVERIFIED";

    // node-postgres gives the `host` query parameter precedence over the URL
    // authority. Do not report the authority as the effective target when the
    // database client could route the connection elsewhere.
    if (configured.searchParams.has("host")) return "UNVERIFIED";

    const configuredHostname = normalizedHostname(configured.hostname);
    const configuredDatabase = decodeURIComponent(configured.pathname.slice(1));
    if (!configuredHostname || !databasePattern.test(configuredDatabase)) return "UNVERIFIED";

    return configuredHostname === expected.hostname && configuredDatabase === expected.database
      ? "MATCH"
      : "MISMATCH";
  } catch {
    return "UNVERIFIED";
  }
}
