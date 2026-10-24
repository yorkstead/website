CREATE SCHEMA IF NOT EXISTS customer_auth;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_auth."user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_auth."session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES customer_auth."user"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_auth."account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES customer_auth."user"("id") ON DELETE CASCADE,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope" TEXT,
  "idToken" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_auth_account_provider_key UNIQUE ("providerId", "accountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_auth."verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_auth_session_user_idx ON customer_auth."session" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_auth_account_user_idx ON customer_auth."account" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_auth_verification_identifier_idx ON customer_auth."verification" ("identifier");
