import type { LeadStatus } from "@/lib/contact-inquiries";

export const leadStatuses = new Set<LeadStatus>(["new", "contacted", "qualified", "proposal", "won", "lost", "archived"]);

export function parseLeadId(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function followUpTimestamp(value: FormDataEntryValue | null) {
  const date = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;

  return parsed.toISOString();
}
