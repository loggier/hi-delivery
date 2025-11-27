-- Drop existing types and tables if they exist to avoid conflicts
DROP TABLE IF EXISTS grupohubs.order_events CASCADE;
DROP TABLE IF EXISTS grupohubs.order_items CASCADE;
DROP TABLE IF EXISTS grupohubs.orders CASCADE;
DROP TYPE IF EXISTS grupohubs.order_status;
DROP TYPE IF EXISTS grupohubs.order_event_type;

-- Create ENUM types for statuses and events
CREATE TYPE grupohubs.order_status AS ENUM (
  'unassigned',
  'pending_acceptance',
  'accepted',
  'at_store',
  'cooking',
  'picked_up',
  'on_the_way',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'failed'
);

CREATE TYPE grupohubs.order_event_type AS ENUM (
  'created',
  'accepted_by_rider',
  'arrived_at_store',
  'picked_up',
  'arrived_at_destination',
  'delivered_with_photo',
  'completed',
  'cancelled_by_user',
  'cancelled_by_business',
  'cancelled_by_admin'
);

-- Main orders table
CREATE TABLE grupohubs.orders (
    id character varying(255) PRIMARY KEY,
    status grupohubs.order_status NOT NULL DEFAULT 'unassigned',
    customer_id character varying(255) REFERENCES grupohubs.customers(id),
    business_id character varying(255) REFERENCES grupohubs.businesses(id),
    rider_id character varying(255) REFERENCES grupohubs.riders(id),
    
    -- Customer and destination details
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(50),
    delivery_address_text text NOT NULL,
    delivery_address_lat double precision NOT NULL,
    delivery_address_lng double precision NOT NULL,

    -- Business and pickup details
    pickup_business_name character varying(255),
    pickup_address_text text,
    pickup_address_lat double precision,
    pickup_address_lng double precision,

    -- Financials
    subtotal numeric(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee numeric(10, 2) NOT NULL DEFAULT 0.00,
    service_fee numeric(10, 2) NOT NULL DEFAULT 0.00,
    total numeric(10, 2) NOT NULL DEFAULT 0.00,
    estimated_earnings numeric(10, 2), -- For the rider

    -- Other details
    items_description text,
    distance_km numeric(8, 2), -- in kilometers
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for items within an order
CREATE TABLE grupohubs.order_items (
    id bigserial PRIMARY KEY,
    order_id character varying(255) NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    product_id character varying(255) REFERENCES grupohubs.products(id),
    product_name character varying(255) NOT NULL,
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table to track the history of an order's lifecycle
CREATE TABLE grupohubs.order_events (
    id bigserial PRIMARY KEY,
    order_id character varying(255) NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    event_type grupohubs.order_event_type NOT NULL,
    actor_id character varying(255), -- User, Rider, or Business ID
    actor_type character varying(50), -- e.g., 'rider', 'admin'
    notes text,
    photo_url character varying(255), -- For evidence of delivery
    location_lat double precision,
    location_lng double precision,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for frequently queried columns
CREATE INDEX ON grupohubs.orders (customer_id);
CREATE INDEX ON grupohubs.orders (business_id);
CREATE INDEX ON grupohubs.orders (rider_id);
CREATE INDEX ON grupohubs.orders (status);
CREATE INDEX ON grupohubs.order_items (order_id);
CREATE INDEX ON grupohubs.order_events (order_id);
