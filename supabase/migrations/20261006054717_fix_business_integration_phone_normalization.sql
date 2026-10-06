DROP INDEX grupohubs.customers_business_phone_digits_idx;
CREATE INDEX customers_business_phone_digits_idx
  ON grupohubs.customers (business_id, (regexp_replace(phone, '[^0-9]', '', 'g')));

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
AS $function$
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
     OR normalized_mx_phone_in !~ '^[+]52[0-9]{10}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_NORMALIZED_MX_PHONE';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(business_id_in || ':' || idempotency_key_hash_in, 0));
  normalized_phone_digits := regexp_replace(normalized_mx_phone_in, '[^0-9]', '', 'g');
  local_phone_digits := right(normalized_phone_digits, 10);
  PERFORM pg_advisory_xact_lock(hashtextextended(business_id_in || ':' || local_phone_digits, 0));

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

  SELECT * INTO STRICT business_row FROM grupohubs.businesses WHERE id = business_id_in;
  customer_first_name := split_part(btrim(customer_name_in), ' ', 1);
  customer_last_name := coalesce(nullif(regexp_replace(btrim(customer_name_in), '^[^[:space:]]+[[:space:]]*', ''), ''), '');

  SELECT id INTO resolved_customer_id
    FROM grupohubs.customers
   WHERE business_id = business_id_in
     AND regexp_replace(phone, '[^0-9]', '', 'g') IN (normalized_phone_digits, local_phone_digits)
   LIMIT 1
   FOR UPDATE;

  IF resolved_customer_id IS NULL THEN
    resolved_customer_id := gen_random_uuid()::text;
    INSERT INTO grupohubs.customers (id, first_name, last_name, phone, email, business_id)
    VALUES (resolved_customer_id, customer_first_name, customer_last_name, normalized_mx_phone_in, customer_email_in, business_id_in);
  END IF;

  SELECT COALESCE(sum((item->>'quantity')::numeric * (item->>'price')::numeric), 0),
         string_agg(format('%s x %s', item->>'quantity', item->>'item_description'), ', ')
    INTO subtotal_value, items_description
    FROM jsonb_array_elements(items_in) AS item;
  total_value := subtotal_value + delivery_fee_in;
  items_description := concat_ws(chr(10), items_description, nullif(notes_in, ''));

  SELECT * INTO STRICT created_order
    FROM grupohubs.create_order_with_items(
      created_order_id, business_id_in, resolved_customer_id,
      jsonb_build_object(
        'street', business_row.address_line,
        'city', business_row.city,
        'state', business_row.state,
        'postal_code', business_row.zip_code,
        'latitude', business_row.latitude,
        'longitude', business_row.longitude
      ),
      delivery_address_in, customer_name_in, normalized_mx_phone_in, items_description,
      subtotal_value, delivery_fee_in, total_value, NULL,
      'pending_acceptance'::grupohubs.order_status, NULL,
      (SELECT jsonb_agg(jsonb_build_object(
        'product_id', NULL,
        'quantity', item->'quantity',
        'price', item->'price',
        'item_description', item->>'item_description'
      )) FROM jsonb_array_elements(items_in) AS item)
    );

  INSERT INTO grupohubs.business_api_idempotency
    (business_id, idempotency_key_hash, canonical_request_hash, order_id)
  VALUES (business_id_in, idempotency_key_hash_in, canonical_request_hash_in, created_order_id);

  RETURN jsonb_build_object('order', to_jsonb(created_order), 'created', true);
END;
$function$;

COMMENT ON FUNCTION grupohubs.create_business_api_order(varchar,text,text,text,text,text,text,jsonb,numeric,text,jsonb)
  IS 'Locks idempotency first, then business_id plus normalized 10-digit phone; uncaught failures roll back customer, order, and idempotency writes together.';
