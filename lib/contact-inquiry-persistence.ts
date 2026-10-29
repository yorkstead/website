import type { AnalyticsAttribution } from "@/lib/analytics-contract";

type InquiryInsertValues = {
  name: string;
  email: string;
  company: string | null;
  projectType: string | null;
  budget: string | null;
  message: string;
  intake?: Record<string, unknown> | null;
  attribution?: AnalyticsAttribution;
};

type InsertedInquiryId = { id: number | string };

export type ContactInquiryInsertClient = {
  query: (query: string, params?: unknown[]) => Promise<unknown>;
};

export async function insertContactInquiry(
  client: ContactInquiryInsertClient,
  values: InquiryInsertValues,
  ipHash: string,
  submissionKey: string,
) {
  const attribution = values.attribution ?? {};
  const source = attribution.utmSource ?? attribution.referrerHost ?? "direct";
  const medium = attribution.utmMedium ?? (attribution.referrerHost ? "referral" : "none");
  const result = await client.query(
    `INSERT INTO contact_inquiries (
      name, email, company, project_type, budget, message, ip_hash, intake, submission_key,
      source, medium, campaign, content, term, landing_page, referrer,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21
    ) ON CONFLICT (submission_key) WHERE submission_key IS NOT NULL DO NOTHING RETURNING id`,
    [
      values.name,
      values.email,
      values.company,
      values.projectType,
      values.budget,
      values.message,
      ipHash,
      values.intake ? JSON.stringify(values.intake) : null,
      submissionKey,
      source,
      medium,
      attribution.utmCampaign ?? null,
      attribution.utmContent ?? null,
      attribution.utmTerm ?? null,
      attribution.landingPath ?? null,
      attribution.referrerHost ?? null,
      attribution.utmSource ?? null,
      attribution.utmMedium ?? null,
      attribution.utmCampaign ?? null,
      attribution.utmContent ?? null,
      attribution.utmTerm ?? null,
    ],
  );
  const rows: InsertedInquiryId[] = Array.isArray(result)
    ? result as InsertedInquiryId[]
    : result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)
      ? result.rows as InsertedInquiryId[]
      : [];
  const id = rows[0]?.id;
  if (id === undefined) return null;
  const numericId = Number(id);
  return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
}
