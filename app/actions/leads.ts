"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contactDatabase, type LeadStatus } from "@/lib/contact-inquiries";
import { followUpTimestamp, leadStatuses } from "@/lib/lead-rules";
import { convertLeadRecord, type LeadConversionQueryClient } from "@/lib/lead-conversion";
import { getOwnerSession } from "@/lib/owner-session";

async function ownerSql() {
  const session = await getOwnerSession(await headers());
  if (!session) throw new Error("Unauthorized");
  return contactDatabase();
}

function leadId(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid lead");
  return id;
}

export async function updateLeadStatus(formData: FormData) {
  const sql = await ownerSql();
  const id = leadId(formData);
  const status = String(formData.get("status")) as LeadStatus;
  if (!leadStatuses.has(status)) throw new Error("Invalid lead update");
  await sql`
    UPDATE contact_inquiries
    SET status = ${status}, archived_at = CASE WHEN ${status} = 'archived' THEN COALESCE(archived_at, NOW()) ELSE NULL END, updated_at = NOW()
    WHERE id = ${id}
  `;
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export async function saveLeadDetails(formData: FormData) {
  const sql = await ownerSql();
  const id = leadId(formData);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 5000);
  const followUpAt = followUpTimestamp(formData.get("followUpAt"));
  await sql`UPDATE contact_inquiries SET notes = ${notes}, follow_up_at = ${followUpAt}, updated_at = NOW() WHERE id = ${id}`;
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
}

export async function convertLeadToProject(formData: FormData) {
  const sql = await ownerSql();
  const id = leadId(formData);
  const projectId = randomUUID();
  const now = new Date().toISOString();
  const activityId = randomUUID();
  const destinationId = await convertLeadRecord(sql as unknown as LeadConversionQueryClient, id, { projectId, activityId, now });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/leads");
  redirect("/dashboard?project=" + encodeURIComponent(String(destinationId)));
}
