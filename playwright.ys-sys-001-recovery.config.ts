import { defineConfig } from "@playwright/test";

const baseURL = process.env.YS_APP_RECOVERY_BASE_URL;
if (baseURL !== "https://recovery.test") throw new Error("Synthetic recovery test URL is not the fixed local origin");

export default defineConfig({
  testDir: "./tests/e2e-ys-sys-001-recovery",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: "line",
  use: {
    baseURL,
    browserName: "chromium",
    ignoreHTTPSErrors: true,
    launchOptions: { args: ["--host-resolver-rules=MAP recovery.test 127.0.0.1"] },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
