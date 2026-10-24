CREATE TABLE IF NOT EXISTS client_project_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('project','milestone','deliverable','date','update')),
  source_id TEXT NOT NULL CHECK (char_length(source_id) BETWEEN 1 AND 200),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source_digest TEXT CHECK (source_digest IS NULL OR source_digest ~ '^[a-f0-9]{32}$'),
  state TEXT NOT NULL DEFAULT 'private' CHECK (state IN ('private','draft','approved','withdrawn')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  CONSTRAINT client_publication_scope FOREIGN KEY (tenant_id,project_id)
    REFERENCES customer_tenant_projects(tenant_id,project_id) ON DELETE RESTRICT,
  UNIQUE (tenant_id,project_id,kind,source_id),
  CHECK (state <> 'approved' OR (source_digest IS NOT NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS client_project_publication_audit (
  id BIGSERIAL PRIMARY KEY,
  publication_id UUID NOT NULL REFERENCES client_project_publications(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('prepared','approved','withdrawn','source_invalidated')),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('owner_internal','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS client_publication_visible ON client_project_publications(tenant_id,project_id,kind) WHERE state='approved';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS client_publication_audit_scope ON client_project_publication_audit(tenant_id,project_id,id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION client_publication_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor TEXT := nullif(current_setting('yorkstead.publication_actor',true),'');
  invalidating BOOLEAN := pg_trigger_depth() > 1 AND TG_OP = 'UPDATE';
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Publication history is retained'; END IF;
  IF invalidating THEN
    IF NEW.state <> 'draft' OR NEW.source_digest IS NOT NULL OR NEW.payload IS DISTINCT FROM OLD.payload
      THEN RAISE EXCEPTION 'Invalid source invalidation'; END IF;
    NEW.decided_by := NULL; NEW.decided_at := NULL;
  ELSE
    IF actor IS NULL OR length(actor)>255 OR actor<>btrim(actor) THEN RAISE EXCEPTION 'Verified publication owner required'; END IF;
    IF TG_OP = 'INSERT' AND NEW.state <> 'draft' THEN RAISE EXCEPTION 'Prepare a draft first'; END IF;
    IF NEW.state NOT IN ('draft','approved','withdrawn') THEN RAISE EXCEPTION 'Invalid publication transition'; END IF;
    IF NEW.state='approved' AND (TG_OP<>'UPDATE' OR OLD.state<>'draft' OR NEW.source_digest IS NULL) THEN
      RAISE EXCEPTION 'Only current drafts may be approved';
    END IF;
    IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.project_id,NEW.kind,NEW.source_id,NEW.id) IS DISTINCT FROM
      (OLD.tenant_id,OLD.project_id,OLD.kind,OLD.source_id,OLD.id) THEN RAISE EXCEPTION 'Publication scope is immutable'; END IF;
    IF TG_OP='UPDATE' AND NEW.state<>'draft' AND (NEW.payload,NEW.source_digest) IS DISTINCT FROM (OLD.payload,OLD.source_digest) THEN
      RAISE EXCEPTION 'Content changes require fresh review';
    END IF;
    IF NEW.state IN ('approved','withdrawn') THEN
      NEW.decided_by := actor; NEW.decided_at := clock_timestamp();
    ELSE NEW.decided_by := NULL; NEW.decided_at := NULL;
    END IF;
  END IF;
  IF TG_OP='INSERT' THEN NEW.revision := 1; ELSE NEW.revision := OLD.revision+1; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION client_publication_audit_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invalidating BOOLEAN := pg_trigger_depth()>1;
BEGIN
  INSERT INTO client_project_publication_audit(publication_id,tenant_id,project_id,revision,from_state,to_state,event,actor_id,actor_role)
  VALUES (NEW.id,NEW.tenant_id,NEW.project_id,NEW.revision,
    CASE WHEN TG_OP='UPDATE' THEN OLD.state ELSE NULL END,NEW.state,
    CASE WHEN invalidating THEN 'source_invalidated' WHEN NEW.state='draft' THEN 'prepared' ELSE NEW.state END,
    CASE WHEN invalidating THEN 'system:workspace-change' ELSE current_setting('yorkstead.publication_actor') END,
    CASE WHEN invalidating THEN 'system' ELSE 'owner_internal' END);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION client_publication_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Publication history is append-only'; END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION client_publication_source_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.id='primary' AND (TG_OP='DELETE' OR NEW.data IS DISTINCT FROM OLD.data) THEN
    UPDATE client_project_publications SET state='draft',source_digest=NULL;
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER client_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON client_project_publications FOR EACH ROW EXECUTE FUNCTION client_publication_guard();
--> statement-breakpoint
CREATE TRIGGER client_publication_audit AFTER INSERT OR UPDATE ON client_project_publications FOR EACH ROW EXECUTE FUNCTION client_publication_audit_write();
--> statement-breakpoint
CREATE TRIGGER client_publication_no_truncate BEFORE TRUNCATE ON client_project_publications EXECUTE FUNCTION client_publication_history_guard();
--> statement-breakpoint
CREATE TRIGGER client_publication_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON client_project_publication_audit EXECUTE FUNCTION client_publication_history_guard();
--> statement-breakpoint
CREATE TRIGGER client_publication_workspace_changed AFTER UPDATE OR DELETE ON workspaces FOR EACH ROW EXECUTE FUNCTION client_publication_source_changed();
--> statement-breakpoint
CREATE TRIGGER client_publication_workspace_no_truncate BEFORE TRUNCATE ON workspaces EXECUTE FUNCTION client_publication_history_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION client_publication_audit_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Audit events are generated by publication transitions'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER client_publication_audit_generated BEFORE INSERT ON client_project_publication_audit FOR EACH ROW EXECUTE FUNCTION client_publication_audit_insert_guard();
