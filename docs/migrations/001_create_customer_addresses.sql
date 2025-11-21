
-- Create the new table for customer addresses
CREATE TABLE grupohubs.customer_addresses (
  id character varying(255) NOT NULL,
  customer_id character varying(255) NOT NULL,
  address text NOT NULL,
  neighborhood character varying(255) NULL,
  city character varying(255) NULL,
  state character varying(255) NULL,
  zip_code character varying(20) NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT fk_customer
      FOREIGN KEY(customer_id) 
	  REFERENCES grupohubs.customers(id)
	  ON DELETE CASCADE
);

-- Optional: Add an index for faster lookups by customer_id
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id
ON grupohubs.customer_addresses USING btree
(customer_id ASC NULLS LAST)
TABLESPACE pg_default;


-- Alter the existing customers table to remove address fields
ALTER TABLE grupohubs.customers
DROP COLUMN IF EXISTS main_address,
DROP COLUMN IF EXISTS additional_address_1,
DROP COLUMN IF EXISTS additional_address_2;
