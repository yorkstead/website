export type ReadinessStatus =
  "passed" | "blocked" | "not_verified" | "not_applicable";
export type ReadinessDefinition = {
  id: string;
  category: string;
  severity: "critical" | "high" | "low";
  scope: "global" | "customer";
  kind: "technical" | "manual";
  description: string;
  role: string;
  dependency: string;
  approval: string;
  invalidation: string;
  ttlSeconds: number;
  mandatory: boolean;
};
const technical = (
  id: string,
  category: string,
  description: string,
  dependency: string,
  scope: "global" | "customer" = "global",
): ReadinessDefinition => ({
  id,
  category,
  description,
  dependency,
  scope,
  kind: "technical",
  severity: "critical",
  role: "Platform/security operator",
  approval: "Independent technical verification",
  invalidation: "Changed release, schema, configuration, observation or expiry",
  ttlSeconds: 3600,
  mandatory: true,
});
const manual = (
  id: string,
  category: string,
  description: string,
  role: string,
): ReadinessDefinition => ({
  id,
  category,
  description,
  role,
  scope: "global",
  kind: "manual",
  severity: "high",
  dependency:
    "Owner reviews the release runbook and accountable role assignment",
  approval: "Explicit owner attestation, not a technical test",
  invalidation: "Changed release, evidence, role assignment or expiry",
  ttlSeconds: 86400,
  mandatory: true,
});
export const readinessCatalog: readonly ReadinessDefinition[] = [
  technical(
    "release.identity",
    "Release",
    "Exact code revision and reviewed configuration identity are known",
    "Trusted build metadata and opaque reviewed configuration digest",
  ),
  technical(
    "code.disabled-routes",
    "Authentication",
    "Customer production routes and capabilities remain disabled",
    "Existing hardcoded gates; no activation in this milestone",
  ),
  technical(
    "auth.isolation",
    "Authentication",
    "Customer authentication boundary is isolated in code",
    "Separate provider schema, cookie and API path; production configuration separately qualified",
  ),
  technical(
    "schema.applied",
    "Release",
    "Migration ledger matches the exact release checksum manifest",
    "All 17 applied migrations, no unknown or mismatched checksum",
  ),
  technical(
    "production.secrets",
    "Authentication",
    "Production secrets are valid and independently separated",
    "Separately authorized non-disclosing production adapter; presence alone is insufficient",
  ),
  technical(
    "security.transport",
    "Authentication",
    "Production TLS, cookies, CSRF, headers and cache behavior qualified",
    "Exact-environment security verification, not inferred from deployment",
  ),
  technical(
    "security.authorization",
    "Access",
    "Exact-release authentication and tenant authorization verified",
    "Independent current release test evidence, least-privilege database review",
  ),
  technical(
    "disclosure.publication",
    "Access",
    "Production disclosure and source invalidation qualified",
    "Safe snapshot review, authorization and cache/invalidation verification",
  ),
  technical("email.infrastructure", "Email", "Transactional infrastructure independently qualified", "Code and fake tests alone cannot qualify production delivery"),
  technical("email.webhook", "Email", "Provider webhook verification and event replay qualified", "Approved signing keys, rotation and exact-production delivery-event rehearsal"),
  technical("email.controls", "Email", "Delivery and recovery operational controls qualified", "Independent rate-limit/load, custody lifecycle and operator alert qualification"),
  technical(
    "email.sender",
    "Email",
    "Authenticated sender and verified sending domain",
    "Approved sender identity, domain ownership and provider qualification",
  ),
  technical(
    "email.dns",
    "Email",
    "SPF, DKIM and DMARC alignment verified",
    "Authorized non-sending DNS verification; separate qualification required",
  ),
  technical(
    "email.provider",
    "Email",
    "Invitation delivery provider and semantics qualified",
    "Delivery, idempotency and secure token handling; CC-012 transport hard-disabled",
  ),
  technical(
    "email.proof",
    "Email",
    "Separate recipient-bound proof delivery qualified",
    "Independent proof channel, expiry/replay/failure checks; no sending",
  ),
  technical(
    "email.failure-handling",
    "Email",
    "Bounces, suppressions, retries and throttling qualified",
    "Provider event handling, abuse response and operational ownership",
  ),
  technical(
    "security.capacity",
    "Operations",
    "Rate limiting and abuse capacity qualified",
    "Distributed limiter limits/load/alerts and failure policy verified",
  ),
  technical(
    "recovery.account",
    "Recovery",
    "Recovery and lost-email identity proof qualified",
    "Reviewed reset, session revocation, lost-access verification; public reset remains disabled",
  ),
  technical(
    "operations.monitoring",
    "Operations",
    "Logs, metrics, alerts and incident response qualified",
    "Redacted telemetry, alert delivery, escalation rehearsal",
  ),
  technical(
    "operations.backup",
    "Operations",
    "Backup and restore rehearsal verified",
    "Fresh recoverable backup and tested tenant-safe restoration",
  ),
  technical(
    "deployment.rollback",
    "Operations",
    "Rollback and stop procedures verified",
    "Deny gates, immutable history and failure recovery rehearsal",
  ),
  manual(
    "security.review",
    "Security",
    "Security reviewer acceptance recorded",
    "Owner and security reviewer",
  ),
  manual(
    "operations.ownership",
    "Operations",
    "Monitoring and incident ownership assigned",
    "Owner and incident commander",
  ),
  manual(
    "recovery.escalation",
    "Recovery",
    "Support and lost-mailbox escalation assigned",
    "Owner and support/recovery lead",
  ),
  manual(
    "rollout.plan",
    "Release",
    "Controlled pilot/rollout and stop plan reviewed",
    "Owner and release operator",
  ),
  technical(
    "customer.access",
    "Access",
    "Individual customer identity, tenant, mapping and grant review",
    "Separate scoped owner review; no customers evaluated by global assessment",
    "customer",
  ),
  technical(
    "customer.publication",
    "Access",
    "Individual customer publication disclosure review",
    "Current approved source snapshots per authorized customer/project",
    "customer",
  ),
  technical(
    "customer.authorization",
    "Access",
    "Explicit individual customer pilot authorization",
    "Separate reviewed owner authorization; never inherited from a global approval",
    "customer",
  ),
  {
    ...technical(
      "documents.excluded",
      "Disclosure",
      "Document sharing and approvals remain excluded",
      "Document capabilities disabled; documented non-goal",
    ),
    severity: "low",
    mandatory: false,
  },
];
export const manualReadinessIds = [
  "security.review",
  "operations.ownership",
  "recovery.escalation",
  "rollout.plan",
] as const;
export type ManualReadinessId = (typeof manualReadinessIds)[number];
export const readinessRunbookSummary = [
  "Validate exact release, schema and configuration; independently qualify production security.",
  "Complete security, email sender/DNS/provider, recovery, monitoring and backup qualification.",
  "Review every customer separately; global approval cannot create eligibility or access.",
  "Request separate reviewed activation authorization, then limited approved pilot and monitored rollout.",
  "Stop on mandatory failure, missing/stale evidence, cross-tenant results, leakage or absent incident ownership.",
  "Rollback through separately authorized deny gates and scoped revocation; preserve all evidence and audit.",
] as const;
