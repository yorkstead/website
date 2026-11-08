import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun run dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      OWNER_EMAIL: "cc021-owner@example.test",
      PASSKEY_RP_ID: "127.0.0.1",
      BETTER_AUTH_SECRET: "cC021R7mW4xQ9pL2sV8nK5dH1aF6Z3Z7",
      OWNER_BOOTSTRAP_TOKEN: "cC021B9vK2xR7mP4qT8nH5sD1aF6Z3Z7",
      YORKSTEAD_AUTOMATIONS_READ_SECRET: "",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
