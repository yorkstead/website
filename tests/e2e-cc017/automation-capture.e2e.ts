import { expect, test } from "@playwright/test";
import { cc016Owner, disposeCc016Inquiry, setupCc016Owner } from "../fixtures/cc016-owner";

const origin = "http://127.0.0.1:3110";
const checkedAt = "2026-10-29T16:00:00.000Z";
const captures = [
  { id: "11111111-1111-4111-8111-111111111111", createdAt: checkedAt, status: "pending", classification: { kind: "task", title: "Replace air filter", summary: "Replace the air filter before Friday.", dueDate: "2026-10-30", requiresConfirmation: true } },
  { id: "55555555-5555-4555-8555-555555555555", createdAt: checkedAt, status: "pending", classification: { kind: "lead", title: "Review prospect", summary: "A synthetic lead stays in Hub review.", dueDate: null, requiresConfirmation: true } },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", createdAt: checkedAt, status: "pending", classification: { kind: "note", title: "Review note", summary: "Synthetic note for reclassification.", dueDate: null, requiresConfirmation: true } },
];
let workspaceSnapshot: Awaited<ReturnType<typeof setupCc016Owner>>["workspace"] | null = null;
let fixtureInitialized = false;
type CaptureFixture = { id: string; createdAt: string; status: string; classification: { kind: string; title: string; summary: string; dueDate: string | null; requiresConfirmation: boolean } };

test.beforeAll(async () => { workspaceSnapshot = (await setupCc016Owner()).workspace; fixtureInitialized = true; });
test.afterAll(async () => { if (fixtureInitialized) await disposeCc016Inquiry(`cc022-${process.pid}@example.test`, workspaceSnapshot); });

test("owner-only Automations supports responsive capture review, confirmed actions, safe outcome, and audit history", async ({ page, context }) => {
  const anonymous = await context.request.post("/api/dashboard/automation-hub/actions", { data: {} });
  expect(anonymous.status()).toBe(401);
  expect((await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).status()).toBe(200);

  let latestCaptures: CaptureFixture[] = structuredClone(captures);
  let audits: Array<Record<string, unknown>> = [];
  await page.route("**/api/dashboard/automation-hub", async (route) => route.fulfill({ json: {
    state: "available", checkedAt,
    data: {
      contractVersion: 1, source: "Automation Hub", generatedAt: checkedAt,
      captures: { source: "Automation Hub · captures", state: "available", checkedAt, truncated: false, errorCode: null, items: latestCaptures },
      captureActions: { source: "Automation Hub · capture action audit", state: "available", checkedAt, truncated: false, errorCode: null, items: audits },
      activity: { source: "Automation Hub · execution history", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      integrationHealth: { source: "Automation Hub · database and Google Tasks", state: "available", checkedAt, database: "healthy", googleTasks: "healthy", errorCode: null },
      reviewQueue: { source: "Automation Hub · pending captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      tasks: { source: "Google Tasks via Automation Hub", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
    },
  } }));
  await page.route("**/api/dashboard/automation-hub/actions", async (route) => {
    const request = route.request(); const body = request.postDataJSON();
    expect(body.captureId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    if (body.action === "approve_task") {
      expect(body.expectedKind).toBe("task");
      latestCaptures = latestCaptures.map((item) => item.id === body.captureId ? { ...item, status: "completed" } : item);
      audits = [{ id: "66666666-6666-4666-8666-666666666666", commandId: "77777777-7777-4777-8777-777777777777", captureId: body.captureId, createdAt: checkedAt, action: body.action, event: "succeeded", priorStatus: "pending", resultingStatus: "completed", destination: "google_tasks", resultCode: "task_created" }];
      await route.fulfill({ status: 200, json: { contractVersion: 1, captureId: body.captureId, action: body.action, status: "completed", destination: "google_tasks", resultCode: "task_created", externalWriteStarted: true, retrySafe: false, taskId: "mock-task-id" } });
      return;
    }
    if (body.action === "reclassify") {
      expect(body.targetKind).toBe("lead");
      latestCaptures = latestCaptures.map((item) => item.id === body.captureId ? { ...item, classification: { ...item.classification, kind: "lead" }, status: "pending" } : item);
      audits = [{ id: "88888888-8888-4888-8888-888888888888", commandId: "99999999-9999-4999-8999-999999999999", captureId: body.captureId, createdAt: checkedAt, action: body.action, event: "succeeded", priorStatus: "pending", resultingStatus: "pending", destination: "hub_capture_inbox", resultCode: "classification_updated" }];
      await route.fulfill({ status: 200, json: { contractVersion: 1, captureId: body.captureId, action: body.action, status: "pending", destination: "hub_capture_inbox", resultCode: "classification_updated", externalWriteStarted: false, retrySafe: false } });
      return;
    }
    await route.fulfill({ status: 200, json: { contractVersion: 1, captureId: body.captureId, action: body.action, status: "pending", destination: "hub_crm_review", resultCode: "lead_staged_for_hub_review", externalWriteStarted: false, retrySafe: false } });
  });

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard/automations");
    await expect(page.getByRole("heading", { name: "Capture inbox" })).toBeVisible();
    await expect(page.getByText("Replace air filter")).toBeVisible();
    await expect(page.getByText("Automation Hub · captures").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390) {
      await page.getByRole("button", { name: "Approve task" }).click();
      const dialog = page.getByRole("dialog", { name: "Confirm approve task" });
      await expect(dialog).toContainText("Google Tasks through Automation Hub");
      await dialog.getByRole("button", { name: "Confirm approve task" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Google Task created through Automation Hub" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Capture action history" })).toBeVisible();
      await expect(page.getByText(/approve task · succeeded/)).toBeVisible();

      await page.getByRole("button", { name: "Reclassify" }).last().click();
      const reclassify = page.getByRole("dialog", { name: "Confirm reclassify" });
      await reclassify.getByLabel("New classification").selectOption("lead");
      await reclassify.getByRole("button", { name: "Confirm reclassify" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Classification updated in Automation Hub" })).toBeVisible();
    }
  }
  await page.getByRole("button", { name: "Stage for Hub CRM review" }).first().click();
  const leadConfirmation = page.getByRole("dialog", { name: "Confirm stage for hub crm review" });
  await expect(leadConfirmation).toContainText("Automation Hub CRM review queue");
  await leadConfirmation.getByRole("button", { name: "Confirm stage for hub crm review" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Lead remains staged in the Hub CRM review queue" })).toBeVisible();
});
