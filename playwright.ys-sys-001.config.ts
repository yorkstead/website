import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-ys-sys-001",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:3113",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun run dev --hostname 127.0.0.1 --port 3113",
    url: "http://127.0.0.1:3113/login",
    timeout: 120_000,
    env: {
      BETTER_AUTH_URL: "http://127.0.0.1:3113",
      OWNER_EMAIL: "cc023-owner@example.test",
      BETTER_AUTH_SECRET: "fictional-cc023-browser-key-381d51",
      PASSKEY_RP_ID: "127.0.0.1",
      YS_SYS_001_ENABLED: "true",
    },
  },
});
