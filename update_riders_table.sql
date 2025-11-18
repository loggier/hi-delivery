-- Asegúrate de tener un backup si tienes datos importantes en la tabla riders.
-- Este script eliminará y recreará la tabla.

-- Eliminar la tabla existente si existe para evitar errores de conflicto.
DROP TABLE IF EXISTS grupohubs.riders;

-- Crear la tabla de nuevo con la estructura correcta.
CREATE TABLE grupohubs.riders (
  id character varying(255) NOT NULL,
  user_id character varying(255) NOT NULL,
  first_name character varying(255) NOT NULL,
  last_name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  phone_e164 character varying(20) NOT NULL,
  password_hash character varying(255) NOT NULL,
  status character varying(50) NOT NULL,
  
  -- Campos que se llenarán en pasos posteriores (ahora son opcionales)
  mother_last_name character varying(255) NULL,
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
  
  -- Timestamps y constraints
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT riders_pkey PRIMARY KEY (id),
  CONSTRAINT riders_email_key UNIQUE (email),
  CONSTRAINT riders_user_id_fkey FOREIGN KEY (user_id) REFERENCES grupohubs.users (id) ON DELETE CASCADE,
  CONSTRAINT riders_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES grupohubs.zones (id) ON DELETE SET NULL,
  CONSTRAINT riders_status_check CHECK (((status)::text = ANY (ARRAY[('pending_review'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('inactive'::character varying)::text, ('incomplete'::character varying)::text])))
) TABLESPACE pg_default;

-- Crear índices para mejorar el rendimiento de las búsquedas
CREATE INDEX IF NOT EXISTS idx_riders_email ON grupohubs.riders USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_riders_zone_id ON grupohubs.riders USING btree (zone_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_riders_user_id ON grupohubs.riders USING btree (user_id) TABLESPACE pg_default;
