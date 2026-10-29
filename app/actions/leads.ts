"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contactDatabase, type LeadStatus } from "@/lib/contact-inquiries";
import { followUpTimestamp, leadStatuses, parseLeadId } from "@/lib/lead-rules";
import { convertLeadRecord, LeadConversionError, type LeadConversionQueryClient } from "@/lib/lead-conversion";
import { completeLeadFollowUpRecord, saveLeadDetailsRecord, type LeadFollowUpQueryClient } from "@/lib/lead-follow-up";
import { getOwnerSession } from "@/lib/owner-session";

async function ownerSql() {
  const session = await getOwnerSession(await headers());
  if (!session) throw new Error("Unauthorized");
  return contactDatabase();
}

function leadId(formData: FormData) {
  const id = parseLeadId(formData.get("id"));
  if (!id) throw new Error("Invalid lead");
  return id;
}

export async function updateLeadStatus(formData: FormData) {
  const sql = await ownerSql();
  const id = leadId(formData);
  const status = String(formData.get("status")) as LeadStatus;
  if (!leadStatuses.has(status)) throw new Error("Invalid lead update");
  await sql`
    UPDATE contact_inquiries
    SET status = ${status}, archived_at = CASE WHEN ${status} = 'archived' THEN COALESCE(archived_at, NOW()) ELSE NULL END,
      follow_up_at = CASE WHEN ${status} IN ('won', 'lost', 'archived') THEN NULL ELSE follow_up_at END,
      updated_at = NOW()
    WHERE id = ${id}
  `;
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export async function saveLeadDetails(formData: FormData) {
  const sql = await ownerSql();
  const id = leadId(formData);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 5000);
  const followUpAt = followUpTimestamp(formData.get("followUpAt"));
  const updated = await saveLeadDetailsRecord(sql as unknown as LeadFollowUpQueryClient, id, notes, followUpAt);
  if (!updated) throw new Error("This inquiry is no longer available or has been retired.");
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export type LeadActionState = { error: string | null };
const emptyLeadActionState: LeadActionState = { error: null };

export async function completeLeadFollowUp(_previousState: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const sql = await ownerSql();
  let id: number;
  try { id = leadId(formData); } catch { return { error: "This inquiry ID is invalid. Refresh the lead list and try again." }; }
  let completed: boolean;
  try {
    completed = await completeLeadFollowUpRecord(sql as unknown as LeadFollowUpQueryClient, id);
  } catch {
    return { error: "Follow-up completion could not be confirmed. Refresh the inquiry and try again." };
  }
  if (!completed) return { error: "This inquiry has no open follow-up, or it is no longer active. Refresh the lead list before trying again." };
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
  return emptyLeadActionState;
}

export async function convertLeadToProject(_previousState: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const sql = await ownerSql();
  let id: number;
  try { id = leadId(formData); } catch { return { error: "This inquiry ID is invalid. Refresh the lead list and try again." }; }
  const projectId = randomUUID();
  const now = new Date().toISOString();
  const activityId = randomUUID();
  let destinationId: string;
  try {
    destinationId = await convertLeadRecord(sql as unknown as LeadConversionQueryClient, id, { projectId, activityId, now });
  } catch (error) {
    return { error: error instanceof LeadConversionError ? error.message : "Project conversion could not be confirmed. Refresh the inquiry before retrying." };
  }
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
  redirect("/dashboard?project=" + encodeURIComponent(String(destinationId)));
}
