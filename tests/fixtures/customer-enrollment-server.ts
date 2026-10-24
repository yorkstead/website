// Disposable browser-test adapter. Never imported by application code.
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { createCustomerAuthOptions } from "../../lib/customer-auth";
import { createClientOnboardingService } from "../../lib/client-onboarding";
import {
  createCustomerEnrollmentService,
  customerEnrollmentEnabled,
} from "../../lib/customer-enrollment";
import { createEnrollmentController } from "../../lib/customer-enrollment-http";
if (!customerEnrollmentEnabled() || process.env.NODE_ENV === "production")
  throw new Error("Disposable loopback configuration required");
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const authPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  options: "-c search_path=customer_auth",
});
const origin = "http://127.0.0.1:3101";
const auth = betterAuth(
  createCustomerAuthOptions(
    {
      baseURL: origin,
      databaseURL: process.env.TEST_DATABASE_URL!,
      secret: "fictional-browser-test-auth-secret-381d51b987ac",
    },
    authPool,
  ),
);
const mailbox = new Map<string, string>();
const enrollment = createCustomerEnrollmentService(
  pool,
  {
    async send({ recipient, proof }) {
      if (!recipient.endsWith("@example.test"))
        throw new Error("Synthetic recipients only");
      mailbox.set(recipient, proof);
    },
  },
  async (p) => (await auth.$context).password.hash(p),
);
const onboarding = createClientOnboardingService(
  pool,
  async () => ({ user: { id: "fictional-browser-owner" } }),
  (headers) =>
    auth.api.getSession({ headers, query: { disableCookieCache: true } }),
);
const controller = createEnrollmentController({
  enabled: () => true,
  origin,
  enrollment,
  onboarding,
  auth: auth.api,
});
Bun.serve({
  hostname: "127.0.0.1",
  port: 3102,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ready");
    if (url.pathname === "/fixture") {
      const id = crypto.randomUUID(),
        email = `${id}@example.test`,
        tenant = `browser-${id}`,
        project = `browser-project-${id}`;
      await pool.query(
        "INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional browser tenant','active')",
        [tenant],
      );
      await pool.query(
        "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')",
        [tenant, project],
      );
      const invitation = await onboarding.issue(new Headers(), {
        tenantId: tenant,
        recipientEmail: email,
        projectIds: [project],
      });
      return Response.json({ token: invitation.token, email, project });
    }
    if (url.pathname === "/mailbox")
      return Response.json({
        proof: mailbox.get(url.searchParams.get("email") ?? ""),
      });
    return controller(request, url.pathname.split("/").pop() ?? "");
  },
});
