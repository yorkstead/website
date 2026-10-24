import type { Pool } from "pg";

export const customerPortalCapabilities = Object.freeze({
  login: false,
  invitations: false,
  publishedUpdates: false,
  documentSharing: false,
} as const);

export type CustomerCredentialSubject = {
  provider: string;
  subject: string;
};

export type CustomerProjectAccess = {
  identityId: string;
  tenantId: string;
  projectId: string;
  role: "member" | "admin";
  permission: "view";
};

export type CustomerAuthorizationDatabase = Pick<Pool, "query">;

type CustomerProjectAccessRow = {
  identityId: string;
  tenantId: string;
  projectId: string;
  role: "member" | "admin";
  permission: "view";
};

export const customerProjectAuthorizationQuery = `
SELECT
  identity.id AS "identityId",
  membership.tenant_id AS "tenantId",
  project.project_id AS "projectId",
  membership.role,
  grant_record.permission
FROM customer_identities AS identity
INNER JOIN customer_tenant_memberships AS membership
  ON membership.identity_id = identity.id
INNER JOIN customer_tenants AS tenant
  ON tenant.id = membership.tenant_id
INNER JOIN customer_tenant_projects AS project
  ON project.tenant_id = membership.tenant_id
INNER JOIN customer_project_grants AS grant_record
  ON grant_record.tenant_id = membership.tenant_id
  AND grant_record.project_id = project.project_id
  AND grant_record.identity_id = identity.id
WHERE identity.auth_provider = $1
  AND identity.auth_subject = $2
  AND project.project_id = $3
  AND identity.status = 'active'
  AND membership.status = 'active'
  AND tenant.status = 'active'
  AND project.status = 'active'
  AND grant_record.status = 'active'
LIMIT 1
`;

function normalizeAuthorizationRequest(
  credentials: CustomerCredentialSubject,
  projectId: string,
) {
  const provider = credentials.provider.trim().toLowerCase();
  const subject = credentials.subject.trim();
  const normalizedProjectId = projectId.trim();

  if (
    !provider ||
    !subject ||
    !normalizedProjectId ||
    subject !== credentials.subject ||
    normalizedProjectId !== projectId
  ) {
    return null;
  }

  return { provider, subject, projectId: normalizedProjectId };
}

export async function getCustomerProjectAccess(
  database: CustomerAuthorizationDatabase,
  credentials: CustomerCredentialSubject,
  projectId: string,
): Promise<CustomerProjectAccess | null> {
  const request = normalizeAuthorizationRequest(credentials, projectId);
  if (!request) return null;

  const result = await database.query<CustomerProjectAccessRow>(
    customerProjectAuthorizationQuery,
    [request.provider, request.subject, request.projectId],
  );

  return result.rows[0] ?? null;
}

// A dedicated list query: selectors and credentials are always bound parameters.
// Keep every lifecycle and tenant-consistency requirement used by single-project access.
export const customerProjectAuthorizationListQuery = `
SELECT
  identity.id AS "identityId",
  membership.tenant_id AS "tenantId",
  project.project_id AS "projectId",
  membership.role,
  grant_record.permission
FROM customer_identities AS identity
INNER JOIN customer_tenant_memberships AS membership
  ON membership.identity_id = identity.id
INNER JOIN customer_tenants AS tenant
  ON tenant.id = membership.tenant_id
INNER JOIN customer_tenant_projects AS project
  ON project.tenant_id = membership.tenant_id
INNER JOIN customer_project_grants AS grant_record
  ON grant_record.tenant_id = membership.tenant_id
  AND grant_record.project_id = project.project_id
  AND grant_record.identity_id = identity.id
WHERE identity.auth_provider = $1
  AND identity.auth_subject = $2
  AND identity.status = 'active'
  AND membership.status = 'active'
  AND tenant.status = 'active'
  AND project.status = 'active'
  AND grant_record.status = 'active'
ORDER BY membership.tenant_id, project.project_id
LIMIT 100
`;

export async function listCustomerProjectAccess(
  database: CustomerAuthorizationDatabase,
  credentials: CustomerCredentialSubject,
): Promise<CustomerProjectAccess[]> {
  const provider = credentials.provider.trim().toLowerCase();
  const subject = credentials.subject.trim();
  if (!provider || !subject || subject !== credentials.subject) return [];
  const result = await database.query<CustomerProjectAccessRow>(
    customerProjectAuthorizationListQuery,
    [provider, subject],
  );
  return result.rows;
}

export async function getCustomerProjectSelection(
  database: CustomerAuthorizationDatabase,
  credentials: CustomerCredentialSubject,
  requestedProjectId?: string,
) {
  const projects = await listCustomerProjectAccess(database, credentials);
  // A supplied selector must never silently fall back to a different project.
  const selectedId = requestedProjectId ?? projects[0]?.projectId;
  const selected = selectedId
    ? await getCustomerProjectAccess(database, credentials, selectedId)
    : null;
  return { projects, selected };
}
