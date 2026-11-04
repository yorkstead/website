-- Independent effective-capability check. Run as a role administrator after setup;
-- no Production row data is read. Values are PASS/FAIL only.
\set ON_ERROR_STOP on

SELECT 1 / (current_database() = :'expected_database')::integer AS ys_expected_database_guard \gset
DO $verify_reader$
DECLARE
  reader oid := pg_catalog.to_regrole('ys_sys_001_preflight_reader');
  relation_record record;
  column_name text;
  privilege text;
  allowed_columns text[];
  required_columns text[];
  relation_oid oid;
BEGIN
  IF reader IS NULL THEN RAISE EXCEPTION 'FAIL: preflight role is absent'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid = reader
      AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolcreatedb
      AND NOT r.rolcreaterole AND NOT r.rolreplication
      AND NOT r.rolbypassrls AND NOT r.rolinherit
  ) THEN RAISE EXCEPTION 'FAIL: role attributes do not match'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member = reader OR roleid = reader) THEN
    RAISE EXCEPTION 'FAIL: unexpected role membership exists';
  END IF;
  IF NOT pg_catalog.has_database_privilege(reader, current_database(), 'CONNECT')
     OR pg_catalog.has_database_privilege(reader, current_database(), 'CREATE')
     OR pg_catalog.has_database_privilege(reader, current_database(), 'TEMP')
     OR pg_catalog.has_schema_privilege(reader, 'public', 'CREATE')
     OR NOT pg_catalog.has_schema_privilege(reader, 'public', 'USAGE') THEN
    RAISE EXCEPTION 'FAIL: effective database/schema privileges do not match';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_database d
     WHERE d.datallowconn AND d.datname <> current_database()
       AND (pg_catalog.has_database_privilege(reader, d.oid, 'CONNECT')
            OR pg_catalog.has_database_privilege(reader, d.oid, 'CREATE')
            OR pg_catalog.has_database_privilege(reader, d.oid, 'TEMP'))
  ) THEN RAISE EXCEPTION 'FAIL: role has access to another database'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace n
     WHERE n.nspname NOT IN ('pg_catalog','information_schema','public')
       AND (pg_catalog.has_schema_privilege(reader, n.nspname, 'USAGE')
            OR pg_catalog.has_schema_privilege(reader, n.nspname, 'CREATE'))
  ) THEN RAISE EXCEPTION 'FAIL: unrelated schema access is effective'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_database WHERE datdba = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspowner = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relowner = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proowner = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_type WHERE typowner = reader) THEN
    RAISE EXCEPTION 'FAIL: preflight role owns a database object';
  END IF;

  FOR relation_record IN
    SELECT * FROM (VALUES
      ('application_migrations', ARRAY['version','checksum','applied_at']::text[], ARRAY['version','checksum','applied_at']::text[], true),
      ('system_directory_entries', ARRAY['id','revision','archived_at','entity_class','legacy_directory_entry']::text[], ARRAY['id','revision','archived_at']::text[], true),
      ('system_directory_audit', ARRAY['id','entry_id','revision']::text[], ARRAY['id','entry_id','revision']::text[], true),
      ('system_directory_relationships', ARRAY['id','source_entry_id','target_entry_id','archived_at']::text[], ARRAY['id','source_entry_id','target_entry_id','archived_at']::text[], false),
      ('system_directory_relationship_audit', ARRAY['id','relationship_id','revision']::text[], ARRAY['id','relationship_id','revision']::text[], false),
      ('system_directory_billing_evidence', ARRAY['id','archived_at']::text[], ARRAY['id','archived_at']::text[], false),
      ('system_directory_billing_allocations', ARRAY['id','evidence_id','subscription_id','archived_at']::text[], ARRAY['id','evidence_id','subscription_id','archived_at']::text[], false),
      ('system_directory_billing_audit', ARRAY['id','evidence_id','allocation_id','revision']::text[], ARRAY['id','evidence_id','revision']::text[], false)
    ) AS targets(table_name, allowed, required, required_table)
  LOOP
    relation_oid := pg_catalog.to_regclass(format('public.%I', relation_record.table_name));
    IF relation_oid IS NULL THEN
      IF relation_record.required_table THEN RAISE EXCEPTION 'FAIL: required relation is absent'; END IF;
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
                    WHERE c.oid = relation_oid AND c.relkind IN ('r','p')) THEN
      RAISE EXCEPTION 'FAIL: expected a base table is absent';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = relation_oid AND relrowsecurity) THEN
      RAISE EXCEPTION 'FAIL: row-level security could make aggregates incomplete';
    END IF;
    FOREACH column_name IN ARRAY relation_record.required LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = relation_oid
                      AND a.attname = column_name AND a.attnum > 0 AND NOT a.attisdropped) THEN
        RAISE EXCEPTION 'FAIL: required relation column is absent';
      END IF;
    END LOOP;
    allowed_columns := ARRAY[]::text[];
    FOREACH column_name IN ARRAY relation_record.allowed LOOP
      IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = relation_oid
                  AND a.attname = column_name AND a.attnum > 0 AND NOT a.attisdropped) THEN
        allowed_columns := array_append(allowed_columns, column_name);
      END IF;
    END LOOP;
    IF pg_catalog.has_table_privilege(reader, relation_oid, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL: table-level SELECT is effective';
    END IF;
    FOR column_name IN SELECT a.attname FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = relation_oid AND a.attnum > 0 AND NOT a.attisdropped
    LOOP
      IF pg_catalog.has_column_privilege(reader, relation_oid, column_name, 'SELECT')
         AND NOT column_name = ANY(allowed_columns) THEN
        RAISE EXCEPTION 'FAIL: an unapproved column is readable';
      END IF;
      IF column_name = ANY(allowed_columns)
         AND NOT pg_catalog.has_column_privilege(reader, relation_oid, column_name, 'SELECT') THEN
        RAISE EXCEPTION 'FAIL: a required column is not readable';
      END IF;
    END LOOP;
    FOREACH privilege IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF pg_catalog.has_table_privilege(reader, relation_oid, privilege) THEN
        RAISE EXCEPTION 'FAIL: a prohibited table privilege is effective';
      END IF;
    END LOOP;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      IF pg_catalog.has_table_privilege(reader, relation_oid, 'MAINTAIN') THEN
        RAISE EXCEPTION 'FAIL: MAINTAIN is effective';
      END IF;
    END IF;
    IF pg_catalog.has_any_column_privilege(reader, relation_oid, 'INSERT')
       OR pg_catalog.has_any_column_privilege(reader, relation_oid, 'UPDATE')
       OR pg_catalog.has_any_column_privilege(reader, relation_oid, 'REFERENCES') THEN
      RAISE EXCEPTION 'FAIL: a prohibited column privilege is effective';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
      AND (pg_catalog.has_sequence_privilege(reader, c.oid, 'USAGE')
           OR pg_catalog.has_sequence_privilege(reader, c.oid, 'SELECT')
           OR pg_catalog.has_sequence_privilege(reader, c.oid, 'UPDATE'))
  ) THEN RAISE EXCEPTION 'FAIL: unexpected sequence privileges are effective'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
      AND p.prorettype NOT IN ('pg_catalog.trigger'::regtype, 'pg_catalog.event_trigger'::regtype)
      AND pg_catalog.has_function_privilege(reader, p.oid, 'EXECUTE')
  ) THEN RAISE EXCEPTION 'FAIL: executable public routines are effective'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
    WHERE d.defaclnamespace IN (0, 'public'::regnamespace)
      AND a.grantee IN (0, reader)
      AND ((d.defaclobjtype = 'r' AND a.privilege_type IN
              ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'))
        OR (d.defaclobjtype = 'S' AND a.privilege_type IN ('SELECT','USAGE','UPDATE'))
        OR (d.defaclobjtype IN ('f','p') AND a.privilege_type = 'EXECUTE'))
  ) THEN RAISE EXCEPTION 'FAIL: unsafe PUBLIC/reader default privileges exist'; END IF;
  IF EXISTS (
    WITH current_creators AS (
      SELECT c.relowner AS role_oid FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
      UNION SELECT p.proowner FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
      UNION SELECT d.datdba FROM pg_catalog.pg_database d WHERE d.datname = current_database()
    )
    SELECT 1 FROM current_creators creator
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_default_acl d
        CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
        WHERE d.defaclrole = creator.role_oid AND d.defaclnamespace = 0
          AND d.defaclobjtype = 'f' AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      )
  ) THEN RAISE EXCEPTION 'FAIL: implicit PUBLIC EXECUTE defaults remain'; END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
       AND c.relname NOT IN (
         'application_migrations','system_directory_entries','system_directory_audit',
         'system_directory_relationships','system_directory_relationship_audit',
         'system_directory_billing_evidence','system_directory_billing_allocations',
         'system_directory_billing_audit'
       )
       AND (pg_catalog.has_table_privilege(reader, c.oid, 'SELECT')
            OR pg_catalog.has_any_column_privilege(reader, c.oid, 'SELECT'))
  ) THEN RAISE EXCEPTION 'FAIL: unrelated public relation is readable'; END IF;
  RAISE NOTICE 'PASS: role attributes, ownership, memberships, and effective scoped privileges verified';
END
$verify_reader$;
