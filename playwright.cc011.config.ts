import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e-cc011",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:3106",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "bun tests/fixtures/run-owner-publishing-setup.ts && bun run dev --hostname 127.0.0.1 --port 3106",
    url: "http://127.0.0.1:3106/login",
    timeout: 120000,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3106",
      OWNER_EMAIL: "cc009-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-readiness-browser-key-381d51b987ac",
      PASSKEY_RP_ID: "127.0.0.1",
      PORTAL_READINESS_DISPOSABLE: "enabled",
      VERCEL_GIT_COMMIT_SHA: "c".repeat(40),
      PORTAL_RELEASE_CONFIGURATION_ID: "d".repeat(64),
    },
  },
});
