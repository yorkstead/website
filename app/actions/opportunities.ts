"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { opportunityStore, OpportunityOperationError } from "@/lib/opportunity-discovery-store";
import type { ResearchStatus } from "@/lib/opportunity-discovery";

export type OpportunityActionState = { error: string | null; success: string | null };
async function actor() {
  const session = await getOwnerSession(await headers());
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

async function run(work: (actorId: string) => Promise<string>): Promise<OpportunityActionState> {
  try {
    const actorId = await actor();
    const success = await work(actorId);
    revalidatePath("/dashboard/opportunities");
    revalidatePath("/dashboard");
    return { error: null, success };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") throw error;
    return { error: error instanceof OpportunityOperationError ? error.message : "The opportunity could not be saved. Refresh and retry.", success: null };
  }
}

export async function createOpportunityAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const created = await opportunityStore.create(Object.fromEntries(form), actorId);
    return `Research record created for ${created.businessName}.`;
  });
}

export async function updateOpportunityAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const id = String(form.get("id") ?? "");
    const saved = await opportunityStore.update(id, Object.fromEntries(form), actorId);
    return `Research details saved for ${saved.businessName}.`;
  });
}

export async function addOpportunityEvidenceAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const id = String(form.get("id") ?? "");
    await opportunityStore.addEvidence(id, Object.fromEntries(form), actorId);
    return "Evidence added with its source and evidence type.";
  });
}

export async function addOpportunityInterviewAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const notes = Object.fromEntries(["workflowToday","participants","toolsHandoffs","manualWork","errorsExceptions","volumeFrequency","delaysBottlenecks","workaroundCost","inactionConsequences","decisionAuthority","budgetUrgency","desiredOutcome","willingnessToChange","nextAgreedAction","additionalNotes"].map((key) => [key, form.get(key)]));
    const input = { participantRole: form.get("participantRole"), interviewOn: form.get("interviewOn"), interviewStatus: form.get("interviewStatus"), consultationId: form.get("consultationId"), notes };
    await opportunityStore.addInterview(String(form.get("id") ?? ""), input, actorId);
    return form.get("interviewStatus") === "scheduled" ? "Discovery conversation scheduled. This does not create a CRM lead." : "Discovery notes saved. This does not create a CRM lead.";
  });
}

export async function completeOpportunityInterviewAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const notes = Object.fromEntries(["workflowToday","participants","toolsHandoffs","manualWork","errorsExceptions","volumeFrequency","delaysBottlenecks","workaroundCost","inactionConsequences","decisionAuthority","budgetUrgency","desiredOutcome","willingnessToChange","nextAgreedAction","additionalNotes"].map((key) => [key, form.get(key)]));
    await opportunityStore.updateScheduledInterview(String(form.get("id") ?? ""), String(form.get("interviewId") ?? ""), { participantRole: form.get("participantRole"), interviewOn: form.get("interviewOn"), interviewStatus: "completed", consultationId: form.get("consultationId"), notes }, actorId);
    return "Scheduled conversation updated with discovery notes.";
  });
}

export async function setInterviewPermissionAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const permission = String(form.get("permission") ?? "");
    if (form.get("confirmPermission") !== "yes") throw new OpportunityOperationError("Confirm that the permission state reflects what the participant agreed to.");
    if (!(permission === "research_only" || permission === "granted" || permission === "declined")) throw new Error("Choose a valid commercial permission state.");
    const status = await opportunityStore.setInterviewPermission(String(form.get("id") ?? ""), String(form.get("interviewId") ?? ""), permission, actorId);
    return `Commercial permission recorded as ${status.replaceAll("_", " ")}.`;
  });
}

export async function setOpportunityOutreachStatusAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const status = String(form.get("status") ?? "");
    if (!(status === "preparing" || status === "permission_requested")) throw new Error("Choose a valid outreach preparation state.");
    await opportunityStore.setOutreachStatus(String(form.get("id") ?? ""), status, actorId);
    return `Preparation status saved. No message was sent.`;
  });
}

export async function saveOpportunityQualificationAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const qualification = Object.fromEntries(["evidence","severity","frequency","impact","decisionAccess","willingness","feasibility","reusability","complexity","revenueFit"].map((key) => [key, form.get(key)]));
    const result = await opportunityStore.saveQualification(String(form.get("id") ?? ""), qualification, actorId);
    return result.complete ? `Qualification complete: ${result.score}/30. Review the listed signals before ranking.` : `Qualification saved: ${result.answered}/10 inputs known; remaining items stay unknown.`;
  });
}

export async function setOpportunityPriorityAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const raw = String(form.get("priority") ?? "");
    const priority = raw ? Number(raw) : null;
    await opportunityStore.setPriority(String(form.get("id") ?? ""), priority, String(form.get("reason") ?? ""), actorId);
    return priority ? `Owner queue order set to ${priority}.` : "Owner queue override cleared.";
  });
}

export async function setOpportunityResearchStatusAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const status = String(form.get("status") ?? "") as ResearchStatus;
    await opportunityStore.setResearchStatus(String(form.get("id") ?? ""), status, actorId);
    return `Research status changed to ${status.replaceAll("_", " ")}.`;
  });
}

export async function promoteOpportunityAction(_previous: OpportunityActionState, form: FormData) {
  return run(async (actorId) => {
    const existingId = String(form.get("existingLeadId") ?? "");
    const confirmed = form.get("confirmPromotion") === "yes";
    const result = await opportunityStore.promote(String(form.get("id") ?? ""), { confirm: confirmed, existingLeadId: existingId ? Number(existingId) : null, name: String(form.get("contactName") ?? ""), email: String(form.get("contactEmail") ?? ""), company: String(form.get("contactCompany") ?? "") }, actorId);
    return result.kind === "existing" ? `Retry confirmed: opportunity is already linked to CRM lead ${result.leadId}.` : `${result.kind === "created" ? "CRM lead created" : "Existing CRM lead linked"}: lead ${result.leadId}.`;
  });
}

export async function eraseArchivedOpportunityAction(_previous: OpportunityActionState, form: FormData) {
  const actorId = await actor();
  try {
    await opportunityStore.deleteArchived(String(form.get("id") ?? ""), String(form.get("confirmation") ?? ""), actorId);
  } catch (error) {
    return { error: error instanceof OpportunityOperationError ? error.message : "Archived research could not be erased. Refresh and retry.", success: null };
  }
  revalidatePath("/dashboard/opportunities");
  redirect("/dashboard/opportunities?erased=1");
}
