import { expect, test } from "bun:test";
import manifest from "../app/manifest";

test("Command Center launches dashboard while retaining installed identity and scope", () => {
  const app = manifest();
  expect(app.id).toBe("/");
  expect(app.start_url).toBe("/dashboard");
  expect(app.name).toBe("Yorkstead Command Center");
  expect(app.short_name).toBe("Yorkstead");
  expect(app.scope).toBe("/");
  for (const path of [app.start_url!, "/login", "/account"]) {
    expect(new URL(path, "https://example.test").pathname.startsWith(app.scope!)).toBe(true);
  }
  expect(app.shortcuts?.map(({ name, url }) => ({ name, url }))).toEqual([
    { name: "Command Center", url: "/dashboard" },
    { name: "Client Leads", url: "/dashboard/leads" },
    { name: "Analytics", url: "/dashboard/analytics" },
    { name: "Consultations", url: "/dashboard/consultations" },
  ]);
});
