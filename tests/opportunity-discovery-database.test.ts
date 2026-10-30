import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";
import { closeOpportunityStorePool, opportunityStore } from "@/lib/opportunity-discovery-store";

const databaseURL = disposableTestDatabaseURL();
const databaseTest = databaseURL ? test : test.skip;
const connectionPool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;
const priorDatabaseURL = process.env.DATABASE_URL;
const priorNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;
const opportunityIds: string[] = [];
const emailAddresses: string[] = [];

afterAll(async () => {
  if (connectionPool) {
    await connectionPool.query("DELETE FROM opportunity_history WHERE opportunity_id=ANY($1::uuid[])", [opportunityIds]);
    await connectionPool.query("DELETE FROM research_opportunities WHERE id=ANY($1::uuid[])", [opportunityIds]);
    if (emailAddresses.length) await connectionPool.query("DELETE FROM contact_inquiries WHERE email=ANY($1::text[])", [emailAddresses]);
    await connectionPool.end();
  }
  await closeOpportunityStorePool();
  mutableEnv.DATABASE_URL = priorDatabaseURL;
  mutableEnv.NODE_ENV = priorNodeEnv;
});

const basicOpportunity = (businessName: string) => ({
  businessName, industry: "Manufacturing", geographicMarket: "Front Range", workflow: "Receiving reconciliation",
  suspectedProblem: "Receiving quantities may be copied between records.", observedOn: "2026-10-30", lastVerifiedOn: "",
  evidenceConfidence: "unknown", currentWorkaround: "", likelyFrequency: "", likelySeverity: "", operationalImpact: "",
  potentialSoftwareApproach: "", openQuestions: "", nextAction: "Review the receiving handoff", nextActionAt: "",
});
const interviewNotes = {
  workflowToday: "Staff compare the packing slip with a receiving screen.", participants: "Receiving lead and inventory clerk.",
  toolsHandoffs: "Paper packing slip to inventory application.", manualWork: "Re-enter line items.", errorsExceptions: "Short shipments are checked separately.",
  volumeFrequency: "Daily during receiving.", delaysBottlenecks: "The clerk waits for the receiver to finish.", workaroundCost: "A second manual check.",
  inactionConsequences: "Inventory counts can be delayed.", decisionAuthority: "Operations manager.", budgetUrgency: "Not discussed.",
  desiredOutcome: "A clear exception list.", willingnessToChange: "Open to reviewing workflow options.", nextAgreedAction: "Share the current process map.", additionalNotes: "Synthetic disposable-test interview only.",
};

describe("opportunity discovery transactional boundaries in disposable PostgreSQL", () => {
  databaseTest("keeps research isolated, requires evidence and consent, and promotes idempotently without changing CRM follow-up", async () => {
    mutableEnv.NODE_ENV = "development";
    mutableEnv.DATABASE_URL = databaseURL!;
    const actor = "cc026-disposable-owner";
    const companyName = `CC-026 Disposable ${randomUUID().slice(0,8)}`;
    const createdEmail = `cc026-${randomUUID()}@example.test`;
    emailAddresses.push(createdEmail);
    const created = await opportunityStore.create(basicOpportunity(companyName), actor);
    opportunityIds.push(created.id);
    expect(created.researchStatus).toBe("hypothesis");
    const separate = await connectionPool!.query("SELECT id FROM contact_inquiries WHERE company=$1", [companyName]);
    expect(separate.rowCount).toBe(0);

    await expect(opportunityStore.setResearchStatus(created.id,"validated",actor)).rejects.toThrow("requires a business statement");
    await opportunityStore.addEvidence(created.id,{ evidenceType:"hypothesis", summary:"Maybe duplicate entry is common", sourceReference:"owner research notes", observedOn:"2026-10-30", ownerNote:"Keep unvalidated" },actor);
    await opportunityStore.addEvidence(created.id,{ evidenceType:"business_statement", summary:"Receiving staff described copying each slip line into the inventory screen.", sourceReference:"interview CC-026-01", observedOn:"2026-10-30", ownerNote:"Participant statement; not independently verified" },actor);
    const interviewId = await opportunityStore.addInterview(created.id,{ participantRole:"Receiving lead", interviewOn:"2026-10-30", interviewStatus:"completed", consultationId:null, notes:interviewNotes },actor);
    await opportunityStore.setResearchStatus(created.id,"researching",actor);
    await opportunityStore.setResearchStatus(created.id,"validated",actor);
    await opportunityStore.setInterviewPermission(created.id,interviewId,"granted",actor);
    const beforeReport = await opportunityStore.reports();
    expect(beforeReport.validatedUnpromoted.some((item) => item.id === created.id)).toBe(true);

    const promote = () => opportunityStore.promote(created.id,{ confirm:true, name:"Synthetic receiving lead", email:createdEmail, company:companyName },actor);
    const [first, retry] = await Promise.all([promote(),promote()]);
    expect(first.leadId).toBe(retry.leadId);
    expect([first.kind,retry.kind]).toEqual(expect.arrayContaining(["created","existing"]));
    const crmLead = await connectionPool!.query("SELECT id,status,follow_up_at,next_step,intake FROM contact_inquiries WHERE email=$1",[createdEmail]);
    expect(crmLead.rowCount).toBe(1);
    expect(crmLead.rows[0]).toMatchObject({ id: String(first.leadId), status:"new", follow_up_at:null, next_step:"" });
    expect(crmLead.rows[0]?.intake).toMatchObject({ source:"owner-research", opportunityId:created.id });
    const analytics = await connectionPool!.query("SELECT COUNT(*)::int AS count FROM conversion_events WHERE contact_inquiry_id=$1",[first.leadId]);
    expect(analytics.rows[0]?.count).toBe(0);
    const events = await connectionPool!.query("SELECT event_type FROM opportunity_history WHERE opportunity_id=$1 ORDER BY id",[created.id]);
    expect(events.rows.map((row) => row.event_type)).toContain("crm_created");
    expect((await opportunityStore.reports()).validatedUnpromoted.some((item) => item.id === created.id)).toBe(false);

    const linkedBusiness = `CC-026 Existing lead ${randomUUID().slice(0,8)}`;
    const existingEmail = `existing-${randomUUID()}@example.test`;
    emailAddresses.push(existingEmail);
    const existing = await connectionPool!.query<{ id: string }>("INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,follow_up_at,next_step) VALUES('Existing synthetic lead',$1,$2,'Preserve CRM data',$3,'qualified','2026-11-04T18:00:00Z','Call after inventory review') RETURNING id",[existingEmail,linkedBusiness,randomUUID()]);
    const existingLeadId = Number(existing.rows[0]!.id);
    const linkedResearch = await opportunityStore.create(basicOpportunity(linkedBusiness),actor);
    opportunityIds.push(linkedResearch.id);
    await opportunityStore.addEvidence(linkedResearch.id,{ evidenceType:"verified_fact",summary:"A public operating-hours note states receiving closes at 4 pm.",sourceReference:"https://example.com/receiving-hours",observedOn:"2026-10-30",ownerNote:"Synthetic source in database test" },actor);
    await opportunityStore.addInterview(linkedResearch.id,{ participantRole:"Operations manager",interviewOn:"2026-10-30",interviewStatus:"completed",notes:interviewNotes },actor);
    await opportunityStore.setResearchStatus(linkedResearch.id,"researching",actor);
    await opportunityStore.setResearchStatus(linkedResearch.id,"validated",actor);
    const linkedInterview=(await opportunityStore.get(linkedResearch.id))!.interviews[0]!;
    await opportunityStore.setInterviewPermission(linkedResearch.id,linkedInterview.id,"granted",actor);
    expect((await opportunityStore.duplicateLeads(linkedBusiness)).some((lead) => lead.id === existingLeadId)).toBe(true);
    const linked=await opportunityStore.promote(linkedResearch.id,{confirm:true,existingLeadId},actor);
    expect(linked).toEqual({kind:"linked",leadId:existingLeadId});
    const preserved=await connectionPool!.query("SELECT status,follow_up_at,next_step FROM contact_inquiries WHERE id=$1",[existingLeadId]);
    expect(preserved.rows[0]).toEqual({status:"qualified",follow_up_at:new Date("2026-11-04T18:00:00.000Z"),next_step:"Call after inventory review"});
    await expect(opportunityStore.promote(linkedResearch.id,{confirm:true,name:"Duplicate",email:createdEmail,company:linkedBusiness},actor)).resolves.toMatchObject({kind:"existing",leadId:existingLeadId});

    const erasable = await opportunityStore.create(basicOpportunity(`CC-026 Erasable ${randomUUID().slice(0,8)}`),actor);
    opportunityIds.push(erasable.id);
    await opportunityStore.addEvidence(erasable.id,{evidenceType:"hypothesis",summary:"Synthetic deletion evidence",sourceReference:"research notebook",observedOn:"2026-10-30",ownerNote:"Disposable only"},actor);
    await opportunityStore.setResearchStatus(erasable.id,"archived",actor);
    await expect(opportunityStore.deleteArchived(erasable.id,"wrong",actor)).rejects.toThrow("Type DELETE");
    expect((await opportunityStore.deleteArchived(erasable.id,`DELETE ${erasable.id}`,actor)).deleted).toBe(true);
    expect((await connectionPool!.query("SELECT 1 FROM research_opportunities WHERE id=$1",[erasable.id])).rowCount).toBe(0);
    expect((await connectionPool!.query("SELECT event_type FROM opportunity_history WHERE opportunity_id=$1 ORDER BY id DESC LIMIT 1",[erasable.id])).rows[0]?.event_type).toBe("erased");
  });
});
