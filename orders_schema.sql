
-- Supress notices for a cleaner output
SET client_min_messages TO WARNING;

-- Drop existing types and tables if they exist to ensure a clean slate
DROP TABLE IF EXISTS "order_events" CASCADE;
DROP TABLE IF EXISTS "order_items" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TYPE IF EXISTS "order_status" CASCADE;
DROP TYPE IF EXISTS "order_type" CASCADE;
DROP TYPE IF EXISTS "order_event_type" CASCADE;

-- Type Definitions (ENUMs)

-- Defines the possible statuses of an order throughout its lifecycle.
CREATE TYPE "order_status" AS ENUM (
  'pending_acceptance', -- Waiting for a rider to accept
  'accepted',           -- Rider accepted, heading to pickup
  'at_store',           -- Rider arrived at pickup location
  'picked_up',          -- Rider collected the package, heading to delivery
  'on_the_way',         -- Rider is at the delivery location (old: on_the_way was for transit)
  'delivered',          -- Rider has delivered the package
  'completed',          -- Order finalized and archived
  'cancelled'           -- Order was cancelled
);

-- Defines the type of order (from POS or a simple package delivery)
CREATE TYPE "order_type" AS ENUM (
  'pos',                -- Point of Sale order with products from a business
  'shipping'            -- Express shipping / package delivery
);

-- Defines the types of events that can be logged for an order.
CREATE TYPE "order_event_type" AS ENUM (
  'accepted',
  'arrived_at_pickup',
  'picked_up',
  'arrived_at_delivery',
  'delivered_with_evidence',
  'cancelled'
);


-- Table Definitions

-- The main table for storing order information.
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "business_id" uuid REFERENCES "businesses"("id") ON DELETE SET NULL,
  "rider_id" uuid REFERENCES "riders"("id") ON DELETE SET NULL,

  "status" order_status NOT NULL DEFAULT 'pending_acceptance',
  "type" order_type NOT NULL DEFAULT 'pos',

  -- Pickup Information
  "pickup_address_text" text NOT NULL,
  "pickup_lat" double precision NOT NULL,
  "pickup_lng" double precision NOT NULL,
  "pickup_business_name" varchar(255), -- Denormalized for quick access

  -- Delivery Information
  "delivery_address_text" text NOT NULL,
  "delivery_lat" double precision NOT NULL,
  "delivery_lng" double precision NOT NULL,
  "delivery_customer_name" varchar(255), -- Denormalized for quick access
  "delivery_customer_phone" varchar(20),  -- Denormalized for quick access

  -- Financials
  "subtotal" numeric(10, 2) NOT NULL DEFAULT 0.00,
  "delivery_fee" numeric(10, 2) NOT NULL DEFAULT 0.00,
  "service_fee" numeric(10, 2) NOT NULL DEFAULT 0.00,
  "order_total" numeric(10, 2) NOT NULL,
  "estimated_earnings" numeric(10, 2) NOT NULL,

  -- Details
  "items_description" text, -- For simple orders or a summary
  "distance_km" numeric(8, 2),

  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table to store individual items within an order (for POS orders).
CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL, -- Can be null for custom items
  
  "name" varchar(255) NOT NULL, -- Denormalized product name
  "quantity" integer NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "sku" varchar(100),

  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table to log significant events and state changes in an order's lifecycle.
CREATE TABLE "order_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "rider_id" uuid REFERENCES "riders"("id") ON DELETE SET NULL,
  "event_type" order_event_type NOT NULL,
  
  "notes" text,
  "photo_url" text, -- For delivery evidence
  
  "lat" double precision,
  "lng" double precision,
  
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX ON "orders" ("customer_id");
CREATE INDEX ON "orders" ("business_id");
CREATE INDEX ON "orders" ("rider_id");
CREATE INDEX ON "orders" ("status");
CREATE INDEX ON "order_items" ("order_id");
CREATE INDEX ON "order_events" ("order_id");
CREATE INDEX ON "order_events" ("event_type");

-- Enable Row Level Security (RLS)
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_events" ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to the 'authenticated' role for now.
-- Production policies should be more restrictive.
GRANT ALL ON TABLE "orders" TO authenticated;
GRANT ALL ON TABLE "order_items" TO authenticated;
GRANT ALL ON TABLE "order_events" TO authenticated;
GRANT ALL ON TABLE "orders" TO service_role;
GRANT ALL ON TABLE "order_items" TO service_role;
GRANT ALL ON TABLE "order_events" TO service_role;

-- Example policies (can be refined later)
CREATE POLICY "Users can see their own orders" ON "orders"
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Riders can see assigned orders" ON "orders"
  FOR SELECT USING (auth.uid() = rider_id);
  
COMMENT ON TABLE "orders" IS 'Main table for storing order information.';
COMMENT ON COLUMN "orders"."status" IS 'The current lifecycle status of the order.';
COMMENT ON TABLE "order_items" IS 'Stores individual items for an order, primarily for POS type orders.';
COMMENT ON TABLE "order_events" IS 'Logs a timestamped history of events for each order, such as acceptance, pickup, and delivery.';
COMMENT ON COLUMN "order_events"."photo_url" IS 'URL to the evidence photo, typically for the "delivered_with_evidence" event.';

