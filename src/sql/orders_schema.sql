-- Utilizar el esquema grupohubs
SET search_path TO grupohubs;

-- Eliminar tablas y tipos si existen, en orden inverso de dependencia
DROP TABLE IF EXISTS grupohubs.order_events CASCADE;
DROP TABLE IF EXISTS grupohubs.order_items CASCADE;
DROP TABLE IF EXISTS grupohubs.orders CASCADE;
DROP TYPE IF EXISTS grupohubs.order_status CASCADE;
DROP TYPE IF EXISTS grupohubs.order_event_type CASCADE;

-- Crear tipo ENUM para el estado del pedido
CREATE TYPE grupohubs.order_status AS ENUM (
  'pending_acceptance', -- Esperando que un repartidor acepte
  'accepted',           -- Repartidor aceptó y va al negocio
  'at_store',           -- Repartidor llegó al negocio
  'picked_up',          -- Repartidor recogió y va al cliente
  'on_the_way',         -- Repartidor llegó a la ubicación del cliente
  'delivered',          -- Repartidor entregó (y subió evidencia)
  'completed',          -- Pedido finalizado/archivado
  'cancelled'           -- Pedido cancelado
);

-- Crear tipo ENUM para los eventos del pedido
CREATE TYPE grupohubs.order_event_type AS ENUM (
  'accepted_by_rider',
  'arrived_at_store',
  'picked_up',
  'arrived_at_destination',
  'delivered_with_proof'
);

-- Crear tabla de pedidos (orders)
CREATE TABLE IF NOT EXISTS grupohubs.orders (
    id character varying(255) PRIMARY KEY,
    status grupohubs.order_status NOT NULL DEFAULT 'pending_acceptance',
    
    -- Participantes
    customer_id uuid REFERENCES grupohubs.customers(id),
    business_id character varying(255) REFERENCES grupohubs.businesses(id),
    rider_id character varying(255) REFERENCES grupohubs.riders(id),

    -- Detalles del Cliente y Negocio (desnormalizados para la app del repartidor)
    customer_name text NOT NULL,
    customer_phone text,
    business_name text NOT NULL,
    
    -- Direcciones (en formato JSON para flexibilidad)
    pickup_address jsonb NOT NULL,
    delivery_address jsonb NOT NULL,

    -- Descripción y Totales
    items_description text, -- Para envíos simples
    distance_km numeric(10, 2), -- Distancia en kilómetros
    order_subtotal numeric(10, 2) NOT NULL DEFAULT 0,
    delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
    order_total numeric(10, 2) NOT NULL DEFAULT 0,
    estimated_earnings numeric(10, 2), -- Ganancia para el repartidor
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de ítems del pedido (order_items)
CREATE TABLE IF NOT EXISTS grupohubs.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id character varying(255) NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    product_id character varying(255) REFERENCES grupohubs.products(id),
    product_name text NOT NULL,
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    
    created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de eventos del pedido (order_events)
CREATE TABLE IF NOT EXISTS grupohubs.order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id character varying(255) NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    rider_id character varying(255) NOT NULL REFERENCES grupohubs.riders(id),
    event_type grupohubs.order_event_type NOT NULL,
    event_time timestamp with time zone DEFAULT now(),
    coordinates point, -- Para registrar la ubicación en cada evento
    notes text, -- Notas adicionales (ej. URL de la foto de evidencia)
    
    created_at timestamp with time zone DEFAULT now()
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_orders_status ON grupohubs.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON grupohubs.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON grupohubs.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON grupohubs.order_events(order_id);
