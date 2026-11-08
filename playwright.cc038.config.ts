import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-cc038",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: { baseURL: "http://127.0.0.1:3113", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "bun run dev --hostname 127.0.0.1 --port 3113",
    url: "http://127.0.0.1:3113/login",
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      BETTER_AUTH_URL: "http://127.0.0.1:3113",
      OWNER_EMAIL: "cc038-marketing-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-cc038-marketing-browser-key-381d51",
      PASSKEY_RP_ID: "127.0.0.1",
    },
  },
});
