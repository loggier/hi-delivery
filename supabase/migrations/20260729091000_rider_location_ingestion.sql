-- Hi Delivery: authenticated/batched rider location ingestion
--
-- The function is intentionally executable only by service_role. The future
-- signed-token API validates the rider identity before calling it. The mobile
-- client must not call this function directly with an arbitrary rider ID.

BEGIN;

CREATE TABLE IF NOT EXISTS grupohubs.rider_location_ingest_batches (
  batch_id uuid PRIMARY KEY,
  rider_id varchar(255) NOT NULL
    REFERENCES grupohubs.riders(id) ON DELETE CASCADE,
  device_id uuid,
  point_count integer NOT NULL DEFAULT 0,
  accepted_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  acknowledged_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  app_version text,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS rider_location_ingest_batches_rider_received_idx
  ON grupohubs.rider_location_ingest_batches (rider_id, received_at DESC);

COMMENT ON TABLE grupohubs.rider_location_ingest_batches IS
  'Idempotent receipts for batched rider location ingestion.';

CREATE OR REPLACE FUNCTION grupohubs.ingest_rider_location_batch(
  p_rider_id text,
  p_batch_id uuid,
  p_device_id uuid,
  p_points jsonb,
  p_app_version text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, grupohubs
AS $$
DECLARE
  v_rider_status text;
  v_existing_batch grupohubs.rider_location_ingest_batches%ROWTYPE;
  v_point jsonb;
  v_event_id uuid;
  v_recorded_at timestamptz;
  v_latitude double precision;
  v_longitude double precision;
  v_speed_mps double precision;
  v_heading_deg double precision;
  v_accuracy_m double precision;
  v_altitude_m double precision;
  v_sequence bigint;
  v_is_mock boolean;
  v_inserted_event_id uuid;
  v_point_count integer := 0;
  v_accepted_count integer := 0;
  v_duplicate_count integer := 0;
  v_acknowledged_event_ids jsonb := '[]'::jsonb;
  v_latest_recorded_at timestamptz := NULL;
  v_latest_event_id uuid := NULL;
  v_latest_latitude double precision := NULL;
  v_latest_longitude double precision := NULL;
  v_latest_speed_mps double precision := NULL;
  v_latest_heading_deg double precision := NULL;
  v_latest_accuracy_m double precision := NULL;
  v_latest_sequence bigint := NULL;
  v_server_received_at timestamptz := clock_timestamp();
  v_latest_applied boolean := false;
BEGIN
  IF p_rider_id IS NULL OR length(trim(p_rider_id)) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'rider_id is required';
  END IF;

  IF p_batch_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'batch_id is required';
  END IF;

  IF p_points IS NULL OR jsonb_typeof(p_points) <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'points must be a JSON array';
  END IF;

  SELECT status
  INTO v_rider_status
  FROM grupohubs.riders
  WHERE id = p_rider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Rider not found';
  END IF;

  IF lower(v_rider_status) NOT IN ('approved', 'active', 'aprobado', 'activo') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Rider is not allowed to report location';
  END IF;

  SELECT *
  INTO v_existing_batch
  FROM grupohubs.rider_location_ingest_batches
  WHERE batch_id = p_batch_id;

  IF FOUND THEN
    IF v_existing_batch.rider_id <> p_rider_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Batch does not belong to rider';
    END IF;

    RETURN jsonb_build_object(
      'batch_id', v_existing_batch.batch_id,
      'accepted', v_existing_batch.accepted_count,
      'duplicates', v_existing_batch.duplicate_count,
      'rejected', 0,
      'latest_applied', false,
      'server_received_at', v_existing_batch.received_at,
      'acknowledged_event_ids', v_existing_batch.acknowledged_event_ids,
      'replayed', true
    );
  END IF;

  IF jsonb_array_length(p_points) < 1 OR jsonb_array_length(p_points) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'points must contain between 1 and 100 items';
  END IF;

  FOR v_point IN SELECT value FROM jsonb_array_elements(p_points)
  LOOP
    v_point_count := v_point_count + 1;

    BEGIN
      v_event_id := NULLIF(v_point->>'event_id', '')::uuid;
      v_recorded_at := (v_point->>'recorded_at')::timestamptz;
      v_latitude := (v_point->>'latitude')::double precision;
      v_longitude := (v_point->>'longitude')::double precision;
      v_speed_mps := NULLIF(v_point->>'speed_mps', '')::double precision;
      v_heading_deg := NULLIF(v_point->>'heading_deg', '')::double precision;
      v_accuracy_m := NULLIF(v_point->>'accuracy_m', '')::double precision;
      v_altitude_m := NULLIF(v_point->>'altitude_m', '')::double precision;
      v_sequence := NULLIF(v_point->>'sequence', '')::bigint;
      v_is_mock := COALESCE((v_point->>'is_mock')::boolean, false);
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Invalid location point format';
    END;

    IF v_event_id IS NULL OR v_recorded_at IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'event_id and recorded_at are required';
    END IF;

    IF v_latitude IS NULL OR v_latitude < -90 OR v_latitude > 90
       OR v_longitude IS NULL OR v_longitude < -180 OR v_longitude > 180 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Location coordinates are out of range';
    END IF;

    IF v_recorded_at > clock_timestamp() + interval '5 minutes' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Location timestamp is too far in the future';
    END IF;

    IF v_speed_mps IS NOT NULL AND v_speed_mps < 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Speed cannot be negative';
    END IF;

    IF v_heading_deg IS NOT NULL AND (v_heading_deg < 0 OR v_heading_deg >= 360) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Heading must be between 0 and 360 degrees';
    END IF;

    IF v_accuracy_m IS NOT NULL AND v_accuracy_m < 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Accuracy cannot be negative';
    END IF;

    INSERT INTO grupohubs.rider_location_history (
      rider_id,
      latitude,
      longitude,
      speed,
      course,
      recorded_at,
      source,
      event_id,
      batch_id,
      device_id,
      sequence,
      accuracy_m,
      altitude_m,
      speed_mps,
      heading_deg,
      is_mock,
      app_version,
      received_at
    ) VALUES (
      p_rider_id,
      v_latitude,
      v_longitude,
      v_speed_mps,
      v_heading_deg,
      v_recorded_at,
      'rider_app_batch',
      v_event_id,
      p_batch_id,
      p_device_id,
      v_sequence,
      v_accuracy_m,
      v_altitude_m,
      v_speed_mps,
      v_heading_deg,
      v_is_mock,
      p_app_version,
      v_server_received_at
    )
    ON CONFLICT (rider_id, event_id) DO NOTHING
    RETURNING event_id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
      v_duplicate_count := v_duplicate_count + 1;
    ELSE
      v_accepted_count := v_accepted_count + 1;
    END IF;

    v_acknowledged_event_ids := v_acknowledged_event_ids || jsonb_build_array(v_event_id);

    IF v_latest_recorded_at IS NULL
       OR v_recorded_at > v_latest_recorded_at
       OR (v_recorded_at = v_latest_recorded_at AND v_event_id::text > v_latest_event_id::text) THEN
      v_latest_recorded_at := v_recorded_at;
      v_latest_event_id := v_event_id;
      v_latest_latitude := v_latitude;
      v_latest_longitude := v_longitude;
      v_latest_speed_mps := v_speed_mps;
      v_latest_heading_deg := v_heading_deg;
      v_latest_accuracy_m := v_accuracy_m;
      v_latest_sequence := v_sequence;
    END IF;
  END LOOP;

  UPDATE grupohubs.riders
  SET
    last_latitude = v_latest_latitude,
    last_longitude = v_latest_longitude,
    last_speed = v_latest_speed_mps,
    last_course = v_latest_heading_deg,
    last_location_update = v_latest_recorded_at,
    last_location_received_at = v_server_received_at,
    last_location_event_id = v_latest_event_id,
    last_location_sequence = v_latest_sequence
  WHERE id = p_rider_id
    AND (
      last_location_update IS NULL
      OR v_latest_recorded_at > last_location_update
      OR (
        v_latest_recorded_at = last_location_update
        AND (
          last_location_event_id IS NULL
          OR v_latest_event_id::text > last_location_event_id::text
        )
      )
    );

  v_latest_applied := FOUND;

  INSERT INTO grupohubs.rider_location_ingest_batches (
    batch_id,
    rider_id,
    device_id,
    point_count,
    accepted_count,
    duplicate_count,
    acknowledged_event_ids,
    app_version,
    received_at
  ) VALUES (
    p_batch_id,
    p_rider_id,
    p_device_id,
    v_point_count,
    v_accepted_count,
    v_duplicate_count,
    v_acknowledged_event_ids,
    p_app_version,
    v_server_received_at
  );

  RETURN jsonb_build_object(
    'batch_id', p_batch_id,
    'accepted', v_accepted_count,
    'duplicates', v_duplicate_count,
    'rejected', 0,
    'latest_applied', v_latest_applied,
    'server_received_at', v_server_received_at,
    'acknowledged_event_ids', v_acknowledged_event_ids,
    'replayed', false
  );
END;
$$;

COMMENT ON FUNCTION grupohubs.ingest_rider_location_batch(
  text, uuid, uuid, jsonb, text
) IS
  'Ingests authenticated rider location batches idempotently. Callable only by the server ingestion boundary.';

REVOKE ALL ON TABLE grupohubs.rider_location_ingest_batches FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE grupohubs.rider_location_ingest_batches TO service_role;

REVOKE ALL ON FUNCTION grupohubs.ingest_rider_location_batch(text, uuid, uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grupohubs.ingest_rider_location_batch(text, uuid, uuid, jsonb, text)
  TO service_role;

COMMIT;
