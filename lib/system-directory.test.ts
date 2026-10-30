import { describe, expect, test } from "bun:test";
import { monthlyEquivalent, orderExceptions, parseSystemAmountInput, refreshSystemsControlPanel, safeHttpsURL, servicesLinkedToProject, staleHealth, summarizeCosts, systemDirectoryInputSchema, type SystemDirectoryInput } from "@/lib/system-directory";
import { createSystemDirectoryController } from "@/lib/system-directory-http";

const valid:SystemDirectoryInput={name:"Yorkstead Website",category:"hosting",provider:"Vercel",purpose:"Website hosting",dashboardURL:"https://vercel.com/dashboard",documentationURL:"",accountIdentity:"owner@example.com",billingEntity:"Yorkstead Systems",notes:"",relationships:[{kind:"project",name:"Website"},{kind:"repository",name:"yorkstead/website",url:"https://github.com/yorkstead/website"},{kind:"domain",name:"yorkstead.com"}],billingCadence:"annual",currency:"USD",amount:120,amountBasis:"actual",costConfirmation:"confirmed",renewalDate:"2026-11-15",pinned:false,manualHealth:"not_monitored",manualHealthSummary:"",manualHealthCheckedAt:null};

describe("CC-023 systems directory validation and calculations",()=>{
 test("preserves decimal text until save parsing, accepts clear, and rejects malformed amounts",()=>{
  expect(parseSystemAmountInput("12.50")).toEqual({ok:true,amount:12.5});
  expect(parseSystemAmountInput("")).toEqual({ok:true,amount:null});
  expect(parseSystemAmountInput("12.")).toEqual({ok:false});
  expect(parseSystemAmountInput("12..5")).toEqual({ok:false});
  expect(parseSystemAmountInput("1,250.00")).toEqual({ok:false});
  expect(parseSystemAmountInput("1000000000.01")).toEqual({ok:false});
 });
 test("control-panel refresh starts both sources once and reports independent outcomes",async()=>{
  let overview=0;let intelligence=0;
  const outcomes=await refreshSystemsControlPanel(async()=>{overview++;},async()=>{intelligence++;throw new Error("upstream unavailable");});
  expect(overview).toBe(1);expect(intelligence).toBe(1);
  expect(outcomes[0]?.status).toBe("fulfilled");expect(outcomes[1]?.status).toBe("rejected");
 });
 test("accepts explicit safe directory facts and rejects secrets and tenant/credential fields",()=>{
  expect(systemDirectoryInputSchema.safeParse(valid).success).toBe(true);
  expect(systemDirectoryInputSchema.safeParse({...valid,accountIdentity:"Bearer abcdefghijklmnop"}).success).toBe(false);
  expect(systemDirectoryInputSchema.safeParse({...valid,notes:"api_key=super-secret"}).success).toBe(false);
  expect(systemDirectoryInputSchema.safeParse({...valid,amount:null,amountBasis:"unknown",costConfirmation:"confirmed"}).success).toBe(false);
  expect(systemDirectoryInputSchema.safeParse({...valid,billingCadence:"usage_based",amount:72,amountBasis:"estimated"}).success).toBe(true);
  expect(systemDirectoryInputSchema.safeParse({...valid,tenantId:"customer-1"}).success).toBe(false);
  expect(systemDirectoryInputSchema.safeParse({...valid,dashboardURL:"javascript:alert(1)"}).success).toBe(false);
  expect(systemDirectoryInputSchema.safeParse({...valid,relationships:[{kind:"domain",name:"not a domain"}]}).success).toBe(false);
 });
 test("accepts only HTTPS links without embedded credentials",()=>{
  expect(safeHttpsURL("https://github.com/yorkstead/website")).toBe(true);
  expect(safeHttpsURL("http://github.com")).toBe(false);
  expect(safeHttpsURL("https://user:password@example.com")).toBe(false);
 });
 test("calculates supported recurring cadences and preserves unknown costs",()=>{
  expect(monthlyEquivalent("monthly",10)).toBe(10);
  expect(monthlyEquivalent("annual",120)).toBe(10);
  expect(monthlyEquivalent("quarterly",30)).toBe(10);
  expect(monthlyEquivalent("weekly",12)).toBe(52);
  expect(monthlyEquivalent("usage_based",12)).toBeNull();
  expect(monthlyEquivalent("promotional",0)).toBeNull();
  const summary=summarizeCosts([
   {...valid,billingCadence:"monthly",amount:20,amountBasis:"actual",costConfirmation:"confirmed",renewalDate:"2026-11-10"},
   {...valid,name:"Estimated Service",billingCadence:"annual",amount:120,amountBasis:"estimated",costConfirmation:"unverified",renewalDate:"2026-11-20"},
   {...valid,name:"Unknown Service",billingCadence:"usage_based",amount:null,amountBasis:"unknown",costConfirmation:"unverified",renewalDate:null},
  ],new Date("2026-10-30T00:00:00Z"));
  expect(summary.totals.USD).toMatchObject({monthlyEquivalent:30,annualized:360,actual:20,estimated:10,confirmed:20,unverified:10});
  expect(summary.renewals.map(item=>item.name)).toEqual(["Yorkstead Website","Estimated Service"]);
 });
 test("orders down, degraded, stale, unknown, not-monitored, then healthy and marks expired evidence stale",()=>{
  const now=new Date("2026-10-30T00:00:00Z");
  const row=(id:string,status:"down"|"degraded"|"stale"|"unknown"|"not_monitored"|"healthy")=>({id,status,source:"test",checkedAt:status==="not_monitored"?null:"2026-10-29T23:00:00Z",summary:"test",affected:["Website"]});
  const stale=staleHealth(row("old","healthy"),now,60_000);
  expect(stale.status).toBe("stale");
  expect(staleHealth({...row("future","healthy"),checkedAt:"2026-10-31T00:00:00Z"},now).status).toBe("unknown");
  expect(orderExceptions([row("ok","healthy"),row("none","not_monitored"),row("down","down"),row("bad","degraded"),stale,row("unknown","unknown")]).map(item=>item.id)).toEqual(["down","bad","old","unknown","none","ok"]);
 });
 test("dependency impact includes only explicit project relationships",()=>{
  expect(servicesLinkedToProject([{name:"Hosting",relationships:[{kind:"project",name:"Yorkstead Website"}]},{name:"Neon",relationships:[{kind:"integration",name:"Website database"}]},{name:"Other project",relationships:[{kind:"project",name:"Automation Hub"}]}],"yorkstead website")).toEqual(["Hosting"]);
 });
});

describe("CC-023 owner HTTP boundary",()=>{
 test("requires owner auth before reads and denies tenant selection",async()=>{
  let reads=0;const service={list:async()=>{reads++;return[]},audit:async()=>[],create:async()=>({}),update:async()=>null,archive:async()=>null} as never;
  const handler=createSystemDirectoryController({verifyOwner:async()=>null,service,origin:"https://yorkstead.com"});
  const denied=await handler(new Request("https://yorkstead.com/api/systems-directory"));
  expect(denied.status).toBe(401);expect(reads).toBe(0);expect(denied.headers.get("cache-control")).toContain("no-store");
  const authed=createSystemDirectoryController({verifyOwner:async()=>({user:{id:"owner"}}),service,origin:"https://yorkstead.com"});
  const tenant=await authed(new Request("https://yorkstead.com/api/systems-directory?tenant=customer-1"));
  expect(tenant.status).toBe(400);expect(reads).toBe(0);
 });
 test("validates origin, content type, strict fields, and returns no submitted secret",async()=>{
  let creates=0;const service={list:async()=>[],audit:async()=>[],create:async()=>{creates++;return {id:"safe"}},update:async()=>null,archive:async()=>null} as never;
  const handler=createSystemDirectoryController({verifyOwner:async()=>({user:{id:"owner"}}),service,origin:"https://yorkstead.com"});
  const body=JSON.stringify({...valid,notes:"api_key=do-not-echo"});
  const request=new Request("https://yorkstead.com/api/systems-directory",{method:"POST",headers:{origin:"https://attacker.example","content-type":"application/json"},body});
  const blocked=await handler(request);expect(blocked.status).toBe(403);expect(await blocked.text()).not.toContain("do-not-echo");
  const unsupported=await handler(new Request("https://yorkstead.com/api/systems-directory",{method:"POST",headers:{origin:"https://yorkstead.com","content-type":"text/plain"},body}));
  expect(unsupported.status).toBe(415);
  const invalid=await handler(new Request("https://yorkstead.com/api/systems-directory",{method:"POST",headers:{origin:"https://yorkstead.com","content-type":"application/json"},body}));
  expect(invalid.status).toBe(400);expect(await invalid.text()).not.toContain("do-not-echo");expect(creates).toBe(0);
 });
});
