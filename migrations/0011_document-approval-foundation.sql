CREATE TABLE document_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('document','design','contract','invoice','other')),
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 300),
  metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object' AND octet_length(metadata::text) <= 8000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','internal_review','approved','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, project_id, id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES customer_tenant_projects(tenant_id, project_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 300),
  metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object' AND octet_length(metadata::text) <= 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (document_id, version_number),
  UNIQUE (tenant_id, project_id, document_id, id),
  FOREIGN KEY (tenant_id, project_id, document_id) REFERENCES document_registry(tenant_id, project_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE document_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  document_id UUID NOT NULL,
  version_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','changes_requested','cancelled','superseded')),
  decision_actor_id TEXT,
  decision_role TEXT CHECK (decision_role = 'owner_internal'),
  decision_comment TEXT CHECK (char_length(decision_comment) <= 2000),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id, project_id, document_id, version_id) REFERENCES document_versions(tenant_id, project_id, document_id, id) ON DELETE RESTRICT,
  CHECK ((status IN ('approved','changes_requested')) = (decision_actor_id IS NOT NULL AND decision_role IS NOT NULL AND decided_at IS NOT NULL)),
  CHECK (status IN ('approved','changes_requested') OR (decision_actor_id IS NULL AND decision_role IS NULL AND decided_at IS NULL AND decision_comment IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX document_one_open_approval ON document_approval_requests(document_id) WHERE status IN ('draft','pending');
--> statement-breakpoint
CREATE TABLE document_audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  document_id UUID NOT NULL,
  version_id UUID,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('document','version','approval')),
  event_type TEXT NOT NULL CHECK (event_type IN ('document.created','document.updated','version.created','approval.created','approval.transitioned')),
  actor_id TEXT NOT NULL CHECK (char_length(btrim(actor_id)) BETWEEN 1 AND 255),
  actor_role TEXT NOT NULL CHECK (actor_role = 'owner_internal'),
  from_state TEXT,
  to_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id, project_id, document_id) REFERENCES document_registry(tenant_id, project_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, project_id, document_id, version_id) REFERENCES document_versions(tenant_id, project_id, document_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX document_audit_timeline ON document_audit_events(tenant_id, project_id, document_id, id);
--> statement-breakpoint
CREATE FUNCTION document_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Document history cannot be changed or deleted' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE FUNCTION document_require_actor() RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE actor TEXT := current_setting('yorkstead.document_actor', true);
BEGIN
  IF actor IS NULL OR char_length(btrim(actor)) NOT BETWEEN 1 AND 255
     OR current_setting('yorkstead.document_role', true) IS DISTINCT FROM 'owner_internal' THEN
    RAISE EXCEPTION 'Verified internal actor required' USING ERRCODE = '42501';
  END IF;
  RETURN actor;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION document_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM document_require_actor();
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'Document starts in draft' USING ERRCODE = '23514'; END IF;
    NEW.created_at := clock_timestamp();
  ELSE
    IF (NEW.id, NEW.tenant_id, NEW.project_id, NEW.document_type, NEW.created_at) IS DISTINCT FROM
       (OLD.id, OLD.tenant_id, OLD.project_id, OLD.document_type, OLD.created_at) OR OLD.status = 'archived' THEN
      RAISE EXCEPTION 'Immutable document ownership or archived document' USING ERRCODE = '23514';
    END IF;
    IF NEW.status <> OLD.status AND NOT (
      (OLD.status = 'draft' AND NEW.status IN ('internal_review','archived')) OR
      (OLD.status = 'internal_review' AND NEW.status IN ('draft','approved','archived')) OR
      (OLD.status = 'approved' AND NEW.status IN ('draft','archived'))
    ) THEN RAISE EXCEPTION 'Invalid document transition' USING ERRCODE = '23514'; END IF;
    IF NEW.status = 'approved' AND OLD.status <> 'approved' AND NOT EXISTS (
      SELECT 1 FROM document_approval_requests a JOIN document_versions v ON v.id = a.version_id
      WHERE a.document_id = NEW.id AND a.status = 'approved' AND v.version_number =
        (SELECT max(version_number) FROM document_versions WHERE document_id = NEW.id)
    ) THEN RAISE EXCEPTION 'Latest-version internal approval required' USING ERRCODE = '23514'; END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION document_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE doc document_registry; expected INTEGER;
BEGIN
  PERFORM document_require_actor();
  SELECT * INTO doc FROM document_registry WHERE id = NEW.document_id FOR UPDATE;
  IF doc.status = 'archived' THEN RAISE EXCEPTION 'Archived document' USING ERRCODE = '23514'; END IF;
  SELECT coalesce(max(version_number), 0) + 1 INTO expected FROM document_versions WHERE document_id = NEW.document_id;
  IF NEW.version_number <> expected THEN RAISE EXCEPTION 'Version must be sequential' USING ERRCODE = '23514'; END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION document_approval_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor TEXT; doc document_registry; latest UUID;
BEGIN
  actor := document_require_actor();
  SELECT * INTO doc FROM document_registry WHERE id = NEW.document_id FOR UPDATE;
  SELECT id INTO latest FROM document_versions WHERE document_id = NEW.document_id ORDER BY version_number DESC LIMIT 1;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.version_id IS DISTINCT FROM latest OR doc.status = 'archived' THEN
      RAISE EXCEPTION 'Request must start as latest-version draft' USING ERRCODE = '23514';
    END IF;
    NEW.created_at := clock_timestamp();
  ELSE
    IF (NEW.id, NEW.tenant_id, NEW.project_id, NEW.document_id, NEW.version_id, NEW.created_at) IS DISTINCT FROM
       (OLD.id, OLD.tenant_id, OLD.project_id, OLD.document_id, OLD.version_id, OLD.created_at) THEN
      RAISE EXCEPTION 'Immutable approval identity' USING ERRCODE = '23514';
    END IF;
    IF NOT ((OLD.status = 'draft' AND NEW.status IN ('pending','cancelled','superseded')) OR
            (OLD.status = 'pending' AND NEW.status IN ('approved','changes_requested','cancelled','superseded'))) THEN
      RAISE EXCEPTION 'Invalid approval transition' USING ERRCODE = '23514';
    END IF;
    IF NEW.status IN ('pending','approved','changes_requested') AND
       (NEW.version_id IS DISTINCT FROM latest OR doc.status <> 'internal_review') THEN
      RAISE EXCEPTION 'Latest version under internal review required' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.status IN ('approved','changes_requested') THEN
    NEW.decision_actor_id := actor;
    NEW.decision_role := 'owner_internal';
    NEW.decided_at := clock_timestamp();
  ELSE
    NEW.decision_actor_id := NULL; NEW.decision_role := NULL;
    NEW.decision_comment := NULL; NEW.decided_at := NULL;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION document_record_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE doc_id UUID; ver_id UUID; kind TEXT; event TEXT; previous TEXT; next_state TEXT;
BEGIN
  IF TG_TABLE_NAME = 'document_registry' THEN
    doc_id := NEW.id; kind := 'document';
    event := CASE WHEN TG_OP = 'INSERT' THEN 'document.created' ELSE 'document.updated' END;
    next_state := NEW.status;
    IF TG_OP = 'UPDATE' THEN previous := OLD.status; END IF;
    SELECT id INTO ver_id FROM document_versions WHERE document_id = NEW.id ORDER BY version_number DESC LIMIT 1;
  ELSIF TG_TABLE_NAME = 'document_versions' THEN
    doc_id := NEW.document_id; ver_id := NEW.id; kind := 'version'; event := 'version.created';
  ELSE
    doc_id := NEW.document_id; ver_id := NEW.version_id; kind := 'approval';
    event := CASE WHEN TG_OP = 'INSERT' THEN 'approval.created' ELSE 'approval.transitioned' END;
    next_state := NEW.status;
    IF TG_OP = 'UPDATE' THEN previous := OLD.status; END IF;
  END IF;
  INSERT INTO document_audit_events(tenant_id, project_id, document_id, version_id, entity_id, entity_type, event_type, actor_id, actor_role, from_state, to_state)
  VALUES (NEW.tenant_id, NEW.project_id, doc_id, ver_id, NEW.id, kind, event, document_require_actor(), 'owner_internal', previous, next_state);
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER document_guard BEFORE INSERT OR UPDATE ON document_registry FOR EACH ROW EXECUTE FUNCTION document_guard();
CREATE TRIGGER document_no_delete BEFORE DELETE ON document_registry FOR EACH ROW EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER document_no_truncate BEFORE TRUNCATE ON document_registry EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER version_guard BEFORE INSERT ON document_versions FOR EACH ROW EXECUTE FUNCTION document_version_guard();
CREATE TRIGGER version_immutable BEFORE UPDATE OR DELETE ON document_versions FOR EACH ROW EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER version_no_truncate BEFORE TRUNCATE ON document_versions EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER approval_guard BEFORE INSERT OR UPDATE ON document_approval_requests FOR EACH ROW EXECUTE FUNCTION document_approval_guard();
CREATE TRIGGER approval_no_delete BEFORE DELETE ON document_approval_requests FOR EACH ROW EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER approval_no_truncate BEFORE TRUNCATE ON document_approval_requests EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON document_audit_events FOR EACH ROW EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON document_audit_events EXECUTE FUNCTION document_history_immutable();
CREATE TRIGGER document_audit AFTER INSERT OR UPDATE ON document_registry FOR EACH ROW EXECUTE FUNCTION document_record_audit();
CREATE TRIGGER version_audit AFTER INSERT ON document_versions FOR EACH ROW EXECUTE FUNCTION document_record_audit();
CREATE TRIGGER approval_audit AFTER INSERT OR UPDATE ON document_approval_requests FOR EACH ROW EXECUTE FUNCTION document_record_audit();
--> statement-breakpoint
CREATE FUNCTION document_audit_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Audit events are generated by domain changes only' USING ERRCODE = '42501';
  END IF;
  NEW.created_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_insert_guard BEFORE INSERT ON document_audit_events FOR EACH ROW EXECUTE FUNCTION document_audit_insert_guard();
--> statement-breakpoint
CREATE FUNCTION document_version_effects() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE document_approval_requests SET status = 'superseded'
    WHERE document_id = NEW.document_id AND status IN ('draft','pending');
  UPDATE document_registry SET display_name = NEW.display_name, metadata = NEW.metadata, status = 'draft' WHERE id = NEW.document_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER version_effects AFTER INSERT ON document_versions FOR EACH ROW EXECUTE FUNCTION document_version_effects();
--> statement-breakpoint
CREATE FUNCTION document_approval_effects() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('approved','changes_requested') THEN
    UPDATE document_registry SET status = CASE WHEN NEW.status = 'approved' THEN 'approved' ELSE 'draft' END WHERE id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER approval_effects AFTER UPDATE ON document_approval_requests FOR EACH ROW EXECUTE FUNCTION document_approval_effects();
