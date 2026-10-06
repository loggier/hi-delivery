CREATE TABLE grupohubs.business_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id varchar NOT NULL REFERENCES grupohubs.businesses(id) ON DELETE CASCADE,
  key_digest text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_by varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE UNIQUE INDEX business_api_keys_one_live_per_business
  ON grupohubs.business_api_keys (business_id)
  WHERE revoked_at IS NULL;

CREATE TABLE grupohubs.business_api_idempotency (
  business_id varchar NOT NULL REFERENCES grupohubs.businesses(id) ON DELETE CASCADE,
  idempotency_key_hash text NOT NULL,
  canonical_request_hash text NOT NULL,
  order_id varchar REFERENCES grupohubs.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX business_api_idempotency_business_key_unique
  ON grupohubs.business_api_idempotency (business_id, idempotency_key_hash);

CREATE TABLE grupohubs.business_api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES grupohubs.business_api_keys(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX business_api_rate_limits_key_requested_at_idx
  ON grupohubs.business_api_rate_limits (api_key_id, requested_at DESC);
CREATE INDEX business_api_rate_limits_requested_at_idx
  ON grupohubs.business_api_rate_limits (requested_at);

CREATE INDEX customers_business_phone_digits_idx
  ON grupohubs.customers (business_id, (regexp_replace(phone, '\D', '', 'g')));

ALTER TABLE grupohubs.business_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.business_api_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.business_api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE grupohubs.business_api_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE grupohubs.business_api_idempotency FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE grupohubs.business_api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE grupohubs.business_api_keys TO service_role;
GRANT SELECT, INSERT ON TABLE grupohubs.business_api_idempotency TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE grupohubs.business_api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION grupohubs.consume_business_api_rate_limit(
  api_key_id_in uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, grupohubs
AS $$
DECLARE
  event_time timestamptz;
  active_request_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('business_api_rate_limit:' || api_key_id_in::text, 0)
  );
  event_time := clock_timestamp();

  DELETE FROM grupohubs.business_api_rate_limits
   WHERE requested_at < event_time - INTERVAL '60 seconds';

  SELECT count(*) INTO active_request_count
    FROM grupohubs.business_api_rate_limits
   WHERE api_key_id = api_key_id_in
     AND requested_at >= event_time - INTERVAL '60 seconds'
     AND requested_at <= event_time;

  IF active_request_count >= 60 THEN
    RETURN false;
  END IF;

  INSERT INTO grupohubs.business_api_rate_limits (api_key_id, requested_at)
  VALUES (api_key_id_in, event_time);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION grupohubs.create_business_api_order(
  business_id_in varchar,
  idempotency_key_hash_in text,
  canonical_request_hash_in text,
  customer_name_in text,
  customer_phone_in text,
  customer_email_in text,
  normalized_mx_phone_in text,
  delivery_address_in jsonb,
  delivery_fee_in numeric,
  notes_in text,
  items_in jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, grupohubs
AS $$
DECLARE
  prior_hash text;
  prior_order_id varchar;
  resolved_customer_id varchar;
  created_order_id varchar := gen_random_uuid()::text;
  business_row grupohubs.businesses%ROWTYPE;
  customer_first_name text;
  customer_last_name text;
  items_description text;
  subtotal_value numeric;
  total_value numeric;
  created_order grupohubs.orders%ROWTYPE;
  normalized_phone_digits text;
  local_phone_digits text;
BEGIN
  IF customer_phone_in IS DISTINCT FROM normalized_mx_phone_in
     OR normalized_mx_phone_in !~ '^\+52[0-9]{10}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_NORMALIZED_MX_PHONE';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(business_id_in || ':' || idempotency_key_hash_in, 0)
  );
  normalized_phone_digits := regexp_replace(normalized_mx_phone_in, '\D', '', 'g');
  local_phone_digits := right(normalized_phone_digits, 10);
  -- Lock order: idempotency digest first, then business-scoped normalized phone.
  -- Distinct idempotency keys for the same phone serialize before find-or-create.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(business_id_in || ':' || local_phone_digits, 0)
  );

  SELECT canonical_request_hash, order_id
    INTO prior_hash, prior_order_id
    FROM grupohubs.business_api_idempotency
   WHERE business_id = business_id_in
     AND idempotency_key_hash = idempotency_key_hash_in;

  IF FOUND THEN
    IF prior_hash <> canonical_request_hash_in THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'IDEMPOTENCY_CONFLICT';
    END IF;
    IF prior_order_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'IDEMPOTENT_ORDER_UNAVAILABLE';
    END IF;
    SELECT * INTO STRICT created_order FROM grupohubs.orders WHERE id = prior_order_id;
    RETURN jsonb_build_object('order', to_jsonb(created_order), 'created', false);
  END IF;

  SELECT * INTO STRICT business_row
    FROM grupohubs.businesses
   WHERE id = business_id_in;

  customer_first_name := split_part(btrim(customer_name_in), ' ', 1);
  customer_last_name := coalesce(
    nullif(regexp_replace(btrim(customer_name_in), '^\S+\s*', ''), ''),
    ''
  );

  SELECT id INTO resolved_customer_id
    FROM grupohubs.customers
   WHERE business_id = business_id_in
     AND regexp_replace(phone, '\D', '', 'g') IN (normalized_phone_digits, local_phone_digits)
   LIMIT 1
   FOR UPDATE;

  IF resolved_customer_id IS NULL THEN
    resolved_customer_id := gen_random_uuid()::text;
    INSERT INTO grupohubs.customers (id, first_name, last_name, phone, email, business_id)
    VALUES (resolved_customer_id, customer_first_name, customer_last_name,
            normalized_mx_phone_in, customer_email_in, business_id_in);
  END IF;

  SELECT COALESCE(sum((item->>'quantity')::numeric * (item->>'price')::numeric), 0),
         string_agg(format('%s x %s', item->>'quantity', item->>'item_description'), ', ')
    INTO subtotal_value, items_description
    FROM jsonb_array_elements(items_in) AS item;
  total_value := subtotal_value + delivery_fee_in;
  items_description := concat_ws(E'\n', items_description, nullif(notes_in, ''));

  SELECT * INTO STRICT created_order
    FROM grupohubs.create_order_with_items(
      created_order_id,
      business_id_in,
      resolved_customer_id,
      jsonb_build_object(
        'street', business_row.address_line,
        'city', business_row.city,
        'state', business_row.state,
        'postal_code', business_row.zip_code,
        'latitude', business_row.latitude,
        'longitude', business_row.longitude
      ),
      delivery_address_in,
      customer_name_in,
      normalized_mx_phone_in,
      items_description,
      subtotal_value,
      delivery_fee_in,
      total_value,
      NULL,
      'pending_acceptance'::grupohubs.order_status,
      NULL,
      (SELECT jsonb_agg(jsonb_build_object(
        'product_id', NULL,
        'quantity', item->'quantity',
        'price', item->'price',
        'item_description', item->'item_description'
      )) FROM jsonb_array_elements(items_in) AS item)
    );

  INSERT INTO grupohubs.business_api_idempotency
    (business_id, idempotency_key_hash, canonical_request_hash, order_id)
  VALUES (business_id_in, idempotency_key_hash_in, canonical_request_hash_in, created_order_id);

  RETURN jsonb_build_object('order', to_jsonb(created_order), 'created', true);
END;
$$;

CREATE OR REPLACE FUNCTION grupohubs.rotate_business_api_key(
  business_id_in varchar,
  new_digest_in text,
  new_prefix_in text,
  actor_user_id_in varchar
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, grupohubs
AS $$
DECLARE
  new_key_id uuid;
  candidate_api_key_id uuid;
  old_api_key_id uuid;
BEGIN
  -- Serialize rotations even when the business has no current key row.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('business_api_key_rotation:' || business_id_in, 0)
  );

  SELECT id INTO candidate_api_key_id
    FROM grupohubs.business_api_keys
   WHERE business_id = business_id_in
     AND revoked_at IS NULL;

  IF candidate_api_key_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('business_api_rate_limit:' || candidate_api_key_id::text, 0)
    );

    SELECT id INTO old_api_key_id
      FROM grupohubs.business_api_keys
     WHERE id = candidate_api_key_id
       AND business_id = business_id_in
       AND revoked_at IS NULL
     FOR UPDATE;

    IF old_api_key_id IS NOT NULL THEN
      DELETE FROM grupohubs.business_api_rate_limits
       WHERE api_key_id = old_api_key_id;

      UPDATE grupohubs.business_api_keys
         SET revoked_at = now(), enabled = false
       WHERE id = old_api_key_id;
    END IF;
  END IF;

  INSERT INTO grupohubs.business_api_keys (business_id, key_digest, key_prefix, enabled, created_by)
  VALUES (business_id_in, new_digest_in, new_prefix_in, false, actor_user_id_in)
  RETURNING id INTO new_key_id;

  RETURN new_key_id;
END;
$$;

COMMENT ON FUNCTION grupohubs.create_business_api_order(varchar, text, text, text, text, text, text, jsonb, numeric, text, jsonb)
  IS 'Locks idempotency first, then business_id plus normalized 10-digit phone; uncaught failures roll back customer, order, and idempotency writes together.';

REVOKE EXECUTE ON FUNCTION grupohubs.consume_business_api_rate_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grupohubs.create_business_api_order(varchar, text, text, text, text, text, text, jsonb, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grupohubs.rotate_business_api_key(varchar, text, text, varchar) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grupohubs.consume_business_api_rate_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION grupohubs.create_business_api_order(varchar, text, text, text, text, text, text, jsonb, numeric, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION grupohubs.rotate_business_api_key(varchar, text, text, varchar) TO service_role;
