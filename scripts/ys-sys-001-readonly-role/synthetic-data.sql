\set ON_ERROR_STOP on
SELECT pg_catalog.set_config('yorkstead.system_directory_actor', 'synthetic-fixture-actor', false);

INSERT INTO public.system_directory_entries
  (id, name, category, provider, purpose, account_identity, billing_entity, entity_class, legacy_directory_entry)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Synthetic Service A', 'other', 'Synthetic Vendor', 'SYNTHETIC PRIVATE SENTINEL', '', '', 'provider_service', true),
  ('00000000-0000-0000-0000-000000000002', 'Synthetic Service B', 'other', 'Synthetic Vendor', 'SYNTHETIC PRIVATE SENTINEL', '', '', 'subscription', false);

INSERT INTO public.system_directory_relationships
  (id, source_entry_id, target_entry_id, relationship_kind)
VALUES
  ('00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002', 'depends_on');

INSERT INTO public.system_directory_billing_evidence
  (id, source_kind, evidence_reference, observed_at, amount_basis)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'owner_observation', 'SYNTHETIC-BILLING-SENTINEL', now(), 'unknown');
