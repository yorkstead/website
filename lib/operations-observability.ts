import type { DocumentOwnerVerifier } from "@/lib/document-approval";

export type OperationsCheckStatus =
  | "healthy"
  | "degraded"
  | "not_configured"
  | "not_verified"
  | "unknown";

export type OperationsCheck = {
  id: string;
  label: string;
  category: "application" | "dependency" | "background";
  status: OperationsCheckStatus;
  summary: string;
  checkedAt?: string;
  impact: string;
  ownerAction: string;
};

export type OperationsIncident = {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  impact: string;
  ownerAction: string;
};

export type OperationsOverview = {
  checkedAt: string;
  status: "healthy" | "degraded" | "needs_review";
  readOnly: true;
  liveAlertDelivery: false;
  checks: OperationsCheck[];
  cronSchedules: { id: string; path: string; schedule: string }[];
  incidents: OperationsIncident[];
  recoveryControls: {
    id: string;
    label: string;
    status: "not_verified";
    evidenceNeeded: string;
  }[];
};

export type BriefingObservation = {
  status: "ready" | "failed" | "generating" | "unknown";
  updatedAt: Date | null;
  generatedAt: Date | null;
} | null;

export type OperationsInput = {
  now: Date;
  authConfigurationValid: boolean;
  databaseStatus: "healthy" | "not_configured" | "unavailable" | "timeout";
  authSchemaPresent: boolean | null;
  briefing: BriefingObservation;
  briefingReadAvailable: boolean;
};

export const cronScheduleIntent = [
  { id: "morning-briefing", path: "/api/cron/morning-briefing", schedule: "15 13 * * *" },
  { id: "morning-briefing-fallback", path: "/api/cron/morning-briefing", schedule: "15 14 * * *" },
  { id: "reminders", path: "/api/cron/reminders", schedule: "0 14 * * *" },
  { id: "retention", path: "/api/cron/retention", schedule: "30 14 * * *" },
] as const;

const briefingFreshnessMs = 36 * 60 * 60 * 1000;
const stuckGenerationMs = 5 * 60 * 1000;

function briefingCheck(input: OperationsInput): OperationsCheck {
  const base = {
    id: "morning-briefing",
    label: "Morning briefing",
    category: "background" as const,
    impact: "The owner may not receive the latest briefing.",
    ownerAction: "Review the fixed morning-briefing Vercel function logs and scheduler status.",
  };
  if (!input.briefingReadAvailable) {
    return { ...base, status: "unknown", summary: "Run history could not be checked safely." };
  }
  if (!input.briefing) {
    return { ...base, status: "not_verified", summary: "No recorded briefing run is available." };
  }
  const updatedAt = input.briefing.updatedAt;
  if (!updatedAt || !Number.isFinite(updatedAt.getTime())) {
    return { ...base, status: "unknown", summary: "The most recent run has no valid observation time." };
  }
  const checkedAt = updatedAt.toISOString();
  const age = input.now.getTime() - updatedAt.getTime();
  if (age < 0) {
    return { ...base, status: "unknown", checkedAt, summary: "The latest run timestamp is later than the current check." };
  }
  if (input.briefing.status === "failed") {
    return { ...base, status: "degraded", checkedAt, summary: `The latest recorded run failed at ${checkedAt}.` };
  }
  if (input.briefing.status === "generating" && age > stuckGenerationMs) {
    return { ...base, status: "degraded", checkedAt, summary: `The latest run has remained in progress since ${checkedAt}.` };
  }
  if (input.briefing.status === "ready" && input.briefing.generatedAt && age <= briefingFreshnessMs) {
    return { ...base, status: "healthy", checkedAt, summary: `A briefing completed at ${input.briefing.generatedAt.toISOString()}. This does not verify scheduler delivery.` };
  }
  if (input.briefing.status === "ready" && age > briefingFreshnessMs) {
    return { ...base, status: "degraded", checkedAt, summary: `The latest successful briefing is stale (${checkedAt}).` };
  }
  return { ...base, status: "unknown", checkedAt, summary: "The latest run does not establish successful processing." };
}

export function buildOperationsOverview(input: OperationsInput): OperationsOverview {
  const checkedAt = input.now.toISOString();
  const checks: OperationsCheck[] = [
    {
      id: "application",
      label: "Application",
      category: "application",
      status: "healthy",
      summary: "The owner-only operations check responded.",
      checkedAt,
      impact: "Public routes are serving this request.",
      ownerAction: "No action indicated by this check.",
    },
    {
      id: "database",
      label: "PostgreSQL connectivity",
      category: "dependency",
      status: input.databaseStatus === "healthy" ? "healthy" : input.databaseStatus === "not_configured" ? "not_configured" : "degraded",
      summary: input.databaseStatus === "healthy"
        ? "A bounded read-only query succeeded."
        : input.databaseStatus === "not_configured"
          ? "The database connection is not configured."
          : input.databaseStatus === "timeout"
            ? "The bounded database check timed out."
            : "The database check failed; connection details are withheld.",
      checkedAt,
      impact: "Database-backed owner, lead and customer workflows may be unavailable.",
      ownerAction: "Review the database provider status and application connection logs. Do not run a migration or restore from this page.",
    },
    {
      id: "auth-configuration",
      label: "Authentication configuration",
      category: "dependency",
      status: input.authConfigurationValid ? "healthy" : "not_configured",
      summary: input.authConfigurationValid
        ? "Required Better Auth settings passed local validation; sign-in was not exercised."
        : "Required Better Auth settings are missing or invalid; values are withheld.",
      checkedAt,
      impact: "Owner sign-in or session verification may be unavailable.",
      ownerAction: "Review the authentication configuration through the approved release process; this page never displays secrets.",
    },
    {
      id: "auth-schema",
      label: "Authentication database schema",
      category: "dependency",
      status: input.authSchemaPresent === true ? "healthy" : input.authSchemaPresent === false ? "degraded" : "unknown",
      summary: input.authSchemaPresent === true
        ? "The expected Better Auth user table is present. This does not exercise a sign-in."
        : input.authSchemaPresent === false
          ? "The expected Better Auth user table was not found."
          : "The authentication schema could not be observed.",
      checkedAt,
      impact: "Owner and customer authentication may be affected.",
      ownerAction: "Compare the deployed schema with the reviewed migration history. Do not run migrations from this page.",
    },
    {
      id: "cron-schedule-intent",
      label: "Scheduled background jobs",
      category: "background",
      status: "not_verified",
      summary: `${cronScheduleIntent.length} cron schedule declarations are checked into the repository; deployed scheduler activation and execution are not observable here.`,
      impact: "Reminder and retention jobs may be delayed or not run.",
      ownerAction: "Inspect the deployment's fixed Vercel Cron configuration and function logs in the provider console.",
    },
    briefingCheck(input),
    {
      id: "reminder-execution",
      label: "Reminder execution history",
      category: "background",
      status: "not_verified",
      summary: "The application does not retain a trusted reminder execution heartbeat.",
      impact: "Scheduled reminders may be delayed without a visible run history.",
      ownerAction: "Review the fixed reminder function's provider logs; no reminder is sent by this check.",
    },
    {
      id: "retention-execution",
      label: "Retention execution history",
      category: "background",
      status: "not_verified",
      summary: "The application does not retain a trusted retention execution heartbeat.",
      impact: "Scheduled cleanup timing cannot be confirmed here.",
      ownerAction: "Review the fixed retention function's provider logs; this page does not run cleanup.",
    },
  ];

  const incidentDetails: Record<string, Omit<OperationsIncident, "id">> = {
    database: { severity: "critical", title: "Database connectivity failed", impact: checks.find((check) => check.id === "database")!.impact, ownerAction: checks.find((check) => check.id === "database")!.ownerAction },
    "auth-configuration": { severity: "critical", title: "Authentication configuration is unavailable", impact: checks.find((check) => check.id === "auth-configuration")!.impact, ownerAction: checks.find((check) => check.id === "auth-configuration")!.ownerAction },
    "auth-schema": { severity: "high", title: "Authentication schema check failed", impact: checks.find((check) => check.id === "auth-schema")!.impact, ownerAction: checks.find((check) => check.id === "auth-schema")!.ownerAction },
    "morning-briefing": { severity: "medium", title: "Morning briefing is failing or stale", impact: checks.find((check) => check.id === "morning-briefing")!.impact, ownerAction: checks.find((check) => check.id === "morning-briefing")!.ownerAction },
  };
  const incidents = checks
    .filter((check) => check.status === "degraded" || check.status === "not_configured")
    .flatMap((check) => incidentDetails[check.id] ? [{ id: check.id, ...incidentDetails[check.id]! }] : []);
  const status = incidents.length
    ? "degraded"
    : checks.some((check) => check.status === "unknown" || check.status === "not_verified")
      ? "needs_review"
      : "healthy";

  return {
    checkedAt,
    status,
    readOnly: true,
    liveAlertDelivery: false,
    checks,
    cronSchedules: cronScheduleIntent.map(({ id, path, schedule }) => ({ id, path, schedule })),
    incidents,
    recoveryControls: [
      { id: "backup", label: "Current backup or restore point", status: "not_verified", evidenceNeeded: "A current provider backup observation with its retention boundary." },
      { id: "restore-test", label: "Restore rehearsal", status: "not_verified", evidenceNeeded: "A dated, scoped restore rehearsal with integrity and recovery-time results." },
      { id: "rollback", label: "Release rollback rehearsal", status: "not_verified", evidenceNeeded: "A reviewed rollback procedure verified against a specific release." },
      { id: "incident-owner", label: "Named incident owner and escalation", status: "not_verified", evidenceNeeded: "A named responder, escalation path and tested contact procedure." },
    ],
  };
}

export function operationsJSON(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function createOperationsController(dependencies: {
  verifyOwner: DocumentOwnerVerifier;
  inspect: () => Promise<OperationsOverview>;
}) {
  return async (request: Request) => {
    try {
      if (!(await dependencies.verifyOwner(request.headers)))
        return operationsJSON({ error: "Owner access required" }, 401);
      if (request.method !== "GET")
        return operationsJSON({ error: "Method unavailable" }, 405);
      if (new URL(request.url).search)
        return operationsJSON({ error: "Invalid request" }, 400);
      return operationsJSON(await dependencies.inspect());
    } catch {
      return operationsJSON({ error: "Operations status temporarily unavailable" }, 503);
    }
  };
}
