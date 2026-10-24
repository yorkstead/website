ALTER TABLE customer_tenants ADD COLUMN admin_revision INTEGER NOT NULL DEFAULT 1 CHECK (admin_revision > 0);
--> statement-breakpoint
ALTER TABLE customer_tenant_projects ADD COLUMN admin_revision INTEGER NOT NULL DEFAULT 1 CHECK (admin_revision > 0);
--> statement-breakpoint
ALTER TABLE customer_tenant_memberships ADD COLUMN admin_revision INTEGER NOT NULL DEFAULT 1 CHECK (admin_revision > 0);
--> statement-breakpoint
ALTER TABLE customer_project_grants ADD COLUMN admin_revision INTEGER NOT NULL DEFAULT 1 CHECK (admin_revision > 0);
--> statement-breakpoint
ALTER TABLE customer_invitations ADD COLUMN admin_revision INTEGER NOT NULL DEFAULT 1 CHECK (admin_revision > 0);
--> statement-breakpoint
CREATE TABLE client_invitation_preparations (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES customer_tenants(id),
  recipient_email TEXT NOT NULL CHECK (length(recipient_email) BETWEEN 3 AND 320 AND recipient_email=lower(btrim(recipient_email))),
  project_ids TEXT[] NOT NULL CHECK (cardinality(project_ids) BETWEEN 1 AND 100),
  expires_in_seconds INTEGER NOT NULL CHECK (expires_in_seconds BETWEEN 60 AND 604800),
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status='prepared'),
  admin_revision INTEGER NOT NULL DEFAULT 1 CHECK (admin_revision>0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE TABLE client_access_admin_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES customer_tenants(id),
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  project_id TEXT,
  identity_id TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  revision INTEGER NOT NULL,
  actor_id TEXT NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 255),
  actor_role TEXT NOT NULL DEFAULT 'owner_internal' CHECK (actor_role='owner_internal'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE INDEX client_access_admin_audit_scope ON client_access_admin_audit(tenant_id,id);
--> statement-breakpoint
CREATE FUNCTION client_access_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.admin_revision:=1;
  ELSE NEW.admin_revision:=OLD.admin_revision+1;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER client_access_revision BEFORE INSERT OR UPDATE ON customer_tenants FOR EACH ROW EXECUTE FUNCTION client_access_revision();
--> statement-breakpoint
CREATE TRIGGER client_access_revision BEFORE INSERT OR UPDATE ON customer_tenant_projects FOR EACH ROW EXECUTE FUNCTION client_access_revision();
--> statement-breakpoint
CREATE TRIGGER client_access_revision BEFORE INSERT OR UPDATE ON customer_tenant_memberships FOR EACH ROW EXECUTE FUNCTION client_access_revision();
--> statement-breakpoint
CREATE TRIGGER client_access_revision BEFORE INSERT OR UPDATE ON customer_project_grants FOR EACH ROW EXECUTE FUNCTION client_access_revision();
--> statement-breakpoint
CREATE TRIGGER client_access_revision BEFORE INSERT OR UPDATE ON customer_invitations FOR EACH ROW EXECUTE FUNCTION client_access_revision();
--> statement-breakpoint
CREATE FUNCTION client_access_admin_audit_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor TEXT := nullif(current_setting('yorkstead.access_admin_actor',true),'');
DECLARE value JSONB := to_jsonb(NEW);
DECLARE previous TEXT;
BEGIN
  IF actor IS NOT NULL THEN
    IF TG_OP='UPDATE' THEN previous:=to_jsonb(OLD)->>'status'; END IF;
    INSERT INTO client_access_admin_audit(tenant_id,record_type,record_id,project_id,identity_id,from_status,to_status,revision,actor_id)
      VALUES(COALESCE(value->>'tenant_id',value->>'id'),TG_TABLE_NAME,
        COALESCE(value->>'id',value->>'project_id',value->>'identity_id'),value->>'project_id',value->>'identity_id',
        previous,value->>'status',(value->>'admin_revision')::integer,actor);
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER client_access_audit AFTER INSERT OR UPDATE ON customer_tenants FOR EACH ROW EXECUTE FUNCTION client_access_admin_audit_write();
--> statement-breakpoint
CREATE TRIGGER client_access_audit AFTER INSERT OR UPDATE ON customer_tenant_projects FOR EACH ROW EXECUTE FUNCTION client_access_admin_audit_write();
--> statement-breakpoint
CREATE TRIGGER client_access_audit AFTER INSERT OR UPDATE ON customer_tenant_memberships FOR EACH ROW EXECUTE FUNCTION client_access_admin_audit_write();
--> statement-breakpoint
CREATE TRIGGER client_access_audit AFTER INSERT OR UPDATE ON customer_project_grants FOR EACH ROW EXECUTE FUNCTION client_access_admin_audit_write();
--> statement-breakpoint
CREATE TRIGGER client_access_audit AFTER INSERT OR UPDATE ON customer_invitations FOR EACH ROW EXECUTE FUNCTION client_access_admin_audit_write();
--> statement-breakpoint
CREATE TRIGGER client_access_audit AFTER INSERT ON client_invitation_preparations FOR EACH ROW EXECUTE FUNCTION client_access_admin_audit_write();
--> statement-breakpoint
CREATE FUNCTION client_access_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' AND TG_TABLE_NAME='client_access_admin_audit' AND pg_trigger_depth()>1 THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND TG_TABLE_NAME='client_invitation_preparations'
    AND nullif(current_setting('yorkstead.access_admin_actor',true),'') IS NOT NULL THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Administrative history is immutable' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER client_access_history BEFORE INSERT OR UPDATE OR DELETE ON client_access_admin_audit FOR EACH ROW EXECUTE FUNCTION client_access_history_guard();
--> statement-breakpoint
CREATE TRIGGER client_access_history_truncate BEFORE TRUNCATE ON client_access_admin_audit FOR EACH STATEMENT EXECUTE FUNCTION client_access_history_guard();
--> statement-breakpoint
CREATE TRIGGER client_access_history BEFORE INSERT OR UPDATE OR DELETE ON client_invitation_preparations FOR EACH ROW EXECUTE FUNCTION client_access_history_guard();
--> statement-breakpoint
CREATE TRIGGER client_access_history_truncate BEFORE TRUNCATE ON client_invitation_preparations FOR EACH STATEMENT EXECUTE FUNCTION client_access_history_guard();
