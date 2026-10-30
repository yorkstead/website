import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";
import { closeOpportunityStorePool, opportunityStore } from "@/lib/opportunity-discovery-store";
import { archivedInquiryPurgeQuery } from "@/lib/data-retention";

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

async function validatedResearch(businessName: string) {
  const actor = "cc026-disposable-owner";
  const created = await opportunityStore.create(basicOpportunity(businessName), actor);
  opportunityIds.push(created.id);
  await opportunityStore.addEvidence(created.id,{ evidenceType:"business_statement",summary:"A participant described a receiving handoff.",sourceReference:"disposable test interview",observedOn:"2026-10-30",ownerNote:"Synthetic test evidence" },actor);
  const interviewId = await opportunityStore.addInterview(created.id,{ participantRole:"Operations manager",interviewOn:"2026-10-30",interviewStatus:"completed",notes:interviewNotes },actor);
  await opportunityStore.setResearchStatus(created.id,"researching",actor);
  await opportunityStore.setResearchStatus(created.id,"validated",actor);
  await opportunityStore.setInterviewPermission(created.id,interviewId,"granted",actor);
  return created.id;
}

describe("opportunity discovery transactional boundaries in disposable PostgreSQL", () => {
  databaseTest("serializes overlapping company and email identities independently", async () => {
    mutableEnv.DATABASE_URL = databaseURL!;
    const actor = "cc026-disposable-owner";
    for (const overlap of ["company", "email"] as const) {
      const token = randomUUID().slice(0,8);
      const sharedCompany = `CC-026 Parallel ${token}`;
      const firstCompany = sharedCompany;
      const secondCompany = overlap === "company" ? sharedCompany.toLowerCase().replaceAll(" ", "-") : `CC-026 Other ${token}`;
      const sharedEmail = `parallel-${token}@example.test`;
      const firstEmail = sharedEmail;
      const secondEmail = overlap === "email" ? sharedEmail.toUpperCase() : `other-${token}@example.test`;
      emailAddresses.push(firstEmail,secondEmail.toLowerCase());
      const [firstId,secondId] = await Promise.all([validatedResearch(firstCompany),validatedResearch(secondCompany)]);
      const results = await Promise.allSettled([
        opportunityStore.promote(firstId,{confirm:true,name:"Synthetic first",email:firstEmail,company:firstCompany},actor),
        opportunityStore.promote(secondId,{confirm:true,name:"Synthetic second",email:secondEmail,company:secondCompany},actor),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(String((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason)).toContain("matching CRM lead already exists");
      const leads = await connectionPool!.query("SELECT id FROM contact_inquiries WHERE email=ANY($1::text[])",[[firstEmail,secondEmail.toLowerCase()]]);
      expect(leads.rowCount).toBe(1);
      const linked = await connectionPool!.query("SELECT id,crm_lead_id FROM research_opportunities WHERE id=ANY($1::uuid[]) ORDER BY id",[[firstId,secondId]]);
      expect(linked.rows.filter((row) => row.crm_lead_id !== null)).toHaveLength(1);
      const unlinkedId = linked.rows.find((row) => row.crm_lead_id === null)?.id;
      expect((await opportunityStore.get(unlinkedId))?.researchStatus).toBe("validated");
    }
  });

  databaseTest("returns overdue DATE values as stable strings for the React report", async () => {
    mutableEnv.DATABASE_URL = databaseURL!;
    const created = await opportunityStore.create({...basicOpportunity(`CC-026 Overdue ${randomUUID().slice(0,8)}`),nextActionAt:"2020-01-02"},"cc026-disposable-owner");
    opportunityIds.push(created.id);
    const row = (await opportunityStore.reports()).overdueActions.find((item) => item.id === created.id);
    expect(row?.next_action_at).toBe("2020-01-02");
    expect(typeof row?.next_action_at).toBe("string");
  });

  databaseTest("purges unrelated expired inquiries while retaining linked research and later releases the link on erasure", async () => {
    mutableEnv.DATABASE_URL = databaseURL!;
    const linkedEmail = `retention-linked-${randomUUID()}@example.test`;
    const eligibleEmail = `retention-eligible-${randomUUID()}@example.test`;
    emailAddresses.push(linkedEmail,eligibleEmail);
    const linked = await connectionPool!.query<{id:string}>("INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,archived_at) VALUES('Synthetic linked',$1,'CC-026 linked research','Test record',$2,'archived','2020-01-01') RETURNING id",[linkedEmail,randomUUID()]);
    const eligible = await connectionPool!.query<{id:string}>("INSERT INTO contact_inquiries(name,email,company,message,ip_hash,status,archived_at) VALUES('Synthetic eligible',$1,'CC-026 eligible','Test record',$2,'archived','2020-01-01') RETURNING id",[eligibleEmail,randomUUID()]);
    const research = await opportunityStore.create(basicOpportunity(`CC-026 Retention ${randomUUID().slice(0,8)}`),"cc026-disposable-owner");
    opportunityIds.push(research.id);
    await connectionPool!.query("UPDATE research_opportunities SET crm_lead_id=$2 WHERE id=$1",[research.id,linked.rows[0]!.id]);
    const firstPurge = await connectionPool!.query(archivedInquiryPurgeQuery,["2025-01-01T00:00:00Z"]);
    expect(firstPurge.rows.some((row) => row.id === eligible.rows[0]!.id)).toBe(true);
    expect(firstPurge.rows.some((row) => row.id === linked.rows[0]!.id)).toBe(false);
    expect((await connectionPool!.query("SELECT 1 FROM contact_inquiries WHERE id=$1",[linked.rows[0]!.id])).rowCount).toBe(1);
    expect((await connectionPool!.query("SELECT crm_lead_id FROM research_opportunities WHERE id=$1",[research.id])).rows[0]?.crm_lead_id).toBe(linked.rows[0]!.id);
    await opportunityStore.setResearchStatus(research.id,"archived","cc026-disposable-owner");
    await opportunityStore.deleteArchived(research.id,`DELETE ${research.id}`,"cc026-disposable-owner");
    const secondPurge = await connectionPool!.query(archivedInquiryPurgeQuery,["2025-01-01T00:00:00Z"]);
    expect(secondPurge.rows.some((row) => row.id === linked.rows[0]!.id)).toBe(true);
    expect((await connectionPool!.query("SELECT event_type FROM opportunity_history WHERE opportunity_id=$1 ORDER BY id DESC LIMIT 1",[research.id])).rows[0]?.event_type).toBe("erased");
  });

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

    await opportunityStore.setResearchStatus(created.id,"researching",actor);
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
