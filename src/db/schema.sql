-- Create schema if it doesn't exist
create schema if not exists grupohubs;

-- Set search path to the new schema
set search_path to grupohubs;

--
-- Roles & Permissions
--
CREATE TABLE grupohubs.roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--
-- Users
--
CREATE TABLE grupohubs.users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    role_id VARCHAR(255) REFERENCES grupohubs.roles(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--
-- Plans
--
create table grupohubs.plans (
  id character varying(255) not null,
  name character varying(255) not null,
  price numeric(10, 2) not null,
  validity character varying(50) not null,
  rider_fee numeric(10, 2) not null,
  fee_per_km numeric(10, 2) not null,
  min_shipping_fee numeric(10, 2) not null,
  min_distance numeric(10, 2) not null,
  details text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint plans_pkey primary key (id)
) tablespace pg_default;


--
-- Zones
--
create table grupohubs.zones (
  id character varying(255) not null,
  name character varying(255) not null,
  status character varying(50) not null default 'ACTIVE'::character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  geofence jsonb null,
  constraint zones_pkey primary key (id),
  constraint zones_status_check check (
    (
      (status)::text = any (
        (
          array['ACTIVE'::character varying, 'INACTIVE'::character varying]
        )::text[]
      )
    )
  )
) tablespace pg_default;


--
-- Business Categories
--
create table grupohubs.business_categories (
  id character varying(255) not null,
  name character varying(255) not null,
  type character varying(50) not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint business_categories_pkey primary key (id),
  constraint business_categories_type_check check (
    (
      (type)::text = any (
        (
          array[
            'restaurant'::character varying,
            'store'::character varying,
            'service'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

--
-- Businesses
--
create table grupohubs.businesses (
  id character varying(255) not null,
  user_id character varying(255) not null,
  name character varying(255) not null,
  type character varying(50) not null,
  category_id character varying(255) null,
  email character varying(255) not null,
  owner_name character varying(255) not null,
  phone_whatsapp character varying(50) not null,
  address_line text not null,
  neighborhood character varying(255) not null,
  city character varying(255) not null,
  state character varying(255) not null,
  zip_code character varying(10) not null,
  latitude numeric(9, 6) null,
  longitude numeric(9, 6) null,
  tax_id character varying(20) null,
  website character varying(255) null,
  instagram character varying(255) null,
  logo_url character varying(255) null,
  notes text null,
  status character varying(50) not null,
  plan_id character varying(255) null,
  zone_id character varying(255) null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint businesses_pkey primary key (id),
  constraint businesses_email_key unique (email),
  constraint businesses_user_id_fkey foreign KEY (user_id) references grupohubs.users (id) on delete cascade,
  constraint businesses_zone_id_fkey foreign KEY (zone_id) references grupohubs.zones (id) on delete set null,
  constraint businesses_category_id_fkey foreign KEY (category_id) references grupohubs.business_categories (id) on delete set null,
  constraint businesses_plan_id_fkey foreign KEY (plan_id) references grupohubs.plans (id) on delete set null,
  constraint businesses_type_check check (
    (
      (type)::text = any (
        (
          array[
            'restaurant'::character varying,
            'store'::character varying,
            'service'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint businesses_status_check check (
    (
      (status)::text = any (
        (
          array[
            'ACTIVE'::character varying,
            'INACTIVE'::character varying,
            'PENDING_REVIEW'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_businesses_name on grupohubs.businesses using btree (name) TABLESPACE pg_default;
create index IF not exists idx_businesses_zone_id on grupohubs.businesses using btree (zone_id) TABLESPACE pg_default;
create index IF not exists idx_businesses_user_id on grupohubs.businesses using btree (user_id) TABLESPACE pg_default;


-- Grant permissions
grant usage on schema grupohubs to anon, authenticated, service_role;
grant all privileges on all tables in schema grupohubs to anon, authenticated, service_role;
grant all privileges on all sequences in schema grupohubs to anon, authenticated, service_role;
