-- Agrega campos opcionales de detalle para direcciones de cliente.
ALTER TABLE grupohubs.customer_addresses
ADD COLUMN IF NOT EXISTS street VARCHAR(255),
ADD COLUMN IF NOT EXISTS house_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference TEXT;
