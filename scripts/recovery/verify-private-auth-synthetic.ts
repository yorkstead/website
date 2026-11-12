import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { ownerEmailMatches } from "@/lib/owner-authorization";
import { privateRecoveryMode, validatePrivateRecoveryEnvironment } from "./private-rehearsal-policy";

validatePrivateRecoveryEnvironment(process.env);
const email = process.env.OWNER_EMAIL ?? "";
const password = process.env.YS_APP_RECOVERY_OWNER_PASSWORD ?? "";
const secret = process.env.BETTER_AUTH_SECRET ?? "";
if (email !== "owner@recovery.test" || password.length < 24 || !/^[a-f0-9]{64}$/.test(secret)
  || process.env.YS_APP_RECOVERY_MODE !== privateRecoveryMode) {
  throw new Error("synthetic owner sign-in inputs are invalid");
}

const pool = new Pool({ connectionString: process.env.YS_APP_RECOVERY_RUNTIME_DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000 });
try {
  const auth = betterAuth({ baseURL: "https://recovery.test", secret, database: pool, emailAndPassword: { enabled: true } });
  const response = await auth.handler(new Request("https://recovery.test/api/auth/sign-in/email", {
    method: "POST",
    headers: { origin: "https://recovery.test", "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  if (response.status !== 200) throw new Error("normal Better Auth synthetic sign-in failed");
  const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
  if (!cookie) throw new Error("Better Auth did not issue a synthetic session cookie");
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  if (!session || !ownerEmailMatches(session.user.email, email)) throw new Error("authenticated owner authorization failed");
  process.stdout.write("Synthetic Better Auth sign-in and owner authorization passed using runtime permissions.\n");
} catch {
  process.stderr.write("Synthetic Better Auth verification failed; authentication details suppressed.\n");
  process.exitCode = 1;
} finally {
  await pool.end();
}
