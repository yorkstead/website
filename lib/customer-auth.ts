import { brand } from "@/lib/brand";
import {
  customerAuthBoundary,
  resolveCustomerAuthConfiguration,
  type CustomerAuthConfiguration,
} from "@/lib/customer-auth-config";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

let customerAuthConfiguration: CustomerAuthConfiguration | undefined;
let customerAuthPool: Pool | undefined;

export function getCustomerAuthConfiguration() {
  customerAuthConfiguration ??= resolveCustomerAuthConfiguration();
  return customerAuthConfiguration;
}

function createCustomerAuthPool(configuration: CustomerAuthConfiguration) {
  return new Pool({
    connectionString: explicitVerifyFullSSL(configuration.databaseURL),
    options: `-c search_path=${customerAuthBoundary.databaseSchema}`,
  });
}

export function createCustomerAuthOptions(
  configuration: CustomerAuthConfiguration,
  database: Pool,
) {
  return {
    appName: `${brand.name} Customer Portal`,
    baseURL: configuration.baseURL,
    basePath: customerAuthBoundary.basePath,
    secret: configuration.secret,
    secrets: [{ version: 1, value: configuration.secret }],
    database,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: customerAuthBoundary.sessionExpiresIn,
      updateAge: customerAuthBoundary.sessionUpdateAge,
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => false,
        },
      },
      session: {
        create: {
          before: async (session: { userId: string }) => {
            const result = await database.query<{ authorized: boolean }>(
              `SELECT EXISTS (
                SELECT 1
                FROM public.customer_identities
                WHERE auth_provider = $1
                  AND auth_subject = $2
                  AND status = 'active'
              ) AS authorized`,
              [customerAuthBoundary.identityProvider, session.userId],
            );
            if (result.rows[0]?.authorized !== true) return false;
          },
        },
      },
    },
    advanced: {
      cookiePrefix: customerAuthBoundary.cookiePrefix,
    },
  };
}

function createCustomerAuth() {
  const configuration = getCustomerAuthConfiguration();
  customerAuthPool ??= createCustomerAuthPool(configuration);
  return betterAuth(createCustomerAuthOptions(configuration, customerAuthPool));
}

let customerAuthInstance: ReturnType<typeof createCustomerAuth> | undefined;

export function getCustomerAuth() {
  customerAuthInstance ??= createCustomerAuth();
  return customerAuthInstance;
}
