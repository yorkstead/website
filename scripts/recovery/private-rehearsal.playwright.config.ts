import { defineConfig } from "@playwright/test";

const baseURL = process.env.YS_APP_RECOVERY_BASE_URL;
if (process.env.YS_APP_RECOVERY_PRIVATE_REHEARSAL !== "true" || baseURL !== "https://recovery.test") {
  throw new Error("private recovery Playwright configuration requires the internal recovery origin");
}

export default defineConfig({
  testDir: "../../tests/e2e-ys-sys-001-private-recovery",
  testMatch: "private-recovery.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "dot",
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
});
