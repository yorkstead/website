-- Owner-operated revocation only. Review target privately before execution.
-- Requires an authorized role administrator and TLS.
\set ON_ERROR_STOP on

BEGIN;
DO $revoke_scoped_privileges$
DECLARE
  target record;
  relation_oid oid;
  allowed_columns text;
BEGIN
  IF pg_catalog.to_regrole('ys_sys_001_preflight_reader') IS NULL THEN
    RAISE NOTICE 'Preflight role is already absent';
    RETURN;
  END IF;

  -- Disable authentication first. Revoke only privileges this fixed setup
  -- script grants; preserve any unrelated permissions for manual review.
  EXECUTE 'ALTER ROLE ys_sys_001_preflight_reader NOLOGIN';
  EXECUTE 'ALTER ROLE ys_sys_001_preflight_reader PASSWORD NULL';

  FOR target IN SELECT * FROM (VALUES
    ('application_migrations', ARRAY['version','checksum','applied_at']::text[]),
    ('system_directory_entries', ARRAY['id','revision','archived_at','entity_class','legacy_directory_entry']::text[]),
    ('system_directory_audit', ARRAY['id','entry_id','revision']::text[]),
    ('system_directory_relationships', ARRAY['id','source_entry_id','target_entry_id','archived_at']::text[]),
    ('system_directory_relationship_audit', ARRAY['id','relationship_id','revision']::text[]),
    ('system_directory_billing_evidence', ARRAY['id','archived_at']::text[]),
    ('system_directory_billing_allocations', ARRAY['id','evidence_id','subscription_id','archived_at']::text[]),
    ('system_directory_billing_audit', ARRAY['id','evidence_id','allocation_id','revision']::text[])
  ) AS scoped(table_name, column_names)
  LOOP
    relation_oid := pg_catalog.to_regclass(format('public.%I', target.table_name));
    IF relation_oid IS NOT NULL THEN
      SELECT string_agg(format('%I', allowed.column_name), ', ' ORDER BY allowed.column_name)
        INTO allowed_columns
        FROM unnest(target.column_names) AS allowed(column_name)
       WHERE EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
                      WHERE a.attrelid = relation_oid AND a.attname = allowed.column_name
                        AND a.attnum > 0 AND NOT a.attisdropped);
      IF allowed_columns IS NOT NULL THEN
        EXECUTE format('REVOKE SELECT (%s) ON TABLE public.%I FROM ys_sys_001_preflight_reader',
                       allowed_columns, target.table_name);
      END IF;
    END IF;
  END LOOP;

  REVOKE ALL PRIVILEGES ON SCHEMA public FROM ys_sys_001_preflight_reader;
  EXECUTE format('REVOKE CONNECT, TEMPORARY ON DATABASE %I FROM ys_sys_001_preflight_reader', current_database());
END
$revoke_scoped_privileges$;
COMMIT;

\echo 'New logins are disabled and direct grants are revoked. Existing sessions must be checked and terminated by the authorized operator before treating access as fully revoked.'
