import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-cc018",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: { baseURL: "http://127.0.0.1:3111", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "bun run dev --hostname 127.0.0.1 --port 3111",
    url: "http://127.0.0.1:3111/login",
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3111",
      OWNER_EMAIL: "cc016-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-cc018-browser-key-381d51b987ac",
      PASSKEY_RP_ID: "127.0.0.1",
    },
  },
});
