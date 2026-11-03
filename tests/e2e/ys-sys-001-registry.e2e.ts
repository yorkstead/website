import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { cc023Owner, disposeCc023Owner, setupCc023Owner } from "../fixtures/cc023-owner";
import { systemEntityClasses } from "../../lib/system-registry";

test.beforeAll(async()=>setupCc023Owner());
test.afterAll(async()=>disposeCc023Owner());

test("owner can stage all Registry classes, search, add evidence-backed dependencies, and review audit",async({page,context,baseURL})=>{
  expect(process.env.YS_SYS_001_ENABLED).toBe("true");
  expect((await context.request.get("/api/systems-registry")).status()).toBe(401);
  await page.goto("/dashboard/systems/registry");await expect(page).toHaveURL(/\/login\?next=\/dashboard\/systems\/registry/);
  const origin=baseURL!;const login=await context.request.post("/api/auth/sign-in/email",{headers:{origin},data:cc023Owner});expect(login.status()).toBe(200);
  const suffix=randomUUID().slice(0,8);const ids:string[]=[];
  for(const entityClass of systemEntityClasses){
    const subscription=entityClass==="subscription";
    const response=await context.request.post("/api/systems-registry",{headers:{origin},data:{entityClass,details:{name:`Synthetic ${entityClass} ${suffix}`,category:"other",provider:`Provider ${entityClass}`,purpose:`Browser fixture for ${entityClass}`,accountIdentity:"",billingEntity:"",notes:"",relationships:[],billingCadence:subscription?"annual":"unknown",currency:"USD",amount:subscription?120:null,amountBasis:subscription?"actual":"unknown",costConfirmation:subscription?"confirmed":"unverified",renewalDate:null,pinned:false,manualHealth:"not_monitored",manualHealthSummary:"",manualHealthCheckedAt:null},responsibleRole:"Synthetic owner",recoveryRole:"Synthetic operator",verificationState:"unknown",provenanceKind:"unknown",provenanceReference:null,observedAt:null}});
    expect(response.status(),entityClass).toBe(201);ids.push((await response.json()).entry.id);
  }
  await page.goto("/dashboard/systems/registry");await expect(page.getByRole("heading",{name:"Systems Registry"})).toBeVisible();
  await expect(page.getByText("Provider / service",{exact:true}).first()).toBeVisible();
  await page.getByLabel("Search Registry").fill(`Synthetic application_workload ${suffix}`);
  await expect(page.getByRole("heading",{name:`Synthetic application_workload ${suffix}`})).toBeVisible();
  await page.getByLabel("Search Registry").fill("");
  await page.getByLabel("Relationship source").selectOption(ids[3]!);await page.getByLabel("Relationship target").selectOption(ids[0]!);
  await page.getByLabel("Relationship evidence").fill("synthetic dependency fixture");await page.getByRole("button",{name:"Link",exact:true}).click();
  await expect(page.getByText(new RegExp(`Synthetic application_workload ${suffix}.*depends on.*Synthetic provider_service ${suffix}`))).toBeVisible();
  await page.getByRole("button",{name:"Add record"}).click();const name=`Synthetic UI service ${suffix}`;
  await page.getByLabel("Name",{exact:true}).fill(name);await page.getByLabel("Provider / technology").fill("Synthetic provider");
  await page.getByRole("button",{name:"Save record"}).click();const card=page.locator("article").filter({has:page.getByRole("heading",{name})});await expect(card).toBeVisible();
  await card.getByRole("button",{name:"Audit"}).click();await expect(page.getByRole("heading",{name:"Recent audit history"})).toBeVisible();await expect(page.getByText(/Revision 1 · created/)).toBeVisible();
  const archive=await context.request.patch("/api/systems-registry",{headers:{origin},data:{id:ids[5],expectedRevision:1,action:"archive"}});expect(archive.status()).toBe(200);
  expect(systemEntityClasses).toHaveLength(6);
});
