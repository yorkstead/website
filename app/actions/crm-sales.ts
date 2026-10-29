"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getOwnerSession } from "@/lib/owner-session";
import { parseLeadId } from "@/lib/lead-rules";
import { parseLeadQualification, parseProposalInput, parseProposalUpdateInput, saveLeadQualification, saveProposal, proposalStates, updateProposal, updateProposalState } from "@/lib/crm-sales";

async function requireOwner() {
  if (!await getOwnerSession(await headers())) throw new Error("Unauthorized");
}

export async function saveLeadQualificationAction(formData: FormData) {
  await requireOwner();
  const leadId = parseLeadId(formData.get("leadId"));
  if (!leadId) throw new Error("Invalid lead");
  const qualification = parseLeadQualification(Object.fromEntries(["industry", "pain", "companySize", "urgency", "decisionMaker", "budgetIndication", "nextStep", "wonReason", "lostReason"].map((key) => [key, formData.get(key)])));
  if (!qualification) throw new Error("Qualification details are invalid.");
  if (!await saveLeadQualification(leadId, qualification)) throw new Error("This inquiry is no longer available or has been retired.");
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export async function createProposalAction(formData: FormData) {
  await requireOwner();
  const input = parseProposalInput({ leadId: formData.get("leadId"), engagementType: formData.get("engagementType"), amount: formData.get("amount"), state: formData.get("state"), nextAction: formData.get("nextAction"), nextActionAt: formData.get("nextActionAt") });
  if (!input) throw new Error("Enter a valid engagement, explicit amount, proposal state, and next action date.");
  if (!await saveProposal(input)) throw new Error("This inquiry is no longer available or has been retired.");
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export async function updateProposalStateAction(formData: FormData) {
  await requireOwner();
  const leadId = parseLeadId(formData.get("leadId"));
  const proposalId = String(formData.get("proposalId") ?? "");
  const state = String(formData.get("state") ?? "");
  if (!leadId || !proposalStates.includes(state as typeof proposalStates[number])) throw new Error("Invalid proposal update.");
  if (!await updateProposalState(leadId, proposalId, state as typeof proposalStates[number])) throw new Error("This proposal or inquiry is no longer available.");
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export async function updateProposalAction(formData: FormData) {
  await requireOwner();
  const input = parseProposalUpdateInput({
    leadId: formData.get("leadId"),
    proposalId: formData.get("proposalId"),
    engagementType: formData.get("engagementType"),
    amount: formData.get("amount"),
    nextAction: formData.get("nextAction"),
    nextActionAt: formData.get("nextActionAt"),
  });
  if (!input) throw new Error("Enter a valid proposal engagement, amount, and next action.");
  if (!await updateProposal(input)) throw new Error("This proposal or inquiry is no longer available or has been retired.");
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}
