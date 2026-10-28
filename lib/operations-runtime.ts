import { Pool } from "pg";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { getAuthConfiguration } from "@/lib/auth";
import { getOwnerSession } from "@/lib/owner-session";
import {
  buildOperationsOverview,
  createOperationsController,
  type BriefingObservation,
} from "@/lib/operations-observability";

let pool: Pool | undefined;

function runtimeEnvironment(): "production" | "preview" | "development" | "unknown" {
  const value = process.env.VERCEL_ENV;
  if (value === "production" || value === "preview" || value === "development") return value;
  return process.env.NODE_ENV === "development" ? "development" : "unknown";
}

async function inspectDependencies() {
  let authConfigurationValid = false;
  try {
    getAuthConfiguration();
    authConfigurationValid = true;
  } catch {
    // Never return configuration error details or values.
  }

  const databaseURL = process.env.DATABASE_URL;
  const databaseConnectionConfigured = Boolean(databaseURL && databaseURL !== "[SENSITIVE]");
  if (!databaseURL || databaseURL === "[SENSITIVE]") {
    return buildOperationsOverview({
      now: new Date(),
      authConfigurationValid,
      databaseStatus: "not_configured",
      authSchemaPresent: null,
      briefing: null,
      briefingReadAvailable: false,
      runtimeEnvironment: runtimeEnvironment(),
      databaseConnectionConfigured,
    });
  }

  let databaseStatus: "healthy" | "unavailable" | "timeout" = "unavailable";
  let authSchemaPresent: boolean | null = null;
  let briefing: BriefingObservation = null;
  let briefingReadAvailable = false;

  try {
    pool ??= new Pool({
      connectionString: explicitVerifyFullSSL(databaseURL),
      max: 1,
      connectionTimeoutMillis: 2500,
      query_timeout: 3000,
      statement_timeout: 2500,
      idleTimeoutMillis: 1000,
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const dependencies = await client.query<{
        auth_schema: boolean;
        briefing_table: boolean;
      }>("SELECT (to_regclass('public.user') IS NOT NULL AND to_regclass('public.session') IS NOT NULL) AS auth_schema, to_regclass('public.morning_briefings') IS NOT NULL AS briefing_table");
      databaseStatus = "healthy";
      authSchemaPresent = dependencies.rows[0]?.auth_schema === true;
      briefingReadAvailable = dependencies.rows[0]?.briefing_table === true;
      if (briefingReadAvailable) {
        await client.query("SAVEPOINT briefing_observation");
        try {
          const rows = await client.query<{
            status: string;
            updated_at: Date | string | null;
            generated_at: Date | string | null;
          }>("SELECT status, updated_at, generated_at FROM morning_briefings ORDER BY briefing_date DESC LIMIT 1");
          const row = rows.rows[0];
          if (row) {
            const safeDate = (value: Date | string | null) => {
              if (!value) return null;
              const date = value instanceof Date ? value : new Date(value);
              return Number.isFinite(date.getTime()) ? date : null;
            };
            const status = ["ready", "failed", "generating"].includes(row.status)
              ? row.status as "ready" | "failed" | "generating"
              : "unknown";
            briefing = {
              status,
              updatedAt: safeDate(row.updated_at),
              generatedAt: safeDate(row.generated_at),
            };
          }
          await client.query("RELEASE SAVEPOINT briefing_observation");
        } catch {
          await client.query("ROLLBACK TO SAVEPOINT briefing_observation");
          briefingReadAvailable = false;
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
    const name = error instanceof Error ? error.name : "";
    databaseStatus = ["ETIMEDOUT", "57014"].includes(code) || ["TimeoutError", "AbortError"].includes(name)
      ? "timeout"
      : "unavailable";
    authSchemaPresent = null;
    briefing = null;
    briefingReadAvailable = false;
  }

  return buildOperationsOverview({
    now: new Date(),
    authConfigurationValid,
    databaseStatus,
    authSchemaPresent,
    briefing,
    briefingReadAvailable,
    runtimeEnvironment: runtimeEnvironment(),
    databaseConnectionConfigured,
  });
}

export async function handleOperations(request: Request) {
  return createOperationsController({
    verifyOwner: getOwnerSession,
    inspect: inspectDependencies,
  })(request);
}
