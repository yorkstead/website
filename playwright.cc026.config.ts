import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-cc026",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "bun run dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      OWNER_EMAIL: "cc016-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-cc026-browser-key-381d51",
      PASSKEY_RP_ID: "127.0.0.1",
    },
  },
});
