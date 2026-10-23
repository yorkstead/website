CREATE TABLE IF NOT EXISTS customer_identities (
  id TEXT PRIMARY KEY,
  auth_provider TEXT NOT NULL,
  auth_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_identities_id_check CHECK (char_length(id) BETWEEN 1 AND 128 AND id = btrim(id)),
  CONSTRAINT customer_identities_provider_check CHECK (char_length(auth_provider) BETWEEN 1 AND 80 AND auth_provider = lower(btrim(auth_provider))),
  CONSTRAINT customer_identities_subject_check CHECK (char_length(auth_subject) BETWEEN 1 AND 255 AND auth_subject = btrim(auth_subject)),
  CONSTRAINT customer_identities_email_check CHECK (char_length(email) BETWEEN 3 AND 320 AND email = lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  CONSTRAINT customer_identities_status_check CHECK (status IN ('active', 'disabled')),
  CONSTRAINT customer_identities_provider_subject_key UNIQUE (auth_provider, auth_subject)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_tenants_id_check CHECK (char_length(id) BETWEEN 1 AND 128 AND id = btrim(id)),
  CONSTRAINT customer_tenants_name_check CHECK (char_length(name) BETWEEN 1 AND 200 AND name = btrim(name)),
  CONSTRAINT customer_tenants_status_check CHECK (status IN ('active', 'suspended', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_tenant_memberships (
  tenant_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, identity_id),
  CONSTRAINT customer_tenant_memberships_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES customer_tenants(id) ON DELETE CASCADE,
  CONSTRAINT customer_tenant_memberships_identity_fkey FOREIGN KEY (identity_id) REFERENCES customer_identities(id) ON DELETE CASCADE,
  CONSTRAINT customer_tenant_memberships_role_check CHECK (role IN ('member', 'admin')),
  CONSTRAINT customer_tenant_memberships_status_check CHECK (status IN ('active', 'suspended', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_tenant_projects (
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, project_id),
  CONSTRAINT customer_tenant_projects_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES customer_tenants(id) ON DELETE CASCADE,
  CONSTRAINT customer_tenant_projects_project_id_check CHECK (char_length(project_id) BETWEEN 1 AND 200 AND project_id = btrim(project_id)),
  CONSTRAINT customer_tenant_projects_status_check CHECK (status IN ('active', 'archived', 'disabled')),
  CONSTRAINT customer_tenant_projects_project_key UNIQUE (project_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_project_grants (
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  status TEXT NOT NULL DEFAULT 'disabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, project_id, identity_id),
  CONSTRAINT customer_project_grants_membership_fkey FOREIGN KEY (tenant_id, identity_id) REFERENCES customer_tenant_memberships(tenant_id, identity_id) ON DELETE CASCADE,
  CONSTRAINT customer_project_grants_project_fkey FOREIGN KEY (tenant_id, project_id) REFERENCES customer_tenant_projects(tenant_id, project_id) ON DELETE CASCADE,
  CONSTRAINT customer_project_grants_permission_check CHECK (permission = 'view'),
  CONSTRAINT customer_project_grants_status_check CHECK (status IN ('active', 'revoked', 'disabled'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_identities_email_idx ON customer_identities (email);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_tenant_memberships_identity_idx ON customer_tenant_memberships (identity_id, tenant_id) WHERE status = 'active';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_project_grants_identity_idx ON customer_project_grants (identity_id, project_id) WHERE status = 'active';
