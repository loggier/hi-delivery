-- Clientes por negocio
-- Permite repetir telefono/correo en negocios distintos, pero no dentro del mismo negocio.

ALTER TABLE grupohubs.customers
  ADD COLUMN IF NOT EXISTS business_id character varying(255);

UPDATE grupohubs.customers c
SET business_id = latest_order.business_id
FROM (
  SELECT DISTINCT ON (customer_id)
    customer_id,
    business_id
  FROM grupohubs.orders
  WHERE customer_id IS NOT NULL
    AND business_id IS NOT NULL
  ORDER BY customer_id, created_at DESC
) latest_order
WHERE c.id = latest_order.customer_id
  AND c.business_id IS NULL;

ALTER TABLE grupohubs.customers
  DROP CONSTRAINT IF EXISTS customers_phone_key,
  DROP CONSTRAINT IF EXISTS customers_email_key,
  DROP CONSTRAINT IF EXISTS customers_business_id_fkey;

ALTER TABLE grupohubs.customers
  ADD CONSTRAINT customers_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES grupohubs.businesses(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_business_id
  ON grupohubs.customers (business_id);

CREATE UNIQUE INDEX IF NOT EXISTS customers_business_phone_unique
  ON grupohubs.customers (business_id, phone)
  WHERE business_id IS NOT NULL
    AND phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_business_email_unique
  ON grupohubs.customers (business_id, email)
  WHERE business_id IS NOT NULL
    AND email IS NOT NULL
    AND email <> '';

COMMENT ON COLUMN grupohubs.customers.business_id IS 'Negocio propietario del cliente.';
