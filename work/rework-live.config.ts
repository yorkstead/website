import { defineConfig } from "@playwright/test";
import config from "../playwright.config";
export default defineConfig({ ...config, testDir: "../tests/e2e", webServer: undefined, use: { ...config.use, baseURL: "https://yorkstead.com" } });
