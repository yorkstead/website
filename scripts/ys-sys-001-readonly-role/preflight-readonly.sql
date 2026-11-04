-- Fixed, aggregate-only Production preflight. Run only after a separate approval.
-- No row-level values are selected. Output is private operational evidence.
\set ON_ERROR_STOP on

SELECT 1 / (current_database() = :'expected_database')::integer AS ys_expected_database_guard \gset

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL idle_in_transaction_session_timeout = '30s';

DO $assert_complete_visibility$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'application_migrations','system_directory_entries','system_directory_audit',
        'system_directory_relationships','system_directory_relationship_audit',
        'system_directory_billing_evidence','system_directory_billing_allocations',
        'system_directory_billing_audit'
      )
      AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'Preflight stopped: row-level security may hide rows from aggregate counts'; END IF;
END
$assert_complete_visibility$;

SELECT current_database() AS database_name,
       current_user AS effective_role,
       current_setting('transaction_read_only') = 'on' AS read_only_transaction;

SELECT version, checksum, applied_at
  FROM public.application_migrations
 ORDER BY version;

SELECT count(id) AS entries_total,
       count(id) FILTER (WHERE archived_at IS NULL) AS entries_active,
       count(id) FILTER (WHERE archived_at IS NOT NULL) AS entries_archived,
       max(revision) AS max_entry_revision
  FROM public.system_directory_entries;

SELECT EXISTS (
  SELECT 1 FROM pg_catalog.pg_attribute
   WHERE attrelid = 'public.system_directory_entries'::regclass
     AND attname = 'entity_class' AND attnum > 0 AND NOT attisdropped
) AS has_entity_class \gset
\if :has_entity_class
SELECT entity_class, count(id) AS records
  FROM public.system_directory_entries GROUP BY entity_class ORDER BY entity_class;
\endif

SELECT EXISTS (
  SELECT 1 FROM pg_catalog.pg_attribute
   WHERE attrelid = 'public.system_directory_entries'::regclass
     AND attname = 'legacy_directory_entry' AND attnum > 0 AND NOT attisdropped
) AS has_legacy_marker \gset
\if :has_legacy_marker
SELECT legacy_directory_entry, count(id) AS records
  FROM public.system_directory_entries GROUP BY legacy_directory_entry ORDER BY legacy_directory_entry;
\endif

SELECT count(a.id) AS audit_events_total,
       count(a.id) FILTER (WHERE e.id IS NULL) AS orphan_audit_events
  FROM public.system_directory_audit a
  LEFT JOIN public.system_directory_entries e ON e.id = a.entry_id;

SELECT to_regclass('public.system_directory_relationships') IS NOT NULL AS has_relationships \gset
\if :has_relationships
SELECT count(id) AS relationships_total,
       count(id) FILTER (WHERE archived_at IS NULL) AS relationships_active,
       count(id) FILTER (
         WHERE source_entry_id NOT IN (SELECT id FROM public.system_directory_entries)
            OR target_entry_id NOT IN (SELECT id FROM public.system_directory_entries)
       ) AS orphan_relationships
  FROM public.system_directory_relationships;
\endif

SELECT to_regclass('public.system_directory_relationship_audit') IS NOT NULL AS has_relationship_audit \gset
\if :has_relationship_audit
SELECT count(a.id) AS relationship_audit_events_total,
       count(a.id) FILTER (WHERE r.id IS NULL) AS orphan_relationship_audit_events
  FROM public.system_directory_relationship_audit a
  LEFT JOIN public.system_directory_relationships r ON r.id = a.relationship_id;
\endif

SELECT to_regclass('public.system_directory_billing_evidence') IS NOT NULL AS has_billing_evidence \gset
\if :has_billing_evidence
SELECT count(id) AS billing_evidence_total,
       count(id) FILTER (WHERE archived_at IS NULL) AS billing_evidence_active
  FROM public.system_directory_billing_evidence;
\endif

SELECT to_regclass('public.system_directory_billing_allocations') IS NOT NULL AS has_billing_allocations \gset
\if :has_billing_allocations
SELECT count(a.id) AS billing_allocations_total,
       count(a.id) FILTER (WHERE a.archived_at IS NULL) AS billing_allocations_active,
       count(a.id) FILTER (WHERE e.id IS NULL OR s.id IS NULL) AS orphan_billing_allocations
  FROM public.system_directory_billing_allocations a
  LEFT JOIN public.system_directory_billing_evidence e ON e.id = a.evidence_id
  LEFT JOIN public.system_directory_entries s ON s.id = a.subscription_id;
\endif

SELECT to_regclass('public.system_directory_billing_audit') IS NOT NULL AS has_billing_audit \gset
\if :has_billing_audit
SELECT count(a.id) AS billing_audit_events_total,
       count(a.id) FILTER (
         WHERE e.id IS NULL OR (a.allocation_id IS NOT NULL AND al.id IS NULL)
       ) AS orphan_billing_audit_events
  FROM public.system_directory_billing_audit a
  LEFT JOIN public.system_directory_billing_evidence e ON e.id = a.evidence_id
  LEFT JOIN public.system_directory_billing_allocations al ON al.id = a.allocation_id;
\endif

-- Metadata only: definitions and enabled state, never table contents.
SELECT c.relname AS table_name, con.conname AS constraint_name,
       pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname LIKE 'system_directory%'
 ORDER BY c.relname, con.conname;

SELECT tablename AS table_name, indexname, indexdef
  FROM pg_catalog.pg_indexes
 WHERE schemaname = 'public' AND tablename LIKE 'system_directory%'
 ORDER BY tablename, indexname;

SELECT c.relname AS table_name, t.tgname AS trigger_name,
       t.tgenabled AS enabled_state,
       pg_catalog.pg_get_triggerdef(t.oid, true) AS definition
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND NOT t.tgisinternal
   AND c.relname LIKE 'system_directory%'
 ORDER BY c.relname, t.tgname;

SELECT c.relname AS table_name, c.relrowsecurity AS row_level_security,
       c.relforcerowsecurity AS force_row_level_security
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN (
     'application_migrations','system_directory_entries','system_directory_audit',
     'system_directory_relationships','system_directory_relationship_audit',
     'system_directory_billing_evidence','system_directory_billing_allocations',
     'system_directory_billing_audit'
   )
 ORDER BY c.relname;

ROLLBACK;
