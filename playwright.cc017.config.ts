import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-cc017",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:3110", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: "bun run dev --hostname 127.0.0.1 --port 3110",
    url: "http://127.0.0.1:3110/login",
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3110",
      OWNER_EMAIL: "cc016-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-cc017-browser-key-381d51b987ac",
      PASSKEY_RP_ID: "127.0.0.1",
    },
  },
});
