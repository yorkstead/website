import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { parseMigration } from "./migration-plan";

const url = process.env.RETIREMENT_TEST_DATABASE_URL;
if (process.env.RETIREMENT_TEST_CONFIRM !== "YES" || !url || url === process.env.DATABASE_URL) throw Error("Disposable confirmation required");
const parsed = new URL(url);
if (!["postgres:", "postgresql:"].includes(parsed.protocol) || parsed.hostname !== "127.0.0.1" || !parsed.port || parsed.search || parsed.hash || !/^\/[a-z0-9_]+_test$/.test(parsed.pathname)) throw Error("Refusing ambiguous or nonlocal database");
const client = new Client({ connectionString: url, application_name: "retirement-upgrade-fixture" });
await client.connect();
try {
  const existing = await client.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')");
  if (existing.rows[0].n !== 0) throw Error("Disposable upgrade target must be empty");
  await client.query("CREATE TABLE application_migrations(version text PRIMARY KEY,name text NOT NULL,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())");
  for (const name of (await readdir("migrations")).filter((f) => f.endsWith(".sql") && !f.startsWith("0018_")).sort()) {
    const migration = parseMigration(name, await readFile(`migrations/${name}`, "utf8"));
    await client.query("BEGIN");
    try {
      for (const statement of migration.statements) await client.query(statement);
      await client.query("INSERT INTO application_migrations(version,name,checksum) VALUES($1,$2,$3)", [migration.version,migration.name,migration.checksum]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  }
  await client.query("INSERT INTO contact_inquiries(name,email,company,message,status,ip_hash) VALUES('Synthetic Historical','historical@example.test','Synthetic Historical','Evidence','won',repeat('a',64))");
  console.log("Synthetic pre-0018 database prepared; no production data accessed.");
} finally { await client.end(); }
