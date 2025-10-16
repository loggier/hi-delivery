-- Crear el esquema si no existe
CREATE SCHEMA IF NOT EXISTS grupohubs;

-- Establecer el esquema para las siguientes operaciones
SET search_path TO grupohubs;

-- Borrar tablas existentes para una limpieza completa
DROP TABLE IF EXISTS "order_items" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "product_categories" CASCADE;
DROP TABLE IF EXISTS "businesses" CASCADE;
DROP TABLE IF EXISTS "business_categories" CASCADE;
DROP TABLE IF EXISTS "zones" CASCADE;
DROP TABLE IF EXISTS "riders" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TABLE IF EXISTS "plans" CASCADE;

-- Enum para el estado del usuario
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE');

-- Tabla de Roles
CREATE TABLE roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Usuarios (Administradores, Gerentes, etc.)
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role_id VARCHAR(255) REFERENCES roles(id),
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Clientes
CREATE TABLE customers (
    id VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE,
    main_address TEXT NOT NULL,
    additional_address1 TEXT,
    additional_address2 TEXT,
    order_count INT NOT NULL DEFAULT 0,
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enum para el tipo de negocio
CREATE TYPE business_type AS ENUM ('restaurant', 'store', 'service');
-- Enum para el estado del negocio
CREATE TYPE business_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW');

-- Tabla de Categorías de Negocio
CREATE TABLE business_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type business_type NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Zonas de Operación
CREATE TABLE zones (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    business_count INT NOT NULL DEFAULT 0,
    rider_count INT NOT NULL DEFAULT 0,
    geofence JSONB, -- O GEOMETRY(Polygon, 4326) si usas PostGIS
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Tabla de Planes
CREATE TABLE plans (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    validity VARCHAR(50) NOT NULL,
    rider_fee NUMERIC(10, 2) NOT NULL,
    fee_per_km NUMERIC(10, 2) NOT NULL,
    min_shipping_fee NUMERIC(10, 2) NOT NULL,
    min_distance NUMERIC(10, 2) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Tabla de Negocios
CREATE TABLE businesses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type business_type NOT NULL,
    category_id VARCHAR(255) REFERENCES business_categories(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    phone_whatsapp VARCHAR(50) NOT NULL,
    address_line TEXT NOT NULL,
    neighborhood VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    lat FLOAT,
    lng FLOAT,
    tax_id VARCHAR(13),
    website TEXT,
    instagram VARCHAR(255),
    logo_url TEXT,
    notes TEXT,
    status business_status NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enum para el estado de las entidades con slug
CREATE TYPE slug_status AS ENUM ('ACTIVE', 'INACTIVE');

-- Tabla de Categorías de Productos
CREATE TABLE product_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status slug_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Productos
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    status slug_status NOT NULL DEFAULT 'ACTIVE',
    business_id VARCHAR(255) REFERENCES businesses(id) ON DELETE CASCADE,
    category_id VARCHAR(255) REFERENCES product_categories(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Enum para el estado del repartidor
CREATE TYPE rider_status AS ENUM ('pending_review', 'approved', 'rejected', 'inactive');
CREATE TYPE vehicle_ownership AS ENUM ('propia', 'rentada', 'prestada');
CREATE TYPE vehicle_brand AS ENUM ('Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki', 'Otra');

-- Tabla de Repartidores (Riders)
CREATE TABLE riders (
    id VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    mother_last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    birth_date DATE NOT NULL,
    rider_type VARCHAR(50) NOT NULL DEFAULT 'Asociado',
    zone VARCHAR(100) NOT NULL,
    identity_type VARCHAR(50) NOT NULL DEFAULT 'INE',
    address TEXT NOT NULL,
    ine_front_url TEXT,
    ine_back_url TEXT,
    proof_of_address_url TEXT,
    license_front_url TEXT,
    license_back_url TEXT,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Moto',
    ownership vehicle_ownership NOT NULL,
    brand vehicle_brand NOT NULL,
    year INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    plate VARCHAR(20) NOT NULL,
    license_valid_until DATE,
    moto_photos TEXT[],
    circulation_card_front_url TEXT,
    circulation_card_back_url TEXT,
    insurer VARCHAR(255),
    policy_number VARCHAR(100),
    policy_valid_until DATE,
    policy_first_page_url TEXT,
    has_helmet BOOLEAN DEFAULT false,
    has_uniform BOOLEAN DEFAULT false,
    has_box BOOLEAN DEFAULT false,
    phone_e164 VARCHAR(20) UNIQUE NOT NULL,
    password_hash_mock TEXT NOT NULL,
    avatar_1x1_url TEXT,
    status rider_status NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enum para el estado del pedido
CREATE TYPE order_status AS ENUM ('DELIVERED', 'CANCELLED', 'PENDING', 'IN_PROGRESS', 'PICKED_UP');

-- Tabla de Pedidos
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) REFERENCES customers(id),
    business_id VARCHAR(255) REFERENCES businesses(id),
    rider_id VARCHAR(255) REFERENCES riders(id),
    product_count INT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Items del Pedido
CREATE TABLE order_items (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) REFERENCES products(id),
    quantity INT NOT NULL,
    price_at_purchase NUMERIC(10, 2) NOT NULL
);

-- Resetear search_path a default
SET search_path TO public;
