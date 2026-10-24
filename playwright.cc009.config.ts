import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e-cc009",testMatch:"**/*.e2e.ts",fullyParallel:false,workers:1,
  timeout:60000,
  use:{baseURL:"http://127.0.0.1:3103",trace:"retain-on-failure",screenshot:"only-on-failure"},
  webServer:{
    command:"bun tests/fixtures/run-owner-publishing-setup.ts && bun run dev --hostname 127.0.0.1 --port 3103",
    url:"http://127.0.0.1:3103/login",timeout:120000,
    env:{BETTER_AUTH_URL:"http://127.0.0.1:3103",OWNER_EMAIL:"cc009-owner@example.test",BETTER_AUTH_SECRET:"fictional-publishing-browser-key-381d51b987ac",PASSKEY_RP_ID:"127.0.0.1"},
  },
});
