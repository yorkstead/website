// Isolated owner and data cleanup for the CC-016 browser workflow.
import { Pool } from "pg";
import { getAuth } from "../../lib/auth";

export const cc016Owner = {
  email: "cc016-owner@example.test",
  password: "Fictional-cc016-owner-62481357",
};

function requireDisposableDatabase() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || process.env.NODE_ENV === "production" || value !== process.env.DATABASE_URL) {
    throw new Error("CC-016 browser flow requires identical disposable DATABASE_URL and TEST_DATABASE_URL values");
  }
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !/(^|[_-])(test|disposable)([_-]|$)/i.test(url.pathname)
  ) throw new Error("CC-016 browser flow requires a loopback test/disposable database");
  return value;
}

export async function setupCc016Owner() {
  const pool = new Pool({ connectionString: requireDisposableDatabase() });
  try {
    for (const table of ["user", "session", "account", "verification"]) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public."${table}" (LIKE customer_auth."${table}" INCLUDING ALL)`);
    }
    const previousWorkspace = await pool.query<{ data: Record<string, unknown>; updated_at: Date }>(
      "SELECT data,updated_at FROM workspaces WHERE id='primary'",
    );
    const hash = await (await getAuth().$context).password.hash(cc016Owner.password);
    await pool.query(
      `INSERT INTO public."user"(id,name,email,"emailVerified") VALUES ('cc016-browser-owner','Fictional CC-016 owner',$1,true)`,
      [cc016Owner.email],
    );
    await pool.query(
      `INSERT INTO public."account"(id,"userId","accountId","providerId",password,"updatedAt")
       VALUES ('cc016-browser-owner','cc016-browser-owner','cc016-browser-owner','credential',$1,now())`,
      [hash],
    );
    return { workspace: previousWorkspace.rows[0] ?? null };
  } finally {
    await pool.end();
  }
}

export async function disposeCc016Inquiry(email: string, workspace: { data: Record<string, unknown>; updated_at: Date } | null) {
  const pool = new Pool({ connectionString: requireDisposableDatabase() });
  try {
    await pool.query("DELETE FROM contact_inquiries WHERE email=$1 AND name='CC-016 Synthetic Inquiry'", [email]);
    if (workspace) {
      await pool.query("UPDATE workspaces SET data=$1,updated_at=$2 WHERE id='primary'", [workspace.data, workspace.updated_at]);
    } else {
      await pool.query("DELETE FROM workspaces WHERE id='primary'");
    }
    await pool.query(`DELETE FROM public."session" WHERE "userId"='cc016-browser-owner'`);
    await pool.query(`DELETE FROM public."account" WHERE "userId"='cc016-browser-owner'`);
    await pool.query(`DELETE FROM public."user" WHERE id='cc016-browser-owner'`);
  } finally {
    await pool.end();
  }
}
