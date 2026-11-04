-- Synthetic test assertion only. Confirms revocation removes effective access.
\set ON_ERROR_STOP on
DO $verify_revoked$
DECLARE reader oid := pg_catalog.to_regrole('ys_sys_001_preflight_reader');
BEGIN
  IF reader IS NULL THEN RAISE EXCEPTION 'FAIL: role unexpectedly absent before role-drop assertion'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE oid=reader AND rolcanlogin) THEN
    RAISE EXCEPTION 'FAIL: reader login remains enabled';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_authid WHERE oid=reader AND rolpassword IS NOT NULL) THEN
    RAISE EXCEPTION 'FAIL: reader password remains set';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=reader OR roleid=reader) THEN
    RAISE EXCEPTION 'FAIL: role membership remains';
  END IF;
  IF pg_catalog.has_database_privilege(reader,current_database(),'CONNECT')
     OR pg_catalog.has_database_privilege(reader,current_database(),'CREATE')
     OR pg_catalog.has_database_privilege(reader,current_database(),'TEMP')
     OR pg_catalog.has_schema_privilege(reader,'public','USAGE')
     OR pg_catalog.has_schema_privilege(reader,'public','CREATE') THEN
    RAISE EXCEPTION 'FAIL: database/schema access remains effective';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('application_migrations', ARRAY['version','checksum','applied_at']::text[]),
      ('system_directory_entries', ARRAY['id','revision','archived_at','entity_class','legacy_directory_entry']::text[]),
      ('system_directory_audit', ARRAY['id','entry_id','revision']::text[]),
      ('system_directory_relationships', ARRAY['id','source_entry_id','target_entry_id','archived_at']::text[]),
      ('system_directory_relationship_audit', ARRAY['id','relationship_id','revision']::text[]),
      ('system_directory_billing_evidence', ARRAY['id','archived_at']::text[]),
      ('system_directory_billing_allocations', ARRAY['id','evidence_id','subscription_id','archived_at']::text[]),
      ('system_directory_billing_audit', ARRAY['id','evidence_id','allocation_id','revision']::text[])
    ) AS scoped(table_name, column_names)
    JOIN pg_catalog.pg_class c ON c.oid = pg_catalog.to_regclass(format('public.%I', table_name))
    CROSS JOIN LATERAL unnest(column_names) AS allowed(column_name)
    WHERE EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
                   WHERE a.attrelid = c.oid AND a.attname = allowed.column_name
                     AND a.attnum > 0 AND NOT a.attisdropped)
      AND pg_catalog.has_column_privilege(reader, c.oid, allowed.column_name, 'SELECT')
  ) THEN RAISE EXCEPTION 'FAIL: a scoped preflight column grant remains effective'; END IF;
END
$verify_revoked$;
