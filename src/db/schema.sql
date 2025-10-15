
-- Crear el esquema para la aplicación si no existe
CREATE SCHEMA IF NOT EXISTS grupohubs;

-- Tabla para Roles y Permisos
CREATE TABLE IF NOT EXISTS grupohubs.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para Usuarios del Sistema
CREATE TABLE IF NOT EXISTS grupohubs.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role_id UUID REFERENCES grupohubs.roles(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    avatar_url TEXT
);

-- Tabla para Categorías de Productos
CREATE TABLE IF NOT EXISTS grupohubs.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para Categorías de Negocios
CREATE TABLE IF NOT EXISTS grupohubs.business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- restaurant, store, service
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Zonas de Operación
CREATE TABLE IF NOT EXISTS grupohubs.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    geofence JSONB, -- Para almacenar el polígono GeoJSON
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Planes
CREATE TABLE IF NOT EXISTS grupohubs.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    validity TEXT NOT NULL, -- mensual, quincenal, semanal, anual
    rider_fee NUMERIC(10, 2) NOT NULL,
    fee_per_km NUMERIC(10, 2) NOT NULL,
    min_shipping_fee NUMERIC(10, 2) NOT NULL,
    min_distance_km NUMERIC(10, 2) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para Negocios
CREATE TABLE IF NOT EXISTS grupohubs.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category_id UUID REFERENCES grupohubs.business_categories(id),
    email TEXT NOT NULL UNIQUE,
    owner_name TEXT NOT NULL,
    phone_whatsapp TEXT NOT NULL,
    address_line TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    tax_id TEXT,
    website TEXT,
    instagram TEXT,
    logo_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- ACTIVE, INACTIVE, PENDING_REVIEW
    zone_id UUID REFERENCES grupohubs.zones(id),
    plan_id UUID REFERENCES grupohubs.plans(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para Productos
CREATE TABLE IF NOT EXISTS grupohubs.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    business_id UUID NOT NULL REFERENCES grupohubs.businesses(id),
    category_id UUID NOT NULL REFERENCES grupohubs.product_categories(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para Clientes
CREATE TABLE IF NOT EXISTS grupohubs.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla para Direcciones de Clientes
CREATE TABLE IF NOT EXISTS grupohubs.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES grupohubs.customers(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false
);

-- Tabla para Repartidores (Riders)
CREATE TABLE IF NOT EXISTS grupohubs.riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    mother_last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    birth_date DATE NOT NULL,
    rider_type TEXT NOT NULL DEFAULT 'Asociado',
    zone_id UUID REFERENCES grupohubs.zones(id),
    address TEXT NOT NULL,
    ine_front_url TEXT,
    ine_back_url TEXT,
    proof_of_address_url TEXT,
    license_front_url TEXT,
    license_back_url TEXT,
    vehicle_type TEXT NOT NULL DEFAULT 'Moto',
    ownership TEXT NOT NULL,
    brand TEXT NOT NULL,
    year INT NOT NULL,
    model TEXT NOT NULL,
    color TEXT NOT NULL,
    plate TEXT NOT NULL UNIQUE,
    license_valid_until DATE,
    circulation_card_front_url TEXT,
    circulation_card_back_url TEXT,
    insurer TEXT,
    policy_number TEXT,
    policy_valid_until DATE,
    policy_first_page_url TEXT,
    has_helmet BOOLEAN DEFAULT false,
    has_uniform BOOLEAN DEFAULT false,
    has_box BOOLEAN DEFAULT false,
    phone_e164 TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, approved, rejected, inactive
    created_at TIMESTAMTz NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS grupohubs.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES grupohubs.customers(id),
    business_id UUID NOT NULL REFERENCES grupohubs.businesses(id),
    rider_id UUID REFERENCES grupohubs.riders(id),
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, DELIVERED, CANCELLED
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de items_de_pedidos (para detalle de productos en un pedido)
CREATE TABLE IF NOT EXISTS grupohubs.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES grupohubs.products(id),
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- Insertar datos iniciales si es necesario (ejemplo para roles)
INSERT INTO grupohubs.roles (id, name, permissions)
VALUES 
('d2f0c345-4236-4d56-a068-9f826019c059', 'Super Administrador', '{"recolectarEfectivo": true, "complemento": true, "atributo": true, "banner": true, "campaña": true, "categoria": true, "cupon": true, "reembolso": true, "gestionDeClientes": true, "repartidor": true, "proveerGanancias": true, "empleado": true, "producto": true, "notificacion": true, "pedido": true, "tienda": true, "reporte": true, "configuraciones": true, "listaDeRetiros": true, "zona": true, "modulo": true, "paquete": true, "puntoDeVenta": true, "unidad": true, "suscripcion": true}')
ON CONFLICT (name) DO NOTHING;

