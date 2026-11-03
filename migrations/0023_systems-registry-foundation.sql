ALTER TABLE system_directory_entries
  ADD COLUMN entity_class TEXT NOT NULL DEFAULT 'provider_service'
    CHECK (entity_class IN ('provider_service','provider_account','subscription','application_workload','infrastructure_asset','stack_component')),
  ADD COLUMN verification_state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (verification_state IN ('unknown','candidate','owner_reviewed')),
  ADD COLUMN provenance_kind TEXT NOT NULL DEFAULT 'legacy'
    CHECK (provenance_kind IN ('legacy','owner_observation','provider_export','invoice','contract','vendor_document','manual_entry','unknown')),
  ADD COLUMN provenance_reference TEXT
    CHECK (provenance_reference IS NULL OR (length(provenance_reference) BETWEEN 1 AND 512 AND provenance_reference = btrim(provenance_reference))),
  ADD COLUMN observed_at TIMESTAMPTZ,
  ADD COLUMN confirmed_at TIMESTAMPTZ,
  ADD COLUMN responsible_role TEXT
    CHECK (responsible_role IS NULL OR (length(responsible_role) BETWEEN 1 AND 120 AND responsible_role = btrim(responsible_role))),
  ADD COLUMN recovery_role TEXT
    CHECK (recovery_role IS NULL OR (length(recovery_role) BETWEEN 1 AND 120 AND recovery_role = btrim(recovery_role))),
  ADD CONSTRAINT system_directory_entries_verification_provenance_check
    CHECK (
      (verification_state = 'unknown' AND confirmed_at IS NULL)
      OR (verification_state = 'candidate' AND provenance_kind NOT IN ('legacy','unknown') AND provenance_reference IS NOT NULL AND confirmed_at IS NULL)
      OR (verification_state = 'owner_reviewed' AND provenance_kind NOT IN ('legacy','unknown') AND provenance_reference IS NOT NULL AND confirmed_at IS NOT NULL)
    );
--> statement-breakpoint
CREATE INDEX system_directory_entries_class_scope_idx
  ON system_directory_entries(tenant_id, entity_class, archived_at, lower(name));
--> statement-breakpoint
CREATE TABLE system_directory_relationships (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'yorkstead-owner' CHECK (tenant_id = 'yorkstead-owner'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  source_entry_id UUID NOT NULL REFERENCES system_directory_entries(id) ON DELETE RESTRICT,
  target_entry_id UUID NOT NULL REFERENCES system_directory_entries(id) ON DELETE RESTRICT,
  relationship_kind TEXT NOT NULL CHECK (relationship_kind IN ('owns','billed_through','runs_on','depends_on','uses','integrates_with')),
  verification_state TEXT NOT NULL DEFAULT 'unknown' CHECK (verification_state IN ('unknown','candidate','owner_reviewed')),
  provenance_kind TEXT NOT NULL DEFAULT 'unknown'
    CHECK (provenance_kind IN ('owner_observation','provider_export','invoice','contract','vendor_document','manual_entry','unknown')),
  provenance_reference TEXT
    CHECK (provenance_reference IS NULL OR (length(provenance_reference) BETWEEN 1 AND 512 AND provenance_reference = btrim(provenance_reference))),
  observed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  responsible_role TEXT
    CHECK (responsible_role IS NULL OR (length(responsible_role) BETWEEN 1 AND 120 AND responsible_role = btrim(responsible_role))),
  recovery_role TEXT
    CHECK (recovery_role IS NULL OR (length(recovery_role) BETWEEN 1 AND 120 AND recovery_role = btrim(recovery_role))),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (source_entry_id <> target_entry_id),
  CHECK (
    (verification_state = 'unknown' AND confirmed_at IS NULL)
    OR (verification_state = 'candidate' AND provenance_kind <> 'unknown' AND provenance_reference IS NOT NULL AND confirmed_at IS NULL)
    OR (verification_state = 'owner_reviewed' AND provenance_kind <> 'unknown' AND provenance_reference IS NOT NULL AND confirmed_at IS NOT NULL)
  ),
  UNIQUE (tenant_id, source_entry_id, target_entry_id, relationship_kind)
);
--> statement-breakpoint
CREATE INDEX system_directory_relationships_source_idx
  ON system_directory_relationships(tenant_id, source_entry_id, archived_at, relationship_kind);
--> statement-breakpoint
CREATE INDEX system_directory_relationships_target_idx
  ON system_directory_relationships(tenant_id, target_entry_id, archived_at, relationship_kind);
--> statement-breakpoint
CREATE TABLE system_directory_relationship_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id = 'yorkstead-owner'),
  relationship_id UUID NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  action TEXT NOT NULL CHECK (action IN ('created','updated','archived','restored')),
  actor_id TEXT NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 255),
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE INDEX system_directory_relationship_audit_scope_idx
  ON system_directory_relationship_audit(tenant_id, relationship_id, id DESC);
--> statement-breakpoint
CREATE FUNCTION system_directory_relationship_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.revision := 1;
  ELSE NEW.revision := OLD.revision + 1; END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_relationship_revision
  BEFORE INSERT OR UPDATE ON system_directory_relationships
  FOR EACH ROW EXECUTE FUNCTION system_directory_relationship_revision();
--> statement-breakpoint
CREATE FUNCTION system_directory_relationship_write_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor TEXT := nullif(current_setting('yorkstead.system_directory_actor', true), '');
  before_value JSONB;
  after_value JSONB;
  action_name TEXT;
BEGIN
  IF actor IS NULL OR length(actor) > 255 THEN RAISE EXCEPTION 'Owner audit context required' USING ERRCODE='42501'; END IF;
  IF TG_OP = 'UPDATE' THEN
    before_value := to_jsonb(OLD) - 'tenant_id';
    after_value := to_jsonb(NEW) - 'tenant_id';
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN action_name := 'archived';
    ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN action_name := 'restored';
    ELSE action_name := 'updated'; END IF;
  ELSE
    after_value := to_jsonb(NEW) - 'tenant_id';
    action_name := 'created';
  END IF;
  INSERT INTO system_directory_relationship_audit(tenant_id,relationship_id,revision,action,actor_id,before_state,after_state)
    VALUES(NEW.tenant_id,NEW.id,NEW.revision,action_name,actor,before_value,after_value);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_relationship_write_audit
  AFTER INSERT OR UPDATE ON system_directory_relationships
  FOR EACH ROW EXECUTE FUNCTION system_directory_relationship_write_audit();
--> statement-breakpoint
CREATE FUNCTION system_directory_relationship_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'System directory relationships are archived, not deleted' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_relationship_no_delete
  BEFORE DELETE ON system_directory_relationships
  FOR EACH ROW EXECUTE FUNCTION system_directory_relationship_no_delete();
--> statement-breakpoint
CREATE FUNCTION system_directory_relationship_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'System directory relationship audit history is immutable' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_relationship_audit_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON system_directory_relationship_audit
  FOR EACH STATEMENT EXECUTE FUNCTION system_directory_relationship_audit_immutable();
--> statement-breakpoint
REVOKE ALL ON system_directory_relationships, system_directory_relationship_audit FROM PUBLIC;
