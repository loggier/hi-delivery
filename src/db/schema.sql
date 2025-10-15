-- Define el esquema si no existe
CREATE SCHEMA IF NOT EXISTS grupohubs;

-- Establece la ruta de búsqueda para usar el esquema por defecto
-- SET search_path TO grupohubs;

-- Tabla de Roles y Permisos
CREATE TABLE grupohubs.roles (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  permissions JSONB NOT NULL, -- Columna para almacenar permisos como JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Usuarios del Sistema (Administradores)
CREATE TABLE grupohubs.users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- Para almacenar el hash de la contraseña
  avatar_url VARCHAR(255),
  role_id VARCHAR(255) REFERENCES grupohubs.roles(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Clientes
CREATE TABLE grupohubs.customers (
  id VARCHAR(255) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE,
  main_address TEXT NOT NULL,
  additional_address_1 TEXT,
  additional_address_2 TEXT,
  order_count INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Categorías de Negocios
CREATE TABLE grupohubs.business_categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'store', 'service')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Planes de Suscripción
CREATE TABLE grupohubs.plans (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    validity VARCHAR(50) NOT NULL CHECK (validity IN ('mensual', 'quincenal', 'semanal', 'anual')),
    rider_fee NUMERIC(10, 2) NOT NULL,
    fee_per_km NUMERIC(10, 2) NOT NULL,
    min_shipping_fee NUMERIC(10, 2) NOT NULL,
    min_distance NUMERIC(5, 2) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Zonas de Operación
CREATE TABLE grupohubs.zones (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    -- En una implementación real, se usaría PostGIS para 'geofence'. Por ahora, se omite.
    -- geofence GEOMETRY(POLYGON, 4326), 
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Negocios
CREATE TABLE grupohubs.businesses (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'store', 'service')),
  category_id VARCHAR(255) REFERENCES grupohubs.business_categories(id) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone_whatsapp VARCHAR(50) NOT NULL,
  address_line TEXT NOT NULL,
  neighborhood VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  tax_id VARCHAR(20),
  website VARCHAR(255),
  instagram VARCHAR(255),
  logo_url VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW')),
  plan_id VARCHAR(255) REFERENCES grupohubs.plans(id) ON DELETE SET NULL,
  zone_id VARCHAR(255) REFERENCES grupohubs.zones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Repartidores (Riders)
CREATE TABLE grupohubs.riders (
  id VARCHAR(255) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  mother_last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  birth_date DATE NOT NULL,
  rider_type VARCHAR(50) NOT NULL DEFAULT 'Asociado',
  zone_id VARCHAR(255) REFERENCES grupohubs.zones(id),
  address TEXT NOT NULL,
  ine_front_url VARCHAR(255) NOT NULL,
  ine_back_url VARCHAR(255) NOT NULL,
  proof_of_address_url VARCHAR(255) NOT NULL,
  license_front_url VARCHAR(255) NOT NULL,
  license_back_url VARCHAR(255) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Moto',
  ownership VARCHAR(50) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  model VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  plate VARCHAR(20) NOT NULL,
  license_valid_until DATE NOT NULL,
  moto_photos JSONB NOT NULL,
  circulation_card_front_url VARCHAR(255) NOT NULL,
  circulation_card_back_url VARCHAR(255) NOT NULL,
  insurer VARCHAR(255) NOT NULL,
  policy_number VARCHAR(255) NOT NULL,
  policy_valid_until DATE NOT NULL,
  policy_first_page_url VARCHAR(255) NOT NULL,
  has_helmet BOOLEAN DEFAULT false,
  has_uniform BOOLEAN DEFAULT false,
  has_box BOOLEAN DEFAULT false,
  phone_e164 VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_1x1_url VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Tabla de Categorías de Productos
CREATE TABLE grupohubs.product_categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Productos
CREATE TABLE grupohubs.products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price NUMERIC(10, 2) NOT NULL,
  image_url VARCHAR(255),
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  business_id VARCHAR(255) REFERENCES grupohubs.businesses(id) ON DELETE CASCADE,
  category_id VARCHAR(255) REFERENCES grupohubs.product_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Pedidos (Orders)
CREATE TABLE grupohubs.orders (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255) REFERENCES grupohubs.customers(id),
  business_id VARCHAR(255) REFERENCES grupohubs.businesses(id),
  rider_id VARCHAR(255) REFERENCES grupohubs.riders(id),
  product_count INTEGER NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('DELIVERED', 'CANCELLED', 'PENDING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento de las búsquedas
CREATE INDEX idx_users_email ON grupohubs.users(email);
CREATE INDEX idx_businesses_name ON grupohubs.businesses(name);
CREATE INDEX idx_businesses_zone_id ON grupohubs.businesses(zone_id);
CREATE INDEX idx_riders_email ON grupohubs.riders(email);
CREATE INDEX idx_riders_zone_id ON grupohubs.riders(zone_id);
CREATE INDEX idx_customers_email ON grupohubs.customers(email);
CREATE INDEX idx_orders_customer_id ON grupohubs.orders(customer_id);
CREATE INDEX idx_orders_business_id ON grupohubs.orders(business_id);
CREATE INDEX idx_orders_rider_id ON grupohubs.orders(rider_id);
