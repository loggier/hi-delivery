-- Crear el esquema si no existe
CREATE SCHEMA IF NOT EXISTS grupohubs;

-- Establecer el esquema para las siguientes operaciones
SET search_path TO grupohubs;

-- -- -- Tablas de Roles y Permisos -- -- --

-- Tabla de Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Módulos (para agrupar permisos)
CREATE TABLE modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Tabla de Permisos
CREATE TABLE permissions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE
);

-- Tabla de union para Roles y Permisos (Muchos a Muchos)
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(50) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -- -- Tabla de Usuarios del Sistema -- -- --
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    role_id UUID REFERENCES roles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -- -- Tablas de Negocios y Categorías -- -- --

-- Categorías de Negocios
CREATE TABLE business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'store', 'service')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Planes de Suscripción
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    validity VARCHAR(20) NOT NULL CHECK (validity IN ('mensual', 'quincenal', 'semanal', 'anual')),
    rider_fee NUMERIC(10, 2) NOT NULL,
    fee_per_km NUMERIC(10, 2) NOT NULL,
    min_shipping_fee NUMERIC(10, 2) NOT NULL,
    min_distance NUMERIC(5, 2) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Zonas de Operación
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    geofence JSONB, -- Usar JSONB para almacenar polígonos GeoJSON
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Negocios
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES business_categories(id),
    plan_id UUID REFERENCES plans(id),
    zone_id UUID REFERENCES zones(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    owner_name VARCHAR(255) NOT NULL,
    phone_whatsapp VARCHAR(20),
    location_address_line VARCHAR(255),
    location_neighborhood VARCHAR(100),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_zip VARCHAR(10),
    location_lat NUMERIC(9, 6),
    location_lng NUMERIC(9, 6),
    tax_id VARCHAR(13),
    website VARCHAR(255),
    instagram VARCHAR(100),
    logo_url VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -- -- Tablas de Productos y sus Categorías -- -- --

-- Categorías de Productos
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -- -- Tabla de Clientes -- -- --
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    main_address TEXT,
    additional_address_1 TEXT,
    additional_address_2 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -- -- Tabla de Repartidores (Riders) -- -- --
CREATE TABLE riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mother_last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    birth_date DATE NOT NULL,
    zone_id UUID REFERENCES zones(id),
    address TEXT,
    ine_front_url VARCHAR(255),
    ine_back_url VARCHAR(255),
    proof_of_address_url VARCHAR(255),
    license_front_url VARCHAR(255),
    license_back_url VARCHAR(255),
    vehicle_type VARCHAR(50) DEFAULT 'Moto',
    ownership VARCHAR(50),
    brand VARCHAR(50),
    year INT,
    model VARCHAR(100),
    color VARCHAR(50),
    plate VARCHAR(20),
    license_valid_until DATE,
    moto_photos TEXT[],
    circulation_card_front_url VARCHAR(255),
    circulation_card_back_url VARCHAR(255),
    insurer VARCHAR(100),
    policy_number VARCHAR(100),
    policy_valid_until DATE,
    policy_first_page_url VARCHAR(255),
    has_helmet BOOLEAN DEFAULT false,
    has_uniform BOOLEAN DEFAULT false,
    has_box BOOLEAN DEFAULT false,
    phone_e164 VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    avatar_1x1_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -- -- Tabla de Pedidos (Orders) -- -- --
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    business_id UUID REFERENCES businesses(id),
    rider_id UUID REFERENCES riders(id),
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DELIVERED', 'CANCELLED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de union para Pedidos y Productos (Muchos a Muchos)
CREATE TABLE order_products (
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    price_at_time NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

-- -- -- Triggers para `updated_at` -- -- --
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger a las tablas correspondientes
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON businesses
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON riders
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON zones
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
