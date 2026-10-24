import { hasStrongSecret } from "@/lib/auth-config";

const developmentDefaults = {
  baseURL: "http://localhost:3000",
  databaseURL: "postgresql://localhost:5432/work_ctrl",
  secret: "local-customer-auth-secret-change-before-deploying",
} as const;

export const customerAuthBoundary = Object.freeze({
  basePath: "/api/customer-auth",
  cookiePrefix: "yorkstead-customer",
  databaseSchema: "customer_auth",
  identityProvider: "yorkstead-customer-auth",
  sessionExpiresIn: 60 * 60 * 8,
  sessionUpdateAge: 60 * 60,
} as const);

export type CustomerAuthConfiguration = {
  baseURL: string;
  databaseURL: string;
  secret: string;
};

type CustomerAuthEnvironment = Partial<Record<
  "BETTER_AUTH_URL" | "DATABASE_URL" | "CUSTOMER_AUTH_SECRET",
  string
>>;

function configuredValue(
  name: keyof CustomerAuthEnvironment,
  value: string | undefined,
  fallback: string,
  production: boolean,
) {
  if (value && value !== "[SENSITIVE]") return value;
  if (production) throw new Error(`${name} must be configured before customer authentication can be enabled`);
  return fallback;
}

function parseBaseURL(value: string, production: boolean) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL");
  }

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("BETTER_AUTH_URL must be an origin without credentials, path, query, or fragment");
  }
  if (production && (url.protocol !== "https:" || url.port)) {
    throw new Error("BETTER_AUTH_URL must use HTTPS without a custom port in production");
  }
  if (!production && !["http:", "https:"].includes(url.protocol)) {
    throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS");
  }
  return url.origin;
}

function parseDatabaseURL(value: string) {
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname === "/") {
      throw new Error();
    }
    return value;
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
}

export function resolveCustomerAuthConfiguration(
  environment: CustomerAuthEnvironment = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    CUSTOMER_AUTH_SECRET: process.env.CUSTOMER_AUTH_SECRET,
  },
  nodeEnvironment = process.env.NODE_ENV,
): CustomerAuthConfiguration {
  const production = nodeEnvironment === "production";
  const baseURL = parseBaseURL(
    configuredValue("BETTER_AUTH_URL", environment.BETTER_AUTH_URL, developmentDefaults.baseURL, production),
    production,
  );
  const databaseURL = parseDatabaseURL(
    configuredValue("DATABASE_URL", environment.DATABASE_URL, developmentDefaults.databaseURL, production),
  );
  const secret = configuredValue(
    "CUSTOMER_AUTH_SECRET",
    environment.CUSTOMER_AUTH_SECRET,
    developmentDefaults.secret,
    production,
  );

  if (production && !hasStrongSecret(secret)) {
    throw new Error("CUSTOMER_AUTH_SECRET must contain at least 32 high-entropy characters in production");
  }

  return { baseURL, databaseURL, secret };
}
