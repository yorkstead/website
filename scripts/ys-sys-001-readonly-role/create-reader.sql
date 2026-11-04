-- Owner-operated setup only. Never use against Production before separate approval.
-- Run with psql -X -v ON_ERROR_STOP=1 over TLS as an authorized role administrator.
\set ON_ERROR_STOP on

BEGIN;

DO $create_role$
DECLARE
  role_record pg_catalog.pg_roles%ROWTYPE;
  role_oid oid;
BEGIN
  SELECT * INTO role_record FROM pg_catalog.pg_roles
   WHERE rolname = 'ys_sys_001_preflight_reader';

  IF NOT FOUND THEN
    EXECUTE 'CREATE ROLE ys_sys_001_preflight_reader LOGIN PASSWORD NULL '
         || 'NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT';
    role_oid := pg_catalog.to_regrole('ys_sys_001_preflight_reader');
    EXECUTE format('COMMENT ON ROLE %I IS %L', 'ys_sys_001_preflight_reader',
                   'Managed by YS-SYS-001 fixed preflight role script v1');
  ELSE
    IF role_record.rolsuper OR role_record.rolcreatedb OR role_record.rolcreaterole
       OR role_record.rolreplication OR role_record.rolbypassrls
       OR NOT role_record.rolcanlogin OR role_record.rolinherit THEN
      RAISE EXCEPTION 'Existing preflight role has unexpected attributes; no changes made';
    END IF;
    role_oid := pg_catalog.to_regrole('ys_sys_001_preflight_reader');
    IF pg_catalog.shobj_description(role_oid, 'pg_authid') IS DISTINCT FROM
       'Managed by YS-SYS-001 fixed preflight role script v1' THEN
      RAISE EXCEPTION 'Existing role is not marked as managed by this plan; no changes made';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member = role_oid OR roleid = role_oid) THEN
      RAISE EXCEPTION 'Existing preflight role has memberships; no changes made';
    END IF;
  END IF;
END
$create_role$;

DO $grant_connect$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO ys_sys_001_preflight_reader', current_database());
END
$grant_connect$;
GRANT USAGE ON SCHEMA public TO ys_sys_001_preflight_reader;

-- Restrict SELECT to non-content identifiers used for aggregates and joins.
-- Missing 0023/0024 tables are skipped. The 0020 ledger and Directory tables
-- are required. No sensitive labels, notes, evidence, account, or audit JSON
-- columns are granted.
DO $grant_columns$
DECLARE
  item record;
  relation_oid oid;
  missing_columns text[];
  granted_columns text[];
  column_name text;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('application_migrations', ARRAY['version','checksum','applied_at']::text[], ARRAY[]::text[], true),
      ('system_directory_entries', ARRAY['id','revision','archived_at']::text[], ARRAY['entity_class','legacy_directory_entry']::text[], true),
      ('system_directory_audit', ARRAY['id','entry_id','revision']::text[], ARRAY[]::text[], true),
      ('system_directory_relationships', ARRAY['id','source_entry_id','target_entry_id','archived_at']::text[], ARRAY[]::text[], false),
      ('system_directory_relationship_audit', ARRAY['id','relationship_id','revision']::text[], ARRAY[]::text[], false),
      ('system_directory_billing_evidence', ARRAY['id','archived_at']::text[], ARRAY[]::text[], false),
      ('system_directory_billing_allocations', ARRAY['id','evidence_id','subscription_id','archived_at']::text[], ARRAY[]::text[], false),
      ('system_directory_billing_audit', ARRAY['id','evidence_id','allocation_id','revision']::text[], ARRAY[]::text[], false)
    ) AS definitions(table_name, required_columns, optional_columns, required_table)
  LOOP
    relation_oid := pg_catalog.to_regclass(format('public.%I', item.table_name));
    IF relation_oid IS NULL THEN
      IF item.required_table THEN
        RAISE EXCEPTION 'Required preflight relation is absent: public.%', item.table_name;
      END IF;
      CONTINUE;
    END IF;

    SELECT array_agg(column_name ORDER BY column_name)
      INTO missing_columns
      FROM unnest(item.required_columns) AS required(column_name)
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = relation_oid AND a.attname = required.column_name
          AND a.attnum > 0 AND NOT a.attisdropped
     );
    IF missing_columns IS NOT NULL THEN
      RAISE EXCEPTION 'Required preflight columns are absent from public.%', item.table_name;
    END IF;

    SELECT array_agg(available.column_name ORDER BY available.column_name)
      INTO granted_columns
      FROM (
        SELECT required.column_name
          FROM unnest(item.required_columns) AS required(column_name)
        UNION
        SELECT optional.column_name
          FROM unnest(item.optional_columns) AS optional(column_name)
         WHERE EXISTS (
           SELECT 1 FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = relation_oid AND a.attname = optional.column_name
              AND a.attnum > 0 AND NOT a.attisdropped
         )
      ) AS available;

    EXECUTE format('GRANT SELECT (%s) ON TABLE public.%I TO ys_sys_001_preflight_reader',
                   (SELECT string_agg(format('%I', columns.column_name), ', ' ORDER BY columns.column_name)
                      FROM unnest(granted_columns) AS columns(column_name)),
                   item.table_name);

    -- Fail closed if table-level/PUBLIC SELECT exposes any unapproved column.
    IF pg_catalog.has_table_privilege('ys_sys_001_preflight_reader', relation_oid, 'SELECT') THEN
      RAISE EXCEPTION 'Table-level SELECT is effective on public.%', item.table_name;
    END IF;
    FOR column_name IN
      SELECT a.attname FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = relation_oid AND a.attnum > 0 AND NOT a.attisdropped
    LOOP
      IF pg_catalog.has_column_privilege('ys_sys_001_preflight_reader', relation_oid, column_name, 'SELECT')
         AND NOT column_name = ANY(granted_columns) THEN
        RAISE EXCEPTION 'An unapproved column is readable on public.%', item.table_name;
      END IF;
      IF column_name = ANY(granted_columns)
         AND NOT pg_catalog.has_column_privilege('ys_sys_001_preflight_reader', relation_oid, column_name, 'SELECT') THEN
        RAISE EXCEPTION 'A required aggregate column is not effectively readable on public.%', item.table_name;
      END IF;
    END LOOP;
  END LOOP;
END
$grant_columns$;

ALTER ROLE ys_sys_001_preflight_reader SET default_transaction_read_only = on;
ALTER ROLE ys_sys_001_preflight_reader SET statement_timeout = '15s';
ALTER ROLE ys_sys_001_preflight_reader SET idle_in_transaction_session_timeout = '30s';

-- Effective-permission assertions include privileges inherited from PUBLIC.
-- This script refuses to proceed if database ACLs make the requested boundary
-- impossible without a broader, separately reviewed ACL change.
DO $verify_effective_rights$
DECLARE
  target record;
  rel regclass;
  privilege text;
  reader oid := 'ys_sys_001_preflight_reader'::regrole;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid = reader
      AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication
           OR r.rolbypassrls OR r.rolinherit OR NOT r.rolcanlogin)
  ) THEN RAISE EXCEPTION 'Preflight role attributes are not least-privileged'; END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member = reader OR roleid = reader) THEN
    RAISE EXCEPTION 'Preflight role has a role membership';
  END IF;
  IF pg_catalog.has_database_privilege(reader, current_database(), 'CREATE')
     OR pg_catalog.has_database_privilege(reader, current_database(), 'TEMP') THEN
    RAISE EXCEPTION 'Database CREATE/TEMP is effectively granted, commonly through PUBLIC';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_database d
     WHERE d.datallowconn AND d.datname <> current_database()
       AND (pg_catalog.has_database_privilege(reader, d.oid, 'CONNECT')
            OR pg_catalog.has_database_privilege(reader, d.oid, 'CREATE')
            OR pg_catalog.has_database_privilege(reader, d.oid, 'TEMP'))
  ) THEN RAISE EXCEPTION 'Preflight role has access to another database'; END IF;
  IF pg_catalog.has_schema_privilege(reader, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Schema CREATE is effectively granted, commonly through PUBLIC';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace n
     WHERE n.nspname NOT IN ('pg_catalog','information_schema','public')
       AND (pg_catalog.has_schema_privilege(reader, n.nspname, 'USAGE')
            OR pg_catalog.has_schema_privilege(reader, n.nspname, 'CREATE'))
  ) THEN RAISE EXCEPTION 'Access to an unrelated schema is effective'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_database WHERE datdba = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspowner = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relowner = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc WHERE proowner = reader)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_type WHERE typowner = reader) THEN
    RAISE EXCEPTION 'Preflight role owns a database object';
  END IF;

  FOR target IN SELECT unnest(ARRAY[
    'application_migrations', 'system_directory_entries', 'system_directory_audit',
    'system_directory_relationships', 'system_directory_relationship_audit',
    'system_directory_billing_evidence', 'system_directory_billing_allocations',
    'system_directory_billing_audit'
  ]) AS table_name
  LOOP
    rel := pg_catalog.to_regclass(format('public.%I', target.table_name));
    IF rel IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = rel AND relrowsecurity) THEN
      RAISE EXCEPTION 'Row-level security could make aggregate counts incomplete';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = rel AND relowner = reader) THEN
      RAISE EXCEPTION 'Preflight role owns a scoped relation';
    END IF;
    FOREACH privilege IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF pg_catalog.has_table_privilege(reader, rel, privilege) THEN
        RAISE EXCEPTION 'Preflight role has an effective prohibited table privilege';
      END IF;
    END LOOP;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      IF pg_catalog.has_table_privilege(reader, rel, 'MAINTAIN') THEN
        RAISE EXCEPTION 'Preflight role has an effective prohibited table privilege';
      END IF;
    END IF;
    IF pg_catalog.has_any_column_privilege(reader, rel, 'INSERT')
       OR pg_catalog.has_any_column_privilege(reader, rel, 'UPDATE')
       OR pg_catalog.has_any_column_privilege(reader, rel, 'REFERENCES') THEN
      RAISE EXCEPTION 'Preflight role has an effective prohibited column privilege';
    END IF;
  END LOOP;
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
  ) THEN RAISE EXCEPTION 'Read access to an unrelated public relation is effective'; END IF;
END
$verify_effective_rights$;

COMMIT;

\echo 'Role and scoped grants configured. Set its password using the interactive psql \password command; do not put a password in SQL, shell arguments, history, or logs.'
