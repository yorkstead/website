import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { cc016Owner, disposeCc016Inquiry, setupCc016Owner } from "../fixtures/cc016-owner";

const ids: string[] = [];
let workspaceSnapshot: Awaited<ReturnType<typeof setupCc016Owner>>["workspace"] | null = null;
let databasePool: Pool | null = null;

test.beforeAll(async () => {
  workspaceSnapshot = (await setupCc016Owner()).workspace;
  databasePool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
});

test.afterAll(async () => {
  if (databasePool) {
    await databasePool.query("DELETE FROM opportunity_history WHERE opportunity_id=ANY($1::uuid[])",[ids]);
    await databasePool.query("DELETE FROM research_opportunities WHERE id=ANY($1::uuid[])",[ids]);
    await databasePool.end();
  }
  if (workspaceSnapshot !== null) await disposeCc016Inquiry(`cc026-browser-${process.pid}@example.test`,workspaceSnapshot);
});

test("owner captures evidence, runs discovery, records permission, and validates without creating a CRM lead", async ({ page, context, baseURL }, testInfo) => {
  const origin=baseURL!;
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/dashboard/opportunities");
  await expect(page).toHaveURL(/\/login\?next=\/dashboard\/opportunities/);
  expect((await context.request.post("/api/auth/sign-in/email",{headers:{origin},data:cc016Owner})).status()).toBe(200);

  await page.goto("/dashboard/opportunities");
  const nav=page.getByRole("navigation",{name:"Primary and tools navigation"});
  const opportunityNav=nav.getByRole("link",{name:"Opportunity Discovery",exact:true});
  await expect(opportunityNav).toHaveAttribute("href","/dashboard/opportunities");
  await expect(opportunityNav).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("heading",{name:"Opportunity Discovery"})).toBeVisible();
  await expect(page.getByText("No research records match")).toBeVisible();

  const businessName=`CC-026 Disposable ${randomUUID().slice(0,8)}`;
  const customerProjection=await page.request.get("/customer/opportunities");
  expect(customerProjection.status()).toBe(404);
  expect(await customerProjection.text()).not.toContain(businessName);
  await page.getByText("Capture a researched problem").click();
  const createForm=page.locator("form").filter({has:page.getByLabel("Business or industry")});
  await createForm.getByLabel("Business or industry").fill(businessName);
  await createForm.getByLabel("Industry",{exact:true}).fill("Manufacturing");
  await createForm.getByLabel("Geographic market (optional)").fill("Front Range");
  await createForm.getByLabel("Operational area or workflow").fill("Receiving reconciliation");
  await createForm.getByLabel("Date observed").fill("2026-10-30");
  await createForm.getByLabel("Suspected problem (hypothesis until supported)").fill("Receiving quantities may be copied between records.");
  await createForm.getByRole("button",{name:"Create research record"}).click();
  await expect(page.getByText("Research record created")).toBeVisible();
  const createdRecord=await databasePool!.query<{id:string}>("SELECT id::text AS id FROM research_opportunities WHERE business_name=$1 ORDER BY created_at DESC LIMIT 1",[businessName]);
  const opportunityId=createdRecord.rows[0]?.id;
  expect(opportunityId).toMatch(/^[0-9a-f-]{36}$/i);
  ids.push(opportunityId!);
  const record=page.getByRole("link",{name:businessName,exact:true});
  await expect(record).toBeVisible();
  await expect(record).toHaveAttribute("href",`/dashboard/opportunities?id=${opportunityId}`);
  await page.goto(`/dashboard/opportunities?id=${opportunityId}`);
  await expect(page.getByText("Hypothesis",{exact:true})).toBeVisible();
  await expect(page.getByText("No evidence added. Keep the suspected problem labeled as a hypothesis.")).toBeVisible();

  const evidenceForm=page.locator("form").filter({has:page.getByLabel("Evidence summary")});
  await evidenceForm.getByLabel("What kind of evidence is this?").selectOption("business_statement");
  await evidenceForm.getByLabel("Evidence summary").fill("A receiving lead described copying each packing-slip line into the inventory screen.");
  await evidenceForm.getByLabel("Source URL or traceable reference").fill("interview CC-026-01");
  await evidenceForm.getByLabel("Date observed").fill("2026-10-30");
  await evidenceForm.getByRole("button",{name:"Add evidence"}).click();
  await expect(page.getByText("Business statement",{exact:true})).toBeVisible();

  await page.getByText("Schedule a conversation or record a completed interview").click();
  const interviewForm=page.locator("form").filter({has:page.getByLabel("Conversation state")});
  await interviewForm.getByLabel("Conversation state").selectOption("completed");
  await interviewForm.getByLabel("Participant role (not a contact record)").fill("Receiving lead");
  await interviewForm.getByLabel("Date",{exact:true}).fill("2026-10-30");
  await interviewForm.getByLabel("How the workflow operates today").fill("Staff compare a packing slip with the inventory screen.");
  await interviewForm.getByLabel("Who participates").fill("Receiving lead and inventory clerk.");
  await interviewForm.getByLabel("Current tools and handoffs").fill("Paper packing slip to inventory application.");
  await interviewForm.getByLabel("Next agreed action").fill("Share the current receiving checklist.");
  await interviewForm.getByRole("button",{name:"Save conversation"}).click();
  await expect(page.getByText("Discovery notes saved. This does not create a CRM lead.")).toBeVisible();

  const permissionForm=page.locator("form").filter({has:page.getByLabel("Commercial discussion permission")});
  await permissionForm.getByLabel("Commercial discussion permission").selectOption("granted");
  await permissionForm.getByLabel("This reflects the participant's agreement.").check();
  await permissionForm.getByRole("button",{name:"Record permission"}).click();
  await expect(page.getByText(/Commercial permission:.*permission granted/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Confirm and promote to CRM"})).toHaveCount(0);

  const statusForm=page.locator("form").filter({has:page.getByLabel("Research stage")});
  await statusForm.getByLabel("Research stage").selectOption("validated");
  await statusForm.getByRole("button",{name:"Save stage"}).click();
  await expect(page.getByText("Validated problem",{exact:true})).toBeVisible();
  await expect(page.getByText("Opportunity linked to CRM lead")).toHaveCount(0);

  const recordCount=await databasePool!.query("SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE company=$1",[businessName]);
  expect(recordCount.rows[0]?.count).toBe(0);

  await mkdir(testInfo.outputDir,{recursive:true});
  await page.screenshot({path:testInfo.outputPath("owner-opportunity-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole("heading",{name:businessName})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("owner-opportunity-mobile.png"),fullPage:true});

  await page.getByRole("button",{name:"Open navigation menu"}).click();
  const drawer=page.getByRole("dialog",{name:"Yorkstead navigation"});
  await expect(drawer.getByRole("link",{name:"Opportunity Discovery"})).toHaveAttribute("aria-current","page");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});
