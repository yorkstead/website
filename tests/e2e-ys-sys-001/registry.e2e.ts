import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { cc023Owner, disposeCc023Owner, setupCc023Owner } from "../fixtures/cc023-owner";
import { systemEntityClasses } from "../../lib/system-registry";

test.beforeAll(async()=>setupCc023Owner());
test.afterAll(async()=>disposeCc023Owner());

test("owner can stage all Registry classes, search, add evidence-backed dependencies, and review audit",async({page,context,baseURL})=>{
  expect((await context.request.get("/api/systems-registry")).status()).toBe(401);
  await page.goto("/dashboard/systems/registry/impact");await expect(page).toHaveURL(/\/login\?next=\/dashboard\/systems\/registry\/impact/);
  await page.goto("/dashboard/systems/registry/readiness");await expect(page).toHaveURL(/\/login\?next=\/dashboard\/systems\/registry\/readiness/);
  await page.goto("/dashboard/systems/registry");await expect(page).toHaveURL(/\/login\?next=\/dashboard\/systems\/registry/);
  const origin=baseURL!;const login=await context.request.post("/api/auth/sign-in/email",{headers:{origin},data:cc023Owner});expect(login.status()).toBe(200);
  const suffix=randomUUID().slice(0,8);const ids:string[]=[];
  for(const entityClass of systemEntityClasses){
    const subscription=entityClass==="subscription";
    const response=await context.request.post("/api/systems-registry",{headers:{origin},data:{entityClass,details:{name:`Synthetic ${entityClass} ${suffix}`,category:"other",provider:`Provider ${entityClass}`,purpose:`Browser fixture for ${entityClass}`,accountIdentity:"",billingEntity:"",notes:"",relationships:[],billingCadence:subscription?"annual":"unknown",currency:"USD",amount:subscription?120:null,amountBasis:subscription?"actual":"unknown",costConfirmation:subscription?"confirmed":"unverified",renewalDate:null,pinned:false,manualHealth:"not_monitored",manualHealthSummary:"",manualHealthCheckedAt:null},responsibleRole:"Synthetic owner",recoveryRole:"Synthetic operator",verificationState:"unknown",provenanceKind:"unknown",provenanceReference:null,observedAt:null}});
    expect(response.status(),entityClass).toBe(201);ids.push((await response.json()).entry.id);
  }
  await page.goto("/dashboard/systems/registry");await expect(page.getByRole("heading",{name:"Systems Registry"})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Systems Registry views"})).toBeVisible();
  await page.getByLabel("Search Registry").fill(`Synthetic application_workload ${suffix}`);
  const filteredCard=page.locator("article").filter({has:page.getByRole("heading",{name:`Synthetic application_workload ${suffix}`})});
  await expect(filteredCard).toBeVisible();await expect(filteredCard.getByText("Application / workload",{exact:true})).toBeVisible();
  await page.getByLabel("Search Registry").fill("");
  await page.getByLabel("Relationship source").selectOption(ids[3]!);await page.getByLabel("Relationship target").selectOption(ids[0]!);
  await page.getByLabel("Relationship evidence").fill("synthetic dependency fixture");await page.getByRole("button",{name:"Link",exact:true}).click();
  await expect(page.getByText(new RegExp(`Synthetic application_workload ${suffix}.*depends on.*Synthetic provider_service ${suffix}`))).toBeVisible();
  await page.goto("/dashboard/systems/registry/impact");await expect(page.getByRole("heading",{name:"Dependency impact"})).toBeVisible();
  await page.getByLabel("Search records").fill(`Synthetic application_workload ${suffix}`);
  await page.getByLabel("Inspect a system").selectOption(ids[3]!);
  await expect(page.getByRole("heading",{name:`Synthetic application_workload ${suffix}`})).toBeVisible();
  await expect(page.locator("section").filter({has:page.getByRole("heading",{name:"Upstream dependencies"})}).getByText("Provider / service",{exact:true})).toBeVisible();
  await expect(page.getByText("Unverified path")).toBeVisible();
  await expect(page.getByRole("link",{name:`Synthetic provider_service ${suffix}`})).toHaveAttribute("href",new RegExp("/dashboard/systems/registry#"));
  await page.goto("/dashboard/systems/registry/readiness");await expect(page.getByRole("heading",{name:"Activation readiness"})).toBeVisible();
  await expect(page.getByText("Blocked",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Missing recovery role"})).toBeVisible();
  await page.goto("/dashboard/systems/registry");
  await page.getByRole("button",{name:"Add record"}).click();const name=`Synthetic UI service ${suffix}`;
  await page.getByLabel("Name",{exact:true}).fill(name);await page.getByLabel("Provider / technology").fill("Synthetic provider");
  await page.getByRole("button",{name:"Save record"}).click();const card=page.locator("article").filter({has:page.getByRole("heading",{name})});await expect(card).toBeVisible();
  await card.getByRole("button",{name:"Audit"}).click();await expect(page.getByRole("heading",{name:"Recent audit history"})).toBeVisible();await expect(page.getByText(/Revision 1 · created/)).toBeVisible();
  const archive=await context.request.patch("/api/systems-registry",{headers:{origin},data:{id:ids[5],expectedRevision:1,action:"archive"}});expect(archive.status()).toBe(200);
  expect(systemEntityClasses).toHaveLength(6);
});

test("owner records verification, monitoring, and one shared billing source with audit provenance",async({page,context,baseURL})=>{
  const origin=baseURL!;const login=await context.request.post("/api/auth/sign-in/email",{headers:{origin},data:cc023Owner});expect(login.status()).toBe(200);
  const suffix=randomUUID().slice(0,8);
  const makeEntry=(name:string,entityClass:"provider_account"|"subscription",monitoringConfiguration="unknown")=>context.request.post("/api/systems-registry",{headers:{origin},data:{entityClass,details:{name,category:"other",provider:"Synthetic billing vendor",purpose:"Synthetic issue 98 workflow",accountIdentity:"",billingEntity:"",notes:"",relationships:[],billingCadence:"unknown",currency:"USD",amount:null,amountBasis:"unknown",costConfirmation:"unverified",renewalDate:null,pinned:false,manualHealth:"not_monitored",manualHealthSummary:"",manualHealthCheckedAt:null},responsibleRole:"Synthetic owner",recoveryRole:"Synthetic operator",verificationState:"unknown",provenanceKind:"unknown",provenanceReference:null,observedAt:null,monitoringConfiguration}});
  const accountResponse=await makeEntry(`Synthetic billing account ${suffix}`,"provider_account");expect(accountResponse.status()).toBe(201);const account=(await accountResponse.json()).entry.id;
  const firstResponse=await makeEntry(`Synthetic subscription A ${suffix}`,"subscription","configured");expect(firstResponse.status()).toBe(201);const first=(await firstResponse.json()).entry.id;
  const secondResponse=await makeEntry(`Synthetic subscription B ${suffix}`,"subscription");expect(secondResponse.status()).toBe(201);const second=(await secondResponse.json()).entry.id;
  const registry=await context.request.get("/api/systems-registry");const registryBody=await registry.json();
  const firstEntry=registryBody.entries.find((entry:{id:string})=>entry.id===first);
  const verified=await context.request.post("/api/systems-registry/verification",{headers:{origin},data:{id:first,expectedRevision:firstEntry.revision,evidence:{status:"verified",subject:"Synthetic subscription is listed in provider account",method:"provider_console",reference:`synthetic-console-${suffix}`,observedAt:new Date().toISOString(),reviewDue:null}}});expect(verified.status()).toBe(200);
  const verifiedEntry=(await verified.json()).entry;
  const monitoring=await context.request.post("/api/systems-registry/monitoring",{headers:{origin},data:{id:first,expectedRevision:verifiedEntry.revision,evidence:{outcome:"unavailable",method:"status_page",reference:`synthetic-status-${suffix}`,observedAt:new Date().toISOString(),reviewDue:null,summary:"Synthetic provider status page unavailable"}}});expect(monitoring.status()).toBe(200);
  const billing=await context.request.post("/api/systems-registry/billing",{headers:{origin},data:{type:"evidence",evidence:{providerAccountId:account,sourceKind:"invoice",reference:`synthetic-invoice-${suffix}`,observedAt:new Date().toISOString(),periodStart:"2026-10-01",periodEnd:"2026-10-31",amountBasis:"actual",amount:120,currency:"USD",payerLabel:"Synthetic owner",status:"unverified",reviewDue:null}}});expect(billing.status()).toBe(201);const evidence=(await billing.json()).evidence;
  for(const [subscriptionId,amount] of [[first,80],[second,40]] as const){const allocation=await context.request.post("/api/systems-registry/billing",{headers:{origin},data:{type:"allocation",allocation:{evidenceId:evidence.id,subscriptionId,amount}}});expect(allocation.status()).toBe(201);}
  const rollup=await context.request.get("/api/systems-registry/billing");const rollupBody=await rollup.json();expect(rollupBody.rollup).toContainEqual(expect.objectContaining({amountBasis:"actual",currency:"USD",amountTotal:"120.00",sourceCount:1}));
  const billingAudit=await context.request.get(`/api/systems-registry/billing?audit=${evidence.id}`);expect((await billingAudit.json()).audit).toHaveLength(3);
  await page.goto("/dashboard/systems/registry");await expect(page.getByRole("heading",{name:"Systems Registry"})).toBeVisible();
  const card=page.locator("article").filter({has:page.getByRole("heading",{name:`Synthetic subscription A ${suffix}`})});await expect(card).toBeVisible();await expect(card.getByText(/Monitoring configured \/ unavailable/)).toBeVisible();
  const billingCard=page.locator("article").filter({hasText:`synthetic-invoice-${suffix}`});await expect(billingCard).toBeVisible();await billingCard.getByRole("button",{name:"Audit"}).click();await expect(billingCard.getByText(/Billing source audit/)).toBeVisible();
});
