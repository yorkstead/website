import { describe, expect, test } from "bun:test";
import { AutomationHubShoppingCommand } from "./automation-hub-shopping-schema";

const key="11111111-1111-4111-8111-111111111111";
const item="22222222-2222-4222-8222-222222222222";

describe("versioned shopping command contract",()=>{
  test("accepts owner review and payday commands with explicit revisions",()=>{
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"review",itemId:item,expectedRevision:1}).success).toBe(true);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"confirm_payday",expectedRevision:0,paydayDate:"2026-11-02",confirmedAmount:1000,currency:"USD",variableIncome:false,reservesConfirmed:true,reserves:[]}).success).toBe(true);
  });

  test("rejects caller-owned state, unsupported fields, non-Monday schedules and impossible dates",()=>{
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"update",itemId:item,expectedRevision:1,changes:{reviewState:"approved"}}).success).toBe(false);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"purchase",itemId:item,expectedRevision:1,state:"purchased"}).success).toBe(false);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"set_payday",expectedRevision:0,enabled:true,expectedAmount:null,currency:null,nextPayday:"2026-11-03"}).success).toBe(false);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"set_payday",expectedRevision:0,enabled:true,expectedAmount:null,currency:null,nextPayday:null}).success).toBe(false);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"update",itemId:item,expectedRevision:1,changes:{targetDate:"2026-02-31"}}).success).toBe(false);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"confirm_payday",expectedRevision:0,paydayDate:"2026-02-31",confirmedAmount:1000,currency:"USD",variableIncome:false,reservesConfirmed:true,reserves:[]}).success).toBe(false);
  });

  test("bounds reserve currency and requires an explicit reserve confirmation",()=>{
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"confirm_payday",expectedRevision:0,paydayDate:"2026-11-02",confirmedAmount:1000,currency:"USD",variableIncome:false,reservesConfirmed:false,reserves:[]}).success).toBe(false);
    expect(AutomationHubShoppingCommand.safeParse({contractVersion:2,idempotencyKey:key,action:"confirm_payday",expectedRevision:0,paydayDate:"2026-11-02",confirmedAmount:1000,currency:"USD",variableIncome:false,reservesConfirmed:true,reserves:Array.from({length:21},(_,i)=>({label:`Reserve ${i}`,amount:1,currency:"USD",essential:true}))}).success).toBe(false);
  });
});
