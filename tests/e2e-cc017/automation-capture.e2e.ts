import { expect, test } from "@playwright/test";
import { cc016Owner, disposeCc016Inquiry, setupCc016Owner } from "../fixtures/cc016-owner";

const origin = "http://127.0.0.1:3110";
const checkedAt = "2026-10-29T16:00:00.000Z";
const captures = [
  { id: "11111111-1111-4111-8111-111111111111", createdAt: checkedAt, status: "pending", classification: { kind: "task", title: "Replace air filter", summary: "Replace the air filter before Friday.", dueDate: "2026-10-30", requiresConfirmation: true } },
  { id: "55555555-5555-4555-8555-555555555555", createdAt: checkedAt, status: "pending", classification: { kind: "lead", title: "Review prospect", summary: "A synthetic lead stays in Hub review.", dueDate: null, requiresConfirmation: true } },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", createdAt: checkedAt, status: "pending", classification: { kind: "note", title: "Review note", summary: "Synthetic note for reclassification.", dueDate: null, requiresConfirmation: true } },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", createdAt: checkedAt, status: "needs_review", classification: { kind: "task", title: "Unreconciled task", summary: "Legacy provider result needs review.", dueDate: null, requiresConfirmation: true } },
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
      expect(body.targetKind).toBe("task");
      latestCaptures = latestCaptures.map((item) => item.id === body.captureId ? { ...item, classification: { ...item.classification, kind: "task" }, status: "pending" } : item);
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
    await expect(page.getByLabel("Capture inbox").getByRole("heading", { name: "Replace air filter" })).toBeVisible();
    await expect(page.getByText("Automation Hub · captures").first()).toBeVisible();
    await expect(page.getByText("Manual reconciliation is required in Automation Hub before changing this capture’s review state.")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Unreconciled task" }).getByRole("button")).toHaveCount(0);
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
      await expect(reclassify.getByLabel("New classification")).toHaveValue("task");
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

test("uncertain command recovery survives unavailable refresh and remount with the same idempotency key", async ({ page, context }) => {
  await expect(await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).toBeOK();
  let recordsAvailable = true;
  const commandBodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/dashboard/automation-hub", async (route) => {
    if (!recordsAvailable) { await route.fulfill({ status: 503, json: { error: "unavailable" } }); return; }
    await route.fulfill({ json: { state: "available", checkedAt, data: { contractVersion: 1, source: "Automation Hub", generatedAt: checkedAt,
      captures: { source: "Automation Hub · captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [captures[2]] },
      captureActions: { source: "Automation Hub · capture action audit", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      activity: { source: "Automation Hub · execution history", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      integrationHealth: { source: "Automation Hub · database and Google Tasks", state: "available", checkedAt, database: "healthy", googleTasks: "healthy", errorCode: null },
      reviewQueue: { source: "Automation Hub · pending captures", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
      tasks: { source: "Google Tasks via Automation Hub", state: "available", checkedAt, truncated: false, errorCode: null, items: [] },
    } } });
  });
  await page.route("**/api/dashboard/automation-hub/actions", async (route) => {
    commandBodies.push(route.request().postDataJSON());
    const command = commandBodies.at(-1)!;
    if (commandBodies.length === 1) {
      await route.fulfill({ status: 503, json: { error: "hub_unavailable" } });
      return;
    }
    recordsAvailable = false;
    await route.fulfill({ status: 202, json: { contractVersion: 1, commandId: "33333333-3333-4333-8333-333333333333", captureId: captures[2].id, action: command.action, status: "processing", destination: "hub_capture_inbox", resultCode: "command_pending", externalWriteStarted: false, retrySafe: false } });
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/dashboard/automations");
  await page.getByRole("button", { name: "Reclassify" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirm reclassify" });
  await dialog.getByRole("button", { name: "Confirm reclassify" }).click();
  await expect(page.getByText("did not return a command result", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Check Hub command status" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Automation Hub records could not be loaded" })).toBeVisible();
  recordsAvailable = true;
  await page.getByRole("button", { name: "Refresh Hub records" }).click();
  await expect(page.getByLabel("Capture inbox").getByRole("heading", { name: "Review note" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Capture inbox").getByRole("heading", { name: "Review note" })).toBeVisible();
  await page.getByRole("button", { name: "Check Hub command status" }).click();
  await expect.poll(() => commandBodies.length).toBe(3);
  expect(commandBodies.map((body) => body.idempotencyKey)).toEqual([commandBodies[0].idempotencyKey, commandBodies[0].idempotencyKey, commandBodies[0].idempotencyKey]);
});

test("shopping planner reviews, edits, purchases, confirms payday, recovers same key, and renders mobile/desktop", async ({ page, context }, testInfo) => {
  const anonymousShopping=await context.request.post("/api/dashboard/shopping",{headers:{origin},data:{}});
  expect(anonymousShopping.status()).toBe(401);
  await expect(await context.request.post("/api/auth/sign-in/email", { headers: { origin }, data: cc016Owner })).toBeOK();
  const itemId="c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1";
  const captureId="c2c2c2c2-c2c2-42c2-82c2-c2c2c2c2c2c2";
  type ShoppingFixtureItem={id:string;captureId:string;name:string;category:string|null;estimatedAmount:number|null;currency:string|null;priority:"essential"|"need"|"want";priorityConfirmed:boolean;scope:"personal"|"business"|null;scopeConfirmed:boolean;timingIntent:"next_payday"|"this_week"|"specific_date"|"unscheduled";targetDate:string|null;recurrenceRule:string|null;state:"planned"|"purchased"|"postponed"|"cancelled";reviewState:"needs_review"|"approved";reviewReason:string|null;revision:number;createdAt:string;completedAt:string|null};
  let item:ShoppingFixtureItem={id:itemId,captureId,name:"Dog food",category:null,estimatedAmount:null,currency:null,priority:"need",priorityConfirmed:false,scope:null,scopeConfirmed:false,timingIntent:"next_payday",targetDate:null,recurrenceRule:null,state:"planned",reviewState:"needs_review",reviewReason:"scope_needs_confirmation",revision:1,createdAt:checkedAt,completedAt:null};
  let audits: Array<Record<string,unknown>>=[];
  const bodies:Array<Record<string,unknown>>=[];let failNext=false;let readUnavailable=false;
  const payday:{timezone:string;weekday:number;enabled:boolean;expectedAmount:number;currency:string;nextPayday:string;revision:number;updatedAt:string;records:Array<{id:string;date:string;status:string;expectedAmount:number;confirmedAmount:number;currency:string;variableIncome:boolean;receivedAt:string;reservesConfirmed:boolean;reserveAmount:number;reserveCount:number;revision:number;createdAt:string}>}={timezone:"America/Denver",weekday:1,enabled:true,expectedAmount:1200,currency:"USD",nextPayday:"2026-11-02",revision:1,updatedAt:checkedAt,records:[]};
  await page.route("**/api/dashboard/automation-hub",async(route)=>{
    if(readUnavailable){await route.fulfill({status:503,json:{error:"unavailable"}});return;}
    await route.fulfill({json:{state:"available",checkedAt,data:{contractVersion:1,source:"Automation Hub",generatedAt:checkedAt,
      captures:{source:"Automation Hub · captures",state:"available",checkedAt,truncated:false,errorCode:null,items:[]},captureActions:{source:"Automation Hub · capture action audit",state:"available",checkedAt,truncated:false,errorCode:null,items:[]},
      shopping:{source:"Automation Hub · shopping planner",state:"available",checkedAt,truncated:false,errorCode:null,items:[item]},
      payday:{source:"Automation Hub · payday planning",state:"available",checkedAt,truncated:false,errorCode:null,items:[payday]},
      shoppingAudit:{source:"Automation Hub · shopping audit",state:"available",checkedAt,truncated:false,errorCode:null,items:audits},
      activity:{source:"Automation Hub · execution history",state:"available",checkedAt,truncated:false,errorCode:null,items:[]},integrationHealth:{source:"Automation Hub",state:"available",checkedAt,database:"healthy",googleTasks:"healthy",errorCode:null},reviewQueue:{source:"Automation Hub",state:"available",checkedAt,truncated:false,errorCode:null,items:[]},tasks:{source:"Google Tasks",state:"available",checkedAt,truncated:false,errorCode:null,items:[]}}}});
  });
  await page.route("**/api/dashboard/shopping",async(route)=>{
    const body=route.request().postDataJSON() as Record<string,unknown>;bodies.push(body);
    if(failNext){failNext=false;await route.fulfill({status:503,json:{error:"hub_unavailable"}});return;}
    if(body.action==="update"){const changes=body.changes as Record<string,string>;item={...item,scope:changes.scope as "personal"|"business"|null,scopeConfirmed:true,priority:changes.priority as "essential"|"need"|"want",priorityConfirmed:true,revision:item.revision+1};}
    if(body.action==="review")item={...item,reviewState:"approved",reviewReason:null,revision:item.revision+1};
    if(body.action==="purchase")item={...item,state:"purchased",revision:item.revision+1};
    if(body.action==="unpurchase")item={...item,state:"planned",revision:item.revision+1};
    if(body.action==="skip")item={...item,state:"postponed",revision:item.revision+1};
    if(body.action==="confirm_payday")payday.records=[{id:"c3c3c3c3-c3c3-43c3-83c3-c3c3c3c3c3c3",date:String(body.paydayDate),status:"confirmed",expectedAmount:1200,confirmedAmount:1100,currency:"USD",variableIncome:false,receivedAt:checkedAt,reservesConfirmed:true,reserveAmount:300,reserveCount:1,revision:1,createdAt:checkedAt}];
    if(body.action==="set_reserves")payday.records[0]={...payday.records[0],reserveAmount:350,reserveCount:1,revision:payday.records[0].revision+1};
    audits=[{id:"c4c4c4c4-c4c4-44c4-84c4-c4c4c4c4c4c4",itemId:itemId,paydayId:null,actor:"website_owner",event:body.action,priorRevision:item.revision,resultingRevision:item.revision+1,priorState:"planned",resultingState:item.state,metadata:{},createdAt:checkedAt}];
    await route.fulfill({status:200,json:{contractVersion:2,commandId:"c5c5c5c5-c5c5-45c5-85c5-c5c5c5c5c5c5",itemId:String(body.itemId||itemId),status:"succeeded",resultCode:"updated"}});
  });
  await page.setViewportSize({width:390,height:900});await page.goto("/dashboard/automations");
  await expect(page.getByRole("heading",{name:"Shopping planner"})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("cc022b-shopping-mobile.png"),fullPage:true});
  const shoppingItem=page.locator('section[aria-labelledby="shopping-planner-title"] li').filter({has:page.getByRole("heading",{name:"Dog food",exact:true})});
  await shoppingItem.getByRole("button",{name:"Correct and review"}).click();
  const scopeControl=shoppingItem.getByRole("combobox",{name:"Scope",exact:true});
  const priorityControl=shoppingItem.getByRole("combobox",{name:"Priority",exact:true});
  await expect(scopeControl).toBeVisible();
  await scopeControl.selectOption("personal");await priorityControl.selectOption("essential");
  await page.getByRole("button",{name:"Save changes"}).click();
  await page.getByRole("button",{name:"Approve review"}).click();await page.getByRole("button",{name:"Mark purchased"}).click();
  await expect(page.getByText(/purchased/).first()).toBeVisible();await page.getByRole("button",{name:"Undo purchase"}).click();
  await page.getByLabel("Receipt date").fill("2026-11-02");await page.getByLabel("Actual amount received").fill("1100");
  await page.getByLabel("Reserve label").fill("Rent");await page.getByLabel("Reserve amount").fill("300");await page.getByRole("button",{name:"Add reserve"}).click();
  await page.getByRole("button",{name:"Confirm receipt and reserves"}).click();
  await expect(page.getByText(/Available to plan after explicitly entered reserves/)).toBeVisible();
  failNext=true;await page.getByRole("button",{name:"Repeat once"}).click();
  await expect(page.getByText(/Update needs review/)).toBeVisible();
  await page.getByRole("button",{name:"Retry same command key"}).click();
  expect(bodies.at(-1)?.idempotencyKey).toBe(bodies.at(-2)?.idempotencyKey);
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:testInfo.outputPath("cc022b-shopping-desktop.png"),fullPage:true});
  readUnavailable=true;await page.getByRole("button",{name:"Refresh planner"}).click();
  await expect(page.getByRole("alert").filter({hasText:"Automation Hub records could not be loaded"})).toBeVisible();
});
