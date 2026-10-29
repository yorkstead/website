import { Pool } from "pg";
import type { NeonQueryFunction } from "@neondatabase/serverless";

type NeonSql = NeonQueryFunction<false, false>;
type QueryPool = Pick<Pool, "query">;

export function isLoopbackDisposableDatabase(databaseURL: string, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv !== "development") return false;
  try {
    const url = new URL(databaseURL);
    return ["postgres:", "postgresql:"].includes(url.protocol)
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && /(^|[_-])(test|disposable)([_-]|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function postgresQueryFunction(pool: QueryPool) {
  const tagged = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let statement = strings[0] ?? "";
    for (let index = 0; index < values.length; index += 1) {
      statement += `$${index + 1}${strings[index + 1] ?? ""}`;
    }
    const result = await pool.query(statement, values as never[]);
    return result.rows;
  };
  return Object.assign(tagged, {
    query: async (statement: string, values?: unknown[]) => {
      const result = await pool.query(statement, values as never[] | undefined);
      return result.rows;
    },
  }) as unknown as NeonSql;
}
