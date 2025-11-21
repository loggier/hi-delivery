-- Crear la nueva tabla para almacenar las direcciones de los clientes
CREATE TABLE grupohubs.customer_addresses (
  id character varying(255) not null,
  customer_id character varying(255) not null,
  address text not null,
  neighborhood character varying(255) null,
  city character varying(255) null,
  state character varying(255) null,
  zip_code character varying(10) null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  is_primary boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint customer_addresses_pkey primary key (id),
  constraint fk_customer foreign key (customer_id) references grupohubs.customers (id) on delete cascade
);

-- Crear índices para mejorar el rendimiento de las búsquedas
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON grupohubs.customer_addresses USING btree (customer_id);

-- Opcional: Eliminar las columnas de dirección antiguas de la tabla de clientes.
-- Haz una copia de seguridad de tus datos antes de ejecutar estas líneas si tienes información importante.
ALTER TABLE grupohubs.customers
DROP COLUMN IF EXISTS main_address,
DROP COLUMN IF EXISTS additional_address_1,
DROP COLUMN IF EXISTS additional_address_2;

-- Opcional: Añadir una columna a customers para referenciar la dirección principal, si se prefiere ese modelo
-- ALTER TABLE grupohubs.customers ADD COLUMN primary_address_id character varying(255) null;
-- ALTER TABLE grupohubs.customers ADD CONSTRAINT fk_primary_address FOREIGN KEY (primary_address_id) REFERENCES grupohubs.customer_addresses(id) ON DELETE SET NULL;
