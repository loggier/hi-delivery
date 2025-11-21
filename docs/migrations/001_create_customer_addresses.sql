-- Create the new table for customer addresses if it doesn't exist
CREATE TABLE IF NOT EXISTS grupohubs.customer_addresses (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL REFERENCES grupohubs.customers(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    neighborhood VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    zip_code VARCHAR(20),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON grupohubs.customer_addresses(customer_id);

-- Remove old address columns from customers table if they exist
ALTER TABLE grupohubs.customers DROP COLUMN IF EXISTS main_address;
ALTER TABLE grupohubs.customers DROP COLUMN IF EXISTS additional_address_1;
ALTER TABLE grupohubs.customers DROP COLUMN IF EXISTS additional_address_2;
