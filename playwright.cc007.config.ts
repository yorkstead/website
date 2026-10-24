import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e-cc007",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "bun tests/fixtures/customer-enrollment-server.ts",
      url: "http://127.0.0.1:3102/health",
      timeout: 30000,
    },
    {
      command: "bun run dev --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/customer/sign-in",
      timeout: 120000,
      env: {
        BETTER_AUTH_URL: "http://127.0.0.1:3101",
        CUSTOMER_AUTH_SECRET: "fictional-browser-test-auth-secret-381d51b987ac",
      },
    },
  ],
});
