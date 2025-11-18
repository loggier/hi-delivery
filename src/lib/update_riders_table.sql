-- This script will update the riders table to allow for a multi-step registration process.
-- It makes most fields nullable, adds the user_id foreign key, and ensures a clean state.

-- Step 1: Drop the existing table and its dependencies (like the FK constraint from the orders table).
DROP TABLE IF EXISTS grupohubs.riders CASCADE;

-- Step 2: Recreate the table with the correct structure.
-- Most fields are now NULLable to allow for gradual profile completion.
CREATE TABLE grupohubs.riders (
  id character varying(255) NOT NULL,
  user_id character varying(255) NOT NULL,
  first_name character varying(255) NOT NULL,
  last_name character varying(255) NOT NULL,
  mother_last_name character varying(255) NULL,
  email character varying(255) NOT NULL,
  phone_e164 character varying(20) NOT NULL,
  password_hash character varying(255) NOT NULL,
  status character varying(50) NOT NULL,

  -- Fields to be filled in later steps (nullable)
  birth_date date NULL,
  rider_type character varying(50) NULL DEFAULT 'Asociado'::character varying,
  zone_id character varying(255) NULL,
  address text NULL,
  ine_front_url character varying(255) NULL,
  ine_back_url character varying(255) NULL,
  proof_of_address_url character varying(255) NULL,
  license_front_url character varying(255) NULL,
  license_back_url character varying(255) NULL,
  vehicle_type character varying(50) NULL DEFAULT 'Moto'::character varying,
  ownership character varying(50) NULL,
  brand character varying(100) NULL,
  "year" integer NULL,
  model character varying(100) NULL,
  color character varying(50) NULL,
  plate character varying(20) NULL,
  license_valid_until date NULL,
  moto_photos jsonb NULL,
  circulation_card_front_url character varying(255) NULL,
  circulation_card_back_url character varying(255) NULL,
  insurer character varying(255) NULL,
  policy_number character varying(255) NULL,
  policy_valid_until date NULL,
  policy_first_page_url character varying(255) NULL,
  has_helmet boolean NULL DEFAULT false,
  has_uniform boolean NULL DEFAULT false,
  has_box boolean NULL DEFAULT false,
  avatar_1x1_url character varying(255) NULL,

  -- Timestamps and constraints
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT riders_pkey PRIMARY KEY (id),
  CONSTRAINT riders_email_key UNIQUE (email),
  CONSTRAINT riders_user_id_fkey FOREIGN KEY (user_id) REFERENCES grupohubs.users(id) ON DELETE CASCADE,
  CONSTRAINT riders_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES grupohubs.zones(id),
  CONSTRAINT riders_status_check CHECK (((status)::text = ANY ((ARRAY['pending_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'inactive'::character varying, 'incomplete'::character varying])::text[])))
);

-- Step 3: Re-create indexes
CREATE INDEX IF NOT EXISTS idx_riders_email ON grupohubs.riders USING btree (email);
CREATE INDEX IF NOT EXISTS idx_riders_zone_id ON grupohubs.riders USING btree (zone_id);

-- IMPORTANT: After running this, the foreign key from `orders` to `riders` will be gone.
-- You need to re-add it.
-- Step 4: Re-add the foreign key constraint to the orders table.
-- Note: This assumes your orders table is named 'grupohubs.orders' and the column is 'rider_id'.
ALTER TABLE grupohubs.orders
ADD CONSTRAINT orders_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES grupohubs.riders(id) ON DELETE SET NULL;

COMMENT ON TABLE grupohubs.riders IS 'Stores information about delivery riders, with most fields being nullable to support a step-by-step registration process.';
COMMENT ON COLUMN grupohubs.riders.status IS 'The current status of the rider''s application or account.';
