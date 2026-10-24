import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e-cc012",
  testMatch: "**/*.e2e.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "bun tests/fixtures/run-owner-publishing-setup.ts && bun run dev --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107/login",
    timeout: 120000,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3107",
      OWNER_EMAIL: "cc009-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-communications-browser-key-381d51b987ac",
      PASSKEY_RP_ID: "127.0.0.1",
    },
  },
});
