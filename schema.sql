-- Crear el esquema para agrupar las tablas
CREATE SCHEMA IF NOT EXISTS grupohubs;

-- Crear tipos ENUM para usar en las tablas
CREATE TYPE grupohubs.business_type AS ENUM ('restaurant', 'store', 'service');
CREATE TYPE grupohubs.business_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW');
CREATE TYPE grupohubs.entity_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE grupohubs.rider_status AS ENUM ('pending_review', 'approved', 'rejected', 'inactive');
CREATE TYPE grupohubs.vehicle_ownership AS ENUM ('propia', 'rentada', 'prestada');
CREATE TYPE grupohubs.vehicle_brand AS ENUM ('Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki', 'Otra');
CREATE TYPE grupohubs.plan_validity AS ENUM ('mensual', 'quincenal', 'semanal', 'anual');
CREATE TYPE grupohubs.order_status AS ENUM ('DELIVERED', 'CANCELLED', 'PENDING');

-- Tabla de Roles y Permisos
CREATE TABLE IF NOT EXISTS grupohubs.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Usuarios del Sistema (Administradores)
CREATE TABLE IF NOT EXISTS grupohubs.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role_id TEXT REFERENCES grupohubs.roles(id) ON DELETE SET NULL,
    status grupohubs.entity_status NOT NULL DEFAULT 'INACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Planes
CREATE TABLE IF NOT EXISTS grupohubs.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    validity grupohubs.plan_validity NOT NULL,
    rider_fee NUMERIC(10, 2) NOT NULL,
    fee_per_km NUMERIC(10, 2) NOT NULL,
    min_shipping_fee NUMERIC(10, 2) NOT NULL,
    min_distance INT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Categorías de Negocios
CREATE TABLE IF NOT EXISTS grupohubs.business_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type grupohubs.business_type NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Zonas de Operación
CREATE TABLE IF NOT EXISTS grupohubs.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status grupohubs.entity_status NOT NULL,
    -- geofence JSONB, -- Para almacenar el polígono GeoJSON
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Negocios
CREATE TABLE IF NOT EXISTS grupohubs.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type grupohubs.business_type NOT NULL,
    category_id TEXT REFERENCES grupohubs.business_categories(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    phone_whatsapp TEXT NOT NULL,
    address_line TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    tax_id TEXT,
    website TEXT,
    instagram TEXT,
    logo_url TEXT,
    notes TEXT,
    status grupohubs.business_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    plan_id TEXT REFERENCES grupohubs.plans(id)
);

-- Tabla de Categorías de Productos
CREATE TABLE IF NOT EXISTS grupohubs.product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status grupohubs.entity_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS grupohubs.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    status grupohubs.entity_status NOT NULL,
    business_id UUID REFERENCES grupohubs.businesses(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES grupohubs.product_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Repartidores (Riders)
CREATE TABLE IF NOT EXISTS grupohubs.riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    mother_last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    birth_date DATE NOT NULL,
    zone_id UUID REFERENCES grupohubs.zones(id),
    address TEXT NOT NULL,
    ine_front_url TEXT,
    ine_back_url TEXT,
    proof_of_address_url TEXT,
    license_front_url TEXT,
    license_back_url TEXT,
    ownership grupohubs.vehicle_ownership,
    brand grupohubs.vehicle_brand,
    year INT,
    model TEXT,
    color TEXT,
    plate TEXT,
    license_valid_until DATE,
    moto_photos TEXT[],
    circulation_card_front_url TEXT,
    circulation_card_back_url TEXT,
    insurer TEXT,
    policy_number TEXT,
    policy_valid_until DATE,
    policy_first_page_url TEXT,
    has_helmet BOOLEAN DEFAULT false,
    has_uniform BOOLEAN DEFAULT false,
    has_box BOOLEAN DEFAULT false,
    phone_e164 TEXT UNIQUE NOT NULL,
    avatar_1x1_url TEXT,
    status grupohubs.rider_status,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS grupohubs.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    main_address TEXT NOT NULL,
    additional_address1 TEXT,
    additional_address2 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS grupohubs.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES grupohubs.customers(id),
    business_id UUID REFERENCES grupohubs.businesses(id),
    rider_id UUID REFERENCES grupohubs.riders(id),
    product_count INT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status grupohubs.order_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de Configuración del Sistema
CREATE TABLE IF NOT EXISTS grupohubs.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Insertar configuración inicial
INSERT INTO grupohubs.settings (key, value)
VALUES 
    ('shipping', '{"minShippingAmount": 50, "minDistanceKm": 3, "maxDistanceKm": 15, "costPerExtraKm": 8}')
ON CONFLICT (key) DO NOTHING;

-- Funciones para actualizar 'updated_at'
CREATE OR REPLACE FUNCTION grupohubs.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignar triggers a las tablas
CREATE TRIGGER set_timestamp_businesses BEFORE UPDATE ON grupohubs.businesses FOR EACH ROW EXECUTE PROCEDURE grupohubs.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_riders BEFORE UPDATE ON grupohubs.riders FOR EACH ROW EXECUTE PROCEDURE grupohubs.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_customers BEFORE UPDATE ON grupohubs.customers FOR EACH ROW EXECUTE PROCEDURE grupohubs.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_zones BEFORE UPDATE ON grupohubs.zones FOR EACH ROW EXECUTE PROCEDURE grupohubs.trigger_set_timestamp();
CREATE TRIGGER set_timestamp_plans BEFORE UPDATE ON grupohubs.plans FOR EACH ROW EXECUTE PROCEDURE grupohubs.trigger_set_timestamp();
