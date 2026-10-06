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
  order_id varchar NOT NULL REFERENCES grupohubs.orders(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX business_api_idempotency_business_key_unique
  ON grupohubs.business_api_idempotency (business_id, idempotency_key_hash);

CREATE TABLE grupohubs.business_api_rate_limits (
  api_key_id uuid NOT NULL REFERENCES grupohubs.business_api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
CREATE UNIQUE INDEX business_api_rate_limits_key_window_unique
  ON grupohubs.business_api_rate_limits (api_key_id, window_start);

ALTER TABLE grupohubs.business_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.business_api_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.business_api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE grupohubs.business_api_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE grupohubs.business_api_idempotency FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE grupohubs.business_api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE grupohubs.business_api_keys TO service_role;
GRANT SELECT, INSERT ON TABLE grupohubs.business_api_idempotency TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE grupohubs.business_api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION grupohubs.consume_business_api_rate_limit(
  api_key_id_in uuid,
  requested_at_in timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, grupohubs
AS $$
DECLARE
  bucket_start timestamptz := date_trunc('minute', requested_at_in);
  new_count integer;
BEGIN
  INSERT INTO grupohubs.business_api_rate_limits (api_key_id, window_start, request_count)
  VALUES (api_key_id_in, bucket_start, 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET request_count = grupohubs.business_api_rate_limits.request_count + 1
  RETURNING request_count INTO new_count;

  RETURN new_count <= 60;
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
BEGIN
  IF customer_phone_in IS DISTINCT FROM normalized_mx_phone_in
     OR normalized_mx_phone_in !~ '^\+52[0-9]{10}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_NORMALIZED_MX_PHONE';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(business_id_in || ':' || idempotency_key_hash_in, 0)
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended(business_id_in || ':' || normalized_mx_phone_in, 0)
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
    SELECT * INTO STRICT created_order FROM grupohubs.orders WHERE id = prior_order_id;
    RETURN jsonb_build_object('order', to_jsonb(created_order), 'created', false);
  END IF;

  SELECT * INTO STRICT business_row
    FROM grupohubs.businesses
   WHERE id = business_id_in;

  SELECT split_part(btrim(customer_name_in), ' ', 1),
         nullif(regexp_replace(btrim(customer_name_in), '^\S+\s*', ''), '')
    INTO customer_first_name, customer_last_name;

  SELECT id INTO resolved_customer_id
    FROM grupohubs.customers
   WHERE business_id = business_id_in
     AND phone = normalized_mx_phone_in
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
      concat_ws(' ', customer_first_name, customer_last_name),
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
BEGIN
  UPDATE grupohubs.business_api_keys
     SET revoked_at = now(), enabled = false
   WHERE business_id = business_id_in
     AND revoked_at IS NULL;

  INSERT INTO grupohubs.business_api_keys (business_id, key_digest, key_prefix, enabled, created_by)
  VALUES (business_id_in, new_digest_in, new_prefix_in, false, actor_user_id_in)
  RETURNING id INTO new_key_id;

  RETURN new_key_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION grupohubs.consume_business_api_rate_limit(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grupohubs.create_business_api_order(varchar, text, text, text, text, text, text, jsonb, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grupohubs.rotate_business_api_key(varchar, text, text, varchar) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grupohubs.consume_business_api_rate_limit(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION grupohubs.create_business_api_order(varchar, text, text, text, text, text, text, jsonb, numeric, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION grupohubs.rotate_business_api_key(varchar, text, text, varchar) TO service_role;
