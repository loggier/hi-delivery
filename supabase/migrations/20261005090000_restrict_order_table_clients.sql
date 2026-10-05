BEGIN;

ALTER TABLE grupohubs.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for orders" ON grupohubs.orders;
REVOKE ALL ON TABLE grupohubs.orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE grupohubs.orders TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA grupohubs TO service_role;

DO $$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'order_items',
    'order_events',
    'order_assignment_attempts',
    'order_rejections'
  ]
  LOOP
    IF to_regclass(format('grupohubs.%I', relation_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE grupohubs.%I ENABLE ROW LEVEL SECURITY', relation_name);
      EXECUTE format('REVOKE ALL ON TABLE grupohubs.%I FROM PUBLIC, anon, authenticated', relation_name);
      EXECUTE format('GRANT ALL ON TABLE grupohubs.%I TO service_role', relation_name);
    END IF;
  END LOOP;
END;
$$;

COMMENT ON TABLE grupohubs.orders IS
  'Orders are server-mediated. Rider APIs verify a scoped signed rider token; web APIs verify an HttpOnly admin/owner session.';

COMMIT;
