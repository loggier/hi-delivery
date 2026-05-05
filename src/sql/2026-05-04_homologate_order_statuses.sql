-- Homologa estados y timestamps del ciclo de vida de pedidos.
-- Ejecutar en el server antes de depender de los estados finos en web/app.

ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'pending_acceptance';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'at_store';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'cooking';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'on_the_way';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'arrived_at_destination';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE grupohubs.order_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TYPE grupohubs.order_event_type ADD VALUE IF NOT EXISTS 'arrived_store';
ALTER TYPE grupohubs.order_event_type ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE grupohubs.order_event_type ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE grupohubs.order_event_type ADD VALUE IF NOT EXISTS 'ready_for_pickup';
ALTER TYPE grupohubs.order_event_type ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE grupohubs.order_event_type ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE grupohubs.orders
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS at_store_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cooking_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ready_for_pickup_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS arrived_at_destination_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivery_proof_url character varying(2048),
  ADD COLUMN IF NOT EXISTS delivery_failure_reason text,
  ADD COLUMN IF NOT EXISTS delivery_failure_reported_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS notified_riders jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_notified_riders jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rejected_riders jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_dispatch_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS assignment_exhausted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS dispatch_attempt_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS grupohubs.order_assignment_attempts (
  id bigserial PRIMARY KEY,
  order_id character varying(255) NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
  rider_id character varying(255) NOT NULL REFERENCES grupohubs.riders(id),
  dispatch_attempt_no integer NOT NULL DEFAULT 1,
  algorithm character varying(40) NOT NULL DEFAULT 'batch',
  score numeric(12, 4),
  distance_km numeric(10, 3),
  active_orders_count integer,
  notified_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  responded_at timestamp with time zone,
  outcome character varying(40) NOT NULL DEFAULT 'notified',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT order_assignment_attempts_algorithm_check
    CHECK (algorithm IN ('batch', 'sequential', 'manual')),
  CONSTRAINT order_assignment_attempts_outcome_check
    CHECK (outcome IN ('notified', 'accepted', 'rejected', 'expired', 'superseded'))
);

CREATE INDEX IF NOT EXISTS idx_order_assignment_attempts_order_id
  ON grupohubs.order_assignment_attempts(order_id);

CREATE INDEX IF NOT EXISTS idx_order_assignment_attempts_rider_id
  ON grupohubs.order_assignment_attempts(rider_id);

CREATE INDEX IF NOT EXISTS idx_order_assignment_attempts_outcome
  ON grupohubs.order_assignment_attempts(outcome);

CREATE OR REPLACE FUNCTION grupohubs.set_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  NEW.updated_at = now();

  CASE NEW.status::text
    WHEN 'accepted' THEN
      NEW.accepted_at = COALESCE(NEW.accepted_at, now());
    WHEN 'at_store' THEN
      NEW.at_store_at = COALESCE(NEW.at_store_at, now());
    WHEN 'cooking' THEN
      NEW.cooking_at = COALESCE(NEW.cooking_at, now());
    WHEN 'ready_for_pickup' THEN
      NEW.ready_for_pickup_at = COALESCE(NEW.ready_for_pickup_at, now());
    WHEN 'picked_up' THEN
      NEW.picked_up_at = COALESCE(NEW.picked_up_at, now());
    WHEN 'out_for_delivery' THEN
      NEW.out_for_delivery_at = COALESCE(NEW.out_for_delivery_at, now());
    WHEN 'on_the_way' THEN
      NEW.out_for_delivery_at = COALESCE(NEW.out_for_delivery_at, now());
    WHEN 'arrived_at_destination' THEN
      NEW.arrived_at_destination_at = COALESCE(NEW.arrived_at_destination_at, now());
    WHEN 'delivered' THEN
      NEW.delivered_at = COALESCE(NEW.delivered_at, now());
    WHEN 'completed' THEN
      NEW.delivered_at = COALESCE(NEW.delivered_at, now());
      NEW.completed_at = COALESCE(NEW.completed_at, now());
    WHEN 'cancelled' THEN
      NEW.cancelled_at = COALESCE(NEW.cancelled_at, now());
    WHEN 'refunded' THEN
      NEW.refunded_at = COALESCE(NEW.refunded_at, now());
    WHEN 'failed' THEN
      NEW.failed_at = COALESCE(NEW.failed_at, now());
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_status_timestamps ON grupohubs.orders;
CREATE TRIGGER trg_set_order_status_timestamps
BEFORE INSERT OR UPDATE OF status
ON grupohubs.orders
FOR EACH ROW
EXECUTE FUNCTION grupohubs.set_order_status_timestamps();
